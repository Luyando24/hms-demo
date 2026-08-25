'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  DoorOpen, 
  Stethoscope, 
  Radio, 
  Tv,
  CheckCircle2,
  Users,
  RefreshCw,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { playVoiceNotification, isVoiceEnabled, setVoiceEnabled } from '@/utils/voiceNotification';
import { TvBroadcastModal } from '@/components/hospital/TvBroadcastModal';
import { checkIsAdmin, fetchTvQueueData } from '@/app/tv/actions';

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
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [hospitalName, setHospitalName] = useState<string>('HMS - Kunda Health Care');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isTvModalOpen, setIsTvModalOpen] = useState<boolean>(false);

  const router = useRouter();
  const supabase = createClient();
  const announcedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void checkIsAdmin().then((res) => setIsAdmin(res));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Live Digital Clock & Fullscreen change listener
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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
      let { data: queueData } = await supabase
        .from('walkin_queue')
        .select('*, patients(first_name, last_name, file_number), rooms(id, name), departments(id, name)')
        .in('status', ['WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION'])
        .order('created_at', { ascending: true });

      let fallbackRooms: { id: string; name: string }[] | null = null;

      // Fallback fetch via admin service role if RLS returns empty for unauthenticated Smart TV screens
      if (!queueData || queueData.length === 0) {
        const tvRes = await fetchTvQueueData();
        if (tvRes.ok) {
          queueData = tvRes.queueData as unknown as typeof queueData;
          fallbackRooms = tvRes.roomsData;
        }
      }

      const items: PatientQueueItem[] = (queueData as unknown as PatientQueueItem[]) || [];
      setQueueItems(items);

      // Extract unique departments
      const deptsSet = new Set<string>();
      items.forEach(i => {
        if (i.departments?.name) deptsSet.add(i.departments.name);
      });
      setDepartments(Array.from(deptsSet));

      // Determine active calling items across all rooms
      const callingList = items.filter(i => i.status === 'CALLING');
      const unannounced = callingList.filter(i => !announcedIdsRef.current.has(i.id));
      if (unannounced.length > 0) {
        unannounced.forEach(i => announcedIdsRef.current.add(i.id));
        announceAllCallingPatients(callingList);
      }

      // 2. Fetch Rooms
      let roomsList: { id: string; name: string }[] | null = fallbackRooms;
      if (!roomsList) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        roomsList = roomsData;
      }

      if (roomsList) {
        const roomList: RoomDisplay[] = roomsList.map(r => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'walkin_queue' }, () => {
        void loadQueueData();
      })
      .subscribe();

    // Polling interval every 5 seconds for reliable Smart TV queue sync
    const interval = setInterval(() => {
      void loadQueueData();
    }, 5000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const announcePatientCall = (item: PatientQueueItem) => {
    announceAllCallingPatients([item]);
  };

  const announceAllCallingPatients = (callingItems: PatientQueueItem[]) => {
    if (!callingItems || callingItems.length === 0) return;

    const announcements = callingItems.map(item => {
      const patientName = item.patients ? `${item.patients.first_name} ${item.patients.last_name}` : 'Patient';
      const token = item.token_number ? `Token ${item.token_number}` : '';
      const isTriage =
        item.departments?.name?.toLowerCase().includes('nurs') ||
        item.departments?.name?.toLowerCase().includes('triage') ||
        (!item.rooms?.name && item.status === 'CALLING');
      const roomName = item.rooms?.name
        ? `Room ${item.rooms.name}`
        : isTriage
        ? 'Triage and Vitals Station'
        : 'Consultation Room';
      return `${token} ${patientName}, please report to ${roomName}.`;
    });

    playVoiceNotification('Attention Please', announcements.join(' '), 'info');
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
  const nowCallingList = filteredQueue.filter(i => i.status === 'CALLING' || i.status === 'CONSULTATION');

  // Auto-slide through active calls every 4.5 seconds
  useEffect(() => {
    if (nowCallingList.length <= 1) {
      setActiveSlideIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % nowCallingList.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [nowCallingList.length]);

  const currentCallingItem = nowCallingList.length > 0
    ? nowCallingList[activeSlideIndex % nowCallingList.length]
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between overflow-hidden select-none">
      {/* ── Top Header (Hidden in Fullscreen mode) ──────────────────── */}
      {!isFullscreen && (
        <header className="bg-white/90 border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-2xl transition-all flex items-center gap-2 text-xs font-semibold shadow-xs"
              title="Sign out of Waiting Room Display"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <div className="p-2.5 bg-brand-50 border border-brand-200 text-brand-600 rounded-2xl flex items-center justify-center">
              <Tv size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                {hospitalName}
                <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold tracking-wide">
                  OPD Waiting Room
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Real-time Patient Queue & Room Announcements</p>
            </div>
          </div>

          {/* Right Controls: Department Filter, Sound, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Department Filter Tabs */}
            {departments.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setSelectedDept('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedDept === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Rooms
                </button>
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedDept === dept
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
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
              className={`p-2.5 rounded-2xl border transition-all flex items-center gap-2 text-xs font-semibold ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
              title="Toggle Voice Announcements"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              <span className="hidden sm:inline">{soundEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>

            {/* Refresh Data Button */}
            <button
              onClick={() => void loadQueueData()}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl transition-all"
              title="Refresh Display"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-brand-600' : ''} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-2xl transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Toggle Fullscreen Mode"
            >
              <Maximize2 size={18} />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>

            {/* Admin-only Broadcast to TV Button */}
            {isAdmin && (
              <button
                onClick={() => setIsTvModalOpen(true)}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold shadow-xs"
                title="Generate TV Broadcast Link & Connection Code"
              >
                <Radio size={18} className="animate-pulse text-amber-600" />
                <span className="hidden sm:inline">Broadcast to TV</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Main Content Grid ────────────────────────────────────── */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column (7 cols): Hero "NOW CALLING" Spotlight Card */}
        <div className="lg:col-span-7 flex flex-col overflow-hidden">
          
          {/* NOW CALLING Spotlight Card */}
          <div className="relative flex-1 bg-white border-2 border-emerald-500/40 rounded-3xl p-8 lg:p-12 shadow-xs flex flex-col justify-between overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-600"></span>
                </span>
                <h2 className="text-lg lg:text-xl font-bold uppercase tracking-wider text-emerald-800">
                  Now Calling
                </h2>
              </div>

              <div className="flex items-center gap-3">
                {nowCallingList.length > 0 && (
                  <button
                    onClick={() => announceAllCallingPatients(nowCallingList)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    <Radio size={15} className="animate-pulse" />
                    <span className="hidden sm:inline">Repeat</span>
                  </button>
                )}

                {/* Digital Clock in NOW CALLING Section */}
                <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-2xl text-right min-w-[125px] shadow-xs">
                  <div className="text-lg font-bold tracking-wider text-slate-900 font-mono leading-none">
                    {currentTime || '--:--:--'}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                    {currentDate}
                  </div>
                </div>

                {/* In Fullscreen mode, provide voice toggle and minimize button */}
                {isFullscreen && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleSound}
                      className={`p-2 rounded-xl border transition-all text-xs font-semibold ${
                        soundEnabled
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                      title="Toggle Voice Announcements"
                    >
                      {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition-all"
                      title="Exit Fullscreen"
                    >
                      <Minimize2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {currentCallingItem ? (
              <div className="my-auto flex flex-col justify-between flex-1 overflow-hidden">
                <div 
                  key={currentCallingItem.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center my-auto transition-all duration-500 ease-in-out animate-in fade-in slide-in-from-right-4"
                >
                  {/* Large Token Badge */}
                  <div className="md:col-span-5 bg-emerald-600 rounded-3xl p-8 text-center text-white shadow-lg border border-emerald-500/30">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-100 block mb-2">
                      Token Number
                    </span>
                    <div className="text-6xl lg:text-7xl font-black tracking-tight font-mono">
                      {currentCallingItem.token_number || currentCallingItem.id.slice(0, 5).toUpperCase()}
                    </div>
                    <div className="mt-4 inline-block bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      {currentCallingItem.priority} Priority
                    </div>
                  </div>

                  {/* Patient & Room Details */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Patient Name</span>
                      <h3 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                        {currentCallingItem.patients ? `${currentCallingItem.patients.first_name} ${currentCallingItem.patients.last_name}` : 'Walk-in Patient'}
                      </h3>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xs">
                        <DoorOpen className="text-emerald-600" size={26} />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Proceed to Room</span>
                          <span className="text-lg font-bold text-emerald-700 uppercase">
                            {currentCallingItem.rooms?.name ||
                              (currentCallingItem.departments?.name?.toLowerCase().includes('nurs') ||
                              currentCallingItem.departments?.name?.toLowerCase().includes('triage') ||
                              currentCallingItem.status === 'CALLING'
                                ? 'Triage & Vitals Station'
                                : 'General Consultation')}
                          </span>
                        </div>
                      </div>

                      {currentCallingItem.departments?.name && (
                        <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xs">
                          <Stethoscope className="text-brand-600" size={26} />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                            <span className="text-base font-semibold text-slate-800 uppercase">
                              {currentCallingItem.departments.name}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Carousel Pagination Dots for Multiple Calling Rooms */}
                {nowCallingList.length > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100/80 mt-auto">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
                      Active Call {(activeSlideIndex % nowCallingList.length) + 1} of {nowCallingList.length}
                    </span>
                    {nowCallingList.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`h-2.5 rounded-full transition-all ${
                          idx === (activeSlideIndex % nowCallingList.length)
                            ? 'w-8 bg-emerald-600'
                            : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                        }`}
                        title={`View Call for ${item.rooms?.name || 'Room'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="my-auto py-16 text-center text-slate-500 font-medium space-y-3">
                <p className="text-xl text-slate-700 font-bold">No active calls right now</p>
                <p className="text-sm text-slate-400 max-w-md mx-auto">Patients will be announced automatically as doctors call them into consultation rooms.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Waiting Patients Queue List */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-brand-600" size={18} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Waiting List
              </h2>
            </div>
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full border border-brand-200">
              {waitingList.length} In Queue
            </span>
          </div>

          {/* Queue List (Scrollbar hidden) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {waitingList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500/70" />
                <p className="text-sm font-semibold text-slate-600">All caught up!</p>
                <p className="text-xs text-slate-400">No waiting patients in the OPD queue right now.</p>
              </div>
            ) : (
              waitingList.map((item, index) => {
                const p = item.patients;
                const token = item.token_number || `#${index + 1}`;
                const patientName = p ? `${p.first_name} ${p.last_name}` : 'Patient';

                return (
                  <div 
                    key={item.id}
                    className="pt-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Index / Token Badge */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-brand-700 font-mono font-bold text-sm shrink-0">
                        {token}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate uppercase">
                          {patientName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-medium">
                          <span className="uppercase">{item.rooms?.name || item.departments?.name || 'OPD General'}</span>
                          <span>•</span>
                          <span className={`font-semibold ${
                            item.priority === 'URGENT' ? 'text-rose-600' :
                            item.priority === 'HIGH' ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${
                        item.status === 'TRIAGED'
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
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

      <TvBroadcastModal isOpen={isTvModalOpen} onClose={() => setIsTvModalOpen(false)} />
    </div>
  );
}
