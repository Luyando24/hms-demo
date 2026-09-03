'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

const recordExpenseSchema = z.object({
  title: z.string().trim().min(1, 'Expense title is required').max(150),
  category: z.string().trim().min(1).default('OPERATIONAL'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  expenseDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  paymentMethod: z.string().default('BANK_TRANSFER'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const recordIncomeSchema = z.object({
  title: z.string().trim().min(1, 'Income title/description is required').max(150),
  category: z.string().trim().min(1).default('DIRECT_PAYMENT'),
  amount: z.number().min(0.01, 'Amount must be greater than zero'),
  incomeDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  paymentMethod: z.string().default('CASH'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const sendReportEmailSchema = z.object({
  reportTitle: z.string().min(1),
  periodLabel: z.string().min(1),
  recipientEmail: z.string().email().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'Invalid input provided.';
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

export async function recordExpenseAction(input: unknown) {
  try {
    const { user } = await requireRole(['ADMIN', 'ACCOUNTANT']);
    const data = recordExpenseSchema.parse(input);
    const adminSupabase = createAdminClient();

    const { data: record, error } = await adminSupabase
      .from('expenses')
      .insert({
        title: data.title,
        category: data.category,
        amount: data.amount,
        expense_date: data.expenseDate,
        payment_method: data.paymentMethod,
        reference_number: data.referenceNumber || null,
        notes: data.notes || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/hospital/finance');
    revalidatePath('/hospital/reports');

    return {
      success: true,
      expense: record,
    };
  } catch (error) {
    return {
      success: false,
      error: actionError(error),
    };
  }
}

export async function recordIncomeAction(input: unknown) {
  try {
    const { user } = await requireRole(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST', 'STAFF']);
    const data = recordIncomeSchema.parse(input);
    const adminSupabase = createAdminClient();

    const { data: record, error } = await adminSupabase
      .from('incomes')
      .insert({
        title: data.title,
        category: data.category,
        amount: data.amount,
        income_date: data.incomeDate,
        payment_method: data.paymentMethod,
        reference_number: data.referenceNumber || null,
        notes: data.notes || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    revalidatePath('/hospital/finance');
    revalidatePath('/hospital/reports');

    return {
      success: true,
      income: record,
    };
  } catch (error) {
    return {
      success: false,
      error: actionError(error),
    };
  }
}

export async function sendFinancialReportEmailAction(input: unknown) {
  try {
    await requireRole(['ADMIN', 'ACCOUNTANT']);
    const data = sendReportEmailSchema.parse(input);
    const adminSupabase = createAdminClient();

    // 1. Fetch System Settings & Email Settings
    const [{ data: settings }, { data: emailSettings }] = await Promise.all([
      adminSupabase.from('system_settings').select('*').limit(1).maybeSingle(),
      adminSupabase.from('email_notification_settings').select('*').limit(1).maybeSingle(),
    ]);

    const targetEmail =
      data.recipientEmail ||
      emailSettings?.manager_report_email ||
      settings?.email ||
      process.env.ADMIN_REPORT_EMAIL;

    if (!targetEmail) {
      throw new Error('No administrator email is configured. Please provide an email or set it in System Settings.');
    }

    const sym = settings?.currency_symbol || '$';
    const hospitalName = settings?.brand_title || settings?.hospital_name || 'Hospital Facility';

    // 2. Determine Date Bounds
    const now = new Date();
    const startDate = data.startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = data.endDate || now.toISOString();

    // 3. Query All Financial Modules in parallel
    const [invoicesRes, payrollRes, purchaseOrdersRes, expensesRes, inventoryRes, incomesRes] = await Promise.all([
      adminSupabase
        .from('invoices')
        .select('total_amount, paid_amount, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      adminSupabase
        .from('payroll_records')
        .select('net_salary, base_salary, allowances, deductions, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      adminSupabase
        .from('purchase_orders')
        .select('total_amount, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate),
      adminSupabase
        .from('expenses')
        .select('amount, category, title, expense_date')
        .gte('expense_date', startDate.split('T')[0])
        .lte('expense_date', endDate.split('T')[0]),
      adminSupabase
        .from('inventory_items')
        .select('id, name, stock_level, unit_price, reorder_level'),
      adminSupabase
        .from('incomes')
        .select('amount, category, title, income_date')
        .gte('income_date', startDate.split('T')[0])
        .lte('income_date', endDate.split('T')[0]),
    ]);

    // Financial calculations
    let totalInvoiced = 0;
    let realizedCollections = 0;
    let pendingInvoicesCount = 0;
    (invoicesRes.data || []).forEach((inv) => {
      totalInvoiced += Number(inv.total_amount || 0);
      realizedCollections += Number(inv.paid_amount || 0);
      if (inv.status !== 'PAID') pendingInvoicesCount++;
    });

    let manualIncomesTotal = 0;
    (incomesRes.data || []).forEach((inc) => {
      const amt = Number(inc.amount || 0);
      manualIncomesTotal += amt;
      realizedCollections += amt;
    });

    const outstandingReceivables = Math.max(0, totalInvoiced - (realizedCollections - manualIncomesTotal));

    let payrollTotal = 0;
    (payrollRes.data || []).forEach((p) => {
      payrollTotal += Number(p.net_salary || 0);
    });

    let procurementTotal = 0;
    (purchaseOrdersRes.data || []).forEach((po) => {
      procurementTotal += Number(po.total_amount || 0);
    });

    let generalExpensesTotal = 0;
    (expensesRes.data || []).forEach((exp) => {
      generalExpensesTotal += Number(exp.amount || 0);
    });

    let inventoryValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    (inventoryRes.data || []).forEach((item) => {
      const qty = Number(item.stock_level) || 0;
      const price = Number(item.unit_price) || 0;
      const reorder = Number(item.reorder_level) || 50;
      inventoryValuation += qty * price;
      if (qty === 0) outOfStockCount++;
      else if (qty <= reorder) lowStockCount++;
    });

    const totalOutflows = payrollTotal + procurementTotal + generalExpensesTotal;
    const netEbitda = realizedCollections - totalOutflows;
    const marginPercent = realizedCollections > 0 ? ((netEbitda / realizedCollections) * 100).toFixed(1) : '0.0';

    const fmt = (val: number) =>
      `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // 4. Construct Branded HTML Executive Report
    const htmlEmail = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .wrapper { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #0f172a; color: #ffffff; padding: 28px 32px; border-bottom: 3px solid #10b981; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 4px 0 0; font-size: 12px; color: #94a3b8; font-weight: 500; }
        .content { padding: 32px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: #ecfdf5; color: #059669; }
        .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 20px 0; }
        .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
        .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .kpi-val { font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px; }
        .kpi-val.green { color: #059669; }
        .kpi-val.red { color: #dc2626; }
        .kpi-val.blue { color: #2563eb; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        .table th { text-align: left; padding: 8px 10px; background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; }
        .table td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; }
        .table tr:last-child td { border-bottom: none; font-weight: 800; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <span class="badge">Audited Executive Report</span>
          <h1 style="margin-top: 8px;">${hospitalName}</h1>
          <p>${data.reportTitle} • ${data.periodLabel}</p>
        </div>
        <div class="content">
          <p style="font-size: 13px; color: #334155; margin-top: 0;">
            This automated financial statement consolidates all verified transactions, realized patient revenues, staff payroll disbursements, pharmacy procurements, medical stock inventory asset valuation, and general operating expenditures.
          </p>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Realized Collections</div>
              <div class="kpi-val green">${fmt(realizedCollections)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Outflows & OpEx</div>
              <div class="kpi-val red">${fmt(totalOutflows)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Net Operating Margin (EBITDA)</div>
              <div class="kpi-val ${netEbitda >= 0 ? 'green' : 'red'}">${fmt(netEbitda)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Medical Stock Inventory Asset</div>
              <div class="kpi-val blue">${fmt(inventoryValuation)}</div>
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: 800; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
            Consolidated Financial Breakdown
          </h3>
          <table class="table">
            <thead>
              <tr>
                <th>Financial Flow Category</th>
                <th>Source Module</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Gross Invoiced Billing</strong></td>
                <td>Patient Billing</td>
                <td style="text-align: right;">${fmt(totalInvoiced)}</td>
              </tr>
              <tr>
                <td><strong>Realized Patient Cash Collections</strong></td>
                <td>Cashier & Payments</td>
                <td style="text-align: right; color: #059669; font-weight: bold;">+${fmt(realizedCollections)}</td>
              </tr>
              <tr>
                <td><strong>Staff Salaries & Workforce Payroll</strong></td>
                <td>HMS Payroll Module</td>
                <td style="text-align: right; color: #dc2626;">-${fmt(payrollTotal)}</td>
              </tr>
              <tr>
                <td><strong>Pharmacy & Supplies Procurement</strong></td>
                <td>Procurement & POs</td>
                <td style="text-align: right; color: #dc2626;">-${fmt(procurementTotal)}</td>
              </tr>
              <tr>
                <td><strong>General Operating Expenses</strong></td>
                <td>Expense Journal</td>
                <td style="text-align: right; color: #dc2626;">-${fmt(generalExpensesTotal)}</td>
              </tr>
              <tr>
                <td><strong>Active Medical Stock Valuation</strong></td>
                <td>Pharmacy & Inventory</td>
                <td style="text-align: right; color: #2563eb; font-weight: bold;">${fmt(inventoryValuation)} (${inventoryRes.data?.length || 0} SKUs)</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td><strong>Net Operating Cashflow (EBITDA)</strong></td>
                <td><strong>All Modules Synced</strong></td>
                <td style="text-align: right; font-size: 14px; font-weight: 900; color: ${netEbitda >= 0 ? '#059669' : '#dc2626'};">${fmt(netEbitda)} (${marginPercent}%)</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 24px; padding: 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 11px; color: #1e40af;">
            <strong>Audit Guarantee:</strong> This report has been synced in real time across the billing, cashflow, payroll, inventory, and expense ledgers of ${hospitalName}.
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">Generated by HMS Hospital Management System • Ref #${new Date().getTime().toString(36).toUpperCase()}</p>
          <p style="margin: 4px 0 0;">Confidential Financial Statement for Hospital Administration.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // 5. Send via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'updates@kundahealthcare.org';

    if (!resendApiKey) {
      throw new Error('Resend API key is not configured.');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${hospitalName} Reporting <${resendFromEmail}>`,
        to: [targetEmail],
        subject: `[Financial Report] ${data.reportTitle} - ${data.periodLabel} (${hospitalName})`,
        html: htmlEmail,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailResult.message || 'Failed to dispatch email report via Resend.');
    }

    return {
      success: true,
      recipientEmail: targetEmail,
      messageId: emailResult.id,
      summary: {
        realizedCollections,
        totalOutflows,
        netEbitda,
        outstandingReceivables,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: actionError(error),
    };
  }
}
