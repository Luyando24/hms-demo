// Invoice & Receipt Print Document Generator Utility
// Formats high-resolution medical bills, tax invoices, and payment receipts with browser print support.

import { formatCurrencyAmount } from '@/utils/currency';

export interface InvoiceHospitalDetails {
  name: string;
  brandTitle?: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  currencySymbol?: string;
  currencyPosition?: 'prefix' | 'suffix';
}

export interface InvoicePatientDetails {
  firstName: string;
  lastName: string;
  fileNumber?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dob?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PrintableInvoiceData {
  invoiceId: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  hospital?: InvoiceHospitalDetails;
  patient: InvoicePatientDetails;
  items: InvoiceLineItem[];
  notes?: string;
}

export function generateInvoiceHtml(data: PrintableInvoiceData): string {
  const {
    invoiceId,
    createdAt,
    status,
    totalAmount,
    paidAmount,
    paymentMethod,
    paymentReference,
    hospital,
    patient,
    items,
    notes,
  } = data;

  const symbol = hospital?.currencySymbol || '$';
  const position = hospital?.currencyPosition || 'prefix';
  const balance = Math.max(0, totalAmount - (paidAmount || 0));

  const hospitalName = hospital?.brandTitle || hospital?.name || 'Hospital Medical Center';
  const hospitalTagline = hospital?.tagline || 'Excellence in Clinical & Healthcare Services';
  const hospitalAddress = hospital?.address || 'Healthcare Way, Medical District';
  const hospitalPhone = hospital?.phone || '+1 (555) 019-2834';
  const hospitalEmail = hospital?.email || 'billing@hospital.org';

  const dateFormatted = new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeFormatted = new Date(createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusUpper = (status || 'UNPAID').toUpperCase();
  const isPaid = statusUpper === 'PAID';
  const isPartial = statusUpper === 'PARTIAL';

  const statusBg = isPaid ? '#ecfdf5' : isPartial ? '#fffbeb' : '#fef2f2';
  const statusColor = isPaid ? '#047857' : isPartial ? '#b45309' : '#b91c1c';
  const statusBorder = isPaid ? '#a7f3d0' : isPartial ? '#fde68a' : '#fecaca';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${invoiceId.slice(0, 8).toUpperCase()} - ${patient.firstName} ${patient.lastName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 32px 16px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }

    /* Print Controls for preview */
    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
    }

    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease;
    }

    .print-btn:hover {
      background: #1d4ed8;
    }

    .header-table {
      width: 100%;
      margin-bottom: 28px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
    }

    .logo-box {
      display: inline-block;
      width: 44px;
      height: 44px;
      background: #0f172a;
      color: #ffffff;
      font-weight: 900;
      font-size: 20px;
      line-height: 44px;
      text-align: center;
      border-radius: 10px;
      margin-right: 12px;
      vertical-align: middle;
    }

    .hospital-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      vertical-align: middle;
    }

    .hospital-subtitle {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    .invoice-badge-title {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      text-align: right;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .invoice-number {
      font-family: monospace;
      font-size: 12px;
      color: #64748b;
      text-align: right;
      margin-top: 2px;
      font-weight: 600;
    }

    .status-pill {
      display: inline-block;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
      margin-top: 6px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }

    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
    }

    .info-card-title {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }

    .info-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .info-line {
      font-size: 12px;
      color: #475569;
      margin-top: 3px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }

    .items-table th {
      background: #f1f5f9;
      color: #1e293b;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      border-bottom: 2px solid #cbd5e1;
      text-align: left;
    }

    .items-table th.text-right,
    .items-table td.text-right {
      text-align: right;
    }

    .items-table th.text-center,
    .items-table td.text-center {
      text-align: center;
    }

    .items-table td {
      padding: 12px 14px;
      font-size: 12px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    .item-desc {
      font-weight: 700;
      color: #0f172a;
    }

    .summary-box {
      margin-left: auto;
      width: 320px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 32px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #475569;
      padding: 4px 0;
    }

    .summary-row.total {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 6px;
    }

    .summary-row.balance {
      font-size: 14px;
      font-weight: 800;
      color: ${balance > 0 ? '#b91c1c' : '#047857'};
      border-top: 1px dashed #cbd5e1;
      padding-top: 6px;
      margin-top: 4px;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 20px;
    }

    .signature-block {
      border-top: 1px dashed #94a3b8;
      padding-top: 8px;
      text-align: center;
    }

    .signature-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      line-height: 1.5;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .invoice-container {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      @page {
        margin: 12mm 15mm;
        size: A4 portrait;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size: 13px; font-weight: 600;">
      Print Preview &bull; Invoice #${invoiceId.slice(0, 8).toUpperCase()}
    </div>
    <button class="print-btn" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Print Invoice
    </button>
  </div>

  <div class="invoice-container">
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <div style="display: flex; align-items: center;">
            <div class="logo-box">+</div>
            <div>
              <div class="hospital-title">${hospitalName}</div>
              <div class="hospital-subtitle">${hospitalTagline}</div>
              <div class="hospital-subtitle">${hospitalAddress} &bull; Tel: ${hospitalPhone}</div>
            </div>
          </div>
        </td>
        <td style="vertical-align: middle; text-align: right;">
          <div class="invoice-badge-title">Medical Invoice</div>
          <div class="invoice-number">INV #${invoiceId.slice(0, 8).toUpperCase()}</div>
          <div class="status-pill">${statusUpper}</div>
        </td>
      </tr>
    </table>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-title">Patient Information</div>
        <div class="info-name">${patient.firstName} ${patient.lastName}</div>
        <div class="info-line"><strong>MRN / File No:</strong> ${patient.fileNumber || 'N/A'}</div>
        ${patient.phone ? `<div class="info-line"><strong>Phone:</strong> ${patient.phone}</div>` : ''}
        ${patient.gender || patient.dob ? `<div class="info-line"><strong>Details:</strong> ${patient.gender || ''} ${patient.dob ? `&bull; DOB: ${patient.dob}` : ''}</div>` : ''}
      </div>

      <div class="info-card">
        <div class="info-card-title">Invoice Details</div>
        <div class="info-line"><strong>Invoice Date:</strong> ${dateFormatted}</div>
        <div class="info-line"><strong>Issue Time:</strong> ${timeFormatted}</div>
        <div class="info-line"><strong>Payment Status:</strong> ${statusUpper}</div>
        ${paymentMethod ? `<div class="info-line"><strong>Payment Mode:</strong> ${paymentMethod}</div>` : ''}
        ${paymentReference ? `<div class="info-line"><strong>Reference:</strong> ${paymentReference}</div>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Service / Item Description</th>
          <th class="text-center" style="width: 15%;">Qty</th>
          <th class="text-right" style="width: 15%;">Unit Price</th>
          <th class="text-right" style="width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? `
          <tr>
            <td colspan="4" class="text-center" style="padding: 24px; color: #94a3b8;">General Clinical Service Consultation</td>
          </tr>
        ` : items.map(item => `
          <tr>
            <td><span class="item-desc">${item.description}</span></td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right">${formatCurrencyAmount(item.unitPrice, symbol, position)}</td>
            <td class="text-right" style="font-weight: 700; color: #0f172a;">${formatCurrencyAmount(item.totalPrice || item.quantity * item.unitPrice, symbol, position)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-box">
      <div class="summary-row">
        <span>Subtotal:</span>
        <span>${formatCurrencyAmount(totalAmount, symbol, position)}</span>
      </div>
      <div class="summary-row">
        <span>Discount / Insurance:</span>
        <span>${formatCurrencyAmount(0, symbol, position)}</span>
      </div>
      <div class="summary-row total">
        <span>Total Bill:</span>
        <span>${formatCurrencyAmount(totalAmount, symbol, position)}</span>
      </div>
      <div class="summary-row" style="color: #047857; font-weight: 600; margin-top: 4px;">
        <span>Amount Paid:</span>
        <span>${formatCurrencyAmount(paidAmount || 0, symbol, position)}</span>
      </div>
      <div class="summary-row balance">
        <span>${balance > 0 ? 'Balance Due:' : 'Settled Balance:'}</span>
        <span>${formatCurrencyAmount(balance, symbol, position)}</span>
      </div>
    </div>

    ${notes ? `
      <div style="background: #f8fafc; border-left: 3px solid #0f172a; padding: 10px 14px; font-size: 11px; color: #475569; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <strong>Notes:</strong> ${notes}
      </div>
    ` : ''}

    <div class="signatures-grid">
      <div class="signature-block">
        <div class="signature-title">Patient / Guardian Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-title">Authorized Hospital Cashier</div>
      </div>
    </div>

    <div class="footer-note">
      This is an official computer-generated medical bill from ${hospitalName}.<br />
      For billing queries, insurance claims, or refund assistance, contact billing at ${hospitalEmail} or call ${hospitalPhone}.
    </div>
  </div>

  <script>
    // Automatically trigger print dialog on page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
}

export function printInvoiceDocument(data: PrintableInvoiceData): boolean {
  try {
    const html = generateInvoiceHtml(data);
    const printWindow = window.open('', '_blank', 'width=900,height=850,resizable=yes,scrollbars=yes');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      return true;
    } else {
      // Fallback: use an invisible iframe if popups are blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 60000);
        }, 500);
        return true;
      }
    }
  } catch (err) {
    console.error('Failed to print invoice document:', err);
  }
  return false;
}
