'use client'

import { useState, useEffect } from "react";
import { Plus, Search, Filter, DoorOpen, Edit2, Trash2, Loader2, Save, X, Building, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import StatusModal from "@/components/hospital/StatusModal";

interface Room {
  id: string;
  name: string;
  department_id?: string;
  is_active: boolean;
  departments?: {
    id: string;
    name: string;
  };
}

export default function RoomsAdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [statusModal, setStatusModal] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();

    // Subscribe to realtime room updates
    const channel = supabase
      .channel('rooms_live_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, deptsRes] = await Promise.all([
        supabase.from('rooms').select('*, departments(*)').order('name', { ascending: true }),
        supabase.from('departments').select('*').order('name', { ascending: true })
      ]);
      
      if (roomsRes.data) setRooms(roomsRes.data as Room[]);
      if (deptsRes.data) setDepartments(deptsRes.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const department_id = formData.get('department_id') as string;
    const is_active = formData.get('is_active') === 'on';

    if (!name) {
      setStatusModal({ type: 'error', title: 'Validation Error', message: 'Room name is required.' });
      setSubmitting(false);
      return;
    }

    const roomData = { name, department_id: department_id || null, is_active };

    let result;
    if (editingRoom) {
      result = await supabase.from('rooms').update(roomData).eq('id', editingRoom.id);
    } else {
      result = await supabase.from('rooms').insert(roomData);
    }

    if (result.error) {
      setStatusModal({ type: 'error', title: 'Save Failed', message: result.error.message });
    } else {
      setStatusModal({ 
        type: 'success', 
        title: editingRoom ? 'Room Updated' : 'Room Created', 
        message: `Facility room "${name}" was saved successfully.` 
      });
      setIsModalOpen(false);
      setEditingRoom(null);
      fetchData();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, roomName: string) => {
    if (!confirm(`Are you sure you want to delete room "${roomName}"?`)) return;
    
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) {
      setStatusModal({ type: 'error', title: 'Delete Failed', message: error.message });
    } else {
      setStatusModal({ type: 'success', title: 'Room Removed', message: `Room "${roomName}" has been deleted.` });
      fetchData();
    }
  };

  const filteredRooms = rooms.filter(r => {
    const matchesSearch = searchQuery === '' || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.departments?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = departmentFilter === 'ALL' || r.department_id === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const stats = {
    total: rooms.length,
    active: rooms.filter(r => r.is_active).length,
    departmentsCount: departments.length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Rooms & Facilities Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage consultation suites, diagnostic rooms, operating theaters, and wards.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button 
            onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}
            className="bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Create Room
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Facility Rooms</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Active Available Suites</p>
          <p className="text-3xl font-black text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Linked Hospital Departments</p>
          <p className="text-3xl font-black text-slate-900">{stats.departmentsCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search room name or department..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="w-full md:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms Table */}
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
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs">
                  <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                  Loading rooms...
                </td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                  No rooms found matching filter.
                </td>
              </tr>
            ) : filteredRooms.map((room) => (
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
                      title="Edit Room"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(room.id, room.name)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete Room"
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
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900">{editingRoom ? 'Edit Facility Room' : 'New Facility Room'}</h2>
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
                  placeholder="e.g. Consultation Room 4, X-Ray Suite 1" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-widest">Department Assignment</label>
                <select 
                  required 
                  name="department_id" 
                  defaultValue={editingRoom?.department_id || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
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
                <label htmlFor="is_active" className="text-sm font-bold text-slate-700">Room is active and available for patient visits</label>
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
                  {editingRoom ? 'Update Room' : 'Create Room'}
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
