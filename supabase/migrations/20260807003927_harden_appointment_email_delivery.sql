-- Harden appointment email delivery, queue lifecycle, and dispatcher visibility.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notification_email text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'appointments_notification_email_check'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_notification_email_check CHECK (
        notification_email IS NULL
        OR notification_email ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$'
      );
  END IF;
END
$migration$;

UPDATE public.appointments AS appointment
SET notification_email = lower(btrim(patient.email))
FROM public.patients AS patient
WHERE appointment.patient_id = patient.id
  AND appointment.notification_email IS NULL
  AND patient.email IS NOT NULL
  AND btrim(patient.email) ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$';

ALTER TABLE public.email_notification_jobs
  ALTER COLUMN max_attempts SET DEFAULT 5;

UPDATE public.email_notification_jobs
SET max_attempts = greatest(max_attempts, 5)
WHERE status IN ('PENDING', 'PROCESSING');

CREATE TABLE IF NOT EXISTS public.email_dispatch_health (
  singleton_key boolean PRIMARY KEY DEFAULT true CHECK (singleton_key),
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  last_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.email_dispatch_health (singleton_key)
VALUES (true)
ON CONFLICT (singleton_key) DO NOTHING;

DROP TRIGGER IF EXISTS set_email_dispatch_health_updated_at
ON public.email_dispatch_health;
CREATE TRIGGER set_email_dispatch_health_updated_at
BEFORE UPDATE ON public.email_dispatch_health
FOR EACH ROW EXECUTE FUNCTION private.set_email_notification_updated_at();

ALTER TABLE public.email_dispatch_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_dispatch_health_admin_read
ON public.email_dispatch_health;
CREATE POLICY email_dispatch_health_admin_read
ON public.email_dispatch_health
FOR SELECT TO authenticated
USING (private.has_role(ARRAY['ADMIN']));

REVOKE ALL ON public.email_dispatch_health FROM anon, authenticated;
GRANT SELECT ON public.email_dispatch_health TO authenticated;
GRANT ALL ON public.email_dispatch_health TO service_role;

CREATE OR REPLACE FUNCTION private.queue_appointment_email_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  master_enabled boolean := false;
  confirmation_enabled boolean := false;
  reminder_24h_enabled boolean := false;
  reminder_2h_enabled boolean := false;
  new_status text := upper(COALESCE(NEW.status, 'SCHEDULED'));
  old_status text := CASE
    WHEN TG_OP = 'UPDATE' THEN upper(COALESCE(OLD.status, 'SCHEDULED'))
    ELSE NULL
  END;
BEGIN
  SELECT
    settings.enabled,
    settings.appointment_confirmation_enabled,
    settings.appointment_reminder_24h_enabled,
    settings.appointment_reminder_2h_enabled
  INTO
    master_enabled,
    confirmation_enabled,
    reminder_24h_enabled,
    reminder_2h_enabled
  FROM public.email_notification_settings AS settings
  WHERE settings.singleton_key;

  master_enabled := COALESCE(master_enabled, false);
  NEW.updated_at := timezone('utc', now());

  IF TG_OP = 'INSERT' THEN
    IF NOT master_enabled OR new_status IN ('CANCELLED', 'COMPLETED') THEN
      RETURN NEW;
    END IF;

    IF confirmation_enabled THEN
      PERFORM private.enqueue_email_notification(
        'appointment_confirmation',
        'appointment',
        NEW.id,
        clock_timestamp(),
        jsonb_build_object('appointment_date', NEW.appointment_date)
      );
    END IF;

    IF reminder_24h_enabled
      AND NEW.appointment_date - interval '24 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_24h',
        'appointment',
        NEW.id,
        NEW.appointment_date - interval '24 hours'
      );
    END IF;

    IF reminder_2h_enabled
      AND NEW.appointment_date - interval '2 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_2h',
        'appointment',
        NEW.id,
        NEW.appointment_date - interval '2 hours'
      );
    END IF;

    RETURN NEW;
  END IF;

  IF new_status = 'CANCELLED' AND old_status <> 'CANCELLED' THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because the appointment was cancelled.'
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING';

    IF master_enabled THEN
      PERFORM private.enqueue_email_notification(
        'appointment_cancelled',
        'appointment',
        NEW.id,
        clock_timestamp()
      );
    END IF;
  ELSIF new_status = 'COMPLETED' AND old_status <> 'COMPLETED' THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because the appointment was completed.'
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING'
      AND notification_type <> 'appointment_cancelled';
  ELSIF (
      NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
      OR (
        old_status IN ('CANCELLED', 'COMPLETED')
        AND new_status NOT IN ('CANCELLED', 'COMPLETED')
      )
    )
    AND new_status NOT IN ('CANCELLED', 'COMPLETED') THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Replaced because the appointment schedule changed.'
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING'
      AND notification_type = ANY (ARRAY[
        'appointment_reminder_24h',
        'appointment_reminder_2h'
      ]);

    IF NOT master_enabled THEN
      RETURN NEW;
    END IF;

    IF confirmation_enabled THEN
      PERFORM private.enqueue_email_notification(
        'appointment_rescheduled',
        'appointment',
        NEW.id,
        clock_timestamp(),
        jsonb_build_object(
          'previous_appointment_date', OLD.appointment_date,
          'appointment_date', NEW.appointment_date
        )
      );
    END IF;

    IF reminder_24h_enabled
      AND NEW.appointment_date - interval '24 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_24h',
        'appointment',
        NEW.id,
        NEW.appointment_date - interval '24 hours'
      );
    END IF;

    IF reminder_2h_enabled
      AND NEW.appointment_date - interval '2 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_2h',
        'appointment',
        NEW.id,
        NEW.appointment_date - interval '2 hours'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.manage_email_notification_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT NEW.enabled THEN
    IF OLD.enabled THEN
      UPDATE public.email_notification_jobs
      SET
        status = 'CANCELLED',
        processed_at = timezone('utc', now()),
        last_error = 'Cancelled because email delivery was disabled.'
      WHERE status = 'PENDING';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.appointment_confirmation_enabled
    AND NOT NEW.appointment_confirmation_enabled THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because appointment confirmations were disabled.'
    WHERE status = 'PENDING'
      AND notification_type IN (
        'appointment_confirmation',
        'appointment_rescheduled'
      );
  END IF;

  IF OLD.appointment_reminder_24h_enabled
    AND NOT NEW.appointment_reminder_24h_enabled THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because 24-hour reminders were disabled.'
    WHERE status = 'PENDING'
      AND notification_type = 'appointment_reminder_24h';
  END IF;

  IF OLD.appointment_reminder_2h_enabled
    AND NOT NEW.appointment_reminder_2h_enabled THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because 2-hour reminders were disabled.'
    WHERE status = 'PENDING'
      AND notification_type = 'appointment_reminder_2h';
  END IF;

  IF OLD.critical_stock_alerts_enabled
    AND NOT NEW.critical_stock_alerts_enabled THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Cancelled because critical stock alerts were disabled.'
    WHERE status = 'PENDING'
      AND notification_type = 'critical_stock';
  END IF;

  IF NEW.appointment_reminder_24h_enabled
    AND (NOT OLD.enabled OR NOT OLD.appointment_reminder_24h_enabled) THEN
    INSERT INTO public.email_notification_jobs (
      notification_type,
      entity_type,
      entity_id,
      scheduled_for,
      payload
    )
    SELECT
      'appointment_reminder_24h',
      'appointment',
      appointment.id,
      appointment.appointment_date - interval '24 hours',
      '{}'::jsonb
    FROM public.appointments AS appointment
    WHERE upper(COALESCE(appointment.status, 'SCHEDULED'))
        NOT IN ('CANCELLED', 'COMPLETED')
      AND appointment.appointment_date - interval '24 hours' > clock_timestamp()
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_notification_jobs AS job
        WHERE job.entity_type = 'appointment'
          AND job.entity_id = appointment.id
          AND job.notification_type = 'appointment_reminder_24h'
          AND job.scheduled_for = appointment.appointment_date - interval '24 hours'
          AND job.status IN ('PENDING', 'PROCESSING', 'COMPLETED')
      );
  END IF;

  IF NEW.appointment_reminder_2h_enabled
    AND (NOT OLD.enabled OR NOT OLD.appointment_reminder_2h_enabled) THEN
    INSERT INTO public.email_notification_jobs (
      notification_type,
      entity_type,
      entity_id,
      scheduled_for,
      payload
    )
    SELECT
      'appointment_reminder_2h',
      'appointment',
      appointment.id,
      appointment.appointment_date - interval '2 hours',
      '{}'::jsonb
    FROM public.appointments AS appointment
    WHERE upper(COALESCE(appointment.status, 'SCHEDULED'))
        NOT IN ('CANCELLED', 'COMPLETED')
      AND appointment.appointment_date - interval '2 hours' > clock_timestamp()
      AND NOT EXISTS (
        SELECT 1
        FROM public.email_notification_jobs AS job
        WHERE job.entity_type = 'appointment'
          AND job.entity_id = appointment.id
          AND job.notification_type = 'appointment_reminder_2h'
          AND job.scheduled_for = appointment.appointment_date - interval '2 hours'
          AND job.status IN ('PENDING', 'PROCESSING', 'COMPLETED')
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manage_email_notification_queue
ON public.email_notification_settings;
CREATE TRIGGER manage_email_notification_queue
AFTER UPDATE OF
  enabled,
  appointment_confirmation_enabled,
  appointment_reminder_24h_enabled,
  appointment_reminder_2h_enabled,
  critical_stock_alerts_enabled
ON public.email_notification_settings
FOR EACH ROW EXECUTE FUNCTION private.manage_email_notification_queue();

CREATE OR REPLACE FUNCTION public.enqueue_appointment_confirmation(
  target_appointment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  appointment_row public.appointments%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_appointment_id::text, 0)
  );

  SELECT appointment.*
  INTO appointment_row
  FROM public.appointments AS appointment
  WHERE appointment.id = target_appointment_id
    AND appointment.notification_email IS NOT NULL
    AND upper(COALESCE(appointment.status, 'SCHEDULED'))
      NOT IN ('CANCELLED', 'COMPLETED');

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1
    FROM public.email_notification_settings AS settings
    WHERE settings.singleton_key
      AND settings.enabled
      AND settings.appointment_confirmation_enabled
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.email_notification_jobs AS job
    WHERE job.entity_type = 'appointment'
      AND job.entity_id = target_appointment_id
      AND job.notification_type = 'appointment_confirmation'
      AND job.created_at >= clock_timestamp() - interval '5 minutes'
      AND job.status <> 'CANCELLED'
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.email_notification_jobs (
    notification_type,
    entity_type,
    entity_id,
    scheduled_for,
    payload
  ) VALUES (
    'appointment_confirmation',
    'appointment',
    appointment_row.id,
    clock_timestamp(),
    jsonb_build_object(
      'appointment_date', appointment_row.appointment_date,
      'patient_only', true
    )
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION private.manage_email_notification_queue()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_appointment_confirmation(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_appointment_confirmation(uuid)
TO service_role;

DO $migration$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'dispatch-email-notifications';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'dispatch-email-notifications',
    '*/5 * * * *',
    $cron$
      SELECT net.http_post(
        url := rtrim(secrets.project_url, '/') || '/functions/v1/email-dispatcher',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', secrets.secret_key
        ),
        body := '{"mode":"dispatch"}'::jsonb,
        timeout_milliseconds := 120000
      )
      FROM (
        SELECT
          max(decrypted_secret) FILTER (WHERE name = 'email_project_url') AS project_url,
          max(decrypted_secret) FILTER (WHERE name = 'email_dispatcher_secret_key') AS secret_key
        FROM vault.decrypted_secrets
      ) AS secrets
      WHERE secrets.project_url IS NOT NULL
        AND secrets.secret_key IS NOT NULL;
    $cron$
  );
END
$migration$;
