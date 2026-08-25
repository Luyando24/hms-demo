'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  DoorOpen, 
  Edit2, 
  Trash2, 
  Loader2, 
  Save, 
  X, 
  Building, 
  RefreshCw,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import clsx from 'clsx';
import StatusModal from '@/components/hospital/StatusModal';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { bulkDeleteRoomsAction, saveRoomAction } from './actions';

interface Room {
  id: string;
  name: string;
  department_id?: string | null;
  is_active: boolean;
  departments?: {
    id: string;
    name: string;
  } | null;
}

export default function RoomsAdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  
  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [deletingRoomTarget, setDeletingRoomTarget] = useState<Room | null>(null); // For single delete via modal
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Edit / Create Modal State
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

  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      const matchesSearch = searchQuery === '' || 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.departments?.name && r.departments.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept = departmentFilter === 'ALL' || r.department_id === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [rooms, searchQuery, departmentFilter]);

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    paginatedItems: paginatedRooms,
  } = usePagination(filteredRooms, { initialPageSize: 10 });

  // Selection helpers
  const currentPageIds = useMemo(() => paginatedRooms.map(r => r.id), [paginatedRooms]);
  
  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
  const isSomeCurrentPageSelected = currentPageIds.some(id => selectedIds.includes(id)) && !isAllCurrentPageSelected;

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredRooms.map(r => r.id);
    setSelectedIds(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleSelectRoom = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle Save (Create / Edit) via Server Action
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

    const res = await saveRoomAction({
      id: editingRoom?.id,
      name,
      departmentId: department_id || null,
      isActive: is_active,
    });

    if (!res.success) {
      setStatusModal({ type: 'error', title: 'Save Failed', message: res.error || 'Failed to save room.' });
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

  // Handle Bulk Delete Confirmation Execution
  const handleExecuteBulkDelete = async () => {
    const targetIds = deletingRoomTarget ? [deletingRoomTarget.id] : selectedIds;
    if (targetIds.length === 0) return;

    setBulkDeleting(true);
    try {
      const res = await bulkDeleteRoomsAction({ roomIds: targetIds });
      if (!res.success) {
        setStatusModal({
          type: 'error',
          title: 'Bulk Delete Failed',
          message: res.error || 'Failed to delete selected rooms.',
        });
      } else {
        const count = res.deletedCount || targetIds.length;
        setStatusModal({
          type: 'success',
          title: count === 1 ? 'Room Deleted' : 'Rooms Bulk Deleted',
          message: `Successfully deleted ${count} ${count === 1 ? 'room' : 'facility rooms'}. Any assigned staff and queue tickets were safely unlinked.`,
        });
        setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
        setIsBulkDeleteModalOpen(false);
        setDeletingRoomTarget(null);
        fetchData();
      }
    } catch (err: any) {
      setStatusModal({
        type: 'error',
        title: 'Delete Error',
        message: err.message || 'An unexpected error occurred during deletion.',
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Target rooms being deleted for modal display
  const roomsPendingDeletion = useMemo(() => {
    if (deletingRoomTarget) return [deletingRoomTarget];
    return rooms.filter(r => selectedIds.includes(r.id));
  }, [deletingRoomTarget, selectedIds, rooms]);

  const stats = {
    total: rooms.length,
    active: rooms.filter(r => r.is_active).length,
    departmentsCount: departments.length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <span>Rooms & Facilities Management</span>
            {selectedIds.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-full border border-rose-200 animate-in fade-in">
                {selectedIds.length} Selected
              </span>
            )}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage consultation suites, triage rooms, diagnostic labs, and active stations.</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button 
              onClick={() => {
                setDeletingRoomTarget(null);
                setIsBulkDeleteModalOpen(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-rose-500/20 flex items-center gap-2 animate-in fade-in"
            >
              <Trash2 size={16} />
              <span>Bulk Delete ({selectedIds.length})</span>
            </button>
          )}

          <button 
            onClick={fetchData}
            className="bg-white border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-brand-600" : ""} />
            <span>Refresh</span>
          </button>
          
          <button 
            onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-md shadow-brand-500/20 flex items-center gap-2"
          >
            <Plus size={18} />
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Facility Rooms</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Active Available Suites</p>
          <p className="text-3xl font-black text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Linked Hospital Departments</p>
          <p className="text-3xl font-black text-slate-900">{stats.departmentsCount}</p>
        </div>
      </div>

      {/* Bulk Selection Floating / Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-sm">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-sm font-bold">
                {selectedIds.length} {selectedIds.length === 1 ? 'room selected' : 'rooms selected across facility'}
              </p>
              <p className="text-xs text-slate-400">
                You can delete all selected rooms in a single batch operation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {filteredRooms.length > selectedIds.length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                Select All Filtered ({filteredRooms.length})
              </button>
            )}
            
            <button
              type="button"
              onClick={clearSelection}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
            >
              Clear Selection
            </button>

            <button
              type="button"
              onClick={() => {
                setDeletingRoomTarget(null);
                setIsBulkDeleteModalOpen(true);
              }}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-900/40 flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Delete {selectedIds.length} {selectedIds.length === 1 ? 'Room' : 'Rooms'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center gap-4">
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

      {/* Rooms Table with Row Selection Checkboxes */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              <th className="w-12 px-4 py-4 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAllCurrentPage}
                  className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-600 flex items-center justify-center mx-auto"
                  title={isAllCurrentPageSelected ? "Deselect page" : "Select page"}
                >
                  {isAllCurrentPageSelected ? (
                    <CheckSquare size={18} className="text-brand-600" />
                  ) : isSomeCurrentPageSelected ? (
                    <MinusSquare size={18} className="text-brand-600" />
                  ) : (
                    <Square size={18} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs">
                  <Loader2 className="animate-spin text-brand-600 mx-auto mb-2" size={24} />
                  Loading rooms...
                </td>
              </tr>
            ) : filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                  No rooms found matching filter.
                </td>
              </tr>
            ) : paginatedRooms.map((room) => {
              const isSelected = selectedIds.includes(room.id);
              return (
                <tr 
                  key={room.id} 
                  className={clsx(
                    "transition-colors group",
                    isSelected ? "bg-brand-50/40 hover:bg-brand-50/70" : "hover:bg-slate-50/50"
                  )}
                >
                  <td className="w-12 px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleSelectRoom(room.id)}
                      className="p-1 hover:bg-slate-200/60 rounded-md transition-colors flex items-center justify-center mx-auto"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-brand-600" />
                      ) : (
                        <Square size={18} className="text-slate-300 group-hover:text-slate-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs transition-colors",
                        isSelected ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600"
                      )}>
                        <DoorOpen size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{room.name}</p>
                        <span className="text-[10px] font-mono text-slate-400">ID: #{room.id.slice(0, 8)}</span>
                      </div>
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
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingRoom(room); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                        title="Edit Room"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingRoomTarget(room);
                          setIsBulkDeleteModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Delete Room"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="rooms"
        />
      </div>

      {/* Bulk / Single Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-rose-950">
                  {deletingRoomTarget ? 'Delete Facility Room' : `Bulk Delete (${roomsPendingDeletion.length}) Rooms`}
                </h2>
                <p className="text-xs text-rose-700 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p className="font-medium text-slate-700">
                Are you sure you want to permanently delete the following {roomsPendingDeletion.length === 1 ? 'room' : `${roomsPendingDeletion.length} facility rooms`}?
              </p>

              {/* Room Badges Preview */}
              <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                {roomsPendingDeletion.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100 text-xs">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <DoorOpen size={14} className="text-slate-400" />
                      {r.name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      {r.departments?.name || 'Unassigned'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-amber-900 flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  <strong>Safe Unlinking:</strong> Any staff members currently assigned to these rooms or active queue tickets will be automatically unlinked without data loss.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => {
                  setIsBulkDeleteModalOpen(false);
                  setDeletingRoomTarget(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleExecuteBulkDelete}
                className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Deleting Rooms...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirm Delete {roomsPendingDeletion.length} {roomsPendingDeletion.length === 1 ? 'Room' : 'Rooms'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
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
                  name="department_id" 
                  defaultValue={editingRoom?.department_id || ''}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                >
                  <option value="">Select Department (Optional)...</option>
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
