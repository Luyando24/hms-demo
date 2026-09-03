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

export interface PrintableReceiptData {
  receiptNumber: string;
  invoiceId?: string;
  paymentId?: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  tenderedAmount?: number;
  changeAmount?: number;
  cashierName?: string;
  hospital?: InvoiceHospitalDetails;
  patient: InvoicePatientDetails;
  items: InvoiceLineItem[];
  notes?: string;
}

export function generateReceiptHtml(data: PrintableReceiptData): string {
  const {
    receiptNumber,
    invoiceId,
    createdAt,
    totalAmount,
    paidAmount,
    paymentMethod,
    paymentReference,
    tenderedAmount,
    changeAmount,
    cashierName,
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Official Receipt #${receiptNumber} - ${patient.firstName} ${patient.lastName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      line-height: 1.4;
      font-size: 13px;
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .sheet {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      position: relative;
    }

    /* Print action bar */
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 12px 18px;
      background: #0f172a;
      border-radius: 12px;
      color: #ffffff;
    }

    .btn-print {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .btn-print:hover {
      background: #047857;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .logo-img {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      object-fit: cover;
      border: 1px solid #e2e8f0;
    }

    .logo-placeholder {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      font-size: 24px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(5, 150, 105, 0.2);
    }

    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }

    .hospital-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.5;
    }

    .receipt-badge-col {
      text-align: right;
    }

    .receipt-title {
      font-size: 22px;
      font-weight: 900;
      color: #059669;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .receipt-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
      background: #f1f5f9;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
    }

    .receipt-date {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 6px;
    }

    /* Cards Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px;
    }

    .card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 8px;
    }

    .patient-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }

    .patient-detail {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-top: 3px;
    }

    .payment-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 11px;
      margin-top: 6px;
      text-transform: uppercase;
    }

    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .items-table th {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }

    .items-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
      color: #1e293b;
    }

    .items-table td.text-right, .items-table th.text-right {
      text-align: right;
    }

    .item-desc {
      font-weight: 700;
      color: #0f172a;
    }

    /* Summary */
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 20px;
    }

    .payment-seal {
      border: 2px dashed #059669;
      background: #ecfdf5;
      color: #065f46;
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 320px;
      text-align: center;
    }

    .seal-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #047857;
    }

    .seal-sub {
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
      color: #065f46;
    }

    .summary-table {
      width: 280px;
      border-collapse: collapse;
    }

    .summary-table td {
      padding: 6px 0;
      font-size: 12px;
    }

    .summary-table td.label {
      color: #64748b;
      font-weight: 600;
    }

    .summary-table td.val {
      text-align: right;
      font-weight: 700;
      color: #0f172a;
    }

    .summary-table tr.total-row td {
      border-top: 2px solid #e2e8f0;
      padding-top: 10px;
      font-size: 15px;
      font-weight: 900;
      color: #059669;
    }

    /* Signatures */
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    .signature-block {
      border-top: 1px dashed #94a3b8;
      padding-top: 8px;
      text-align: center;
    }

    .signature-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }

    .footer-note {
      text-align: center;
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      font-size: 10px;
      color: #94a3b8;
      line-height: 1.5;
    }

    @media print {
      body {
        background: transparent;
        padding: 0;
      }
      .sheet {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="no-print">
      <div>
        <strong>Official Hospital Payment Receipt</strong> • #${receiptNumber}
      </div>
      <button class="btn-print" onclick="window.print()">
        🖨️ Print Receipt
      </button>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="brand">
        ${hospital?.logoUrl ? `<img src="${hospital.logoUrl}" class="logo-img" alt="Logo" />` : `<div class="logo-placeholder">✚</div>`}
        <div>
          <div class="brand-title">${hospitalName}</div>
          <div class="brand-tagline">${hospitalTagline}</div>
          <div class="hospital-meta">
            ${hospitalAddress}<br />
            Tel: ${hospitalPhone} • Email: ${hospitalEmail}
          </div>
        </div>
      </div>

      <div class="receipt-badge-col">
        <div class="receipt-title">Official Receipt</div>
        <div class="receipt-number">REC #${receiptNumber}</div>
        <div class="receipt-date">${dateFormatted} at ${timeFormatted}</div>
        ${invoiceId ? `<div style="font-size:10px; color:#64748b; margin-top:2px;">Ref Invoice: #${invoiceId.slice(0, 8).toUpperCase()}</div>` : ''}
      </div>
    </div>

    <!-- Details Grid -->
    <div class="details-grid">
      <div class="card">
        <div class="card-title">Received From (Patient / Payer)</div>
        <div class="patient-name">${patient.firstName} ${patient.lastName}</div>
        ${patient.fileNumber ? `<div class="patient-detail">MRN / File: <strong>${patient.fileNumber}</strong></div>` : ''}
        ${patient.phone ? `<div class="patient-detail">Phone: ${patient.phone}</div>` : ''}
        ${patient.gender ? `<div class="patient-detail">Gender: ${patient.gender}</div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">Payment Settlement Details</div>
        <div class="payment-badge">
          ✓ ${paymentMethod || 'CASH PAYMENT'}
        </div>
        ${paymentReference ? `<div class="patient-detail" style="margin-top:6px;">Txn / Ref #: <strong>${paymentReference}</strong></div>` : ''}
        ${cashierName ? `<div class="patient-detail">Cashier / Staff: <strong>${cashierName}</strong></div>` : ''}
        <div class="patient-detail">Settlement Status: <span style="color:#059669; font-weight:800;">CONFIRMED & CLEARED</span></div>
      </div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 50%;">Service / Medical Item Description</th>
          <th class="text-right" style="width: 15%;">Qty</th>
          <th class="text-right" style="width: 15%;">Unit Price</th>
          <th class="text-right" style="width: 20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <div class="item-desc">${item.description}</div>
            </td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrencyAmount(item.unitPrice, symbol, position)}</td>
            <td class="text-right" style="font-weight:700;">${formatCurrencyAmount(item.totalPrice, symbol, position)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Summary & Official Seal -->
    <div class="summary-section">
      <div class="payment-seal">
        <div class="seal-title">✓ Verified & Paid</div>
        <div class="seal-sub">Payment received and officially processed into the hospital financial ledger.</div>
      </div>

      <table class="summary-table">
        <tr>
          <td class="label">Gross Bill Amount</td>
          <td class="val">${formatCurrencyAmount(totalAmount, symbol, position)}</td>
        </tr>
        <tr class="total-row">
          <td>Amount Received</td>
          <td class="val">${formatCurrencyAmount(paidAmount, symbol, position)}</td>
        </tr>
        ${tenderedAmount && tenderedAmount > paidAmount ? `
          <tr>
            <td class="label">Tendered Cash</td>
            <td class="val">${formatCurrencyAmount(tenderedAmount, symbol, position)}</td>
          </tr>
          <tr>
            <td class="label">Change Returned</td>
            <td class="val">${formatCurrencyAmount(changeAmount || (tenderedAmount - paidAmount), symbol, position)}</td>
          </tr>
        ` : ''}
        <tr>
          <td class="label">Outstanding Balance</td>
          <td class="val" style="color: ${balance === 0 ? '#059669' : '#dc2626'}; font-weight:800;">
            ${formatCurrencyAmount(balance, symbol, position)}
          </td>
        </tr>
      </table>
    </div>

    ${notes ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-title">Receipt Notes / Remarks</div>
        <div style="font-size: 11px; color: #475569;">${notes}</div>
      </div>
    ` : ''}

    <div class="signatures-grid">
      <div class="signature-block">
        <div class="signature-title">Patient / Payer Signature</div>
      </div>
      <div class="signature-block">
        <div class="signature-title">Authorized Cashier: ${cashierName || hospitalName}</div>
      </div>
    </div>

    <div class="footer-note">
      Official Medical Receipt • Thank you for choosing ${hospitalName}.<br />
      For receipt verifications, contact billing at ${hospitalEmail} or call ${hospitalPhone}.
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
}

export function printReceiptDocument(data: PrintableReceiptData): boolean {
  try {
    const html = generateReceiptHtml(data);
    const printWindow = window.open('', '_blank', 'width=900,height=850,resizable=yes,scrollbars=yes');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      return true;
    } else {
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
    console.error('Failed to print receipt document:', err);
  }
  return false;
}

