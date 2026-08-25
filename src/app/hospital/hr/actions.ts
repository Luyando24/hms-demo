'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendPayslipEmailViaResend, type PayslipEmailData } from '@/lib/payslipEmail';

const uuidSchema = z.string().uuid();

const singlePayrollSchema = z.object({
  staffId: z.string().uuid(),
  payPeriod: z.string().trim().min(1).max(60),
  baseSalary: z.number().min(0),
  allowances: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  paymentMethod: z.string().trim().min(1).default('BANK_TRANSFER'),
  sendEmailImmediately: z.boolean().default(true),
});

const batchPayrollSchema = z.object({
  payPeriod: z.string().trim().min(1).max(60),
  paymentMethod: z.string().trim().min(1).default('BANK_TRANSFER'),
  defaultBaseSalary: z.number().min(0).default(3500),
  defaultAllowances: z.number().min(0).default(500),
  defaultDeductions: z.number().min(0).default(350),
  sendEmailImmediately: z.boolean().default(true),
  staffIds: z.array(z.string().uuid()).optional(),
});

function actionError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message || 'Invalid input submitted.';
  }
  return error instanceof Error ? error.message : 'An unexpected payroll error occurred.';
}

export async function processSinglePayrollAction(input: unknown) {
  try {
    const { user } = await requireRole(['ADMIN', 'ACCOUNTANT']);
    const data = singlePayrollSchema.parse(input);
    const adminSupabase = createAdminClient();

    const grossSalary = data.baseSalary + data.allowances;
    const netSalary = Math.max(0, grossSalary - data.deductions);
    const nowIso = new Date().toISOString();

    // 1. Fetch Staff Profile and System Settings in parallel
    const [{ data: staffProfile, error: staffError }, { data: settings }] = await Promise.all([
      adminSupabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, staff_number, departments(name)')
        .eq('id', data.staffId)
        .single(),
      adminSupabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle(),
    ]);

    if (staffError || !staffProfile) {
      throw new Error('Staff member profile could not be found.');
    }

    // 2. Insert Payroll Record
    const { data: payrollRecord, error: recordError } = await adminSupabase
      .from('payroll_records')
      .insert({
        staff_id: data.staffId,
        pay_period: data.payPeriod,
        base_salary: data.baseSalary,
        allowances: data.allowances,
        deductions: data.deductions,
        net_salary: netSalary,
        payment_method: data.paymentMethod,
        status: 'PROCESSED',
        processed_at: nowIso,
        created_at: nowIso,
      })
      .select('id')
      .single();

    if (recordError || !payrollRecord) {
      throw recordError || new Error('Failed to record payroll transaction.');
    }

    // 3. Create Payslip Record
    let payslipStatus = 'GENERATED';
    let emailSent = false;
    let emailErrorDetail: string | undefined;

    const { data: payslipRecord } = await adminSupabase
      .from('payslips')
      .insert({
        profile_id: data.staffId,
        basic_salary: data.baseSalary,
        allowances_json: { allowances: data.allowances, gross: grossSalary },
        deductions_json: { deductions: data.deductions },
        net_pay: netSalary,
        status: payslipStatus,
        created_at: nowIso,
      })
      .select('id')
      .single();

    // 4. Send Email Automatically via Resend if enabled and email exists
    if (data.sendEmailImmediately && staffProfile.email) {
      const emailPayload: PayslipEmailData = {
        hospitalName: settings?.hospital_name || 'Hospital Medical Facility',
        brandTitle: settings?.brand_title || settings?.hospital_name,
        logoUrl: settings?.logo_url,
        tagline: settings?.tagline,
        hospitalAddress: settings?.address,
        hospitalPhone: settings?.phone,
        hospitalEmail: settings?.email,
        currencySymbol: settings?.currency_symbol || '$',
        currencyPosition: (settings?.currency_position as any) || 'prefix',
        recipientName: `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() || 'Staff Member',
        recipientEmail: staffProfile.email,
        staffNumber: staffProfile.staff_number,
        role: staffProfile.role || 'STAFF',
        department: (staffProfile.departments as any)?.name || 'General Staff',
        payPeriod: data.payPeriod,
        disbursedAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
        paymentMethod: data.paymentMethod,
        baseSalary: data.baseSalary,
        allowances: data.allowances,
        grossSalary,
        deductions: data.deductions,
        netSalary,
        payslipId: payslipRecord?.id || payrollRecord.id,
      };

      const emailResult = await sendPayslipEmailViaResend(emailPayload);
      if (emailResult.success) {
        emailSent = true;
        payslipStatus = 'SENT';
        if (payslipRecord?.id) {
          await adminSupabase
            .from('payslips')
            .update({ status: 'SENT' } as any)
            .eq('id', payslipRecord.id);
        }
      } else {
        emailErrorDetail = emailResult.error;
      }
    }

    revalidatePath('/hospital/hr');
    revalidatePath('/hospital/reports');

    return {
      success: true,
      recordId: payrollRecord.id,
      payslipId: payslipRecord?.id,
      netSalary,
      emailSent,
      emailWarning: emailErrorDetail,
      recipientEmail: staffProfile.email,
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function processBatchPayrollAction(input: unknown) {
  try {
    const { user } = await requireRole(['ADMIN', 'ACCOUNTANT']);
    const data = batchPayrollSchema.parse(input);
    const adminSupabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. Fetch Eligible Staff (exclude PATIENT profiles)
    let staffQuery = adminSupabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, staff_number, departments(name)')
      .neq('role', 'PATIENT');

    if (data.staffIds && data.staffIds.length > 0) {
      staffQuery = staffQuery.in('id', data.staffIds);
    }

    const [{ data: staffMembers, error: staffError }, { data: settings }] = await Promise.all([
      staffQuery,
      adminSupabase.from('system_settings').select('*').limit(1).maybeSingle(),
    ]);

    if (staffError || !staffMembers || staffMembers.length === 0) {
      throw new Error('No eligible staff members found for batch payroll disbursal.');
    }

    // 2. Parse pay period date components for payroll_runs
    const dateObj = new Date();
    const currentMonth = dateObj.getMonth() + 1;
    const currentYear = dateObj.getFullYear();

    const grossSalary = data.defaultBaseSalary + data.defaultAllowances;
    const netSalary = Math.max(0, grossSalary - data.defaultDeductions);
    const totalPayout = netSalary * staffMembers.length;

    // 3. Create Payroll Run Record
    const { data: payrollRun, error: runError } = await adminSupabase
      .from('payroll_runs')
      .insert({
        month: currentMonth,
        year: currentYear,
        total_payout: totalPayout,
        status: 'COMPLETED',
        processed_by: user.id,
        processed_at: nowIso,
        created_at: nowIso,
      })
      .select('id')
      .single();

    const runId = payrollRun?.id || null;

    let processedCount = 0;
    let emailedCount = 0;
    const failedEmails: string[] = [];

    // 4. Process individual payroll & payslips
    for (const staff of staffMembers) {
      try {
        const { data: rec } = await adminSupabase
          .from('payroll_records')
          .insert({
            staff_id: staff.id,
            pay_period: data.payPeriod,
            base_salary: data.defaultBaseSalary,
            allowances: data.defaultAllowances,
            deductions: data.defaultDeductions,
            net_salary: netSalary,
            payment_method: data.paymentMethod,
            status: 'PROCESSED',
            processed_at: nowIso,
            created_at: nowIso,
          })
          .select('id')
          .single();

        const { data: payslip } = await adminSupabase
          .from('payslips')
          .insert({
            payroll_run_id: runId,
            profile_id: staff.id,
            basic_salary: data.defaultBaseSalary,
            allowances_json: { allowances: data.defaultAllowances, gross: grossSalary },
            deductions_json: { deductions: data.defaultDeductions },
            net_pay: netSalary,
            status: 'GENERATED',
            created_at: nowIso,
          })
          .select('id')
          .single();

        processedCount++;

        // Send Payslip Email
        if (data.sendEmailImmediately && staff.email) {
          const emailPayload: PayslipEmailData = {
            hospitalName: settings?.hospital_name || 'Hospital Medical Facility',
            brandTitle: settings?.brand_title || settings?.hospital_name,
            logoUrl: settings?.logo_url,
            tagline: settings?.tagline,
            hospitalAddress: settings?.address,
            hospitalPhone: settings?.phone,
            hospitalEmail: settings?.email,
            currencySymbol: settings?.currency_symbol || '$',
            currencyPosition: (settings?.currency_position as any) || 'prefix',
            recipientName: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Staff Member',
            recipientEmail: staff.email,
            staffNumber: staff.staff_number,
            role: staff.role || 'STAFF',
            department: (staff.departments as any)?.name || 'General Staff',
            payPeriod: data.payPeriod,
            disbursedAt: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
            paymentMethod: data.paymentMethod,
            baseSalary: data.defaultBaseSalary,
            allowances: data.defaultAllowances,
            grossSalary,
            deductions: data.defaultDeductions,
            netSalary,
            payslipId: payslip?.id || rec?.id,
          };

          const emailRes = await sendPayslipEmailViaResend(emailPayload);
          if (emailRes.success) {
            emailedCount++;
            if (payslip?.id) {
              await adminSupabase
                .from('payslips')
                .update({ status: 'SENT' } as any)
                .eq('id', payslip.id);
            }
          } else {
            failedEmails.push(`${staff.first_name} ${staff.last_name} (${emailRes.error || 'delivery failed'})`);
          }
        }
      } catch (innerErr) {
        console.error(`Failed to process payroll for staff ${staff.id}:`, innerErr);
      }
    }

    revalidatePath('/hospital/hr');
    revalidatePath('/hospital/reports');

    return {
      success: true,
      processedCount,
      totalPayout,
      emailedCount,
      failedEmails,
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function sendPayslipEmailAction(recordId: string) {
  try {
    await requireRole(['ADMIN', 'ACCOUNTANT']);
    const id = uuidSchema.parse(recordId);
    const adminSupabase = createAdminClient();

    // 1. Fetch Payroll Record and related Staff Profile
    const { data: record, error: recError } = await adminSupabase
      .from('payroll_records')
      .select('*, profiles(id, first_name, last_name, email, role, staff_number, departments(name))')
      .eq('id', id)
      .single();

    if (recError || !record) {
      throw new Error('Payroll record was not found.');
    }

    const staff = (record as any).profiles;
    if (!staff || !staff.email) {
      throw new Error('Employee email address is missing on profile. Please update employee contact info.');
    }

    // 2. Fetch System Settings
    const { data: settings } = await adminSupabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const baseSalary = Number(record.base_salary || 0);
    const allowances = Number(record.allowances || 0);
    const deductions = Number(record.deductions || 0);
    const grossSalary = baseSalary + allowances;
    const netSalary = Number(record.net_salary || Math.max(0, grossSalary - deductions));

    const emailPayload: PayslipEmailData = {
      hospitalName: settings?.hospital_name || 'Hospital Medical Facility',
      brandTitle: settings?.brand_title || settings?.hospital_name,
      logoUrl: settings?.logo_url,
      tagline: settings?.tagline,
      hospitalAddress: settings?.address,
      hospitalPhone: settings?.phone,
      hospitalEmail: settings?.email,
      currencySymbol: settings?.currency_symbol || '$',
      currencyPosition: (settings?.currency_position as any) || 'prefix',
      recipientName: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Staff Member',
      recipientEmail: staff.email,
      staffNumber: staff.staff_number,
      role: staff.role || 'STAFF',
      department: staff.departments?.name || 'Hospital Department',
      payPeriod: record.pay_period || 'Salary Period',
      disbursedAt: record.created_at
        ? new Date(record.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : new Date().toLocaleDateString(),
      paymentMethod: record.payment_method || 'BANK_TRANSFER',
      baseSalary,
      allowances,
      grossSalary,
      deductions,
      netSalary,
      payslipId: record.id,
    };

    const emailResult = await sendPayslipEmailViaResend(emailPayload);
    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Email service rejected payslip transmission.');
    }

    // Update payslip record status if exists
    await adminSupabase
      .from('payslips')
      .update({ status: 'SENT' } as any)
      .eq('profile_id', staff.id);

    revalidatePath('/hospital/hr');

    return {
      success: true,
      recipientEmail: staff.email,
      recipientName: `${staff.first_name} ${staff.last_name}`,
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}

export async function getPayslipDetailsAction(recordId: string) {
  try {
    await requireRole(['ADMIN', 'ACCOUNTANT', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'STAFF']);
    const id = uuidSchema.parse(recordId);
    const adminSupabase = createAdminClient();

    const [{ data: record, error: recError }, { data: settings }] = await Promise.all([
      adminSupabase
        .from('payroll_records')
        .select('*, profiles(id, first_name, last_name, email, role, staff_number, phone, departments(name))')
        .eq('id', id)
        .single(),
      adminSupabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .maybeSingle(),
    ]);

    if (recError || !record) {
      throw new Error('Payroll record not found.');
    }

    const staff = (record as any).profiles;

    return {
      success: true,
      payslip: {
        id: record.id,
        payPeriod: record.pay_period,
        disbursedAt: record.created_at,
        paymentMethod: record.payment_method || 'BANK_TRANSFER',
        baseSalary: Number(record.base_salary || 0),
        allowances: Number(record.allowances || 0),
        deductions: Number(record.deductions || 0),
        grossSalary: Number(record.base_salary || 0) + Number(record.allowances || 0),
        netSalary: Number(record.net_salary || 0),
        status: record.status || 'PROCESSED',
        staff: {
          id: staff?.id,
          name: `${staff?.first_name || ''} ${staff?.last_name || ''}`.trim(),
          email: staff?.email,
          phone: staff?.phone,
          role: staff?.role,
          staffNumber: staff?.staff_number,
          department: staff?.departments?.name,
        },
        hospital: {
          name: settings?.hospital_name || 'HMS Hospital',
          brandTitle: settings?.brand_title || settings?.hospital_name,
          logoUrl: settings?.logo_url,
          tagline: settings?.tagline,
          address: settings?.address,
          phone: settings?.phone,
          email: settings?.email,
          currencySymbol: settings?.currency_symbol || '$',
          currencyPosition: settings?.currency_position || 'prefix',
        },
      },
    };
  } catch (error) {
    return { success: false, error: actionError(error) };
  }
}
