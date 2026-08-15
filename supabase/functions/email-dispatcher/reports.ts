import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.105.1";
import {
  APP_URL,
  addLocalDays,
  combineEmailErrors,
  emailLayout,
  getZonedParts,
  isPastConfiguredTime,
  localDateKey,
  plainText,
  sendEmails,
  zonedDateToUtc,
} from "../_shared/email.ts";
import type {
  EmailMessage,
  JsonRecord,
  NotificationSettings,
  ZonedParts,
} from "../_shared/notification-types.ts";

async function roleRecipients(admin: SupabaseClient, roles: string[]): Promise<string[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("email")
    .in("role", roles)
    .not("email", "is", null);
  if (error) throw error;
  return [...new Set(
    (data ?? []).map((row) => String(row.email).trim().toLowerCase()).filter(Boolean),
  )];
}

async function countInPeriod(
  admin: SupabaseClient,
  table: string,
  column: string,
  start: string,
  end: string,
): Promise<number> {
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte(column, start)
    .lt(column, end);
  if (error) throw error;
  return count ?? 0;
}

async function fetchPeriodRows(
  admin: SupabaseClient,
  table: string,
  columns: string,
  dateColumn: string,
  start: string,
  end: string,
): Promise<JsonRecord[]> {
  const pageSize = 1000;
  const rows: JsonRecord[] = [];
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .gte(dateColumn, start)
      .lt(dateColumn, end)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as JsonRecord[]));
    if ((data?.length ?? 0) < pageSize) break;
  }
  return rows;
}

async function buildManagerMetrics(
  admin: SupabaseClient,
  start: string,
  end: string,
) {
  const [
    appointments,
    patients,
    admissions,
    discharges,
    walkins,
    labOrders,
    radiologyOrders,
    invoiceRows,
    expenseRows,
    payrollRows,
    bedsResult,
    inventoryResult,
  ] = await Promise.all([
    countInPeriod(admin, "appointments", "appointment_date", start, end),
    countInPeriod(admin, "patients", "created_at", start, end),
    countInPeriod(admin, "admissions", "admission_date", start, end),
    countInPeriod(admin, "admissions", "discharge_date", start, end),
    countInPeriod(admin, "walkin_queue", "check_in_time", start, end),
    countInPeriod(admin, "lab_orders", "created_at", start, end),
    countInPeriod(admin, "radiology_orders", "created_at", start, end),
    fetchPeriodRows(admin, "invoices", "total_amount, paid_amount", "created_at", start, end),
    fetchPeriodRows(admin, "expenses", "amount", "created_at", start, end),
    fetchPeriodRows(admin, "payroll_records", "net_salary", "created_at", start, end),
    admin.from("beds").select("status"),
    admin.from("inventory_items").select("stock_level, reorder_level"),
  ]);
  if (bedsResult.error) throw bedsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const billed = invoiceRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const collected = invoiceRows.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0);
  const expenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const payroll = payrollRows.reduce((sum, row) => sum + Number(row.net_salary || 0), 0);
  const beds = bedsResult.data ?? [];
  const occupiedBeds = beds.filter((bed) => bed.status === "OCCUPIED").length;
  const inventory = inventoryResult.data ?? [];
  const lowStock = inventory.filter(
    (item) => Number(item.stock_level || 0) <= Number(item.reorder_level || 0),
  ).length;
  const stockOuts = inventory.filter((item) => Number(item.stock_level || 0) <= 0).length;

  return {
    appointments,
    patients,
    admissions,
    discharges,
    walkins,
    labOrders,
    radiologyOrders,
    billed,
    collected,
    outstanding: Math.max(0, billed - collected),
    expenses,
    payroll,
    operatingMargin: collected - expenses - payroll,
    occupancyRate: beds.length ? Math.round((occupiedBeds / beds.length) * 100) : 0,
    lowStock,
    stockOuts,
  };
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-ZM", { maximumFractionDigits: 2 }).format(value);
}

async function sendManagerReport(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  reportType: "daily" | "weekly" | "monthly",
  periodKey: string,
  start: Date,
  end: Date,
) {
  if (!settings.manager_report_email) return 0;
  const metrics = await buildManagerMetrics(admin, start.toISOString(), end.toISOString());
  const reportName = `${reportType[0].toUpperCase()}${reportType.slice(1)} management report`;
  const rows: Array<[string, string | number]> = [
    ["Appointments", metrics.appointments],
    ["New patient records", metrics.patients],
    ["Walk-in visits", metrics.walkins],
    ["Admissions / discharges", `${metrics.admissions} / ${metrics.discharges}`],
    ["Current bed occupancy", `${metrics.occupancyRate}%`],
    ["Laboratory / radiology orders", `${metrics.labOrders} / ${metrics.radiologyOrders}`],
    ["Revenue billed", currency(metrics.billed)],
    ["Revenue collected", currency(metrics.collected)],
    ["Outstanding revenue", currency(metrics.outstanding)],
    ["Expenses / payroll", `${currency(metrics.expenses)} / ${currency(metrics.payroll)}`],
    ["Operating margin estimate", currency(metrics.operatingMargin)],
    ["Low-stock / stock-out items", `${metrics.lowStock} / ${metrics.stockOuts}`],
  ];
  const html = emailLayout(
    hospitalName,
    reportName,
    `Aggregate hospital activity for ${periodKey}. No patient-identifying clinical data is included.`,
    rows,
    APP_URL
      ? { label: "Open reports dashboard", href: `${APP_URL}/hospital/reports` }
      : undefined,
  );
  const recipients = [...new Set([
    settings.manager_report_email.toLowerCase(),
    ...(settings.report_cc_emails ?? []).map((email) => email.toLowerCase()),
  ])];
  await sendEmails(admin, recipients.map((recipient): EmailMessage => ({
      notificationType: `manager_${reportType}_report`,
      recipient,
      subject: `${hospitalName}: ${reportName} — ${periodKey}`,
      html,
      text: plainText(html),
      idempotencyKey: `manager-report/${reportType}/${periodKey}/${recipient}`,
      periodKey,
      metadata: {
        report_type: reportType,
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })));
  return recipients.length;
}

async function sendProviderSchedules(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  parts: ZonedParts,
) {
  if (
    !settings.provider_schedule_enabled ||
    !isPastConfiguredTime(parts, settings.provider_schedule_time)
  ) return 0;

  const dateKey = localDateKey(parts);
  const start = zonedDateToUtc(parts.year, parts.month, parts.day, settings.timezone);
  const next = addLocalDays(parts, 1);
  const end = zonedDateToUtc(next.year, next.month, next.day, settings.timezone);
  const { data: providers, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("role", "DOCTOR")
    .not("email", "is", null);
  if (error) throw error;
  const messages: EmailMessage[] = [];
  for (const provider of providers ?? []) {
    const { count, error: countError } = await admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .gte("appointment_date", start.toISOString())
      .lt("appointment_date", end.toISOString())
      .neq("status", "CANCELLED");
    if (countError) throw countError;
    if (!count) continue;
    const name =
      `${provider.first_name || ""} ${provider.last_name || ""}`.trim() ||
      "Doctor";
    const html = emailLayout(
      hospitalName,
      "Today's appointment schedule",
      `Good morning ${name}. Your schedule is ready in the secure hospital workspace.`,
      [["Scheduled appointments", count], ["Schedule date", dateKey]],
      APP_URL
        ? { label: "Open OPD dashboard", href: `${APP_URL}/hospital/opd` }
        : undefined,
      "Patient names and clinical details are intentionally omitted from email.",
    );
    messages.push({
      notificationType: "provider_daily_schedule",
      recipient: provider.email,
      subject: `${hospitalName}: Today's appointment schedule`,
      html,
      text: plainText(html),
      idempotencyKey: `provider-schedule/${dateKey}/${provider.id}`,
      periodKey: dateKey,
      metadata: { provider_id: provider.id, appointment_count: count },
    });
  }
  await sendEmails(admin, messages);
  return messages.length;
}

async function sendClinicalDigest(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  parts: ZonedParts,
  area: "laboratory" | "radiology",
) {
  const enabled = area === "laboratory"
    ? settings.laboratory_digest_enabled
    : settings.radiology_digest_enabled;
  if (!enabled || !isPastConfiguredTime(parts, settings.clinical_digest_time)) return 0;

  const dateKey = localDateKey(parts);
  const table = area === "laboratory" ? "lab_orders" : "radiology_orders";
  const role = area === "laboratory" ? "LAB_TECH" : "RADIOLOGIST";
  const path = area === "laboratory" ? "/hospital/laboratory" : "/hospital/radiology";
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .neq("status", "COMPLETED")
    .neq("status", "CANCELLED");
  if (error) throw error;
  if (!count) return 0;
  const recipients = await roleRecipients(admin, [role]);
  const messages: EmailMessage[] = [];
  for (const recipient of recipients) {
    const title = `${area === "laboratory" ? "Laboratory" : "Radiology"} worklist summary`;
    const html = emailLayout(
      hospitalName,
      title,
      "Pending work is available in the secure hospital workspace.",
      [["Pending orders", count], ["Summary date", dateKey]],
      APP_URL ? { label: "Open worklist", href: `${APP_URL}${path}` } : undefined,
      "Patient names and clinical details are intentionally omitted from email.",
    );
    messages.push({
      notificationType: `${area}_daily_digest`,
      recipient,
      subject: `${hospitalName}: ${title}`,
      html,
      text: plainText(html),
      idempotencyKey: `${area}-digest/${dateKey}/${recipient}`,
      periodKey: dateKey,
      metadata: { pending_count: count },
    });
  }
  await sendEmails(admin, messages);
  return recipients.length;
}

async function sendInventoryDigest(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
  parts: ZonedParts,
) {
  if (
    !settings.inventory_digest_enabled ||
    !isPastConfiguredTime(parts, settings.inventory_digest_time)
  ) return 0;
  const dateKey = localDateKey(parts);
  const { data, error } = await admin
    .from("inventory_items")
    .select("name, stock_level, reorder_level, unit")
    .order("stock_level", { ascending: true });
  if (error) throw error;
  const lowItems = (data ?? []).filter(
    (item) => Number(item.stock_level || 0) <= Number(item.reorder_level || 0),
  );
  if (!lowItems.length) return 0;

  const pharmacists = await roleRecipients(admin, ["PHARMACIST"]);
  const recipients = [...new Set([
    ...pharmacists,
    ...(settings.manager_report_email
      ? [settings.manager_report_email.toLowerCase()]
      : []),
  ])];
  const rows = lowItems.slice(0, 20).map((item) => [
    item.name,
    `${item.stock_level ?? 0} ${item.unit || "units"} (reorder at ${item.reorder_level ?? 0})`,
  ] as [string, string]);
  if (lowItems.length > 20) {
    rows.push(["Additional low-stock items", String(lowItems.length - 20)]);
  }
  const html = emailLayout(
    hospitalName,
    "Daily low-stock digest",
    `${lowItems.length} item${lowItems.length === 1 ? " is" : "s are"} at or below the configured reorder level.`,
    rows,
    APP_URL
      ? { label: "Open inventory", href: `${APP_URL}/hospital/inventory` }
      : undefined,
  );
  await sendEmails(admin, recipients.map((recipient): EmailMessage => ({
      notificationType: "inventory_daily_digest",
      recipient,
      subject: `${hospitalName}: ${lowItems.length} low-stock item${lowItems.length === 1 ? "" : "s"}`,
      html,
      text: plainText(html),
      idempotencyKey: `inventory-digest/${dateKey}/${recipient}`,
      periodKey: dateKey,
      metadata: { low_stock_count: lowItems.length },
    })));
  return recipients.length;
}

export async function runScheduledDigests(
  admin: SupabaseClient,
  settings: NotificationSettings,
  hospitalName: string,
) {
  const now = new Date();
  const parts = getZonedParts(now, settings.timezone);
  const dateKey = localDateKey(parts);
  let sent = 0;
  const failures: unknown[] = [];
  const run = async (task: () => Promise<number>) => {
    try {
      sent += await task();
    } catch (error) {
      failures.push(error);
    }
  };

  await run(() => sendProviderSchedules(admin, settings, hospitalName, parts));
  await run(() => sendClinicalDigest(admin, settings, hospitalName, parts, "laboratory"));
  await run(() => sendClinicalDigest(admin, settings, hospitalName, parts, "radiology"));
  await run(() => sendInventoryDigest(admin, settings, hospitalName, parts));

  if (settings.daily_report_enabled && isPastConfiguredTime(parts, settings.daily_report_time)) {
    const start = zonedDateToUtc(parts.year, parts.month, parts.day, settings.timezone);
    await run(() => sendManagerReport(admin, settings, hospitalName, "daily", dateKey, start, now));
  }

  if (
    settings.weekly_report_enabled &&
    parts.weekday === settings.weekly_report_day &&
    isPastConfiguredTime(parts, settings.weekly_report_time)
  ) {
    const startParts = addLocalDays(parts, -7);
    const start = zonedDateToUtc(
      startParts.year,
      startParts.month,
      startParts.day,
      settings.timezone,
    );
    const end = zonedDateToUtc(parts.year, parts.month, parts.day, settings.timezone);
    await run(() => sendManagerReport(
      admin,
      settings,
      hospitalName,
      "weekly",
      `${localDateKey(startParts)} to ${dateKey}`,
      start,
      end,
    ));
  }

  if (
    settings.monthly_report_enabled &&
    parts.day === settings.monthly_report_day &&
    isPastConfiguredTime(parts, settings.monthly_report_time)
  ) {
    const end = zonedDateToUtc(parts.year, parts.month, 1, settings.timezone);
    const previousMonth = new Date(Date.UTC(parts.year, parts.month - 2, 1));
    const start = zonedDateToUtc(
      previousMonth.getUTCFullYear(),
      previousMonth.getUTCMonth() + 1,
      1,
      settings.timezone,
    );
    const monthKey =
      `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;
    await run(() => sendManagerReport(
      admin,
      settings,
      hospitalName,
      "monthly",
      monthKey,
      start,
      end,
    ));
  }

  if (failures.length) throw combineEmailErrors(failures);
  return sent;
}
