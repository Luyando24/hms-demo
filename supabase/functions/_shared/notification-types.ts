export type JsonRecord = Record<string, unknown>;

export interface NotificationSettings {
  enabled: boolean;
  manager_report_email: string | null;
  report_cc_emails: string[];
  timezone: string;
  appointment_confirmation_enabled: boolean;
  appointment_reminder_24h_enabled: boolean;
  appointment_reminder_2h_enabled: boolean;
  provider_schedule_enabled: boolean;
  provider_schedule_time: string;
  laboratory_digest_enabled: boolean;
  radiology_digest_enabled: boolean;
  clinical_digest_time: string;
  inventory_digest_enabled: boolean;
  inventory_digest_time: string;
  critical_stock_alerts_enabled: boolean;
  daily_report_enabled: boolean;
  daily_report_time: string;
  weekly_report_enabled: boolean;
  weekly_report_day: number;
  weekly_report_time: string;
  monthly_report_enabled: boolean;
  monthly_report_day: number;
  monthly_report_time: string;
}

export interface NotificationJob {
  id: string;
  notification_type: string;
  entity_type: string;
  entity_id: string;
  scheduled_for: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  payload: JsonRecord;
}

export interface EmailMessage {
  notificationType: string;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  jobId?: string;
  periodKey?: string;
  metadata?: JsonRecord;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}
