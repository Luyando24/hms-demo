"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import {
  sendTestNotificationEmailAction,
  updateEmailNotificationSettingsAction,
} from "@/app/hospital/settings/actions";
import StatusModal from "@/components/hospital/StatusModal";
import {
  DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  type EmailNotificationSettingsInput,
} from "@/types/email-notifications";
import { createClient } from "@/utils/supabase/client";

interface EmailDeliverySummary {
  id: string;
  notification_type: string;
  recipient_email: string;
  status: string;
  subject: string;
  created_at: string;
}

interface EmailNotificationSettingsPanelProps {
  canEdit: boolean;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TIMEZONES = [
  "Africa/Lusaka",
  "Africa/Harare",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Lagos",
  "UTC",
];

function normalizeTime(value: string | null | undefined, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
}

function Toggle({
  checked,
  disabled,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span>
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
      />
    </label>
  );
}

export function EmailNotificationSettingsPanel({
  canEdit,
}: EmailNotificationSettingsPanelProps) {
  const [form, setForm] = useState<EmailNotificationSettingsInput>(
    DEFAULT_EMAIL_NOTIFICATION_SETTINGS,
  );
  const [deliveries, setDeliveries] = useState<EmailDeliverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    if (!canEdit) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const [{ data: settings, error: settingsError }, { data: recentDeliveries }] =
      await Promise.all([
        supabase
          .from("email_notification_settings")
          .select("*")
          .eq("singleton_key", true)
          .maybeSingle(),
        supabase
          .from("email_deliveries")
          .select("id, notification_type, recipient_email, status, subject, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

    if (settingsError) {
      setStatus({
        type: "error",
        title: "Notification Settings Unavailable",
        message: settingsError.message,
      });
    } else if (settings) {
      setForm({
        enabled: settings.enabled,
        manager_report_email: settings.manager_report_email || "",
        report_cc_emails: settings.report_cc_emails || [],
        timezone: settings.timezone,
        appointment_confirmation_enabled: settings.appointment_confirmation_enabled,
        appointment_reminder_24h_enabled: settings.appointment_reminder_24h_enabled,
        appointment_reminder_2h_enabled: settings.appointment_reminder_2h_enabled,
        provider_schedule_enabled: settings.provider_schedule_enabled,
        provider_schedule_time: normalizeTime(
          settings.provider_schedule_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.provider_schedule_time,
        ),
        laboratory_digest_enabled: settings.laboratory_digest_enabled,
        radiology_digest_enabled: settings.radiology_digest_enabled,
        clinical_digest_time: normalizeTime(
          settings.clinical_digest_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.clinical_digest_time,
        ),
        inventory_digest_enabled: settings.inventory_digest_enabled,
        inventory_digest_time: normalizeTime(
          settings.inventory_digest_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.inventory_digest_time,
        ),
        critical_stock_alerts_enabled: settings.critical_stock_alerts_enabled,
        daily_report_enabled: settings.daily_report_enabled,
        daily_report_time: normalizeTime(
          settings.daily_report_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.daily_report_time,
        ),
        weekly_report_enabled: settings.weekly_report_enabled,
        weekly_report_day: settings.weekly_report_day,
        weekly_report_time: normalizeTime(
          settings.weekly_report_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.weekly_report_time,
        ),
        monthly_report_enabled: settings.monthly_report_enabled,
        monthly_report_day: settings.monthly_report_day,
        monthly_report_time: normalizeTime(
          settings.monthly_report_time,
          DEFAULT_EMAIL_NOTIFICATION_SETTINGS.monthly_report_time,
        ),
      });
    }
    setDeliveries((recentDeliveries || []) as EmailDeliverySummary[]);
    setLoading(false);
  }, [canEdit]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadSettings(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSettings]);

  const update = <Key extends keyof EmailNotificationSettingsInput>(
    key: Key,
    value: EmailNotificationSettingsInput[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await updateEmailNotificationSettingsAction(form);
    setSaving(false);
    if (!result.success) {
      setStatus({
        type: "error",
        title: "Notification Settings Not Saved",
        message: result.error || "The notification settings could not be saved.",
      });
      return;
    }
    setStatus({
      type: "success",
      title: "Email Settings Saved",
      message: form.enabled
        ? "The scheduler will now use these reminder and report preferences."
        : "Preferences were saved. Email delivery remains disabled.",
    });
    await loadSettings();
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await sendTestNotificationEmailAction();
    setTesting(false);
    if (!result.success) {
      setStatus({
        type: "error",
        title: "Test Email Failed",
        message: result.error || "The test email could not be sent.",
      });
      return;
    }
    setStatus({
      type: "success",
      title: "Test Email Sent",
      message: result.message || "The test email was accepted for delivery.",
    });
    await loadSettings();
  };

  if (!canEdit) return null;
  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-400 shadow-sm">
        <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
        Loading email notification settings...
      </section>
    );
  }

  const controlsDisabled = !form.enabled || !canEdit;
  const statusStyles: Record<string, string> = {
    sent: "bg-blue-50 text-blue-700",
    delivered: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
    bounced: "bg-rose-50 text-rose-700",
    complained: "bg-amber-50 text-amber-700",
    suppressed: "bg-amber-50 text-amber-700",
    delivery_delayed: "bg-amber-50 text-amber-700",
    queued: "bg-slate-100 text-slate-600",
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-8">
        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BellRing size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Email Notifications & Reports</h2>
                <p className="text-xs font-medium text-slate-500">
                  Resend delivery for patient reminders, staff digests, and manager reports.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => update("enabled", event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Enable email delivery
            </label>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-800">
            Email messages contain operational summaries and secure dashboard links. Clinical notes,
            diagnoses, appointment reasons, and test results are intentionally excluded.
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-700">
                Hospital manager email
              </label>
              <input
                type="email"
                value={form.manager_report_email}
                onChange={(event) => update("manager_report_email", event.target.value)}
                placeholder="manager@hospital.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-700">
                Report CC addresses
              </label>
              <input
                type="text"
                value={form.report_cc_emails.join(", ")}
                onChange={(event) =>
                  update(
                    "report_cc_emails",
                    event.target.value
                      .split(",")
                      .map((email) => email.trim())
                      .filter(Boolean),
                  )}
                placeholder="finance@hospital.com, board@hospital.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-700">
                Hospital timezone
              </label>
              <select
                value={form.timezone}
                onChange={(event) => update("timezone", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-brand-500/20"
              >
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Mail size={20} className="text-brand-600" />
            <div>
              <h2 className="text-lg font-black text-slate-900">Patient & Staff Reminders</h2>
              <p className="text-xs font-medium text-slate-500">Choose which operational messages are sent.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Toggle
              checked={form.appointment_confirmation_enabled}
              disabled={controlsDisabled}
              label="Appointment confirmations"
              description="Send confirmation and rescheduling emails to patients."
              onChange={(checked) => update("appointment_confirmation_enabled", checked)}
            />
            <Toggle
              checked={form.appointment_reminder_24h_enabled}
              disabled={controlsDisabled}
              label="24-hour reminders"
              description="Remind patients one day before scheduled appointments."
              onChange={(checked) => update("appointment_reminder_24h_enabled", checked)}
            />
            <Toggle
              checked={form.appointment_reminder_2h_enabled}
              disabled={controlsDisabled}
              label="2-hour reminders"
              description="Send a final reminder shortly before the appointment."
              onChange={(checked) => update("appointment_reminder_2h_enabled", checked)}
            />
            <Toggle
              checked={form.critical_stock_alerts_enabled}
              disabled={controlsDisabled}
              label="Critical stock-out alerts"
              description="Notify pharmacists and the manager when stock reaches zero."
              onChange={(checked) => update("critical_stock_alerts_enabled", checked)}
            />
            <Toggle
              checked={form.provider_schedule_enabled}
              disabled={controlsDisabled}
              label="Provider schedule digest"
              description="Send doctors their appointment count for the day."
              onChange={(checked) => update("provider_schedule_enabled", checked)}
            />
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-bold text-slate-900">Provider schedule time</label>
              <input
                type="time"
                value={form.provider_schedule_time}
                disabled={controlsDisabled || !form.provider_schedule_enabled}
                onChange={(event) => update("provider_schedule_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
            <Toggle
              checked={form.laboratory_digest_enabled}
              disabled={controlsDisabled}
              label="Laboratory worklist digest"
              description="Send laboratory staff a count of pending orders."
              onChange={(checked) => update("laboratory_digest_enabled", checked)}
            />
            <Toggle
              checked={form.radiology_digest_enabled}
              disabled={controlsDisabled}
              label="Radiology worklist digest"
              description="Send radiology staff a count of pending orders."
              onChange={(checked) => update("radiology_digest_enabled", checked)}
            />
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-bold text-slate-900">Clinical worklist time</label>
              <input
                type="time"
                value={form.clinical_digest_time}
                disabled={controlsDisabled}
                onChange={(event) => update("clinical_digest_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
            <Toggle
              checked={form.inventory_digest_enabled}
              disabled={controlsDisabled}
              label="Daily low-stock digest"
              description="Send items at or below their reorder level."
              onChange={(checked) => update("inventory_digest_enabled", checked)}
            />
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="text-sm font-bold text-slate-900">Inventory digest time</label>
              <input
                type="time"
                value={form.inventory_digest_time}
                disabled={controlsDisabled || !form.inventory_digest_enabled}
                onChange={(event) => update("inventory_digest_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <Clock3 size={20} className="text-emerald-600" />
            <div>
              <h2 className="text-lg font-black text-slate-900">Manager Report Schedule</h2>
              <p className="text-xs font-medium text-slate-500">Aggregate operational and financial summaries without patient-identifying details.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <Toggle
                checked={form.daily_report_enabled}
                disabled={controlsDisabled}
                label="Daily report"
                description="Current-day activity and exceptions."
                onChange={(checked) => update("daily_report_enabled", checked)}
              />
              <input
                type="time"
                value={form.daily_report_time}
                disabled={controlsDisabled || !form.daily_report_enabled}
                onChange={(event) => update("daily_report_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <Toggle
                checked={form.weekly_report_enabled}
                disabled={controlsDisabled}
                label="Weekly report"
                description="Previous seven-day management summary."
                onChange={(checked) => update("weekly_report_enabled", checked)}
              />
              <select
                value={form.weekly_report_day}
                disabled={controlsDisabled || !form.weekly_report_enabled}
                onChange={(event) => update("weekly_report_day", Number(event.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {WEEKDAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
              <input
                type="time"
                value={form.weekly_report_time}
                disabled={controlsDisabled || !form.weekly_report_enabled}
                onChange={(event) => update("weekly_report_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <Toggle
                checked={form.monthly_report_enabled}
                disabled={controlsDisabled}
                label="Monthly report"
                description="Previous calendar-month executive summary."
                onChange={(checked) => update("monthly_report_enabled", checked)}
              />
              <label className="block text-xs font-bold text-slate-600">
                Day of month
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.monthly_report_day}
                  disabled={controlsDisabled || !form.monthly_report_enabled}
                  onChange={(event) => update("monthly_report_day", Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                />
              </label>
              <input
                type="time"
                value={form.monthly_report_time}
                disabled={controlsDisabled || !form.monthly_report_enabled}
                onChange={(event) => update("monthly_report_time", event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col justify-end gap-3 sm:flex-row">
          <button
            type="button"
            disabled={testing || !form.manager_report_email}
            onClick={handleTest}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Send Test Email
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-500/20 transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            Save Email Settings
          </button>
        </div>
      </form>

      <section className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900">Recent Email Delivery</h2>
          <p className="text-xs font-medium text-slate-500">Latest Resend delivery and failure states.</p>
        </div>
        {!deliveries.length ? (
          <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
            No notification emails have been recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {deliveries.map((delivery) => (
              <div key={delivery.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{delivery.subject}</p>
                  <p className="truncate text-xs text-slate-500">{delivery.recipient_email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[delivery.status] || "bg-slate-100 text-slate-600"}`}>
                    {delivery.status.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(delivery.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <StatusModal
        isOpen={!!status}
        type={status?.type || "success"}
        title={status?.title || ""}
        message={status?.message || ""}
        onClose={() => setStatus(null)}
      />
    </>
  );
}
