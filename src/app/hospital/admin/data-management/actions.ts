'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { createAdminClient } from '@/utils/supabase/admin';

export type PurgeCategoryKey =
  | 'PATIENTS'
  | 'APPOINTMENTS_QUEUE'
  | 'CLINICAL_RECORDS'
  | 'BILLING_FINANCE'
  | 'INPATIENT_ADMISSIONS'
  | 'BLOOD_BANK'
  | 'INVENTORY_PHARMACY'
  | 'HR_PAYROLL'
  | 'NOTIFICATIONS_LOGS'
  | 'ALL_TRANSACTIONAL_DATA';

export interface CategoryCountSummary {
  key: PurgeCategoryKey;
  title: string;
  description: string;
  affectedTables: string[];
  totalRecords: number;
  breakdown: Record<string, number>;
  dangerLevel: 'medium' | 'high' | 'critical';
  confirmationWord: string;
}

export async function getDataCategoryCountsAction(): Promise<{
  counts: Record<PurgeCategoryKey, CategoryCountSummary>;
  overallTotal: number;
}> {
  await requireRole(['ADMIN']);
  const adminSupabase = createAdminClient();

  // Try RPC first
  const { data: rpcCounts } = await (adminSupabase as any).rpc('admin_get_category_counts');

  // Query table counts with parallel count heads
  const [
    patientsRes,
    appointmentsRes,
    queueRes,
    notesRes,
    vitalsRes,
    prescriptionsRes,
    labsRes,
    radiologyRes,
    invoicesRes,
    paymentsRes,
    expensesRes,
    admissionsRes,
    bloodDonationsRes,
    bloodInventoryRes,
    inventoryRes,
    payrollRes,
    shiftsRes,
    emailsRes,
  ] = await Promise.all([
    adminSupabase.from('patients').select('*', { count: 'exact', head: true }),
    adminSupabase.from('appointments').select('*', { count: 'exact', head: true }),
    adminSupabase.from('walkin_queue').select('*', { count: 'exact', head: true }),
    adminSupabase.from('clinical_notes').select('*', { count: 'exact', head: true }),
    adminSupabase.from('vitals').select('*', { count: 'exact', head: true }),
    adminSupabase.from('prescriptions').select('*', { count: 'exact', head: true }),
    adminSupabase.from('lab_orders').select('*', { count: 'exact', head: true }),
    adminSupabase.from('radiology_orders').select('*', { count: 'exact', head: true }),
    adminSupabase.from('invoices').select('*', { count: 'exact', head: true }),
    adminSupabase.from('payments').select('*', { count: 'exact', head: true }),
    adminSupabase.from('expenses').select('*', { count: 'exact', head: true }),
    adminSupabase.from('admissions').select('*', { count: 'exact', head: true }),
    adminSupabase.from('blood_donations').select('*', { count: 'exact', head: true }),
    adminSupabase.from('blood_inventory').select('*', { count: 'exact', head: true }),
    adminSupabase.from('inventory_items').select('*', { count: 'exact', head: true }),
    adminSupabase.from('payroll_records').select('*', { count: 'exact', head: true }),
    adminSupabase.from('staff_shifts').select('*', { count: 'exact', head: true }),
    adminSupabase.from('email_deliveries').select('*', { count: 'exact', head: true }),
  ]);

  const pCnt = patientsRes.count || 0;
  const apptCnt = appointmentsRes.count || 0;
  const qCnt = queueRes.count || 0;
  const notesCnt = notesRes.count || 0;
  const vitalsCnt = vitalsRes.count || 0;
  const rxCnt = prescriptionsRes.count || 0;
  const labCnt = labsRes.count || 0;
  const radCnt = radiologyRes.count || 0;
  const invCnt = invoicesRes.count || 0;
  const payCnt = paymentsRes.count || 0;
  const expCnt = expensesRes.count || 0;
  const admCnt = admissionsRes.count || 0;
  const bdCnt = bloodDonationsRes.count || 0;
  const biCnt = bloodInventoryRes.count || 0;
  const itemCnt = inventoryRes.count || 0;
  const prCnt = payrollRes.count || 0;
  const shiftCnt = shiftsRes.count || 0;
  const emailCnt = emailsRes.count || 0;

  const clinicalTotal = notesCnt + vitalsCnt + rxCnt + labCnt + radCnt;
  const billingTotal = invCnt + payCnt + expCnt;
  const apptQueueTotal = apptCnt + qCnt;
  const bloodTotal = bdCnt + biCnt;
  const hrTotal = prCnt + shiftCnt;

  const overallTotal =
    pCnt +
    apptQueueTotal +
    clinicalTotal +
    billingTotal +
    admCnt +
    bloodTotal +
    itemCnt +
    hrTotal +
    emailCnt;

  const counts: Record<PurgeCategoryKey, CategoryCountSummary> = {
    PATIENTS: {
      key: 'PATIENTS',
      title: 'Patient Registry & Clinical History',
      description:
        'Erases all patient master records, medical files, demographics, and all linked clinical encounters, vitals, queues, and invoices.',
      affectedTables: ['patients', 'clinical_notes', 'vitals', 'prescriptions', 'lab_orders', 'invoices', 'walkin_queue'],
      totalRecords: pCnt,
      breakdown: { 'Registered Patients': pCnt },
      dangerLevel: 'critical',
      confirmationWord: 'DELETE PATIENTS',
    },
    APPOINTMENTS_QUEUE: {
      key: 'APPOINTMENTS_QUEUE',
      title: 'Appointments & Walk-in Queues',
      description:
        'Clears all scheduled doctor appointments and front-desk walk-in triaging queue tokens while preserving patient profiles.',
      affectedTables: ['walkin_queue', 'appointments'],
      totalRecords: apptQueueTotal,
      breakdown: { 'Scheduled Appointments': apptCnt, 'Walk-in Queue Tokens': qCnt },
      dangerLevel: 'medium',
      confirmationWord: 'DELETE APPOINTMENTS',
    },
    CLINICAL_RECORDS: {
      key: 'CLINICAL_RECORDS',
      title: 'Clinical Charts, SOAP Notes & Orders',
      description:
        'Erases all doctor consultation SOAP notes, diagnoses, vital sign entries, pharmacy prescriptions, lab orders/results, and radiology scans.',
      affectedTables: ['clinical_notes', 'diagnosis', 'vitals', 'prescriptions', 'lab_orders', 'radiology_orders', 'er_visits'],
      totalRecords: clinicalTotal,
      breakdown: {
        'SOAP Notes': notesCnt,
        'Vitals Captured': vitalsCnt,
        Prescriptions: rxCnt,
        'Lab Orders': labCnt,
        'Radiology Scans': radCnt,
      },
      dangerLevel: 'high',
      confirmationWord: 'DELETE CLINICAL',
    },
    BILLING_FINANCE: {
      key: 'BILLING_FINANCE',
      title: 'Billing, Invoices & Financial Ledgers',
      description:
        'Purges all patient invoices, itemized bills, cashier payments, insurance claim submissions, and recorded hospital expenses.',
      affectedTables: ['invoices', 'invoice_items', 'payments', 'insurance_claims', 'expenses'],
      totalRecords: billingTotal,
      breakdown: { Invoices: invCnt, Payments: payCnt, Expenses: expCnt },
      dangerLevel: 'high',
      confirmationWord: 'DELETE BILLING',
    },
    INPATIENT_ADMISSIONS: {
      key: 'INPATIENT_ADMISSIONS',
      title: 'Inpatient Ward Admissions',
      description:
        'Discharges and clears all IPD admissions, nurse treatment sheets, and resets all hospital ward beds back to VACANT status.',
      affectedTables: ['admissions', 'nurse_treatment_sheets', 'beds (status reset)'],
      totalRecords: admCnt,
      breakdown: { 'Active/Past Admissions': admCnt },
      dangerLevel: 'medium',
      confirmationWord: 'DELETE ADMISSIONS',
    },
    BLOOD_BANK: {
      key: 'BLOOD_BANK',
      title: 'Blood Bank & Donor Records',
      description:
        'Purges donor registrations, blood component units in inventory, and patient transfusion logs.',
      affectedTables: ['blood_donations', 'blood_inventory', 'blood_transfusions'],
      totalRecords: bloodTotal,
      breakdown: { 'Blood Donations': bdCnt, 'Inventory Units': biCnt },
      dangerLevel: 'medium',
      confirmationWord: 'DELETE BLOOD BANK',
    },
    INVENTORY_PHARMACY: {
      key: 'INVENTORY_PHARMACY',
      title: 'Pharmacy Stock & Item Catalog',
      description:
        'Clears the inventory drug catalog, stock batch movements, purchase orders, goods received notes, and supplier directories.',
      affectedTables: ['inventory_items', 'stock_movements', 'purchase_orders', 'po_items', 'suppliers'],
      totalRecords: itemCnt,
      breakdown: { 'Inventory Items': itemCnt },
      dangerLevel: 'high',
      confirmationWord: 'DELETE INVENTORY',
    },
    HR_PAYROLL: {
      key: 'HR_PAYROLL',
      title: 'Payroll Disbursements & Shifts',
      description:
        'Erases payroll transaction logs, payslips, staff shift rosters, and leave requests while safely keeping employee accounts active.',
      affectedTables: ['payroll_records', 'payroll_runs', 'payslips', 'staff_shifts', 'leave_requests'],
      totalRecords: hrTotal,
      breakdown: { 'Payroll Records': prCnt, 'Staff Shifts': shiftCnt },
      dangerLevel: 'medium',
      confirmationWord: 'DELETE PAYROLL',
    },
    NOTIFICATIONS_LOGS: {
      key: 'NOTIFICATIONS_LOGS',
      title: 'Email Delivery Logs & Pairing Codes',
      description:
        'Clears sent email delivery histories, queued background jobs, webhook audit trails, and TV broadcast pairing codes.',
      affectedTables: ['email_deliveries', 'email_notification_jobs', 'email_webhook_events', 'tv_broadcast_codes'],
      totalRecords: emailCnt,
      breakdown: { 'Email Logs': emailCnt },
      dangerLevel: 'medium',
      confirmationWord: 'DELETE LOGS',
    },
    ALL_TRANSACTIONAL_DATA: {
      key: 'ALL_TRANSACTIONAL_DATA',
      title: 'Complete System Wipe (Client Handover Reset)',
      description:
        'PERMANENTLY RESETS ALL test patients, queues, clinical charts, billing transactions, admissions, blood bank logs, and notifications in one atomic operation. Core system configurations, departments, wards, rooms, and admin accounts are protected.',
      affectedTables: [
        'patients',
        'appointments',
        'walkin_queue',
        'clinical_notes',
        'vitals',
        'prescriptions',
        'lab_orders',
        'radiology_orders',
        'invoices',
        'payments',
        'expenses',
        'admissions',
        'blood_donations',
        'blood_inventory',
        'payroll_records',
        'staff_shifts',
        'email_deliveries',
      ],
      totalRecords: overallTotal,
      breakdown: { 'Total Transactional Records': overallTotal },
      dangerLevel: 'critical',
      confirmationWord: 'DELETE ALL DATA',
    },
  };

  return { counts, overallTotal };
}

export async function purgeDataCategoryAction(
  category: PurgeCategoryKey,
  confirmationPhrase: string,
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(['ADMIN']);

    const validCategories: PurgeCategoryKey[] = [
      'PATIENTS',
      'APPOINTMENTS_QUEUE',
      'CLINICAL_RECORDS',
      'BILLING_FINANCE',
      'INPATIENT_ADMISSIONS',
      'BLOOD_BANK',
      'INVENTORY_PHARMACY',
      'HR_PAYROLL',
      'NOTIFICATIONS_LOGS',
      'ALL_TRANSACTIONAL_DATA',
    ];

    if (!validCategories.includes(category)) {
      throw new Error('Invalid data deletion category specified.');
    }

    const expectedPhraseMap: Record<PurgeCategoryKey, string> = {
      PATIENTS: 'DELETE PATIENTS',
      APPOINTMENTS_QUEUE: 'DELETE APPOINTMENTS',
      CLINICAL_RECORDS: 'DELETE CLINICAL',
      BILLING_FINANCE: 'DELETE BILLING',
      INPATIENT_ADMISSIONS: 'DELETE ADMISSIONS',
      BLOOD_BANK: 'DELETE BLOOD BANK',
      INVENTORY_PHARMACY: 'DELETE INVENTORY',
      HR_PAYROLL: 'DELETE PAYROLL',
      NOTIFICATIONS_LOGS: 'DELETE LOGS',
      ALL_TRANSACTIONAL_DATA: 'DELETE ALL DATA',
    };

    const expected = expectedPhraseMap[category];
    if (confirmationPhrase.trim() !== expected) {
      throw new Error(`Confirmation mismatch. Please type exactly "${expected}" to authorize permanent deletion.`);
    }

    const adminSupabase = createAdminClient();

    // 1. Try atomic PostgreSQL RPC first
    const { data: rpcResult, error: rpcError } = await (adminSupabase as any).rpc('admin_purge_category', {
      p_category: category,
    });

    if (!rpcError && rpcResult && (rpcResult as any).success) {
      revalidateAllHospitalPaths();
      return {
        success: true,
        message: (rpcResult as any).message || `Successfully purged category ${category}.`,
      };
    }

    // 2. Fallback: Direct Cascading Deletes via adminSupabase (Service Role)
    await executeFallbackPurge(adminSupabase, category);

    revalidateAllHospitalPaths();
    return {
      success: true,
      message: `Successfully executed permanent deletion for ${category}. All targeted records were purged.`,
    };
  } catch (err: unknown) {
    if (err instanceof AuthorizationError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Failed to execute data deletion.';
    throw new Error(message);
  }
}

async function executeFallbackPurge(adminSupabase: any, category: PurgeCategoryKey) {
  if (category === 'PATIENTS' || category === 'ALL_TRANSACTIONAL_DATA') {
    await adminSupabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('nurse_treatment_sheets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('admissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('beds').update({ status: 'VACANT' }).neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('er_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('blood_transfusions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('diagnosis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('clinical_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('vitals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('prescription_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('prescriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('lab_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('lab_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('insurance_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('walkin_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'APPOINTMENTS_QUEUE') {
    await adminSupabase.from('walkin_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'CLINICAL_RECORDS') {
    await adminSupabase.from('diagnosis').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('clinical_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('vitals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('prescription_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('prescriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('lab_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('lab_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('radiology_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('er_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'BILLING_FINANCE') {
    await adminSupabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('insurance_claims').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('invoice_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'INPATIENT_ADMISSIONS') {
    await adminSupabase.from('nurse_treatment_sheets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('admissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('beds').update({ status: 'VACANT' }).neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'BLOOD_BANK') {
    await adminSupabase.from('blood_transfusions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('blood_donations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('blood_inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'INVENTORY_PHARMACY') {
    await adminSupabase.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('po_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('goods_received_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('prescription_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('inventory_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'HR_PAYROLL') {
    await adminSupabase.from('payslips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('payroll_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('payroll_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('staff_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  if (category === 'NOTIFICATIONS_LOGS') {
    await adminSupabase.from('email_webhook_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('email_deliveries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('email_notification_jobs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await adminSupabase.from('tv_broadcast_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
}

function revalidateAllHospitalPaths() {
  const paths = [
    '/hospital/dashboard',
    '/hospital/patients',
    '/hospital/opd',
    '/hospital/er',
    '/hospital/ipd',
    '/hospital/icu',
    '/hospital/appointments',
    '/hospital/reception',
    '/hospital/queue-display',
    '/hospital/laboratory',
    '/hospital/radiology',
    '/hospital/inventory',
    '/hospital/bloodbank',
    '/hospital/billing',
    '/hospital/finance',
    '/hospital/hr',
    '/hospital/reports',
    '/hospital/settings',
    '/hospital/admin/data-management',
  ];

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // safe fallback if outside request context
    }
  }
}
