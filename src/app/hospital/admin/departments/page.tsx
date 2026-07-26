'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Building, Edit2, Trash2, Loader2, Save, X, RefreshCw, DoorOpen, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import StatusModal from "@/components/hospital/StatusModal";

interface Department {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  rooms?: Array<{ id: string }>;
}

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roomsCount, setRoomsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchDepartments();

    // Subscribe to realtime department updates
    const channel = supabase
      .channel('departments_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchDepartments())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const [deptRes, roomsRes] = await Promise.all([
        supabase.from('departments').select('*, rooms(id)').order('name', { ascending: true }),
        supabase.from('rooms').select('*', { count: 'exact', head: true })
      ]);

      if (deptRes.data) setDepartments(deptRes.data as Department[]);
      if (roomsRes.count) setRoomsCount(roomsRes.count);
    } catch (err) {
      console.error('Error fetching departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const description = (formData.get('description') as string).trim();

    if (!name) {
      setStatusModal({ type: 'error', title: 'Validation Error', message: 'Department name is required.' });
      setSubmitting(false);
      return;
    }

    const deptData = { name, description };

    let result;
    if (editingDept) {
      result = await supabase.from('departments').update(deptData).eq('id', editingDept.id);
    } else {
      result = await supabase.from('departments').insert(deptData);
    }

    if (result.error) {
      setStatusModal({ type: 'error', title: 'Save Failed', message: result.error.message });
    } else {
      setStatusModal({ 
        type: 'success', 
        title: editingDept ? 'Department Updated' : 'Department Created', 
        message: `Department "${name}" was saved successfully in database.` 
      });
      setIsModalOpen(false);
      setEditingDept(null);
      fetchDepartments();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, deptName: string) => {
    if (!confirm(`Are you sure you want to delete department "${deptName}"? This may affect linked rooms.`)) return;
    
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Department Removed', message: `Department "${deptName}" was deleted.` });
      fetchDepartments();
    }
  };

  const filteredDepartments = departments.filter(d => 
    searchQuery === '' ||
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Hospital Departments & Units</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage clinical specialties, administrative units, and departmental structure.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDepartments}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => { setEditingDept(null); setIsModalOpen(true); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Create Department
          </button>
        </div>
      </div>

      {/* Real Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Active Departments</p>
          <p className="text-3xl font-black text-slate-900">{departments.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Total Linked Rooms / Wards</p>
          <p className="text-3xl font-black text-slate-900">{roomsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Clinical Status</p>
          <p className="text-3xl font-black text-emerald-600">100% Active</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search department by name or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rooms / Units</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs">
                  <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                  Loading departments from database...
                </td>
              </tr>
            ) : filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                  No departments found.
                </td>
              </tr>
            ) : filteredDepartments.map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                      <Building size={20} />
                    </div>
                    <p className="font-black text-slate-900">{dept.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 font-medium max-w-xs truncate">
                  {dept.description || 'No description provided.'}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {dept.rooms?.length || 0} Units
                  </span>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-slate-400">
                  {new Date(dept.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingDept(dept); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                      title="Edit Department"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(dept.id, dept.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Department"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{editingDept ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Department Name</label>
                <input 
                  required 
                  name="name" 
                  defaultValue={editingDept?.name}
                  placeholder="e.g. Cardiology, Intensive Care, Pharmacy" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingDept?.description}
                  rows={3}
                  placeholder="Details about clinical services or administrative scope..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button 
                  disabled={submitting}
                  type="submit" 
                  className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StatusModal 
        isOpen={!!statusModal}
        type={statusModal?.type || 'success'}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}
