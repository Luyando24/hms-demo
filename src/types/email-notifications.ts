export interface EmailNotificationSettingsInput {
  enabled: boolean;
  manager_report_email: string;
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

export const DEFAULT_EMAIL_NOTIFICATION_SETTINGS: EmailNotificationSettingsInput = {
  enabled: false,
  manager_report_email: "",
  report_cc_emails: [],
  timezone: "Africa/Lusaka",
  appointment_confirmation_enabled: true,
  appointment_reminder_24h_enabled: true,
  appointment_reminder_2h_enabled: true,
  provider_schedule_enabled: true,
  provider_schedule_time: "06:30",
  laboratory_digest_enabled: true,
  radiology_digest_enabled: true,
  clinical_digest_time: "06:30",
  inventory_digest_enabled: true,
  inventory_digest_time: "08:00",
  critical_stock_alerts_enabled: true,
  daily_report_enabled: true,
  daily_report_time: "18:00",
  weekly_report_enabled: true,
  weekly_report_day: 1,
  weekly_report_time: "07:00",
  monthly_report_enabled: true,
  monthly_report_day: 1,
  monthly_report_time: "07:00",
};
