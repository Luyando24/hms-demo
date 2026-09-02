import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.105.1";
import {
  APP_URL,
  EmailDeliveryError,
  emailLayout,
  formatDateTime,
  plainText,
  sendEmails,
} from "../_shared/email.ts";
import type {
  EmailMessage,
  NotificationJob,
  NotificationSettings,
} from "../_shared/notification-types.ts";

function appointmentFeatureEnabled(settings: NotificationSettings, type: string): boolean {
  if (type === "appointment_confirmation" || type === "appointment_rescheduled") {
    return settings.appointment_confirmation_enabled;
  }
  if (type === "appointment_cancelled") return true;
  if (type === "appointment_reminder_24h") return settings.appointment_reminder_24h_enabled;
  if (type === "appointment_reminder_2h") return settings.appointment_reminder_2h_enabled;
  return false;
}

async function roleRecipients(admin: SupabaseClient, roles: string[]): Promise<string[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("email")
    .in("role", roles)
    .not("email", "is", null);
  if (error) throw error;
  return [...new Set(
    (data ?? [])
      .map((row) => String(row.email).trim().toLowerCase())
      .filter(Boolean),
  )];
}

async function processAppointmentJob(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  job: NotificationJob,
) {
  if (!appointmentFeatureEnabled(settings, job.notification_type)) {
    return { skipped: true, reason: "This appointment email type is disabled." };
  }

  const { data: appointment, error: appointmentError } = await admin
    .from("appointments")
    .select("appointment_date, patient_id, provider_id, status")
    .eq("id", job.entity_id)
    .maybeSingle();
  if (appointmentError) throw appointmentError;
  if (!appointment?.patient_id) {
    return { skipped: true, reason: "Appointment or patient was not found." };
  }

  const appointmentStatus = String(appointment.status || "SCHEDULED").toUpperCase();
  const isReminder = job.notification_type === "appointment_reminder_24h" ||
    job.notification_type === "appointment_reminder_2h";
  if (job.notification_type === "appointment_cancelled" && appointmentStatus !== "CANCELLED") {
    return { skipped: true, reason: "The appointment is no longer cancelled." };
  }
  if (job.notification_type !== "appointment_cancelled" &&
    ["CANCELLED", "COMPLETED"].includes(appointmentStatus)) {
    return { skipped: true, reason: `The appointment is ${appointmentStatus.toLowerCase()}.` };
  }
  if (isReminder && !["SCHEDULED", "CONFIRMED"].includes(appointmentStatus)) {
    return { skipped: true, reason: `Appointment status ${appointmentStatus} is not reminder-eligible.` };
  }
  if (isReminder && new Date(appointment.appointment_date) <= new Date()) {
    return { skipped: true, reason: "The appointment time has already passed." };
  }
  const patientRequest = admin
    .from("patients")
    .select("first_name, last_name, email")
    .eq("id", appointment.patient_id)
    .maybeSingle();
  const providerRequest = appointment.provider_id
    ? admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", appointment.provider_id)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [{ data: patient, error: patientError }, { data: provider }] =
    await Promise.all([patientRequest, providerRequest]);
  if (patientError) throw patientError;
  const patientEmail = patient?.email?.trim().toLowerCase() || null;
  const patientOnly = job.payload.patient_only === true;
  const includeManager = !patientOnly && [
    "appointment_confirmation",
    "appointment_rescheduled",
    "appointment_cancelled",
  ].includes(job.notification_type);
  const recipients = [...new Set([
    ...(patientEmail ? [patientEmail] : []),
    ...(includeManager && settings.manager_report_email ? [settings.manager_report_email.trim().toLowerCase()] : []),
  ])];

  if (!recipients.length) {
    return { skipped: true, reason: "No recipient email address available for appointment notification." };
  }

  const appointmentWhen = formatDateTime(
    appointment.appointment_date,
    settings.timezone,
  );
  const providerName = provider
    ? `${provider.first_name || ""} ${provider.last_name || ""}`.trim() ||
      "To be assigned"
    : "To be assigned";
  const patientName =
    `${patient?.first_name || ""} ${patient?.last_name || ""}`.trim() ||
    "Patient";
  const copy: Record<string, { title: string; intro: string }> = {
    appointment_confirmation: {
      title: "Appointment confirmed",
      intro: `Hello ${patientName}, your appointment has been recorded.`,
    },
    appointment_rescheduled: {
      title: "Appointment rescheduled",
      intro: `Hello ${patientName}, your appointment time has changed.`,
    },
    appointment_cancelled: {
      title: "Appointment cancelled",
      intro: `Hello ${patientName}, your appointment has been cancelled.`,
    },
    appointment_reminder_24h: {
      title: "Appointment reminder: tomorrow",
      intro: `Hello ${patientName}, this is a reminder about your upcoming appointment.`,
    },
    appointment_reminder_2h: {
      title: "Appointment reminder: in 2 hours",
      intro: `Hello ${patientName}, your appointment is coming up shortly.`,
    },
  };
  const content = copy[job.notification_type];
  if (!content) return { skipped: true, reason: "Unsupported appointment email type." };

  const rows: Array<[string, string]> = [["Date and time", appointmentWhen]];
  if (job.notification_type !== "appointment_cancelled") {
    rows.push(["Provider", providerName]);
  }
  const portalUrl = APP_URL ? `${APP_URL}/patient/portal/appointments` : "";
  const adminUrl = APP_URL ? `${APP_URL}/hospital/opd` : "";

  const messages: EmailMessage[] = [];
  const managerEmail = settings.manager_report_email?.trim().toLowerCase() || null;

  for (const recipient of recipients) {
    const isManager = recipient === managerEmail;

    let subject: string;
    let html: string;

    if (isManager) {
      const managerCopy: Record<string, { title: string; intro: string }> = {
        appointment_confirmation: {
          title: `New appointment booked — ${patientName}`,
          intro: `A new patient appointment has been registered in the system for ${patientName}.`,
        },
        appointment_rescheduled: {
          title: `Appointment rescheduled — ${patientName}`,
          intro: `The appointment schedule for ${patientName} has been updated.`,
        },
        appointment_cancelled: {
          title: `Appointment cancelled — ${patientName}`,
          intro: `The appointment for ${patientName} has been cancelled.`,
        },
        appointment_reminder_24h: {
          title: `Upcoming appointment tomorrow — ${patientName}`,
          intro: `Reminder: ${patientName} has an appointment scheduled for tomorrow.`,
        },
        appointment_reminder_2h: {
          title: `Upcoming appointment in 2 hours — ${patientName}`,
          intro: `Reminder: ${patientName} has an appointment scheduled in 2 hours.`,
        },
      };
      const mgrContent = managerCopy[job.notification_type] || {
        title: `Appointment update — ${patientName}`,
        intro: `An appointment update occurred for ${patientName}.`,
      };

      const mgrRows: Array<[string, string]> = [
        ["Patient name", patientName],
        ["Patient email", patientEmail || "Not provided"],
        ["Date and time", appointmentWhen],
      ];
      if (job.notification_type !== "appointment_cancelled") {
        mgrRows.push(["Assigned provider", providerName]);
      }

      subject = `${hospitalName}: ${mgrContent.title}`;
      html = emailLayout(
        hospitalName,
        mgrContent.title,
        mgrContent.intro,
        mgrRows,
        adminUrl ? { label: "Open OPD / Appointments", href: adminUrl } : undefined,
        "Administrative notification for hospital operations.",
      );
    } else {
      subject = `${hospitalName}: ${content.title}`;
      html = emailLayout(
        hospitalName,
        content.title,
        content.intro,
        rows,
        portalUrl ? { label: "View appointment", href: portalUrl } : undefined,
        "For privacy, this email does not include medical or appointment-reason details.",
      );
    }

    messages.push({
      notificationType: job.notification_type,
      recipient,
      subject,
      html,
      text: plainText(html),
      idempotencyKey: `job/${job.id}/${recipient}`,
      jobId: job.id,
      metadata: { appointment_id: job.entity_id },
    });
  }
  await sendEmails(admin, messages);
  return { skipped: false, reason: null };
}

async function processCriticalStockJob(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  job: NotificationJob,
) {
  if (!settings.critical_stock_alerts_enabled) {
    return { skipped: true, reason: "Critical stock alerts are disabled." };
  }
  const { data: item, error } = await admin
    .from("inventory_items")
    .select("name, stock_level, unit")
    .eq("id", job.entity_id)
    .maybeSingle();
  if (error) throw error;
  if (!item) return { skipped: true, reason: "The inventory item was not found." };

  const pharmacists = await roleRecipients(admin, ["PHARMACIST"]);
  const recipients = [...new Set([
    ...pharmacists,
    ...(settings.manager_report_email
      ? [settings.manager_report_email.toLowerCase()]
      : []),
  ])];
  if (!recipients.length) {
    return { skipped: true, reason: "No stock-alert recipient is configured." };
  }

  const html = emailLayout(
    hospitalName,
    "Critical stock-out alert",
    "An inventory item has reached zero stock and needs attention.",
    [
      ["Item", item.name],
      ["Stock level", `${item.stock_level ?? 0} ${item.unit || "units"}`],
    ],
    APP_URL
      ? { label: "Open inventory", href: `${APP_URL}/hospital/inventory` }
      : undefined,
  );
  await sendEmails(admin, recipients.map((recipient): EmailMessage => ({
      notificationType: job.notification_type,
      recipient,
      subject: `${hospitalName}: Stock-out — ${item.name}`,
      html,
      text: plainText(html),
      idempotencyKey: `job/${job.id}/${recipient}`,
      jobId: job.id,
      metadata: { inventory_item_id: job.entity_id },
    })));
  return { skipped: false, reason: null };
}

export async function processDueJobs(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
) {
  const staleLock = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { error: recoveryError } = await admin
    .from("email_notification_jobs")
    .update({
      status: "PENDING",
      locked_at: null,
      last_error: "Recovered after a stale processing lock.",
    })
    .eq("status", "PROCESSING")
    .lt("locked_at", staleLock);
  if (recoveryError) throw recoveryError;

  const { data, error } = await admin
    .from("email_notification_jobs")
    .select("*")
    .eq("status", "PENDING")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(25);
  if (error) throw error;

  let completed = 0;
  let failed = 0;
  let retried = 0;
  let skipped = 0;
  for (const rawJob of data ?? []) {
    const job = rawJob as NotificationJob;
    const nextAttempt = job.attempt_count + 1;
    const { data: claimed, error: claimError } = await admin
      .from("email_notification_jobs")
      .update({
        status: "PROCESSING",
        locked_at: new Date().toISOString(),
        attempt_count: nextAttempt,
      })
      .eq("id", job.id)
      .eq("status", "PENDING")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) continue;

    try {
      const result = job.entity_type === "appointment"
        ? await processAppointmentJob(admin, settings, hospitalName, job)
        : await processCriticalStockJob(admin, settings, hospitalName, job);
      const { error: completionError } = await admin
        .from("email_notification_jobs")
        .update({
          status: result.skipped ? "SKIPPED" : "COMPLETED",
          last_error: result.reason,
          locked_at: null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (completionError) throw completionError;
      if (result.skipped) skipped += 1;
      else completed += 1;
    } catch (jobError) {
      const retryable = !(jobError instanceof EmailDeliveryError) || jobError.retryable;
      const exhausted = !retryable || nextAttempt >= job.max_attempts;
      const exponentialDelay = Math.min(
        60 * 60 * 1000,
        5 * 60 * 1000 * (2 ** Math.max(0, nextAttempt - 1)),
      );
      const retryAfter = jobError instanceof EmailDeliveryError
        ? jobError.retryAfterMs ?? 0
        : 0;
      const retryDelay = Math.min(
        24 * 60 * 60 * 1000,
        Math.max(exponentialDelay, retryAfter),
      );
      const { error: failureUpdateError } = await admin
        .from("email_notification_jobs")
        .update({
          status: exhausted ? "FAILED" : "PENDING",
          scheduled_for: exhausted
            ? job.scheduled_for
            : new Date(Date.now() + retryDelay).toISOString(),
          last_error: jobError instanceof Error
            ? jobError.message
            : "Email delivery failed.",
          locked_at: null,
          processed_at: exhausted ? new Date().toISOString() : null,
        })
        .eq("id", job.id);
      if (failureUpdateError) throw failureUpdateError;
      if (exhausted) failed += 1;
      else retried += 1;
    }
  }
  return { completed, failed, retried, skipped };
}
