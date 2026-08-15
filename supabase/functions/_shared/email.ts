import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.105.1";
import type { EmailMessage, JsonRecord, ZonedParts } from "./notification-types.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
const RESEND_FROM_NAME = (Deno.env.get("RESEND_FROM_NAME") ?? "HMS - Kunda Health Care")
  .replace(/[\r\n]/g, " ")
  .trim();
const RESEND_MIN_INTERVAL_MS = 225;
let lastSendStartedAt = 0;
let sendGate: Promise<void> = Promise.resolve();
export const APP_URL = (Deno.env.get("HMS_APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

export class EmailDeliveryError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(message: string, retryable = true, retryAfterMs?: number) {
    super(message);
    this.name = "EmailDeliveryError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

function configuredFromAddress(): string | null {
  if (!RESEND_FROM_EMAIL) return null;
  const sender = RESEND_FROM_EMAIL.replace(/[\r\n]/g, " ").trim();
  if (!sender || sender.includes("<")) return sender || null;
  return `${RESEND_FROM_NAME} <${sender}>`;
}

function waitForSendSlot(): Promise<void> {
  const scheduled = sendGate.then(async () => {
    const waitMs = Math.max(0, lastSendStartedAt + RESEND_MIN_INTERVAL_MS - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastSendStartedAt = Date.now();
  });
  sendGate = scheduled.catch(() => undefined);
  return scheduled;
}

function retryAfterMilliseconds(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }

  const reset = Number(response.headers.get("ratelimit-reset"));
  if (Number.isFinite(reset) && reset > 0) {
    const resetAt = reset > 10_000_000_000 ? reset : reset * 1000;
    return Math.max(0, resetAt - Date.now());
  }
  return undefined;
}

export interface HospitalInfo {
  hospitalName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  appUrl?: string | null;
}

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

function renderValueBadge(value: string | number): string {
  const str = String(value).trim();
  const upper = str.toUpperCase();

  if (upper.includes("COMPLETED") || upper.includes("CONFIRMED") || upper.includes("100%") || upper.includes("GRADE A+")) {
    return `<span style="display:inline-block;padding:3px 10px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:9999px;font-size:11px;font-weight:800;">${escapeHtml(str)}</span>`;
  }
  if (upper.includes("CRITICAL") || upper.includes("CANCELLED") || upper.includes("STOCK-OUT") || upper.includes("HIGH")) {
    return `<span style="display:inline-block;padding:3px 10px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:9999px;font-size:11px;font-weight:800;">${escapeHtml(str)}</span>`;
  }
  if (upper.includes("PENDING") || upper.includes("RESCHEDULED") || upper.includes("LOW-STOCK")) {
    return `<span style="display:inline-block;padding:3px 10px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:9999px;font-size:11px;font-weight:800;">${escapeHtml(str)}</span>`;
  }
  return escapeHtml(str);
}

export function emailLayout(
  hospital: string | HospitalInfo,
  title: string,
  introduction: string,
  rows: Array<[string, string | number]>,
  cta?: { label: string; href: string },
  note?: string,
): string {
  const info: HospitalInfo = typeof hospital === "string"
    ? { hospitalName: hospital, appUrl: APP_URL || null }
    : hospital;

  const hospitalName = info.hospitalName || "HMS Hospital";
  const address = info.address?.trim() || "";
  const phone = info.phone?.trim() || "";
  const email = info.email?.trim() || "";
  const rawUrl = info.appUrl || APP_URL || "";
  const websiteUrl = rawUrl ? rawUrl.replace(/\/$/, "") : "";
  const websiteDisplay = websiteUrl.replace(/^https?:\/\//, "");

  const contactParts = [address, phone, email].filter(Boolean);
  const contactLine = contactParts.map(escapeHtml).join(" &bull; ");

  const details = rows
    .map(([label, value], index) => {
      const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      const formatted = renderValueBadge(value);
      return `
      <tr style="background:${bg};">
        <td style="padding:12px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;">${escapeHtml(label)}</td>
        <td style="padding:12px 16px;color:#0f172a;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;">${formatted}</td>
      </tr>`;
    })
    .join("");

  const action = cta?.href
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px auto 12px;text-align:center;">
        <tr>
          <td align="center" style="border-radius:10px;background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);box-shadow:0 4px 12px rgba(2, 132, 199, 0.25);">
            <a href="${escapeHtml(cta.href)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.3px;border-radius:10px;">
              ${escapeHtml(cta.label)} &rarr;
            </a>
          </td>
        </tr>
       </table>`
    : "";

  const noteBox = note
    ? `<div style="margin-top:24px;padding:14px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;">
        <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Important Notice</div>
        <div style="font-size:12px;line-height:1.5;color:#334155;">${escapeHtml(note)}</div>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    
    <!-- Outer Card -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05),0 8px 10px -6px rgba(0,0,0,0.01);">
      
      <!-- Header Banner -->
      <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:26px 30px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td>
              <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;margin-bottom:6px;">
                ✚ ${escapeHtml(hospitalName)}
              </div>
              <h1 style="font-size:22px;font-weight:900;line-height:1.3;margin:0;color:#ffffff;letter-spacing:-0.3px;">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body Content -->
      <div style="padding:28px 30px;">
        <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 22px;font-weight:400;">
          ${escapeHtml(introduction)}
        </p>

        <!-- Details Grid Table -->
        ${
          rows.length
            ? `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;text-align:left;">
                  <tbody>
                    ${details}
                  </tbody>
                </table>
               </div>`
            : ""
        }

        <!-- CTA Button -->
        ${action}

        <!-- Security / Privacy Note -->
        ${noteBox}
      </div>

      <!-- Card Footer -->
      <div style="background:#f8fafc;padding:20px 30px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="font-size:13px;color:#0f172a;margin:0 0 4px;font-weight:800;letter-spacing:-0.2px;">
          ${escapeHtml(hospitalName)}
        </p>
        ${
          contactLine
            ? `<p style="font-size:11px;color:#64748b;margin:0 0 6px;line-height:1.45;font-weight:500;">
                ${contactLine}
               </p>`
            : ""
        }
        ${
          websiteUrl
            ? `<p style="font-size:11px;margin:0;font-weight:700;">
                <a href="${escapeHtml(websiteUrl)}" target="_blank" style="color:#0284c7;text-decoration:none;">
                  🌐 ${escapeHtml(websiteDisplay)}
                </a>
               </p>`
            : ""
        }
      </div>
    </div>

    <!-- Sub-footer Disclaimer -->
    <div style="text-align:center;margin-top:18px;padding:0 10px;">
      <p style="font-size:11px;line-height:1.5;color:#94a3b8;margin:0;">
        This automated email was dispatched by the hospital management notification system.
        <br>Please do not transmit personal health information or clinical details by replying directly to this message.
      </p>
    </div>

  </div>
</body>
</html>`;
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

export async function getHospitalInfo(admin: SupabaseClient): Promise<HospitalInfo> {
  const { data } = await admin
    .from("system_settings")
    .select("hospital_name, address, phone, email")
    .limit(1)
    .maybeSingle();

  return {
    hospitalName: data?.hospital_name || "HMS Hospital",
    address: data?.address || null,
    phone: data?.phone || null,
    email: data?.email || null,
    appUrl: APP_URL || null,
  };
}

export async function getHospitalName(admin: SupabaseClient): Promise<string> {
  const info = await getHospitalInfo(admin);
  return info.hospitalName;
}

async function updateDelivery(
  admin: SupabaseClient,
  deliveryId: string,
  payload: JsonRecord,
): Promise<void> {
  const { error } = await admin
    .from("email_deliveries")
    .update(payload)
    .eq("id", deliveryId);
  if (error) throw new EmailDeliveryError(`Could not persist email delivery state: ${error.message}`);
}

async function providerIdempotencyKey(value: string): Promise<string> {
  if (value.length <= 240) return value;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${value.slice(0, 160)}/${hash}`;
}

export function combineEmailErrors(errors: unknown[]): EmailDeliveryError {
  const deliveryErrors = errors.filter(
    (error): error is EmailDeliveryError => error instanceof EmailDeliveryError,
  );
  const retryableError = deliveryErrors.find((error) => error.retryable);
  const selected = retryableError ?? deliveryErrors[0];
  const messages = [...new Set(errors.map((error) =>
    error instanceof Error ? error.message : "Email delivery failed."
  ))];
  return new EmailDeliveryError(
    `${errors.length} recipient delivery${errors.length === 1 ? "" : "ies"} failed: ${messages.join("; ")}`,
    selected?.retryable ?? true,
    retryableError?.retryAfterMs,
  );
}

export async function sendEmail(admin: SupabaseClient, message: EmailMessage) {
  const recipient = message.recipient.trim().toLowerCase();
  const { data: existing, error: existingError } = await admin
    .from("email_deliveries")
    .select("id, status, provider_message_id")
    .eq("idempotency_key", message.idempotencyKey)
    .maybeSingle();
  if (existingError) throw new EmailDeliveryError(existingError.message);

  if (
    existing &&
    (existing.provider_message_id || !["queued", "failed"].includes(existing.status))
  ) {
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
    await updateDelivery(admin, deliveryId, deliveryPayload);
  } else {
    const { data, error } = await admin
      .from("email_deliveries")
      .insert(deliveryPayload)
      .select("id")
      .single();
    if (error) throw new EmailDeliveryError(error.message);
    deliveryId = data.id;
  }

  if (!deliveryId) {
    throw new EmailDeliveryError("Email delivery record did not return an identifier.");
  }
  const from = configuredFromAddress();
  if (!RESEND_API_KEY || !from) {
    const errorMessage = "Resend API key or sender address is not configured.";
    await updateDelivery(admin, deliveryId, {
      status: "failed",
      last_error: errorMessage,
    });
    throw new EmailDeliveryError(errorMessage, false);
  }

  let response: Response;
  try {
    await waitForSendSlot();
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": await providerIdempotencyKey(message.idempotencyKey),
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const detail = error instanceof Error
      ? `Resend request failed: ${error.message}`
      : "Resend request failed before a response was received.";
    await updateDelivery(admin, deliveryId, {
      status: "failed",
      last_error: detail,
    });
    throw new EmailDeliveryError(detail, true);
  }
  const responseBody = await response.json().catch(() => ({})) as JsonRecord;

  if (!response.ok || typeof responseBody.id !== "string") {
    const detail = typeof responseBody.message === "string"
      ? responseBody.message
      : `Resend returned HTTP ${response.status}.`;
    await updateDelivery(admin, deliveryId, {
      status: "failed",
      last_error: detail,
    });
    const retryable = response.status === 408 || response.status === 425 ||
      response.status === 429 || response.status >= 500;
    throw new EmailDeliveryError(
      detail,
      retryable,
      retryAfterMilliseconds(response),
    );
  }

  await updateDelivery(admin, deliveryId, {
    status: "sent",
    provider_message_id: responseBody.id,
    sent_at: new Date().toISOString(),
    last_error: null,
  });

  return { duplicate: false, providerMessageId: responseBody.id };
}

export async function sendEmails(
  admin: SupabaseClient,
  messages: EmailMessage[],
): Promise<void> {
  const errors: unknown[] = [];
  for (const message of messages) {
    try {
      await sendEmail(admin, message);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw combineEmailErrors(errors);
}
