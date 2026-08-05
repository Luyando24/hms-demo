-- Resend-backed email reminders, operational digests, and manager reports.
-- Delivery is disabled by default until Resend secrets and an administrator
-- recipient are configured.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

CREATE TABLE public.email_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton_key),
  enabled boolean NOT NULL DEFAULT false,
  manager_report_email text,
  report_cc_emails text[] NOT NULL DEFAULT '{}',
  timezone text NOT NULL DEFAULT 'Africa/Lusaka',
  appointment_confirmation_enabled boolean NOT NULL DEFAULT true,
  appointment_reminder_24h_enabled boolean NOT NULL DEFAULT true,
  appointment_reminder_2h_enabled boolean NOT NULL DEFAULT true,
  provider_schedule_enabled boolean NOT NULL DEFAULT true,
  provider_schedule_time time NOT NULL DEFAULT '06:30',
  laboratory_digest_enabled boolean NOT NULL DEFAULT true,
  radiology_digest_enabled boolean NOT NULL DEFAULT true,
  clinical_digest_time time NOT NULL DEFAULT '06:30',
  inventory_digest_enabled boolean NOT NULL DEFAULT true,
  inventory_digest_time time NOT NULL DEFAULT '08:00',
  critical_stock_alerts_enabled boolean NOT NULL DEFAULT true,
  daily_report_enabled boolean NOT NULL DEFAULT true,
  daily_report_time time NOT NULL DEFAULT '18:00',
  weekly_report_enabled boolean NOT NULL DEFAULT true,
  weekly_report_day smallint NOT NULL DEFAULT 1 CHECK (weekly_report_day BETWEEN 0 AND 6),
  weekly_report_time time NOT NULL DEFAULT '07:00',
  monthly_report_enabled boolean NOT NULL DEFAULT true,
  monthly_report_day smallint NOT NULL DEFAULT 1 CHECK (monthly_report_day BETWEEN 1 AND 28),
  monthly_report_time time NOT NULL DEFAULT '07:00',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT email_notification_settings_manager_email_check CHECK (
    manager_report_email IS NULL
    OR manager_report_email ~* '^[A-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$'
  )
);

CREATE TABLE public.email_notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type text NOT NULL CHECK (notification_type = ANY (ARRAY[
    'appointment_confirmation',
    'appointment_rescheduled',
    'appointment_cancelled',
    'appointment_reminder_24h',
    'appointment_reminder_2h',
    'critical_stock'
  ])),
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['appointment', 'inventory_item'])),
  entity_id uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY[
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED'
  ])),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  locked_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.email_notification_jobs(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  recipient_email text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  provider_message_id text,
  status text NOT NULL DEFAULT 'queued' CHECK (status = ANY (ARRAY[
    'queued', 'sent', 'delivered', 'delivery_delayed', 'bounced',
    'complained', 'failed', 'suppressed', 'skipped'
  ])),
  subject text NOT NULL,
  period_key text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX email_deliveries_provider_message_key
  ON public.email_deliveries (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE public.email_webhook_events (
  event_id text PRIMARY KEY,
  provider_message_id text NOT NULL,
  event_type text NOT NULL,
  event_created_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX email_notification_jobs_due_idx
  ON public.email_notification_jobs (scheduled_for, status)
  WHERE status = 'PENDING';
CREATE INDEX email_notification_jobs_entity_idx
  ON public.email_notification_jobs (entity_type, entity_id);
CREATE INDEX email_deliveries_created_idx
  ON public.email_deliveries (created_at DESC);
CREATE INDEX email_deliveries_status_idx
  ON public.email_deliveries (status, created_at DESC);

INSERT INTO public.email_notification_settings (singleton_key)
VALUES (true)
ON CONFLICT (singleton_key) DO NOTHING;

CREATE OR REPLACE FUNCTION private.set_email_notification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_email_notification_settings_updated_at
BEFORE UPDATE ON public.email_notification_settings
FOR EACH ROW EXECUTE FUNCTION private.set_email_notification_updated_at();

CREATE TRIGGER set_email_notification_jobs_updated_at
BEFORE UPDATE ON public.email_notification_jobs
FOR EACH ROW EXECUTE FUNCTION private.set_email_notification_updated_at();

CREATE TRIGGER set_email_deliveries_updated_at
BEFORE UPDATE ON public.email_deliveries
FOR EACH ROW EXECUTE FUNCTION private.set_email_notification_updated_at();

CREATE OR REPLACE FUNCTION private.enqueue_email_notification(
  target_type text,
  target_entity_type text,
  target_entity_id uuid,
  target_scheduled_for timestamptz,
  target_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.email_notification_jobs (
    notification_type,
    entity_type,
    entity_id,
    scheduled_for,
    payload
  ) VALUES (
    target_type,
    target_entity_type,
    target_entity_id,
    target_scheduled_for,
    COALESCE(target_payload, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.queue_appointment_email_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_status text := upper(COALESCE(NEW.status, 'SCHEDULED'));
  old_status text := CASE WHEN TG_OP = 'UPDATE' THEN upper(COALESCE(OLD.status, 'SCHEDULED')) ELSE NULL END;
BEGIN
  NEW.updated_at := timezone('utc', now());

  IF TG_OP = 'INSERT' THEN
    IF new_status <> 'CANCELLED' THEN
      PERFORM private.enqueue_email_notification(
        'appointment_confirmation',
        'appointment',
        NEW.id,
        clock_timestamp(),
        jsonb_build_object('appointment_date', NEW.appointment_date)
      );

      IF NEW.appointment_date - interval '24 hours' > clock_timestamp() THEN
        PERFORM private.enqueue_email_notification(
          'appointment_reminder_24h', 'appointment', NEW.id,
          NEW.appointment_date - interval '24 hours'
        );
      END IF;

      IF NEW.appointment_date - interval '2 hours' > clock_timestamp() THEN
        PERFORM private.enqueue_email_notification(
          'appointment_reminder_2h', 'appointment', NEW.id,
          NEW.appointment_date - interval '2 hours'
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF new_status = 'CANCELLED' AND old_status <> 'CANCELLED' THEN
    UPDATE public.email_notification_jobs
    SET status = 'CANCELLED', processed_at = timezone('utc', now())
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING';

    PERFORM private.enqueue_email_notification(
      'appointment_cancelled', 'appointment', NEW.id, clock_timestamp()
    );
  ELSIF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
    OR (old_status = 'CANCELLED' AND new_status <> 'CANCELLED') THEN
    UPDATE public.email_notification_jobs
    SET status = 'CANCELLED', processed_at = timezone('utc', now())
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING'
      AND notification_type = ANY (ARRAY[
        'appointment_reminder_24h', 'appointment_reminder_2h'
      ]);

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

    IF NEW.appointment_date - interval '24 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_24h', 'appointment', NEW.id,
        NEW.appointment_date - interval '24 hours'
      );
    END IF;

    IF NEW.appointment_date - interval '2 hours' > clock_timestamp() THEN
      PERFORM private.enqueue_email_notification(
        'appointment_reminder_2h', 'appointment', NEW.id,
        NEW.appointment_date - interval '2 hours'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_appointment_email_notifications ON public.appointments;
CREATE TRIGGER queue_appointment_email_notifications
BEFORE INSERT OR UPDATE OF appointment_date, status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.queue_appointment_email_notifications();

CREATE OR REPLACE FUNCTION private.queue_critical_stock_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF COALESCE(NEW.stock_level, 0) <= 0
    AND (TG_OP = 'INSERT' OR COALESCE(OLD.stock_level, 0) > 0) THEN
    PERFORM private.enqueue_email_notification(
      'critical_stock',
      'inventory_item',
      NEW.id,
      clock_timestamp(),
      jsonb_build_object('item_name', NEW.name)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_critical_stock_email_notification ON public.inventory_items;
CREATE TRIGGER queue_critical_stock_email_notification
AFTER INSERT OR UPDATE OF stock_level ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION private.queue_critical_stock_email_notification();

REVOKE ALL ON FUNCTION private.set_email_notification_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.enqueue_email_notification(text, text, uuid, timestamptz, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.queue_appointment_email_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.queue_critical_stock_email_notification() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.email_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_notification_settings_admin_access
ON public.email_notification_settings FOR ALL TO authenticated
USING (private.has_role(ARRAY['ADMIN']))
WITH CHECK (private.has_role(ARRAY['ADMIN']));

CREATE POLICY email_notification_jobs_admin_read
ON public.email_notification_jobs FOR SELECT TO authenticated
USING (private.has_role(ARRAY['ADMIN']));

CREATE POLICY email_deliveries_admin_read
ON public.email_deliveries FOR SELECT TO authenticated
USING (private.has_role(ARRAY['ADMIN']));

CREATE POLICY email_webhook_events_admin_read
ON public.email_webhook_events FOR SELECT TO authenticated
USING (private.has_role(ARRAY['ADMIN']));

REVOKE ALL ON public.email_notification_settings FROM anon, authenticated;
REVOKE ALL ON public.email_notification_jobs FROM anon, authenticated;
REVOKE ALL ON public.email_deliveries FROM anon, authenticated;
REVOKE ALL ON public.email_webhook_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.email_notification_settings TO authenticated;
GRANT SELECT ON public.email_notification_jobs TO authenticated;
GRANT SELECT ON public.email_deliveries TO authenticated;
GRANT SELECT ON public.email_webhook_events TO authenticated;

GRANT ALL ON public.email_notification_settings TO service_role;
GRANT ALL ON public.email_notification_jobs TO service_role;
GRANT ALL ON public.email_deliveries TO service_role;
GRANT ALL ON public.email_webhook_events TO service_role;

DO $migration$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid INTO existing_job_id
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
        timeout_milliseconds := 10000
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
