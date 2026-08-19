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
import { checkIsAdmin, getTvQueueData } from '@/app/tv/actions';

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

function getPatientFullName(patientData: any): string {
  if (!patientData) return 'Patient';
  const p = Array.isArray(patientData) ? patientData[0] : patientData;
  if (!p) return 'Patient';
  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
  return fullName || 'Patient';
}

function getPatientFileNumber(patientData: any): string {
  if (!patientData) return 'N/A';
  const p = Array.isArray(patientData) ? patientData[0] : patientData;
  return p?.file_number || 'N/A';
}

export default function QueueDisplayView({ tvConnectionCode }: { tvConnectionCode?: string } = {}) {
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
      let items: PatientQueueItem[] = [];
      let roomsRaw: Array<{ id: string; name: string }> = [];

      if (tvConnectionCode) {
        const tvData = await getTvQueueData(tvConnectionCode);
        if (tvData.ok) {
          items = (tvData.items as unknown as PatientQueueItem[]) || [];
          roomsRaw = tvData.rooms || [];
          if (tvData.hospitalName) {
            setHospitalName(tvData.hospitalName);
          }
        }
      } else {
        const { data: queueData } = await supabase
          .from('walkin_queue')
          .select('*, patients(first_name, last_name, file_number), rooms(id, name), departments(id, name)')
          .in('status', ['WAITING', 'TRIAGED', 'CALLING', 'CONSULTATION'])
          .order('created_at', { ascending: true });

        items = (queueData as unknown as PatientQueueItem[]) || [];

        const { data: roomsData } = await supabase
          .from('rooms')
          .select('id, name')
          .order('name', { ascending: true });

        roomsRaw = roomsData || [];
      }

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

      // Map rooms
      if (roomsRaw.length > 0) {
        const roomList: RoomDisplay[] = roomsRaw.map(r => {
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tvConnectionCode]);

  const announcePatientCall = (item: PatientQueueItem) => {
    announceAllCallingPatients([item]);
  };

  const announceAllCallingPatients = (callingItems: PatientQueueItem[]) => {
    if (!callingItems || callingItems.length === 0) return;

    const announcements = callingItems.map(item => {
      const pName = getPatientFullName(item.patients);
      const rName = item.rooms?.name ? item.rooms.name : 'Consultation Room';
      const tNum = item.token_number || '';
      return { pName, rName, tNum };
    });

    // Voice announcement logic
    if (isVoiceEnabled()) {
      announcements.forEach(({ pName, rName, tNum }, idx) => {
        setTimeout(() => {
          const speechText = tNum 
            ? `Token number ${tNum}, ${pName}, please proceed to ${rName}`
            : `Patient ${pName}, please proceed to ${rName}`;
          playVoiceNotification(speechText);
        }, idx * 4500);
      });
    }

    // Set newest calling patient in Spotlight banner
    const latest = callingItems[callingItems.length - 1];
    setNowCalling(latest);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setVoiceEnabled(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.error('Error exiting fullscreen:', err);
        });
      }
    }
  };

  // Filter items by department
  const filteredQueue = selectedDept === 'ALL' 
    ? queueItems 
    : queueItems.filter(i => i.departments?.name === selectedDept);

  const callingQueue = filteredQueue.filter(i => i.status === 'CALLING');
  const waitingQueue = filteredQueue.filter(i => i.status === 'WAITING' || i.status === 'TRIAGED');
  const consultationQueue = filteredQueue.filter(i => i.status === 'CONSULTATION');

  // Rotate spotlight calling card if multiple patients are calling simultaneously
  useEffect(() => {
    if (callingQueue.length <= 1) {
      if (callingQueue.length === 1) setNowCalling(callingQueue[0]);
      return;
    }
    const timer = setInterval(() => {
      setActiveSlideIndex(prev => {
        const next = (prev + 1) % callingQueue.length;
        setNowCalling(callingQueue[next]);
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [callingQueue]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col select-none overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link 
            href="/hospital/dashboard"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Return to Dashboard"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Tv size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{hospitalName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  OPD Waiting Room
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Real-time Patient Queue & Room Announcements</p>
            </div>
          </div>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-3">
          {/* Admin TV Broadcast Modal Trigger */}
          {isAdmin && (
            <button
              onClick={() => setIsTvModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all hover:border-brand-500/40 hover:text-brand-300 shadow-sm"
              title="Broadcast Queue to Smart TV"
            >
              <Radio size={16} className="text-brand-400 animate-pulse" />
              <span>Broadcast to TV</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
              soundEnabled 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Voice ON' : 'Muted'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => void loadQueueData()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Refresh Queue Data"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span>Fullscreen</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 border border-rose-900/40 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">
        {/* Left 7 Columns: Now Calling Spotlight Banner & Room Cards */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* NOW CALLING Spotlight Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-brand-500/30 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Radio size={220} className="text-brand-400" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
                <h2 className="text-2xl font-extrabold tracking-wider text-emerald-400 uppercase">Now Calling</h2>
              </div>

              {/* Digital Clock Badge */}
              <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl text-right">
                <p className="font-mono text-xl font-bold text-white tracking-wider">{currentTime}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{currentDate}</p>
              </div>
            </div>

            {nowCalling ? (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-2">
                      {nowCalling.departments?.name || 'General OPD'}
                    </span>
                    <h3 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                      {getPatientFullName(nowCalling.patients)}
                    </h3>
                    <p className="text-sm font-semibold text-slate-400 mt-1">
                      File No: <span className="font-mono text-slate-200">{getPatientFileNumber(nowCalling.patients)}</span>
                    </p>
                  </div>

                  {nowCalling.token_number && (
                    <div className="flex flex-col items-center justify-center bg-brand-600 text-white rounded-3xl p-5 shadow-lg min-w-[120px] border border-brand-400/30">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-200">Token</span>
                      <span className="text-4xl font-black font-mono">{nowCalling.token_number}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <DoorOpen size={28} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proceed To</p>
                      <p className="text-2xl font-bold text-emerald-300">{nowCalling.rooms?.name || 'Consultation Room'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => announcePatientCall(nowCalling)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-95"
                  >
                    <Volume2 size={16} className="text-emerald-400" />
                    <span>Re-Announce</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <p className="text-xl font-bold text-slate-300">No active calls right now</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Patients will be announced automatically as doctors call them into consultation rooms.
                </p>
              </div>
            )}
          </div>

          {/* Consultation Rooms Status Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Stethoscope size={18} className="text-brand-400" />
                <span>Consultation Rooms Status</span>
              </h3>
              <span className="text-xs font-semibold text-slate-400">{rooms.length} Active Rooms</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  className={`rounded-2xl border p-5 transition-all shadow-sm ${
                    room.status === 'CALLING'
                      ? 'bg-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : room.status === 'BUSY'
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-base text-white">{room.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      room.status === 'CALLING'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : room.status === 'BUSY'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {room.status === 'CALLING' ? 'Calling Patient' : room.status === 'BUSY' ? 'In Session' : 'Available'}
                    </span>
                  </div>

                  {room.currentPatient ? (
                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <p className="text-sm font-bold text-slate-100 truncate">
                        {getPatientFullName(room.currentPatient.patients)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Token: <strong className="font-mono text-slate-200">{room.currentPatient.token_number || 'N/A'}</strong></span>
                        <span>{room.currentPatient.departments?.name || 'OPD'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 pt-2 border-t border-slate-800/40 font-medium">Ready for next patient</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Waiting Queue List */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-3xl bg-slate-950/90 border border-slate-800 p-6 flex-1 flex flex-col shadow-xl">
            {/* Queue Header & Department Filter */}
            <div className="flex flex-col gap-4 mb-6 pb-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Users size={22} className="text-brand-400" />
                  <h3 className="text-lg font-bold text-white tracking-tight uppercase">Waiting List</h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  {waitingQueue.length} In Queue
                </span>
              </div>

              {/* Department Tabs */}
              {departments.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedDept('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedDept === 'ALL'
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    All Departments
                  </button>
                  {departments.map(dept => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedDept === dept
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Waiting List Items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[680px]">
              {waitingQueue.length > 0 ? (
                waitingQueue.map((item, index) => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800 text-slate-300 font-mono font-bold text-sm shrink-0 border border-slate-700">
                        #{index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">
                          {getPatientFullName(item.patients)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {item.departments?.name || 'General OPD'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.token_number && (
                        <div className="px-3 py-1.5 rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono font-bold text-xs">
                          {item.token_number}
                        </div>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.priority === 'HIGH' || item.priority === 'URGENT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-base font-bold text-slate-200">All caught up!</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    No waiting patients in the OPD queue right now.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Admin TV Broadcast Control Modal */}
      {isAdmin && (
        <TvBroadcastModal
          isOpen={isTvModalOpen}
          onClose={() => setIsTvModalOpen(false)}
        />
      )}
    </div>
  );
}
