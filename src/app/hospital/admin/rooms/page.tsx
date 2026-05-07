'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Filter, DoorOpen, MoreVertical, Edit2, Trash2, Loader2, Save, X, Building } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import StatusModal from "@/components/hospital/StatusModal";

export default function RoomsAdminPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [roomsRes, deptsRes] = await Promise.all([
      supabase.from('rooms').select('*, departments(*)').order('name', { ascending: true }),
      supabase.from('departments').select('*').order('name', { ascending: true })
    ]);
    
    if (roomsRes.data) setRooms(roomsRes.data);
    if (deptsRes.data) setDepartments(deptsRes.data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomData = {
      name: formData.get('name') as string,
      department_id: formData.get('department_id') as string,
      is_active: formData.get('is_active') === 'on',
    };

    let result;
    if (editingRoom) {
      result = await supabase.from('rooms').update(roomData).eq('id', editingRoom.id);
    } else {
      result = await supabase.from('rooms').insert(roomData);
    }

    if (result.error) {
      setStatus({ type: 'error', title: 'Error', message: result.error.message });
    } else {
      setStatus({ type: 'success', title: 'Success', message: `Room ${editingRoom ? 'updated' : 'created'} successfully.` });
      setIsModalOpen(false);
      setEditingRoom(null);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      setStatus({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatus({ type: 'success', title: 'Deleted', message: 'Room has been removed.' });
      fetchData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Rooms & Facilities</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage consultation rooms, labs, and wards.</p>
        </div>
        <button 
          onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}
          className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Create Room
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto mb-2" />
                  Loading rooms...
                </td>
              </tr>
            ) : rooms.map((room) => (
              <tr key={room.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                      <DoorOpen size={20} />
                    </div>
                    <p className="font-black text-slate-900">{room.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold text-xs uppercase tracking-wider">
                    <Building size={12} className="text-slate-400" />
                    {room.departments?.name || 'Unassigned'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                    room.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                  )}>
                    {room.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingRoom(room); setIsModalOpen(true); }}
                      className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(room.id)}
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

      {/* Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{editingRoom ? 'Edit Room' : 'New Room'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Room Name</label>
                <input 
                  required 
                  name="name" 
                  defaultValue={editingRoom?.name}
                  placeholder="e.g. Consult Room 4" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Department</label>
                <select 
                  required 
                  name="department_id" 
                  defaultValue={editingRoom?.department_id}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500/20 transition-all"
                >
                  <option value="">Select Department...</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 px-1">
                <input 
                  type="checkbox" 
                  name="is_active" 
                  id="is_active"
                  defaultChecked={editingRoom ? editingRoom.is_active : true}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500" 
                />
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Room is active and available for selection</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-[2] bg-brand-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2">
                  <Save size={18} />
                  {editingRoom ? 'Update Room' : 'Create Room'}
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
