import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.105.1";
import type { EmailMessage, JsonRecord, ZonedParts } from "./notification-types.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
export const APP_URL = (Deno.env.get("HMS_APP_URL") ?? "").replace(/\/$/, "");

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function plainText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function emailLayout(
  hospitalName: string,
  title: string,
  introduction: string,
  rows: Array<[string, string | number]>,
  cta?: { label: string; href: string },
  note?: string,
): string {
  const details = rows
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 12px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;">${escapeHtml(label)}</td>
        <td style="padding:10px 12px;color:#0f172a;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;">${escapeHtml(value)}</td>
      </tr>`)
    .join("");
  const action = cta?.href
    ? `<p style="margin:28px 0 8px;text-align:center;"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;">${escapeHtml(cta.label)}</a></p>`
    : "";

  return `<!doctype html>
  <html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#2563eb;color:#fff;padding:22px 28px;">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">${escapeHtml(hospitalName)}</div>
          <h1 style="font-size:24px;line-height:1.25;margin:8px 0 0;">${escapeHtml(title)}</h1>
        </div>
        <div style="padding:26px 28px;">
          <p style="font-size:15px;line-height:1.65;color:#475569;margin:0 0 20px;">${escapeHtml(introduction)}</p>
          ${rows.length ? `<table style="border-collapse:collapse;width:100%;border:1px solid #e2e8f0;border-radius:10px;">${details}</table>` : ""}
          ${action}
          ${note ? `<p style="font-size:12px;line-height:1.5;color:#64748b;margin:22px 0 0;">${escapeHtml(note)}</p>` : ""}
        </div>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin:14px 0 0;">Automated notification from ${escapeHtml(hospitalName)}. Please do not send clinical information by replying to this email.</p>
    </div>
  </body></html>`;
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  return {
    year,
    month,
    day,
    hour: Number(values.hour),
    minute: Number(values.minute),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

export function localDateKey(parts: ZonedParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function isPastConfiguredTime(parts: ZonedParts, value: string): boolean {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return parts.hour * 60 + parts.minute >= (hour || 0) * 60 + (minute || 0);
}

export function zonedDateToUtc(
  year: number,
  month: number,
  day: number,
  timezone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const represented = getZonedParts(new Date(guess), timezone);
  const representedAsUtc = Date.UTC(
    represented.year,
    represented.month - 1,
    represented.day,
    represented.hour,
    represented.minute,
  );
  return new Date(guess + (guess - representedAsUtc));
}

export function addLocalDays(parts: ZonedParts, days: number): ZonedParts {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: 0,
    minute: 0,
    weekday: shifted.getUTCDay(),
  };
}

export function formatDateTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-ZM", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export async function getHospitalName(admin: SupabaseClient): Promise<string> {
  const { data } = await admin
    .from("system_settings")
    .select("hospital_name")
    .limit(1)
    .maybeSingle();
  return data?.hospital_name || "HMS Hospital";
}

export async function sendEmail(admin: SupabaseClient, message: EmailMessage) {
  const recipient = message.recipient.trim().toLowerCase();
  const { data: existing } = await admin
    .from("email_deliveries")
    .select("id, status, provider_message_id")
    .eq("idempotency_key", message.idempotencyKey)
    .maybeSingle();

  if (existing && existing.status !== "failed") {
    return { duplicate: true, providerMessageId: existing.provider_message_id as string | null };
  }

  const deliveryPayload = {
    job_id: message.jobId ?? null,
    notification_type: message.notificationType,
    recipient_email: recipient,
    idempotency_key: message.idempotencyKey,
    subject: message.subject,
    period_key: message.periodKey ?? null,
    metadata: message.metadata ?? {},
    status: "queued",
    last_error: null,
  };

  let deliveryId = existing?.id as string | undefined;
  if (deliveryId) {
    const { error } = await admin.from("email_deliveries").update(deliveryPayload).eq("id", deliveryId);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from("email_deliveries")
      .insert(deliveryPayload)
      .select("id")
      .single();
    if (error) throw error;
    deliveryId = data.id;
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    const errorMessage = "Resend API key or sender address is not configured.";
    await admin
      .from("email_deliveries")
      .update({ status: "failed", last_error: errorMessage })
      .eq("id", deliveryId);
    throw new Error(errorMessage);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": message.idempotencyKey,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [recipient],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  const responseBody = await response.json().catch(() => ({})) as JsonRecord;

  if (!response.ok || typeof responseBody.id !== "string") {
    const detail = typeof responseBody.message === "string"
      ? responseBody.message
      : `Resend returned HTTP ${response.status}.`;
    await admin
      .from("email_deliveries")
      .update({ status: "failed", last_error: detail })
      .eq("id", deliveryId);
    throw new Error(detail);
  }

  await admin
    .from("email_deliveries")
    .update({
      status: "sent",
      provider_message_id: responseBody.id,
      sent_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", deliveryId);

  return { duplicate: false, providerMessageId: responseBody.id };
}
