-- Do not accumulate reminders while the master email switch is disabled.
-- Pending work created before this guard is cancelled so it cannot be released
-- as stale email when an administrator enables delivery later.

CREATE OR REPLACE FUNCTION private.queue_appointment_email_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  notifications_enabled boolean;
  new_status text := upper(COALESCE(NEW.status, 'SCHEDULED'));
  old_status text := CASE
    WHEN TG_OP = 'UPDATE' THEN upper(COALESCE(OLD.status, 'SCHEDULED'))
    ELSE NULL
  END;
BEGIN
  SELECT COALESCE(bool_or(settings.enabled), false)
  INTO notifications_enabled
  FROM public.email_notification_settings AS settings
  WHERE settings.singleton_key;

  NEW.updated_at := timezone('utc', now());

  IF TG_OP = 'INSERT' THEN
    IF NOT notifications_enabled OR new_status = 'CANCELLED' THEN
      RETURN NEW;
    END IF;

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

    IF notifications_enabled THEN
      PERFORM private.enqueue_email_notification(
        'appointment_cancelled', 'appointment', NEW.id, clock_timestamp()
      );
    END IF;
  ELSIF NEW.appointment_date IS DISTINCT FROM OLD.appointment_date
    OR (old_status = 'CANCELLED' AND new_status <> 'CANCELLED') THEN
    UPDATE public.email_notification_jobs
    SET
      status = 'CANCELLED',
      processed_at = timezone('utc', now()),
      last_error = 'Replaced because the appointment schedule changed.'
    WHERE entity_type = 'appointment'
      AND entity_id = NEW.id
      AND status = 'PENDING'
      AND notification_type = ANY (ARRAY[
        'appointment_reminder_24h', 'appointment_reminder_2h'
      ]);

    IF NOT notifications_enabled THEN
      RETURN NEW;
    END IF;

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

CREATE OR REPLACE FUNCTION private.queue_critical_stock_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.email_notification_settings AS settings
    WHERE settings.singleton_key
      AND settings.enabled
      AND settings.critical_stock_alerts_enabled
  ) THEN
    RETURN NEW;
  END IF;

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

UPDATE public.email_notification_jobs
SET
  status = 'CANCELLED',
  processed_at = timezone('utc', now()),
  last_error = 'Cancelled because email delivery is disabled.'
WHERE status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1
    FROM public.email_notification_settings AS settings
    WHERE settings.singleton_key AND settings.enabled
  );
