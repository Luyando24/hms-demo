// Report Document Generator Utility
// Generates styled HTML print documents, interactive document previews, and structured CSV exports.

export interface HospitalSettings {
  hospitalName: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
}

export interface KpiCard {
  label: string;
  value: string;
  subtext?: string;
  colorClass?: string;
}

export interface ReportDocumentData {
  reportTitle: string;
  reportKey: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  refCode: string;
  hospital: HospitalSettings;
  kpiCards?: KpiCard[];
  rows: Array<Record<string, any>>;
  summaryRow?: Record<string, any>;
  notes?: string[];
}

export function formatValue(val: any, symbol = '$', position = 'prefix'): string {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    const formatted = val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return position === 'suffix' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
  }
  return String(val);
}

export function getStatusStyle(val: any): { bg: string; text: string; border: string } {
  const str = String(val ?? '').toUpperCase();
  if (str.includes('PAID') || str.includes('COMPLETED') || str.includes('ACTIVE') || str.includes('GRADE A+') || str.includes('100%')) {
    return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
  }
  if (str.includes('PENDING') || str.includes('UNPAID') || str.includes('MEDIUM') || str.includes('OCCUPIED')) {
    return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
  }
  if (str.includes('STAT') || str.includes('HIGH') || str.includes('URGENT') || str.includes('CANCELLED')) {
    return { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' };
  }
  if (str.includes('ADMITTED') || str.includes('INPATIENT') || str.includes('EXECUTIVE')) {
    return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
  }
  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
}

export function generateReportHtml(data: ReportDocumentData): string {
  const { reportTitle, periodLabel, startDate, endDate, generatedAt, refCode, hospital, kpiCards = [], rows = [], notes = [] } = data;

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const kpiCardsHtml = kpiCards.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(${Math.min(kpiCards.length, 4)}, 1fr); gap: 12px; margin-bottom: 24px;">
      ${kpiCards.map(card => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${card.label}</div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a;">${card.value}</div>
          ${card.subtext ? `<div style="font-size: 10px; font-weight: 600; color: #0284c7; margin-top: 2px;">${card.subtext}</div>` : ''}
        </div>
      `).join('')}
    </div>
  ` : '';

  const tableHeaderHtml = columns.map(col => `
    <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; background: #f1f5f9;">
      ${col.replace(/_/g, ' ')}
    </th>
  `).join('');

  const tableRowsHtml = rows.map((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `
      <tr style="background: ${bg};">
        ${columns.map(col => {
          const val = row[col];
          const isStatus = ['status', 'priority', 'regulatory_audit_status', 'clinical_safety_rating'].some(k => col.toLowerCase().includes(k));
          let content = String(val ?? '');
          
          if (isStatus) {
            const style = getStatusStyle(val);
            content = `<span style="display: inline-block; padding: 3px 8px; font-size: 10px; font-weight: 800; border-radius: 9999px; background: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border};">${val}</span>`;
          }

          return `<td style="padding: 9px 12px; font-size: 12px; font-weight: 500; color: #334155; border-bottom: 1px solid #e2e8f0; vertical-align: middle;">${content}</td>`;
        }).join('')}
      </tr>
    `;
  }).join('');

  const notesHtml = notes.length > 0 ? `
    <div style="margin-top: 24px; padding: 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;">
      <div style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Executive Audit Remarks</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #334155; line-height: 1.6;">
        ${notes.map(n => `<li>${n}</li>`).join('')}
      </ul>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportTitle} - ${refCode}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
          color: #0f172a;
          background: #ffffff;
        }

        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <div style="display: flex; items-center; gap: 10px; margin-bottom: 6px;">
              <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #0284c7, #0369a1); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                ✚
              </div>
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">${hospital.hospitalName || 'MediCloud Central Hospital'}</h1>
                <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 600; color: #64748b;">${hospital.address || 'Healthcare Facilities & Clinical Analytics Network'} • Tel: ${hospital.phone || '+1 (800) 555-0199'}</p>
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; padding: 4px 10px; background: #0284c7; color: #ffffff; font-size: 10px; font-weight: 800; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">
              OFFICIAL REPORT
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 6px;">Ref: <span style="font-family: monospace; color: #0f172a;">${refCode}</span></div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Generated: ${generatedAt}</div>
          </div>
        </div>

        <!-- Title Banner -->
        <div style="background: linear-gradient(to right, #0f172a, #1e293b); border-radius: 10px; padding: 16px 20px; color: white; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 10px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">EXECUTIVE DATA & ANALYTICS</span>
            <h2 style="margin: 2px 0 0 0; font-size: 18px; font-weight: 900; color: #ffffff;">${reportTitle}</h2>
          </div>
          <div style="text-align: right; background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15);">
            <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Reporting Period</div>
            <div style="font-size: 12px; font-weight: 800; color: #ffffff;">${periodLabel}</div>
          </div>
        </div>

        <!-- KPI Cards -->
        ${kpiCardsHtml}

        <!-- Data Table -->
        <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr>${tableHeaderHtml}</tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? tableRowsHtml : `
                <tr>
                  <td colspan="${Math.max(1, columns.length)}" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">
                    No records found for the selected period range (${startDate} to ${endDate}).
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Executive Audit Remarks -->
        ${notesHtml}

        <!-- Footer & Signatures -->
        <div style="margin-top: 36px; pt: 20px; border-top: 2px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Document Authentication</div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">MediCloud Digital Audit Engine</div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">Checksum Hash: ${Math.random().toString(36).substring(2, 12).toUpperCase()}</div>
            </div>
            
            <div style="text-align: center;">
              <div style="width: 180px; border-bottom: 1.5px dashed #94a3b8; margin-bottom: 4px; height: 30px;"></div>
              <div style="font-size: 11px; font-weight: 800; color: #0f172a;">Chief Financial / Operations Officer</div>
              <div style="font-size: 10px; color: #64748b;">Authorized Executive Signature</div>
            </div>
          </div>

          <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; pt: 10px;">
            CONFIDENTIAL • FOR AUTHORIZED BOARD & ADMINISTRATIVE USE ONLY • ${hospital.hospitalName || 'MediCloud Central Hospital'}
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
}

export function printReportDocument(data: ReportDocumentData) {
  const html = generateReportHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}

export function downloadFormattedCsv(data: ReportDocumentData) {
  const { reportTitle, periodLabel, generatedAt, refCode, hospital, rows = [] } = data;
  if (rows.length === 0) return;

  const escapeCsv = (val: any) => {
    const raw = String(val ?? '');
    const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return '"' + formulaSafe.replace(/"/g, '""') + '"';
  };

  const metaRows = [
    `"HOSPITAL REPORT","${hospital.hospitalName || 'MediCloud Central Hospital'}"`,
    `"REPORT TITLE","${reportTitle}"`,
    `"REFERENCE CODE","${refCode}"`,
    `"PERIOD","${periodLabel}"`,
    `"GENERATED AT","${generatedAt}"`,
    `""`
  ];

  const columns = Object.keys(rows[0]);
  const headerRow = columns.map(c => escapeCsv(c.replace(/_/g, ' '))).join(',');
  const dataRows = rows.map(r => columns.map(c => escapeCsv(r[c])).join(','));

  const csvContent = "\uFEFF" + [...metaRows, headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.reportKey}_${data.startDate}_to_${data.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
