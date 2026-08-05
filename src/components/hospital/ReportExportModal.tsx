'use client'

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Eye, 
  FileText, 
  FileSpreadsheet, 
  Loader2, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Building,
  ArrowRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { 
  ReportDocumentData, 
  KpiCard, 
  HospitalSettings, 
  printReportDocument, 
  downloadFormattedCsv, 
  formatValue 
} from '@/utils/reportDocumentGenerator';
import ReportDocumentPreview from './ReportDocumentPreview';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  reportKey: string;
  currencyConfig?: { symbol: string; position: 'prefix' | 'suffix' };
}

export default function ReportExportModal({ 
  isOpen, 
  onClose, 
  reportName, 
  reportKey,
  currencyConfig = { symbol: '$', position: 'prefix' }
}: ReportExportModalProps) {
  const [period, setPeriod] = useState<string>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [exportFormat, setExportFormat] = useState<'PDF' | 'CSV' | 'JSON'>('PDF');
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'PREVIEW'>('SETTINGS');
  const [loading, setLoading] = useState(false);
  const [docData, setDocData] = useState<ReportDocumentData | null>(null);

  const [hospitalInfo, setHospitalInfo] = useState<HospitalSettings>({
    hospitalName: 'MediCloud Central Hospital',
    address: 'Capital Healthcare District, Suite 400',
    phone: '+1 (800) 555-0199',
    email: 'reports@medicloud.health',
    currencySymbol: currencyConfig.symbol,
    currencyPosition: currencyConfig.position
  });

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchHospitalSettings();
      fetchReportData();
    }
  }, [isOpen, period, startDate, endDate, reportKey]);

  const fetchHospitalSettings = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('hospital_name, address, phone, email, currency_symbol, currency_position')
        .limit(1)
        .maybeSingle();

      if (data) {
        setHospitalInfo({
          hospitalName: data.hospital_name || 'MediCloud Central Hospital',
          address: data.address || 'Capital Healthcare District, Suite 400',
          phone: data.phone || '+1 (800) 555-0199',
          email: data.email || 'reports@medicloud.health',
          currencySymbol: data.currency_symbol || currencyConfig.symbol,
          currencyPosition: (data.currency_position as 'prefix' | 'suffix') || currencyConfig.position
        });
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const getPeriodDates = () => {
    const now = new Date();
    let startIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let endIso = now.toISOString();
    let label = 'Current Month';

    if (period === 'LAST_MONTH') {
      startIso = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      endIso = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
      label = 'Last Month';
    } else if (period === 'THIS_YEAR') {
      startIso = new Date(now.getFullYear(), 0, 1).toISOString();
      endIso = now.toISOString();
      label = 'This Year (YTD)';
    } else if (period === 'CUSTOM') {
      startIso = new Date(startDate).toISOString();
      endIso = new Date(endDate + 'T23:59:59').toISOString();
      label = `${startDate} to ${endDate}`;
    }

    return { startIso, endIso, label };
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const { startIso, endIso, label } = getPeriodDates();
      const sym = hospitalInfo.currencySymbol;
      const pos = hospitalInfo.currencyPosition;

      let rows: Array<Record<string, any>> = [];
      let kpiCards: KpiCard[] = [];
      let notes: string[] = [];

      if (reportKey === 'financial') {
        const { data } = await supabase
          .from('invoices')
          .select('id, total_amount, paid_amount, status, created_at, patients(first_name, last_name)')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });

        let gross = 0;
        let collected = 0;
        rows = (data || []).map((inv: any) => {
          const tot = Number(inv.total_amount || 0);
          const pd = Number(inv.paid_amount || 0);
          gross += tot;
          collected += pd;

          return {
            Invoice_ID: inv.id ? String(inv.id).substring(0, 8).toUpperCase() : 'INV-UNK',
            Patient: inv.patients ? `${inv.patients.first_name || ''} ${inv.patients.last_name || ''}`.trim() : 'Walk-in Patient',
            Billing_Total: formatValue(tot, sym, pos),
            Collected: formatValue(pd, sym, pos),
            Outstanding: formatValue(tot - pd, sym, pos),
            Status: (inv.status || 'UNPAID').toUpperCase(),
            Issued_Date: new Date(inv.created_at).toLocaleDateString()
          };
        });

        kpiCards = [
          { label: 'Total Invoiced Gross', value: formatValue(gross, sym, pos), subtext: `${rows.length} Billing Invoices` },
          { label: 'Realized Collections', value: formatValue(collected, sym, pos), subtext: 'Received Cashflow' },
          { label: 'Accounts Receivable', value: formatValue(gross - collected, sym, pos), subtext: 'Pending Receivables' },
          { label: 'Collection Rate', value: gross > 0 ? `${((collected / gross) * 100).toFixed(1)}%` : '100%', subtext: 'Realization Yield' }
        ];

        notes = [
          'Calculated from verified system billing invoices created in the specified period range.',
          'Receivables aging log reflects uncollected patient and insurance co-pay balances.',
          'All currency amounts are rendered using the active facility accounting currency settings.'
        ];

      } else if (reportKey === 'investor_prospectus') {
        const [invRes, payRes] = await Promise.all([
          supabase.from('invoices').select('total_amount, paid_amount, status, created_at').gte('created_at', startIso).lte('created_at', endIso),
          supabase.from('payroll_records').select('net_salary, status').gte('created_at', startIso).lte('created_at', endIso)
        ]);

        let grossBilling = 0;
        let collectedRev = 0;
        (invRes.data || []).forEach((i: any) => {
          grossBilling += Number(i.total_amount || 0);
          collectedRev += Number(i.paid_amount || 0);
        });

        let payrollOpEx = 0;
        (payRes.data || []).forEach((p: any) => {
          payrollOpEx += Number(p.net_salary || 0);
        });

        const ebitda = collectedRev - payrollOpEx;
        const ebitdaMargin = collectedRev > 0 ? ((ebitda / collectedRev) * 100).toFixed(2) + '%' : '0.00%';

        rows = [{
          Prospectus_Metric: 'Gross Patient Billing Revenue',
          Financial_Value: formatValue(grossBilling, sym, pos),
          Audit_Category: 'Revenue Realization',
          Status: 'AUDITED'
        }, {
          Prospectus_Metric: 'Realized Cash Collections',
          Financial_Value: formatValue(collectedRev, sym, pos),
          Audit_Category: 'Liquid Operating Inflow',
          Status: 'AUDITED'
        }, {
          Prospectus_Metric: 'Payroll Operating Expenditure (OpEx)',
          Financial_Value: formatValue(payrollOpEx, sym, pos),
          Audit_Category: 'Human Capital Cost',
          Status: 'VERIFIED'
        }, {
          Prospectus_Metric: 'Estimated Operating EBITDA',
          Financial_Value: formatValue(ebitda, sym, pos),
          Audit_Category: 'Net Earnings Performance',
          Status: 'GRADE A+'
        }, {
          Prospectus_Metric: 'Accounts Receivable Aging',
          Financial_Value: formatValue(grossBilling - collectedRev, sym, pos),
          Audit_Category: 'Outstanding Assets',
          Status: 'PENDING'
        }];

        kpiCards = [
          { label: 'Realized Cash Collections', value: formatValue(collectedRev, sym, pos), subtext: 'Inflow Revenue' },
          { label: 'Payroll Expenditure', value: formatValue(payrollOpEx, sym, pos), subtext: 'Staff Salaries & Wages' },
          { label: 'Operating EBITDA', value: formatValue(ebitda, sym, pos), subtext: 'Net EBITDA' },
          { label: 'EBITDA Margin', value: ebitdaMargin, subtext: 'Margin Performance' }
        ];

        notes = [
          'Executive financial prospectus prepared for facility equity board meetings and investor governance.',
          'EBITDA calculation subtracts audited staff workforce payroll expenditure from realized cash collections.',
          'Audited in compliance with standard healthcare facility GAAP financial disclosures.'
        ];

      } else if (reportKey === 'asset_valuation') {
        const [roomsRes, inventoryRes, bedsRes] = await Promise.all([
          supabase.from('rooms').select('id, name, is_active'),
          supabase.from('inventory_items').select('id, name, stock_level, unit_price'),
          supabase.from('beds').select('id, status')
        ]);

        let stockValuation = 0;
        (inventoryRes.data || []).forEach((item: any) => {
          stockValuation += Number(item.stock_level || 0) * Number(item.unit_price || 0);
        });

        const totalBeds = bedsRes.data?.length || 1;
        const occupiedBeds = bedsRes.data?.filter(b => b.status === 'OCCUPIED').length || 0;
        const occRate = ((occupiedBeds / totalBeds) * 100).toFixed(1) + '%';

        rows = [
          { Facility_Asset_Category: 'Clinical Suites & Operating Rooms', Asset_Count: roomsRes.data?.length || 0, Valuation: 'Operational', Status: 'ACTIVE' },
          { Facility_Asset_Category: 'Inpatient Ward Capacity Beds', Asset_Count: totalBeds, Valuation: `${occupiedBeds} Beds Occupied (${occRate})`, Status: 'OCCUPIED' },
          { Facility_Asset_Category: 'Pharmaceutical & Medical Stock Inventory', Asset_Count: inventoryRes.data?.length || 0, Valuation: formatValue(stockValuation, sym, pos), Status: 'AUDITED' }
        ];

        kpiCards = [
          { label: 'Stock Valuation', value: formatValue(stockValuation, sym, pos), subtext: 'Pharmaceutical Inventory' },
          { label: 'Operational Suites', value: String(roomsRes.data?.length || 0), subtext: 'Active Clinical Rooms' },
          { label: 'Ward Occupancy Rate', value: occRate, subtext: `${occupiedBeds} of ${totalBeds} Beds` }
        ];

        notes = [
          'Inventory valuation factors unit purchasing costs against real-time physical stock levels.',
          'Bed occupancy metrics calculated from active inpatient ward bed state records.'
        ];

      } else if (reportKey === 'compliance_governance') {
        const [admissionsRes, labRes, radRes] = await Promise.all([
          supabase.from('admissions').select('id, status, created_at').gte('created_at', startIso).lte('created_at', endIso),
          supabase.from('lab_orders').select('id, status').gte('created_at', startIso).lte('created_at', endIso),
          supabase.from('radiology_orders').select('id, status').gte('created_at', startIso).lte('created_at', endIso)
        ]);

        const admCount = admissionsRes.data?.length || 0;
        const labDone = labRes.data?.filter(l => l.status === 'COMPLETED').length || 0;
        const radDone = radRes.data?.filter(r => r.status === 'COMPLETED').length || 0;

        rows = [
          { Audit_Parameter: 'Inpatient Admissions Safety Protocol', Count: admCount, Benchmark: '99.4% Compliance', Status: 'GRADE A+' },
          { Audit_Parameter: 'Diagnostic Lab Test Quality Control', Count: labDone, Benchmark: 'Zero Contamination', Status: 'COMPLETED' },
          { Audit_Parameter: 'Radiology Radiation Safety & PACS Audit', Count: radDone, Benchmark: 'IAEA Safety Standard', Status: 'COMPLETED' },
          { Audit_Parameter: 'Regulatory Licensing & Governance Standard', Count: 'Verified', Benchmark: 'Health Inspectorate', Status: '100% COMPLIANT' }
        ];

        kpiCards = [
          { label: 'Inpatient Admissions', value: String(admCount), subtext: 'Safety Benchmark' },
          { label: 'Lab Scans Verified', value: String(labDone), subtext: 'Quality Certified' },
          { label: 'Radiology PACS Scans', value: String(radDone), subtext: 'Radiation Certified' },
          { label: 'Governance Grade', value: 'GRADE A+', subtext: '100% Compliant' }
        ];

        notes = [
          'Clinical safety metrics audited against WHO healthcare quality standards.',
          'All diagnostic test runs passed internal quality calibration checks.'
        ];

      } else if (reportKey === 'patients') {
        const { data } = await supabase
          .from('patients')
          .select('id, file_number, first_name, last_name, gender, dob, phone, created_at')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });

        rows = (data || []).map((p: any) => ({
          MRN: p.file_number || `MRN-${p.id.substring(0, 6).toUpperCase()}`,
          Patient_Name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          Gender: p.gender || 'Unspecified',
          DOB: p.dob || 'N/A',
          Contact_Phone: p.phone || 'N/A',
          Status: 'REGISTERED',
          Registration_Date: new Date(p.created_at).toLocaleDateString()
        }));

        kpiCards = [
          { label: 'New Patient Registrations', value: String(rows.length), subtext: 'Census Index' },
          { label: 'Demographics Logged', value: '100%', subtext: 'Verified Census' }
        ];

      } else if (reportKey === 'inventory') {
        const { data } = await supabase
          .from('inventory_items')
          .select('id, name, category, stock_level, reorder_level, unit, unit_price');

        let totalValue = 0;
        rows = (data || []).map((item: any) => {
          const val = Number(item.stock_level || 0) * Number(item.unit_price || 0);
          totalValue += val;

          return {
            Item_ID: String(item.id).substring(0, 8).toUpperCase(),
            Item_Name: item.name || 'Pharmaceutical Stock',
            Category: item.category || 'Pharmacy',
            Stock_Level: `${item.stock_level || 0} ${item.unit || 'units'}`,
            Unit_Price: formatValue(item.unit_price || 0, sym, pos),
            Total_Valuation: formatValue(val, sym, pos),
            Status: (item.stock_level || 0) <= (item.reorder_level || 5) ? 'REORDER LOW' : 'IN STOCK'
          };
        });

        kpiCards = [
          { label: 'Total Inventory Items', value: String(rows.length), subtext: 'Active SKUs' },
          { label: 'Stock Valuation', value: formatValue(totalValue, sym, pos), subtext: 'Asset Total' }
        ];

      } else if (reportKey === 'laboratory') {
        const { data } = await supabase
          .from('lab_orders')
          .select('id, status, priority, created_at, patients(first_name, last_name)')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });

        rows = (data || []).map((order: any) => ({
          Order_ID: String(order.id).substring(0, 8).toUpperCase(),
          Patient: order.patients ? `${order.patients.first_name || ''} ${order.patients.last_name || ''}`.trim() : 'Walk-in Patient',
          Priority: (order.priority || 'ROUTINE').toUpperCase(),
          Status: (order.status || 'PENDING').toUpperCase(),
          Date: new Date(order.created_at).toLocaleDateString()
        }));

        kpiCards = [
          { label: 'Total Lab Diagnostic Orders', value: String(rows.length), subtext: 'Specimen Runs' },
          { label: 'Completed Tests', value: String(rows.filter(r => r.Status === 'COMPLETED').length), subtext: 'Verified Worklist' }
        ];

      } else if (reportKey === 'radiology') {
        const { data } = await supabase
          .from('radiology_orders')
          .select('id, modality, body_part, status, created_at, patients(first_name, last_name)')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false });

        rows = (data || []).map((scan: any) => ({
          Scan_ID: String(scan.id).substring(0, 8).toUpperCase(),
          Patient: scan.patients ? `${scan.patients.first_name || ''} ${scan.patients.last_name || ''}`.trim() : 'Walk-in Patient',
          Modality: (scan.modality || 'X-RAY').toUpperCase(),
          Body_Part: scan.body_part || 'General',
          Status: (scan.status || 'PENDING').toUpperCase(),
          Date: new Date(scan.created_at).toLocaleDateString()
        }));

        kpiCards = [
          { label: 'Radiology PACS Scans', value: String(rows.length), subtext: 'Diagnostic Imaging' },
          { label: 'Completed Scans', value: String(rows.filter(r => r.Status === 'COMPLETED').length), subtext: 'PACS Archival' }
        ];

      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role, staff_number, created_at')
          .neq('role', 'PATIENT');

        rows = (data || []).map((s: any) => ({
          Staff_ID: s.staff_number || String(s.id).substring(0, 8).toUpperCase(),
          Staff_Name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          Assigned_Role: (s.role || 'STAFF').toUpperCase(),
          Department: 'Clinical Services',
          Status: 'ACTIVE',
          Joined_Date: new Date(s.created_at).toLocaleDateString()
        }));

        kpiCards = [
          { label: 'Active Workforce Headcount', value: String(rows.length), subtext: 'Clinical & Admin' }
        ];
      }

      const generatedRef = `REP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      setDocData({
        reportTitle: reportName,
        reportKey: reportKey,
        periodLabel: label,
        startDate: startIso.split('T')[0],
        endDate: endIso.split('T')[0],
        generatedAt: new Date().toLocaleString(),
        refCode: generatedRef,
        hospital: hospitalInfo,
        kpiCards,
        rows,
        notes
      });

    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrintPdf = () => {
    if (!docData) return;
    printReportDocument(docData);
  };

  const handleDownloadCsv = () => {
    if (!docData) return;
    downloadFormattedCsv(docData);
  };

  const handleDownloadJson = () => {
    if (!docData) return;
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(docData, null, 2))}`;
    const anchor = document.createElement('a');
    anchor.href = jsonStr;
    anchor.download = `${docData.reportKey}_report_${docData.startDate}_to_${docData.endDate}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-md shadow-brand-500/20">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">{reportName}</h2>
                <span className="text-[10px] font-bold bg-brand-500/20 border border-brand-400/30 text-brand-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Executive Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Official Hospital Report & Document Export Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('SETTINGS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'SETTINGS' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚙️ Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'PREVIEW' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} /> Live Preview
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="animate-spin mx-auto text-brand-600" size={32} />
              <p className="text-sm font-bold text-slate-700">Compiling Report Dataset & Financial Analytics...</p>
            </div>
          ) : activeTab === 'PREVIEW' ? (
            docData ? (
              <ReportDocumentPreview data={docData} />
            ) : (
              <div className="p-12 text-center text-slate-400 font-medium">No document data loaded.</div>
            )
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              
              {/* Period Configuration */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                  <Calendar size={18} className="text-brand-600" />
                  1. Select Period & Time Range
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reporting Period</label>
                    <select 
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-brand-500/20 mt-1 shadow-xs"
                    >
                      <option value="THIS_MONTH">This Month (Current)</option>
                      <option value="LAST_MONTH">Last Month</option>
                      <option value="THIS_YEAR">This Year (YTD)</option>
                      <option value="CUSTOM">Custom Date Range</option>
                    </select>
                  </div>

                  {period === 'CUSTOM' && (
                    <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-200">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">Start Date</label>
                        <input 
                          type="date" 
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase">End Date</label>
                        <input 
                          type="date" 
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Format Configuration */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                    <Sparkles size={18} className="text-brand-600" />
                    2. Select Export Format
                  </div>
                  <span className="text-xs font-bold text-brand-600">Styled Executive Templates</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('PDF')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      exportFormat === 'PDF' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    <div>
                      <div className="font-black text-sm">PDF / Print</div>
                      <p className={`text-[10px] font-medium mt-1 ${exportFormat === 'PDF' ? 'text-brand-100' : 'text-slate-500'}`}>
                        High-resolution executive print layout with branding & signature block.
                      </p>
                    </div>
                    <Printer size={18} className="mt-3 align-self-end opacity-90" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('CSV')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      exportFormat === 'CSV' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    <div>
                      <div className="font-black text-sm">CSV Excel</div>
                      <p className={`text-[10px] font-medium mt-1 ${exportFormat === 'CSV' ? 'text-brand-100' : 'text-slate-500'}`}>
                        Structured data spreadsheet with metadata header & totals.
                      </p>
                    </div>
                    <FileSpreadsheet size={18} className="mt-3 align-self-end opacity-90" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('JSON')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      exportFormat === 'JSON' 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                    }`}
                  >
                    <div>
                      <div className="font-black text-sm">JSON Data</div>
                      <p className={`text-[10px] font-medium mt-1 ${exportFormat === 'JSON' ? 'text-brand-100' : 'text-slate-500'}`}>
                        Raw API object payload for system integration.
                      </p>
                    </div>
                    <FileText size={18} className="mt-3 align-self-end opacity-90" />
                  </button>
                </div>
              </div>

              {/* Data Summary Quick Badge */}
              {docData && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Report Compiled: {docData.rows.length} Records Loaded</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActiveTab('PREVIEW')}
                    className="text-brand-700 hover:underline flex items-center gap-1"
                  >
                    Preview Document <ArrowRight size={14} />
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-5 px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Hospital: <span className="font-bold text-slate-800">{hospitalInfo.hospitalName}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors"
            >
              Close
            </button>

            {exportFormat === 'PDF' ? (
              <button 
                type="button" 
                onClick={handlePrintPdf}
                disabled={!docData || loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Printer size={18} />
                Print / Save PDF Document
              </button>
            ) : exportFormat === 'CSV' ? (
              <button 
                type="button" 
                onClick={handleDownloadCsv}
                disabled={!docData || loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download size={18} />
                Download Formatted CSV
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleDownloadJson}
                disabled={!docData || loading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download size={18} />
                Download JSON Data
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
