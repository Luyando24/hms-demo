'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, User, Users, Calendar, LayoutDashboard,
  FlaskConical, Pill, Stethoscope, BedDouble, CreditCard,
  Droplets, Loader2, ClipboardList, FileText,
  ChevronRight, HeartPulse, Settings, UserCog,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Variant = 'hospital' | 'patient';

interface SearchResult {
  id: string;
  category: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ReactNode;
}

// ─── Static quick-nav pages per variant ───────────────────────────────────
const HOSPITAL_PAGES: SearchResult[] = [
  { id: 'page-dashboard', category: 'Pages', label: 'Dashboard', href: '/hospital/dashboard', icon: <LayoutDashboard size={15} /> },
  { id: 'page-patients', category: 'Pages', label: 'Patients', href: '/hospital/patients', icon: <Users size={15} /> },
  { id: 'page-opd', category: 'Pages', label: 'OPD', href: '/hospital/opd', icon: <Stethoscope size={15} /> },
  { id: 'page-ipd', category: 'Pages', label: 'IPD / Admissions', href: '/hospital/ipd', icon: <BedDouble size={15} /> },
  { id: 'page-er', category: 'Pages', label: 'Emergency Room', href: '/hospital/er', icon: <HeartPulse size={15} /> },
  { id: 'page-lab', category: 'Pages', label: 'Laboratory', href: '/hospital/laboratory', icon: <FlaskConical size={15} /> },
  { id: 'page-radiology', category: 'Pages', label: 'Radiology', href: '/hospital/radiology', icon: <ClipboardList size={15} /> },
  { id: 'page-pharmacy', category: 'Pages', label: 'Pharmacy / Inventory', href: '/hospital/inventory', icon: <Pill size={15} /> },
  { id: 'page-billing', category: 'Pages', label: 'Billing', href: '/hospital/billing', icon: <CreditCard size={15} /> },
  { id: 'page-bloodbank', category: 'Pages', label: 'Blood Bank', href: '/hospital/bloodbank', icon: <Droplets size={15} /> },
  { id: 'page-staff', category: 'Pages', label: 'Staff', href: '/hospital/staff', icon: <UserCog size={15} /> },
  { id: 'page-settings', category: 'Pages', label: 'Settings', href: '/hospital/settings', icon: <Settings size={15} /> },
];

const PATIENT_PAGES: SearchResult[] = [
  { id: 'page-home', category: 'Pages', label: 'My Dashboard', href: '/patient/portal', icon: <LayoutDashboard size={15} /> },
  { id: 'page-appointments', category: 'Pages', label: 'My Appointments', href: '/patient/portal/appointments', icon: <Calendar size={15} /> },
  { id: 'page-records', category: 'Pages', label: 'Medical Records', href: '/patient/portal/records', icon: <FileText size={15} /> },
  { id: 'page-prescriptions', category: 'Pages', label: 'Prescriptions', href: '/patient/portal/prescriptions', icon: <Pill size={15} /> },
  { id: 'page-billing', category: 'Pages', label: 'Billing & Invoices', href: '/patient/portal/billing', icon: <CreditCard size={15} /> },
  { id: 'page-settings', category: 'Pages', label: 'Account Settings', href: '/patient/portal/settings', icon: <Settings size={15} /> },
];

function filterPages(pages: SearchResult[], query: string): SearchResult[] {
  const q = query.toLowerCase();
  return pages.filter(p => p.label.toLowerCase().includes(q));
}

function groupBy(results: SearchResult[]): Record<string, SearchResult[]> {
  return results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);
}

async function hospitalSearch(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [patientsRes, staffRes] = await Promise.allSettled([
    supabase
      .from('patients')
      .select('id, first_name, last_name, phone, file_number')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,file_number.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('profiles')
      .select('id, first_name, last_name, role, email')
      .neq('role', 'PATIENT')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  if (patientsRes.status === 'fulfilled' && patientsRes.value.data) {
    for (const p of patientsRes.value.data) {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
      results.push({
        id: `patient-${p.id}`,
        category: 'Patients',
        label: fullName,
        sublabel: p.file_number || p.phone || undefined,
        href: `/hospital/patients`,
        icon: <User size={15} />,
      });
    }
  }

  if (staffRes.status === 'fulfilled' && staffRes.value.data) {
    for (const s of staffRes.value.data) {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown';
      results.push({
        id: `staff-${s.id}`,
        category: 'Staff',
        label: fullName,
        sublabel: s.role || undefined,
        href: `/hospital/staff`,
        icon: <UserCog size={15} />,
      });
    }
  }

  return results;
}

async function patientSearch(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return [];

  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (!patient?.id) return [];

  const { data: appts } = await supabase
    .from('appointments')
    .select('id, appointment_date, reason, status')
    .eq('patient_id', patient.id)
    .or(`reason.ilike.%${q}%,status.ilike.%${q}%`)
    .order('appointment_date', { ascending: false })
    .limit(5);

  const results: SearchResult[] = [];
  for (const a of appts ?? []) {
    const dateStr = a.appointment_date
      ? new Date(a.appointment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Date TBD';
    results.push({
      id: `appt-${a.id}`,
      category: 'My Appointments',
      label: a.reason || 'Appointment',
      sublabel: `${dateStr} · ${a.status || ''}`,
      href: '/patient/portal/appointments',
      icon: <Calendar size={15} />,
    });
  }

  return results;
}

interface GlobalSearchProps {
  variant: Variant;
  className?: string;
  placeholder?: string;
}

export function GlobalSearch({ variant, className = '', placeholder }: GlobalSearchProps) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const defaultPlaceholder = variant === 'hospital'
    ? 'Search patients, staff, IDs…'
    : 'Search appointments, services…';

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click-outside close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchFn = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const results = variant === 'hospital'
        ? await hospitalSearch(supabase, q)
        : await patientSearch(supabase, q);
      setDynamicResults(results);
    } catch {
      setDynamicResults([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    if (query.length < 2) {
      setDynamicResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => searchFn(query), 300);
    return () => clearTimeout(timer);
  }, [query, searchFn]);

  const pages = variant === 'hospital' ? HOSPITAL_PAGES : PATIENT_PAGES;
  const pageResults = query.length >= 2
    ? filterPages(pages, query)
    : (open && query.length === 0 ? pages.slice(0, 6) : []);
  const allResults = [...dynamicResults, ...pageResults];
  const grouped = groupBy(allResults);
  const flatResults = Object.values(grouped).flat();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const result = flatResults[activeIndex];
      if (result) navigate(result);
    }
  };

  const navigate = (result: SearchResult) => {
    router.push(result.href);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
  };

  const categoryOrder = variant === 'hospital'
    ? ['Patients', 'Staff', 'Pages']
    : ['My Appointments', 'Pages'];

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  const showDropdown = open && (query.length === 0 || allResults.length > 0 || loading);

  let globalIdx = 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {loading
            ? <Loader2 size={16} className="text-slate-400 animate-spin" />
            : <Search size={16} className="text-slate-400" />
          }
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          className="w-full pl-10 pr-20 py-2.5 bg-slate-100 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400 text-slate-700"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5">
          {query ? (
            <button
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 transition-colors"
              onMouseDown={e => { e.preventDefault(); setQuery(''); setDynamicResults([]); inputRef.current?.focus(); }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-400 text-[10px] font-mono font-medium pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top max-h-[420px] overflow-y-auto">
          {allResults.length === 0 && !loading && query.length >= 2 && (
            <div className="px-4 py-8 text-center">
              <Search size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">
                No results for <span className="font-medium text-slate-600">"{query}"</span>
              </p>
            </div>
          )}

          {query.length === 0 && open && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick navigate</p>
            </div>
          )}

          {sortedCategories.map(category => {
            const items = grouped[category];
            return (
              <div key={category}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{category}</p>
                </div>
                {items.map(result => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={result.id}
                      onMouseDown={e => { e.preventDefault(); navigate(result); }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}>
                        {result.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.label}</p>
                        {result.sublabel && (
                          <p className="text-xs text-slate-400 truncate">{result.sublabel}</p>
                        )}
                      </div>
                      <ChevronRight
                        size={14}
                        className={`shrink-0 transition-colors ${isActive ? 'text-brand-400' : 'text-slate-300'}`}
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {allResults.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-4 text-[10px] text-slate-400">
              <span><kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">↵</kbd> open</span>
              <span><kbd className="font-mono px-1 py-0.5 bg-slate-100 rounded text-[10px]">Esc</kbd> close</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
