'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Filter, Building, MoreVertical, Edit2, Trash2, Loader2, Save, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import StatusModal from "@/components/hospital/StatusModal";

export default function DepartmentsAdminPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) setDepartments(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const deptData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
    };

    let result;
    if (editingDept) {
      result = await supabase.from('departments').update(deptData).eq('id', editingDept.id);
    } else {
      result = await supabase.from('departments').insert(deptData);
    }

    if (result.error) {
      setStatus({ type: 'error', title: 'Error', message: result.error.message });
    } else {
      setStatus({ type: 'success', title: 'Success', message: `Department ${editingDept ? 'updated' : 'created'} successfully.` });
      setIsModalOpen(false);
      setEditingDept(null);
      fetchDepartments();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department? This may affect linked rooms and staff.')) return;
    
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      setStatus({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatus({ type: 'success', title: 'Deleted', message: 'Department has been removed.' });
      fetchDepartments();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Hospital Departments</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage clinical and administrative units.</p>
        </div>
        <button 
          onClick={() => { setEditingDept(null); setIsModalOpen(true); }}
          className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Create Department
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto mb-2" />
                  Loading departments...
                </td>
              </tr>
            ) : departments.map((dept) => (
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
                <td className="px-6 py-4 text-xs font-bold text-slate-400">
                  {new Date(dept.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingDept(dept); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(dept.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
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
                  placeholder="e.g. Cardiology" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingDept?.description}
                  rows={3}
                  placeholder="Details about this department..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StatusModal 
        isOpen={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        message={status?.message || ''}
        onClose={() => setStatus(null)}
      />
    </div>
  );
}
