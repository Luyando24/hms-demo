'use client'

import React from 'react';
import { ReportDocumentData, getStatusStyle } from '@/utils/reportDocumentGenerator';
import { ShieldCheck, Award, FileText, CheckCircle2 } from 'lucide-react';

interface ReportDocumentPreviewProps {
  data: ReportDocumentData;
}

export default function ReportDocumentPreview({ data }: ReportDocumentPreviewProps) {
  const { reportTitle, periodLabel, startDate, endDate, generatedAt, refCode, hospital, kpiCards = [], rows = [], notes = [] } = data;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="bg-slate-200/80 p-4 sm:p-8 rounded-2xl border border-slate-300 overflow-x-auto shadow-inner">
      {/* Paper Document Container */}
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 max-w-4xl mx-auto border border-slate-200 text-xs sm:text-sm font-sans space-y-6 select-text transition-all">
        
        {/* Document Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-brand-600 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-black text-2xl shadow-md">
              ✚
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">{hospital.hospitalName || 'MediCloud Central Hospital'}</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">{hospital.address || 'Healthcare Facilities & Clinical Analytics Network'} • Tel: {hospital.phone || '+1 (800) 555-0199'}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-2.5 py-1 bg-brand-50 border border-brand-200 text-brand-700 font-extrabold text-[10px] uppercase tracking-wider rounded-md">
              OFFICIAL EXECUTIVE DOCUMENT
            </span>
            <p className="text-xs font-bold text-slate-700 mt-1">Ref: <span className="font-mono text-slate-900">{refCode}</span></p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Generated: {generatedAt}</p>
          </div>
        </div>

        {/* Executive Banner */}
        <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg border border-slate-800">
          <div>
            <span className="text-[10px] font-black tracking-widest text-brand-400 uppercase">EXECUTIVE DATA & ANALYTICS</span>
            <h2 className="text-lg font-black text-white mt-0.5">{reportTitle}</h2>
          </div>
          <div className="bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700/80 text-left sm:text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Period</p>
            <p className="text-xs font-black text-white">{periodLabel}</p>
          </div>
        </div>

        {/* KPI Cards Grid */}
        {kpiCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiCards.map((card, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
                <p className="text-lg font-black text-slate-900 mt-1">{card.value}</p>
                {card.subtext && (
                  <p className="text-[10px] font-bold text-brand-600 mt-0.5">{card.subtext}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formatted Data Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                  {columns.map((col, idx) => (
                    <th key={idx} className="p-3">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rows.length > 0 ? (
                  rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      {columns.map((col, cIdx) => {
                        const val = row[col];
                        const isStatus = ['status', 'priority', 'regulatory_audit_status', 'clinical_safety_rating'].some(k => col.toLowerCase().includes(k));
                        
                        return (
                          <td key={cIdx} className="p-3 text-slate-700 font-medium whitespace-nowrap">
                            {isStatus ? (
                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border shadow-2xs" style={{
                                backgroundColor: getStatusStyle(val).bg,
                                color: getStatusStyle(val).text,
                                borderColor: getStatusStyle(val).border
                              }}>
                                {val}
                              </span>
                            ) : (
                              String(val ?? '-')
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(1, columns.length)} className="p-8 text-center text-slate-400 font-medium">
                      No records found for the selected period range ({startDate} to {endDate}).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Remarks & Executive Notes */}
        {notes.length > 0 && (
          <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck size={16} />
              Executive Audit & Compliance Remarks
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-xs font-medium">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Signature & Authentication Line */}
        <div className="pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Authentication</p>
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              MediCloud Engine Certified Log
            </p>
            <p className="text-[10px] text-slate-400 font-mono">HASH: {refCode}-VERIFIED-PASS</p>
          </div>

          <div className="text-center">
            <div className="w-48 border-b-2 border-dashed border-slate-300 pb-1 mb-1">
              <span className="font-serif italic text-slate-400 text-xs">A. Executive Officer</span>
            </div>
            <p className="text-xs font-extrabold text-slate-900">Chief Executive / Auditor</p>
            <p className="text-[10px] text-slate-500 font-medium">Authorized Governance Sign-off</p>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100 font-medium">
          CONFIDENTIAL • FOR AUTHORIZED BOARD & ADMINISTRATIVE USE ONLY • {hospital.hospitalName || 'MediCloud Central Hospital'}
        </div>

      </div>
    </div>
  );
}
