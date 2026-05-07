'use client'

import { useState, useEffect } from "react";
import { FileText, Shield, Calendar, AlertTriangle, Plus, Search, ExternalLink, Download, Trash2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";

export default function ManagementDashboard() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clinic_documents')
      .select('*')
      .order('expiry_date', { ascending: true });
    if (data) setDocuments(data);
    setLoading(false);
  };

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.issuer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    expiring: documents.filter(d => d.status === 'EXPIRING').length,
    expired: documents.filter(d => d.status === 'EXPIRED').length,
    valid: documents.filter(d => d.status === 'VALID').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Compliance & Administration</h1>
          <p className="text-slate-500 mt-1">Manage Clinic Licenses, Certificates, and Legal Documents.</p>
        </div>
        <button className="bg-brand-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2">
          <Plus size={18} />
          Upload New Document
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Documents</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Valid</p>
          <p className="text-3xl font-black text-emerald-700">{stats.valid}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Expiring Soon</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-amber-700">{stats.expiring}</p>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>
        </div>
        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 shadow-sm">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Expired</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-rose-700">{stats.expired}</p>
            <AlertTriangle className="text-rose-500" size={20} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">Document Registry</h2>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by title, type, or issuer..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-w-[300px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">Document Title</th>
                <th className="px-8 py-4">Type</th>
                <th className="px-8 py-4">Issuer</th>
                <th className="px-8 py-4">Expiry Date</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">Loading registry...</td></tr>
              ) : filteredDocs.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest">No documents found</td></tr>
              ) : filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <FileText size={20} />
                      </div>
                      <p className="font-bold text-slate-900">{doc.title}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      {doc.document_type}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-600 font-medium">{doc.issuer}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(doc.expiry_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit",
                      doc.status === 'VALID' ? "bg-emerald-50 text-emerald-600" :
                      doc.status === 'EXPIRING' ? "bg-amber-50 text-amber-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {doc.status === 'VALID' && <CheckCircle2 size={12} />}
                      {doc.status !== 'VALID' && <AlertTriangle size={12} />}
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-brand-50 text-brand-600 rounded-lg transition-colors" title="View Document">
                        <ExternalLink size={18} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors" title="Download">
                        <Download size={18} />
                      </button>
                      <button className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
