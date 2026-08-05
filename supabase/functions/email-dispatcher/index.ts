import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.105.1";
import {
  APP_URL,
  emailLayout,
  getHospitalInfo,
  getHospitalName,
  plainText,
  sendEmail,
} from "../_shared/email.ts";
import type {
  JsonRecord,
  NotificationSettings,
} from "../_shared/notification-types.ts";
import { processDueJobs } from "./jobs.ts";
import { runScheduledDigests } from "./reports.ts";

async function loadSettings(admin: SupabaseClient): Promise<NotificationSettings | null> {
  const { data, error } = await admin
    .from("email_notification_settings")
    .select("*")
    .eq("singleton_key", true)
    .maybeSingle();
  if (error) throw error;
  return data as NotificationSettings | null;
}

async function verifyAdminCaller(ctx: {
  authMode: string;
  userClaims?: { sub?: string } | null;
  supabaseAdmin: SupabaseClient;
}): Promise<boolean> {
  if (ctx.authMode !== "user" || !ctx.userClaims?.sub) return false;
  const { data } = await ctx.supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", ctx.userClaims.sub)
    .maybeSingle();
  return data?.role === "ADMIN";
}

export default {
  fetch: withSupabase({ auth: ["user", "secret"] }, async (request, ctx) => {
    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }
    const body = await request.json().catch(() => ({})) as JsonRecord;
    const mode = body.mode === "test" ? "test" : "dispatch";
    const admin = ctx.supabaseAdmin;

    if (ctx.authMode === "user") {
      if (!(await verifyAdminCaller(ctx))) {
        return Response.json(
          { error: "Administrator access is required." },
          { status: 403 },
        );
      }
      if (mode !== "test") {
        return Response.json(
          { error: "Interactive callers may only send a test email." },
          { status: 403 },
        );
      }
    } else if (mode !== "dispatch") {
      return Response.json(
        { error: "Service callers may only run the dispatcher." },
        { status: 403 },
      );
    }

    try {
      const settings = await loadSettings(admin);
      if (!settings) {
        return Response.json(
          { error: "Notification settings were not found." },
          { status: 503 },
        );
      }
      const hospitalInfo = await getHospitalInfo(admin);
      const hospitalName = hospitalInfo.hospitalName;

      if (mode === "test") {
        if (!settings.manager_report_email) {
          return Response.json(
            { error: "Set a manager report email before sending a test." },
            { status: 400 },
          );
        }
        const html = emailLayout(
          hospitalInfo,
          "Email notifications are connected",
          "This test confirms that the hospital can send operational reminders and management reports through Resend.",
          [
            ["Timezone", settings.timezone],
            ["Recipient", settings.manager_report_email],
          ],
          APP_URL
            ? {
              label: "Open hospital settings",
              href: `${APP_URL}/hospital/settings`,
            }
            : undefined,
        );
        await sendEmail(admin, {
          notificationType: "configuration_test",
          recipient: settings.manager_report_email,
          subject: `${hospitalName}: Email notification test`,
          html,
          text: plainText(html),
          idempotencyKey: `configuration-test/${crypto.randomUUID()}`,
          metadata: { initiated_by: ctx.userClaims?.sub ?? null },
        });
        return Response.json({
          success: true,
          message: "Test email accepted by Resend.",
        });
      }

      if (!settings.enabled) {
        return Response.json({
          success: true,
          skipped: true,
          reason: "Email notifications are disabled.",
        });
      }

      const jobs = await processDueJobs(admin, settings, hospitalName);
      const scheduledEmails = await runScheduledDigests(
        admin,
        settings,
        hospitalName,
      );
      return Response.json({ success: true, jobs, scheduledEmails });
    } catch (error) {
      console.error("Email dispatcher failed", error);
      return Response.json(
        {
          error: error instanceof Error
            ? error.message
            : "Email dispatcher failed.",
        },
        { status: 500 },
      );
    }
  }),
};
