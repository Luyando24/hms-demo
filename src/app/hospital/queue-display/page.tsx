'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  DoorOpen, 
  Stethoscope, 
  Sparkles, 
  Radio, 
  Tv,
  CheckCircle2,
  Users,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { playVoiceNotification, isVoiceEnabled, setVoiceEnabled } from '@/utils/voiceNotification';

interface PatientQueueItem {
  id: string;
  token_number: string | null;
  status: string;
  priority: string;
  check_in_time: string | null;
  created_at: string | null;
  patients: {
    first_name: string;
    last_name: string;
    file_number: string | null;
  } | null;
  rooms: {
    id: string;
    name: string;
  } | null;
  departments: {
    id: string;
    name: string;
  } | null;
}

interface RoomDisplay {
  id: string;
  name: string;
  doctor_name?: string;
  currentPatient?: PatientQueueItem | null;
  status: 'AVAILABLE' | 'BUSY' | 'CALLING';
}

export default function QueueDisplayPage() {
  const [queueItems, setQueueItems] = useState<PatientQueueItem[]>([]);
  const [rooms, setRooms] = useState<RoomDisplay[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [nowCalling, setNowCalling] = useState<PatientQueueItem | null>(null);
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [hospitalName, setHospitalName] = useState<string>('HMS - Kunda Health Care');

  const supabase = createClient();
  const prevCallingId = useRef<string | null>(null);

  // Live Digital Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Hospital Name & Settings
  useEffect(() => {
    setSoundEnabled(isVoiceEnabled());
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('hospital_name, brand_title')
        .limit(1)
        .maybeSingle();
      if (data?.hospital_name || data?.brand_title) {
        setHospitalName(data.brand_title || data.hospital_name || 'HMS - Kunda Health Care');
      }
    };
    void fetchSettings();
  }, []);

  // Fetch Queue & Rooms data
  const loadQueueData = async () => {
    try {
      setLoading(true);
      // 1. Fetch walk-in queue
      const { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(first_name, last_name, file_number), rooms(id, name), departments(id, name)')
        .in('status', ['WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION'])
        .order('created_at', { ascending: true });

      const items: PatientQueueItem[] = (queueData as unknown as PatientQueueItem[]) || [];
      setQueueItems(items);

      // Extract unique departments
      const deptsSet = new Set<string>();
      items.forEach(i => {
        if (i.departments?.name) deptsSet.add(i.departments.name);
      });
      setDepartments(Array.from(deptsSet));

      // Determine currently called patient
      const callingItem = items.find(i => i.status === 'CALLING') || items.find(i => i.status === 'CONSULTATION');
      if (callingItem) {
        setNowCalling(callingItem);
        // Announce voice alert if new patient is called
        if (callingItem.id !== prevCallingId.current) {
          prevCallingId.current = callingItem.id;
          announcePatientCall(callingItem);
        }
      } else {
        setNowCalling(null);
      }

      // 2. Fetch Rooms
      const { data: roomsData } = await supabase
        .from('rooms')
        .select('id, name')
        .order('name', { ascending: true });

      if (roomsData) {
        const roomList: RoomDisplay[] = roomsData.map(r => {
          const activeItem = items.find(i => i.rooms?.id === r.id && (i.status === 'CONSULTATION' || i.status === 'CALLING'));
          return {
            id: r.id,
            name: r.name,
            currentPatient: activeItem || null,
            status: activeItem ? (activeItem.status === 'CALLING' ? 'CALLING' : 'BUSY') : 'AVAILABLE',
          };
        });
        setRooms(roomList);
      }
    } catch (err) {
      console.error('Error loading queue display:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueueData();

    // Subscribe to real-time walkin_queue changes
    const channel = supabase
      .channel('tv-queue-display-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, (payload) => {
        void loadQueueData();
        // If a new CALLING status comes in
        if (payload.eventType === 'UPDATE' && payload.new?.status === 'CALLING') {
          const p = payload.new;
          playVoiceNotification(
            'Patient Announcement',
            `Token ${p.token_number || p.id.slice(0, 4)}. Please proceed to room.`,
            'info'
          );
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const announcePatientCall = (item: PatientQueueItem) => {
    const patientName = item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Patient';
    const token = item.token_number ? `Token ${item.token_number}` : '';
    const roomName = item.rooms?.name ? `Room ${item.rooms.name}` : 'the designated Consultation Room';
    
    playVoiceNotification(
      'Attention Please',
      `${token} ${patientName}. Please report to ${roomName}.`,
      'info'
    );
  };

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setVoiceEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playVoiceNotification('Audio Enabled', 'Waiting room voice announcements are active.', 'success');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Filtered queue items by selected department
  const filteredQueue = queueItems.filter(i => {
    if (selectedDept === 'ALL') return true;
    return i.departments?.name === selectedDept;
  });

  const waitingList = filteredQueue.filter(i => i.status === 'WAITING' || i.status === 'TRIAGED');

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col justify-between overflow-hidden select-none">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-600/20 border border-brand-500/30 text-brand-400 rounded-2xl flex items-center justify-center shadow-inner">
            <Tv size={28} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              {hospitalName}
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                OPD Waiting Room
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Real-time Patient Queue & Room Announcements</p>
          </div>
        </div>

        {/* Right Controls: Department Filter, Sound, Fullscreen, Clock */}
        <div className="flex items-center gap-4">
          {/* Department Filter Tabs */}
          {departments.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
              <button
                onClick={() => setSelectedDept('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDept === 'ALL'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Rooms
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDept === dept
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}

          {/* Sound Audio Toggle */}
          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-xs font-extrabold ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
            }`}
            title="Toggle Voice Announcements"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            <span className="hidden sm:inline">{soundEnabled ? 'Voice ON' : 'Voice OFF'}</span>
          </button>

          {/* Refresh Data Button */}
          <button
            onClick={() => void loadQueueData()}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-2xl transition-all"
            title="Refresh Display"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin text-brand-400' : ''} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-2xl transition-all"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          {/* Clock */}
          <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl text-right min-w-[130px]">
            <div className="text-xl font-black tracking-widest text-brand-400 font-mono leading-none">
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              {currentDate}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Grid ────────────────────────────────────── */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column (8 cols): Hero "NOW CALLING" Banner + Room Cards Grid */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* NOW CALLING Spotlight Card */}
          <div className="relative bg-gradient-to-r from-brand-950 via-slate-900 to-slate-950 border-2 border-brand-500/50 rounded-3xl p-6 lg:p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-brand-500/20 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
                <h2 className="text-xl lg:text-2xl font-black uppercase tracking-widest text-emerald-400">
                  NOW CALLING / NEXT IN ROOM
                </h2>
              </div>
              {nowCalling && (
                <button
                  onClick={() => announcePatientCall(nowCalling)}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all"
                >
                  <Radio size={16} className="animate-pulse" />
                  <span>Repeat Announcement</span>
                </button>
              )}
            </div>

            {nowCalling ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Large Token Badge */}
                <div className="md:col-span-5 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-3xl p-6 text-center text-white shadow-2xl border border-brand-400/40">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-brand-200 block mb-1">
                    Token Number
                  </span>
                  <div className="text-5xl lg:text-6xl font-black tracking-tight font-mono">
                    {nowCalling.token_number || nowCalling.id.slice(0, 5).toUpperCase()}
                  </div>
                  <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {nowCalling.priority} Priority
                  </div>
                </div>

                {/* Patient & Room Details */}
                <div className="md:col-span-7 space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Patient Name</span>
                    <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                      {nowCalling.patients ? `${nowCalling.patients.first_name} ${nowCalling.patients.last_name}` : 'Walk-in Patient'}
                    </h3>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <div className="bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                      <DoorOpen className="text-emerald-400" size={24} />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Proceed to Room</span>
                        <span className="text-lg font-black text-emerald-400">
                          {nowCalling.rooms?.name || 'General Consultation'}
                        </span>
                      </div>
                    </div>

                    {nowCalling.departments?.name && (
                      <div className="bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                        <Stethoscope className="text-brand-400" size={24} />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                          <span className="text-sm font-bold text-white">
                            {nowCalling.departments.name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-semibold space-y-2">
                <Sparkles size={36} className="mx-auto text-slate-600" />
                <p className="text-lg text-slate-300 font-bold">No active calls right now</p>
                <p className="text-xs text-slate-500">Patients will be announced automatically as doctors call them into consultation rooms.</p>
              </div>
            )}
          </div>

          {/* Consultation Rooms Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <DoorOpen className="text-brand-400" size={20} />
                Consultation Rooms Status
              </h2>
              <span className="text-xs font-bold text-slate-500">
                {rooms.filter(r => r.status !== 'AVAILABLE').length} / {rooms.length} Rooms Occupied
              </span>
            </div>

            {rooms.length === 0 ? (
              <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center text-slate-500 text-sm">
                No consultation rooms configured.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room) => {
                  const p = room.currentPatient?.patients;
                  const isBusy = room.status !== 'AVAILABLE';
                  const isCalling = room.status === 'CALLING';

                  return (
                    <div 
                      key={room.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isCalling
                          ? 'bg-brand-950/80 border-emerald-500/70 shadow-xl shadow-emerald-500/10 animate-pulse'
                          : isBusy
                          ? 'bg-slate-900/90 border-slate-800'
                          : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            isCalling ? 'bg-emerald-400 animate-ping' :
                            isBusy ? 'bg-amber-400' : 'bg-slate-600'
                          }`} />
                          <h3 className="font-extrabold text-sm text-white truncate">
                            {room.name}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isCalling ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                          isBusy ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {room.status}
                        </span>
                      </div>

                      {p ? (
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-black text-brand-400">
                              {room.currentPatient?.token_number || 'IN ROOM'}
                            </span>
                            <span className="text-[10px] text-slate-500">Serving Now</span>
                          </div>
                          <p className="text-sm font-black text-white truncate">
                            {p.first_name} {p.last_name}
                          </p>
                        </div>
                      ) : (
                        <div className="py-3 text-center text-xs text-slate-500 font-bold bg-slate-950/30 rounded-2xl border border-slate-800/40">
                          Room Available
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Waiting Patients Queue List */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-brand-400" size={20} />
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Waiting List
              </h2>
            </div>
            <span className="text-xs font-black bg-brand-500/20 text-brand-400 px-3 py-1 rounded-full border border-brand-500/30">
              {waitingList.length} In Queue
            </span>
          </div>

          {/* Scrollable Queue List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-800/40">
            {waitingList.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-emerald-500/50" />
                <p className="text-sm font-bold text-slate-400">All caught up!</p>
                <p className="text-xs text-slate-600">No waiting patients in the OPD queue right now.</p>
              </div>
            ) : (
              waitingList.map((item, index) => {
                const p = item.patients;
                const token = item.token_number || `#${index + 1}`;
                const patientName = p ? `${p.first_name} ${p.last_name}` : 'Patient';

                return (
                  <div 
                    key={item.id}
                    className="pt-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 p-2.5 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Index / Token Badge */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-brand-400 font-mono font-black text-base shrink-0 shadow-inner">
                        {token}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-white truncate">
                          {patientName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-medium">
                          <span>{item.departments?.name || 'OPD General'}</span>
                          <span>•</span>
                          <span className={`font-bold ${
                            item.priority === 'URGENT' ? 'text-rose-400' :
                            item.priority === 'HIGH' ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl border ${
                        item.status === 'TRIAGED'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* ── Bottom Broadcast Announcement Ticker ───────────────────── */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex items-center gap-4 text-xs font-bold">
        <div className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-xl uppercase tracking-wider text-[11px] font-black shrink-0 shadow-md">
          <Radio size={14} className="animate-pulse" />
          <span>Notice Board</span>
        </div>
        
        <div className="flex-1 overflow-hidden whitespace-nowrap text-slate-300 font-medium">
          <div className="inline-block animate-marquee tracking-wide space-x-8">
            <span>Welcome to {hospitalName}. Please present your token number to the nursing station when your name is announced.</span>
            <span>•</span>
            <span>Emergency & Urgent Triage cases are prioritized in clinical workflow.</span>
            <span>•</span>
            <span>Pharmacy & Laboratory services are located on Ground Floor Block B.</span>
            <span>•</span>
            <span>For assistance, please visit the main Reception desk.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
