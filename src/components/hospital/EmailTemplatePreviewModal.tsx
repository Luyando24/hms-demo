'use client'

import React, { useState, useEffect } from 'react';
import { X, Mail, Smartphone, Monitor, Sparkles } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatCurrencyAmount } from '@/utils/currency';

export interface ClientHospitalInfo {
  hospitalName: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  appUrl?: string | null;
}

interface EmailTemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalName?: string;
}

export function renderClientEmailTemplate(
  hospital: string | ClientHospitalInfo,
  title: string,
  introduction: string,
  rows: Array<[string, string | number]>,
  cta?: { label: string; href: string },
  note?: string
): string {
  const info: ClientHospitalInfo = typeof hospital === "string"
    ? { hospitalName: hospital, address: "Capital Healthcare District, Suite 400", phone: "+1 (800) 555-0199", email: "info@medicloud.health", appUrl: "https://kundahealthcare.org" }
    : hospital;

  const hospitalName = info.hospitalName || "HMS - Kunda Health Care";
  const address = info.address?.trim() || "";
  const phone = info.phone?.trim() || "";
  const email = info.email?.trim() || "";
  const rawUrl = info.appUrl || "https://kundahealthcare.org";
  const websiteUrl = rawUrl ? rawUrl.replace(/\/$/, "") : "";
  const websiteDisplay = websiteUrl.replace(/^https?:\/\//, "");

  const contactParts = [address, phone, email].filter(Boolean);
  const contactLine = contactParts.join(" &bull; ");

  const details = rows
    .map(([label, value], index) => {
      const bg = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      const str = String(value).trim();
      const upper = str.toUpperCase();
      let formatted = str;

      if (upper.includes("COMPLETED") || upper.includes("CONFIRMED") || upper.includes("100%") || upper.includes("GRADE A+")) {
        formatted = `<span style="display:inline-block;padding:3px 10px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:9999px;font-size:11px;font-weight:800;">${str}</span>`;
      } else if (upper.includes("CRITICAL") || upper.includes("CANCELLED") || upper.includes("STOCK-OUT") || upper.includes("HIGH")) {
        formatted = `<span style="display:inline-block;padding:3px 10px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;border-radius:9999px;font-size:11px;font-weight:800;">${str}</span>`;
      } else if (upper.includes("PENDING") || upper.includes("RESCHEDULED") || upper.includes("LOW-STOCK")) {
        formatted = `<span style="display:inline-block;padding:3px 10px;background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:9999px;font-size:11px;font-weight:800;">${str}</span>`;
      }

      return `
      <tr style="background:${bg};">
        <td style="padding:12px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;">${label}</td>
        <td style="padding:12px 16px;color:#0f172a;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;text-align:right;">${formatted}</td>
      </tr>`;
    })
    .join("");

  const action = cta?.href
    ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px auto 12px;text-align:center;">
        <tr>
          <td align="center" style="border-radius:10px;background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);box-shadow:0 4px 12px rgba(2, 132, 199, 0.25);">
            <a href="${cta.href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.3px;border-radius:10px;">
              ${cta.label} &rarr;
            </a>
          </td>
        </tr>
       </table>`
    : "";

  const noteBox = note
    ? `<div style="margin-top:24px;padding:14px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;">
        <div style="font-size:11px;font-weight:800;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Important Notice</div>
        <div style="font-size:12px;line-height:1.5;color:#334155;">${note}</div>
       </div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
      <div style="background:linear-gradient(135deg, #0f172a 0%, #1e293b 100%);color:#ffffff;padding:26px 30px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#38bdf8;margin-bottom:6px;">
          ✚ ${hospitalName}
        </div>
        <h1 style="font-size:22px;font-weight:900;line-height:1.3;margin:0;color:#ffffff;">
          ${title}
        </h1>
      </div>

      <div style="padding:28px 30px;">
        <p style="font-size:15px;line-height:1.65;color:#334155;margin:0 0 22px;">
          ${introduction}
        </p>

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

        ${action}
        ${noteBox}
      </div>

      <!-- Card Footer -->
      <div style="background:#f8fafc;padding:20px 30px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="font-size:13px;color:#0f172a;margin:0 0 4px;font-weight:800;letter-spacing:-0.2px;">
          ${hospitalName}
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
                <a href="${websiteUrl}" target="_blank" style="color:#0284c7;text-decoration:none;">
                  🌐 ${websiteDisplay}
                </a>
               </p>`
            : ""
        }
      </div>
    </div>

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

export default function EmailTemplatePreviewModal({
  isOpen,
  onClose,
  hospitalName = 'MediCloud Central Hospital'
}: EmailTemplatePreviewModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<
    'APPOINTMENT_CONFIRMATION' | 'CRITICAL_STOCK' | 'DAILY_DIGEST'
  >('APPOINTMENT_CONFIRMATION');
  const [deviceView, setDeviceView] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [hospInfo, setHospInfo] = useState<ClientHospitalInfo>({
    hospitalName,
    address: 'Capital Healthcare District, Suite 400',
    phone: '+1 (800) 555-0199',
    email: 'info@medicloud.health',
    appUrl: 'https://kundahealthcare.org'
  });
  const [currencyConfig, setCurrencyConfig] = useState<{ symbol: string; position: 'prefix' | 'suffix' }>({
    symbol: '$',
    position: 'prefix'
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      const loadInfo = async () => {
        const { data } = await supabase
          .from('system_settings')
          .select('hospital_name, address, phone, email, currency_symbol, currency_position')
          .limit(1)
          .maybeSingle();

        if (data) {
          setHospInfo({
            hospitalName: data.hospital_name || hospitalName,
            address: data.address || 'Capital Healthcare District, Suite 400',
            phone: data.phone || '+1 (800) 555-0199',
            email: data.email || 'info@medicloud.health',
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://kundahealthcare.org'
          });
          if (data.currency_symbol) {
            setCurrencyConfig({
              symbol: data.currency_symbol,
              position: (data.currency_position as 'prefix' | 'suffix') || 'prefix'
            });
          }
        }
      };
      void loadInfo();
    }
  }, [isOpen, hospitalName]);

  if (!isOpen) return null;

  let title = '';
  let intro = '';
  let rows: Array<[string, string | number]> = [];
  let cta: { label: string; href: string } | undefined = undefined;
  let note: string | undefined = undefined;

  if (selectedTemplate === 'APPOINTMENT_CONFIRMATION') {
    title = 'Appointment Confirmed';
    intro = 'Hello Mulenga Phiri, your medical consultation appointment has been recorded successfully.';
    rows = [
      ['Date and time', 'Thursday, August 6, 2026 at 09:30 AM'],
      ['Attending Physician', 'Dr. Sarah Banda (Cardiology)'],
      ['Facility Wing', 'Outpatient Suite 3B'],
      ['Status', 'CONFIRMED']
    ];
    cta = { label: 'View Appointment Portal', href: 'https://medicloud.health/patient/portal' };
    note = 'For privacy, this email does not include medical history or diagnosis details.';
  } else if (selectedTemplate === 'CRITICAL_STOCK') {
    title = 'Critical Stock-Out Alert';
    intro = 'An essential pharmaceutical inventory item has reached zero stock level and requires immediate reorder.';
    rows = [
      ['Inventory Item', 'Amoxicillin 500mg Oral Capsules'],
      ['Current Stock', '0 units'],
      ['Reorder Threshold', '50 units'],
      ['Department', 'Central Pharmacy'],
      ['Urgency Level', 'CRITICAL']
    ];
    cta = { label: 'Open Inventory Management', href: 'https://medicloud.health/hospital/inventory' };
    note = 'Automated stock monitor alert. Replenishment purchase orders should be authorized promptly.';
  } else {
    title = 'Daily Executive Management Report';
    intro = 'Aggregate operational activity metrics and financial inflow summary for August 5, 2026.';
    rows = [
      ['Scheduled Appointments', 42],
      ['New Patient Registrations', 18],
      ['Admissions / Discharges', '12 / 9'],
      ['Ward Bed Occupancy', '78%'],
      ['Gross Billing Invoiced', formatCurrencyAmount(14250, currencyConfig.symbol, currencyConfig.position)],
      ['Realized Collections', formatCurrencyAmount(11800, currencyConfig.symbol, currencyConfig.position)],
      ['Operational Status', '100% COMPLIANT']
    ];
    cta = { label: 'Open Executive Dashboard', href: 'https://medicloud.health/hospital/reports' };
    note = 'Aggregate facility report prepared for hospital management and board governance.';
  }

  const htmlContent = renderClientEmailTemplate(hospInfo, title, intro, rows, cta, note);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-md shadow-brand-500/20">
              <Mail size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Email Notification Template Gallery</h2>
                <span className="text-[10px] font-bold bg-brand-500/20 border border-brand-400/30 text-brand-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Live Preview Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Responsive Resend HTML Email Notification Design System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Switcher */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setDeviceView('DESKTOP')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  deviceView === 'DESKTOP' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Desktop View (600px)"
              >
                <Monitor size={15} />
              </button>
              <button
                type="button"
                onClick={() => setDeviceView('MOBILE')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  deviceView === 'MOBILE' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Mobile View (360px)"
              >
                <Smartphone size={15} />
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Template Selector Bar */}
        <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Template:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTemplate('APPOINTMENT_CONFIRMATION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTemplate === 'APPOINTMENT_CONFIRMATION'
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Patient Confirmation
            </button>

            <button
              type="button"
              onClick={() => setSelectedTemplate('CRITICAL_STOCK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTemplate === 'CRITICAL_STOCK'
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Critical Stock Alert
            </button>

            <button
              type="button"
              onClick={() => setSelectedTemplate('DAILY_DIGEST')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTemplate === 'DAILY_DIGEST'
                  ? 'bg-brand-600 border-brand-600 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Daily Executive Digest
            </button>
          </div>
        </div>

        {/* Live Preview Canvas */}
        <div className="p-6 bg-slate-200/90 overflow-y-auto flex-1 flex justify-center items-start shadow-inner">
          <div className={`w-full transition-all duration-300 ${deviceView === 'MOBILE' ? 'max-w-sm' : 'max-w-2xl'}`}>
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden">
              <iframe
                title="Email Preview"
                srcDoc={htmlContent}
                className="w-full min-h-[520px] border-0"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Template Status: <span className="font-bold text-emerald-700">✓ Resend HTML Mail Compliant</span>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
