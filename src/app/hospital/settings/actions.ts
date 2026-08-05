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
    const { data, error } = await supabase.functions.invoke('email-dispatcher', {
      body: { mode: 'test' },
    });
    if (error) {
      throw new Error(
        typeof data?.error === 'string' ? data.error : error.message,
      );
    }
    if (data?.error) throw new Error(String(data.error));
    return {
      success: true,
      message: typeof data?.message === 'string'
        ? data.message
        : 'Test email accepted for delivery.',
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
