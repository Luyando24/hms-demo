export interface PayslipEmailData {
  hospitalName: string;
  brandTitle?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  hospitalAddress?: string | null;
  hospitalPhone?: string | null;
  hospitalEmail?: string | null;
  currencySymbol: string;
  currencyPosition?: 'prefix' | 'suffix';
  recipientName: string;
  recipientEmail: string;
  staffNumber?: string | null;
  role: string;
  department?: string | null;
  payPeriod: string;
  disbursedAt: string;
  paymentMethod: string;
  baseSalary: number;
  allowances: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  payslipId?: string;
  portalUrl?: string;
}

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatAmount(amount: number, symbol: string, position: 'prefix' | 'suffix' = 'prefix'): string {
  const formatted = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return position === 'suffix' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

export function generatePayslipHtml(data: PayslipEmailData): string {
  const brand = data.brandTitle || data.hospitalName || 'HMS Medical Facility';
  const pos = data.currencyPosition || 'prefix';
  const sym = data.currencySymbol || '$';
  const portalLink = data.portalUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://kundahealthcare.org/';

  const baseFormatted = formatAmount(data.baseSalary, sym, pos);
  const allowancesFormatted = formatAmount(data.allowances, sym, pos);
  const grossFormatted = formatAmount(data.grossSalary, sym, pos);
  const deductionsFormatted = formatAmount(data.deductions, sym, pos);
  const netFormatted = formatAmount(data.netSalary, sym, pos);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Salary Payslip - ${escapeHtml(data.payPeriod)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:24px 0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <center>
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);margin:0 auto;border:1px solid #e2e8f0;">
      
      <!-- Top Brand Bar -->
      <tr>
        <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 32px;color:#ffffff;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                ${data.logoUrl ? `
                  <img src="${escapeHtml(data.logoUrl)}" alt="${escapeHtml(brand)}" width="48" height="48" style="border-radius:10px;background:#ffffff;padding:2px;display:block;margin-bottom:12px;object-fit:contain;" />
                ` : ''}
                <h1 style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;">
                  ${escapeHtml(brand)}
                </h1>
                ${data.tagline ? `<p style="margin:4px 0 0 0;font-size:12px;color:#94a3b8;font-weight:500;">${escapeHtml(data.tagline)}</p>` : ''}
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;padding:6px 14px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#34d399;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-radius:9999px;">
                  Official Payslip
                </span>
                <p style="margin:8px 0 0 0;font-size:12px;font-weight:700;color:#cbd5e1;">${escapeHtml(data.payPeriod)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Greeting & Notice -->
      <tr>
        <td style="padding:28px 32px 16px 32px;">
          <p style="margin:0 0 6px 0;font-size:15px;color:#0f172a;font-weight:700;">
            Dear ${escapeHtml(data.recipientName)},
          </p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
            Your salary disbursement for the period <strong>${escapeHtml(data.payPeriod)}</strong> has been processed successfully. Below is your itemized salary calculation and payment breakdown.
          </p>
        </td>
      </tr>

      <!-- Employee Info Summary Card -->
      <tr>
        <td style="padding:0 32px 20px 32px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;">
            <tr>
              <td width="50%" style="padding:4px 8px;vertical-align:top;">
                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:700;display:block;">Staff Member</span>
                <span style="font-size:13px;font-weight:800;color:#0f172a;display:block;margin-top:2px;">${escapeHtml(data.recipientName)}</span>
                <span style="font-size:11px;font-weight:600;color:#64748b;">ID: ${escapeHtml(data.staffNumber || 'HMS-STAFF')}</span>
              </td>
              <td width="50%" style="padding:4px 8px;vertical-align:top;">
                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:700;display:block;">Designation & Role</span>
                <span style="font-size:13px;font-weight:800;color:#0f172a;display:block;margin-top:2px;">${escapeHtml(data.role)}</span>
                <span style="font-size:11px;font-weight:600;color:#64748b;">${escapeHtml(data.department || 'Clinical / Hospital Dept')}</span>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding:10px 8px 4px 8px;vertical-align:top;border-top:1px solid #f1f5f9;">
                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:700;display:block;">Disbursal Date</span>
                <span style="font-size:12px;font-weight:700;color:#334155;display:block;margin-top:2px;">${escapeHtml(data.disbursedAt)}</span>
              </td>
              <td width="50%" style="padding:10px 8px 4px 8px;vertical-align:top;border-top:1px solid #f1f5f9;">
                <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:700;display:block;">Payment Channel</span>
                <span style="font-size:12px;font-weight:700;color:#334155;display:block;margin-top:2px;">${escapeHtml(data.paymentMethod.replace(/_/g, ' '))}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Itemized Salary Table -->
      <tr>
        <td style="padding:0 32px 24px 32px;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th align="left" style="padding:10px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Description / Component</th>
                <th align="right" style="padding:10px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">Basic / Base Salary</td>
                <td align="right" style="padding:12px 16px;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #f1f5f9;">${escapeHtml(baseFormatted)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;">Allowances & Clinical Benefits</td>
                <td align="right" style="padding:12px 16px;font-size:13px;font-weight:700;color:#059669;border-bottom:1px solid #f1f5f9;">+${escapeHtml(allowancesFormatted)}</td>
              </tr>
              <tr style="background:#fafafa;">
                <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">Total Gross Earnings</td>
                <td align="right" style="padding:12px 16px;font-size:13px;font-weight:800;color:#0f172a;border-bottom:1px solid #e2e8f0;">${escapeHtml(grossFormatted)}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:13px;color:#dc2626;border-bottom:1px solid #e2e8f0;">Statutory Deductions & Taxes</td>
                <td align="right" style="padding:12px 16px;font-size:13px;font-weight:700;color:#dc2626;border-bottom:1px solid #e2e8f0;">-${escapeHtml(deductionsFormatted)}</td>
              </tr>
              
              <!-- NET SALARY HIGHLIGHT -->
              <tr style="background:#0f172a;color:#ffffff;">
                <td style="padding:16px;font-size:14px;font-weight:800;color:#ffffff;letter-spacing:-0.2px;">
                  NET SALARY DISBURSED
                  <span style="display:block;font-size:10px;font-weight:500;color:#94a3b8;margin-top:2px;">Credited via ${escapeHtml(data.paymentMethod.replace(/_/g, ' '))}</span>
                </td>
                <td align="right" style="padding:16px;font-size:18px;font-weight:900;color:#34d399;letter-spacing:-0.5px;">
                  ${escapeHtml(netFormatted)}
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>

      <!-- Action Button to Portal -->
      <tr>
        <td align="center" style="padding:0 32px 28px 32px;">
          <a href="${escapeHtml(portalLink)}" target="_blank" style="display:inline-block;padding:12px 28px;background:#0f172a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,0.2);">
            View in Staff Personnel Portal →
          </a>
        </td>
      </tr>

      <!-- Footer & Disclaimers -->
      <tr>
        <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;line-height:1.6;">
          <p style="margin:0 0 6px 0;font-weight:700;color:#64748b;">
            ${escapeHtml(brand)} • Human Resources & Payroll Office
          </p>
          ${data.hospitalAddress ? `<p style="margin:0 0 4px 0;">${escapeHtml(data.hospitalAddress)}</p>` : ''}
          ${data.hospitalPhone || data.hospitalEmail ? `
            <p style="margin:0 0 8px 0;">
              ${data.hospitalPhone ? `Phone: ${escapeHtml(data.hospitalPhone)} ` : ''}
              ${data.hospitalEmail ? `• Email: ${escapeHtml(data.hospitalEmail)}` : ''}
            </p>
          ` : ''}
          <p style="margin:8px 0 0 0;font-size:10px;color:#cbd5e1;border-top:1px dashed #e2e8f0;padding-top:8px;">
            Confidential Notice: This electronic payslip contains privileged financial data intended solely for ${escapeHtml(data.recipientName)}. If received in error, please notify HR immediately.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
}

export async function sendPayslipEmailViaResend(data: PayslipEmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'updates@kundahealthcare.org';
  const fromName = data.brandTitle || data.hospitalName || 'HMS - Payroll';

  if (!apiKey) {
    console.warn('[PayslipEmail] RESEND_API_KEY is not configured in environment.');
    return {
      success: false,
      error: 'RESEND_API_KEY is not configured.',
    };
  }

  if (!data.recipientEmail || !data.recipientEmail.includes('@')) {
    return {
      success: false,
      error: `Invalid recipient email: ${data.recipientEmail || 'None provided'}`,
    };
  }

  try {
    const html = generatePayslipHtml(data);
    const subject = `Official Payslip - ${data.payPeriod} | ${data.hospitalName || 'Hospital'}`;

    const senderHeader = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: senderHeader,
        to: [data.recipientEmail],
        subject,
        html,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = resData?.message || resData?.error || `HTTP ${res.status}`;
      console.warn(`[PayslipEmail] Resend API rejected message to ${data.recipientEmail}:`, errMsg);
      return {
        success: false,
        error: `Resend error: ${errMsg}`,
      };
    }

    return {
      success: true,
      messageId: resData?.id,
    };
  } catch (err: any) {
    console.error('[PayslipEmail] Network error sending payslip email:', err);
    return {
      success: false,
      error: err.message || 'Failed to connect to email service.',
    };
  }
}
