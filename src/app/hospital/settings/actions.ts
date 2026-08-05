'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import type { EmailNotificationSettingsInput } from '@/types/email-notifications';
import { createAdminClient } from '@/utils/supabase/admin';

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const optionalEmail = z
  .union([z.string().trim().email().max(254), z.literal('')])
  .transform((value) => value || null);

const notificationSettingsSchema = z
  .object({
    enabled: z.boolean(),
    manager_report_email: optionalEmail,
    report_cc_emails: z.array(z.string().trim().email().max(254)).max(10),
    timezone: z.enum([
      'Africa/Lusaka',
      'Africa/Harare',
      'Africa/Johannesburg',
      'Africa/Nairobi',
      'Africa/Lagos',
      'UTC',
    ]),
    appointment_confirmation_enabled: z.boolean(),
    appointment_reminder_24h_enabled: z.boolean(),
    appointment_reminder_2h_enabled: z.boolean(),
    provider_schedule_enabled: z.boolean(),
    provider_schedule_time: timeSchema,
    laboratory_digest_enabled: z.boolean(),
    radiology_digest_enabled: z.boolean(),
    clinical_digest_time: timeSchema,
    inventory_digest_enabled: z.boolean(),
    inventory_digest_time: timeSchema,
    critical_stock_alerts_enabled: z.boolean(),
    daily_report_enabled: z.boolean(),
    daily_report_time: timeSchema,
    weekly_report_enabled: z.boolean(),
    weekly_report_day: z.number().int().min(0).max(6),
    weekly_report_time: timeSchema,
    monthly_report_enabled: z.boolean(),
    monthly_report_day: z.number().int().min(1).max(28),
    monthly_report_time: timeSchema,
  })
  .strict()
  .superRefine((settings, context) => {
    const reportsEnabled =
      settings.daily_report_enabled ||
      settings.weekly_report_enabled ||
      settings.monthly_report_enabled;
    if (settings.enabled && reportsEnabled && !settings.manager_report_email) {
      context.addIssue({
        code: 'custom',
        path: ['manager_report_email'],
        message: 'Set the hospital manager email before enabling automated reports.',
      });
    }
  });

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'The submitted notification settings are invalid.';
  }
  if (error instanceof AuthorizationError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'The operation could not be completed.';
}

export async function updateEmailNotificationSettingsAction(
  input: EmailNotificationSettingsInput,
) {
  try {
    const { user } = await requireRole(['ADMIN']);
    const settings = notificationSettingsSchema.parse(input);
    const adminSupabase = createAdminClient();
    const payload = {
      ...settings,
      report_cc_emails: [...new Set(settings.report_cc_emails.map((email) => email.toLowerCase()))],
      manager_report_email: settings.manager_report_email?.toLowerCase() ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await adminSupabase
      .from('email_notification_settings')
      .upsert(
        { ...payload, singleton_key: true },
        { onConflict: 'singleton_key' },
      );
    if (error) throw error;

    revalidatePath('/hospital/settings');
    return { success: true };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function sendTestNotificationEmailAction() {
  try {
    const { supabase } = await requireRole(['ADMIN']);
    
    // First attempt: Invoke Edge Function
    const { data, error } = await supabase.functions.invoke('email-dispatcher', {
      body: { mode: 'test' },
    });

    if (!error && data && !data.error) {
      return {
        success: true,
        message: typeof data.message === 'string' ? data.message : 'Test email accepted for delivery.',
      };
    }

    // Fallback: If Edge Function returns non-2xx error, use Next.js server environment variables (process.env.RESEND_API_KEY)
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !resendFrom) {
      const functionErrMsg = error ? (typeof data?.error === 'string' ? data.error : error.message) : '';
      throw new Error(functionErrMsg || 'RESEND_API_KEY or RESEND_FROM_EMAIL is missing from environment.');
    }

    const adminSupabase = createAdminClient();
    const [{ data: settings }, { data: hospSettings }] = await Promise.all([
      adminSupabase.from('email_notification_settings').select('manager_report_email, timezone').eq('singleton_key', true).maybeSingle(),
      adminSupabase.from('system_settings').select('hospital_name').limit(1).maybeSingle(),
    ]);

    const recipient = settings?.manager_report_email;
    if (!recipient) {
      throw new Error('Set a hospital manager email in settings before sending a test email.');
    }

    const hospitalName = hospSettings?.hospital_name || 'HMS Hospital';
    const appUrl = (process.env.HMS_APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Email Test</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;margin:0;padding:24px;background-color:#f1f5f9;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="height:4px;background:linear-gradient(to right, #0284c7, #38bdf8, #0369a1);"></div>
    <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:24px 28px;">
      <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;margin-bottom:4px;">✚ ${hospitalName}</div>
      <h1 style="font-size:20px;font-weight:900;margin:0;color:#ffffff;">Email Notification Test</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="font-size:14px;line-height:1.6;color:#334155;margin:0 0 20px;">
        This test confirms that your hospital system is connected to Resend and ready to deliver operational reminders and management reports.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;font-size:13px;color:#475569;">
        <strong>Target Recipient:</strong> ${recipient}
      </div>
      ${appUrl ? `<p style="margin:24px 0 0;text-align:center;"><a href="${appUrl}/hospital/settings" style="display:inline-block;padding:12px 24px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:800;font-size:13px;">Open Settings &rarr;</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [recipient],
        subject: `${hospitalName}: Email Notification Test`,
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok || !resendData.id) {
      throw new Error(resendData.message || `Resend API returned HTTP ${resendRes.status}`);
    }

    await adminSupabase.from('email_deliveries').insert({
      notification_type: 'configuration_test',
      recipient_email: recipient,
      idempotency_key: `configuration-test-fallback-${Date.now()}`,
      subject: `${hospitalName}: Email Notification Test`,
      status: 'sent',
      provider_message_id: resendData.id,
      sent_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Test email accepted for delivery.',
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
