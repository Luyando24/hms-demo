'use client'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Settings as SettingsIcon, DollarSign, Building, Save, Loader2, ShieldAlert, CreditCard, Shield, Plus, X, Mail, MapPin, Navigation, Crosshair, Tv, Radio, Trash2, ArrowRight, Sparkles, Database, Monitor, Wifi, CheckCircle2, AlertCircle, Laptop } from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/utils/supabase/client';
import { SUPPORTED_CURRENCIES, formatCurrencyAmount } from '@/utils/currency';
import StatusModal from '@/components/hospital/StatusModal';
import { EmailNotificationSettingsPanel } from '@/components/hospital/EmailNotificationSettingsPanel';
import { updateSystemSettingsAction, listTrustedWorkstationsAction, authorizeCurrentWorkstationAction, revokeTrustedWorkstationAction } from '@/app/hospital/actions';
import { formatDistance } from '@/utils/geofence';
import { TvBroadcastModal } from '@/components/hospital/TvBroadcastModal';

const WORKFORCE_ROLES = [
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHARMACIST',
  'LAB_TECH',
  'RADIOLOGIST',
  'ACCOUNTANT',
  'STAFF',
] as const;

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'payments' | 'insurance' | 'notifications' | 'geofence' | 'tv_broadcast' | 'data_management'>('general');
  const [isTvModalOpen, setIsTvModalOpen] = useState(false);

  const [form, setForm] = useState({
    hospital_name: 'HMS Medical Center',
    brand_title: '',
    tagline: 'Integrated Healthcare & Clinical Operations System',
    logo_url: '',
    default_currency: 'USD',
    currency_symbol: '$',
    currency_position: 'prefix' as 'prefix' | 'suffix',
    tax_rate: 0,
    consultation_fee: 150.0,
    phone: '',
    email: '',
    address: '',
    payment_methods: ['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'BANK_TRANSFER', 'CHEQUE'],
    insurance_providers: ['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'],
    geofence_enabled: false,
    geofence_latitude: -15.3875,
    geofence_longitude: 28.3228,
    geofence_radius_meters: 500,
    geofence_enforce_roles: ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'ACCOUNTANT', 'STAFF'],
    geofence_allow_admin_bypass: true,
    geofence_network_check_enabled: true,
    geofence_allowed_subnets: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '127.0.0.1/32', '::1/128'],
    geofence_allowed_ips: [] as string[],
    geofence_trusted_workstations_enabled: true,
  });

  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newInsuranceProvider, setNewInsuranceProvider] = useState('');
  const [trustedWorkstations, setTrustedWorkstations] = useState<any[]>([]);
  const [loadingWorkstations, setLoadingWorkstations] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [workstationEnrollName, setWorkstationEnrollName] = useState('');
  const [enrollingWorkstation, setEnrollingWorkstation] = useState(false);
  const [detectedClientIp, setDetectedClientIp] = useState<string | null>(null);
  const [newSubnetInput, setNewSubnetInput] = useState('');
  const [newIpInput, setNewIpInput] = useState('');
  const [isCurrentWorkstationEnrolled, setIsCurrentWorkstationEnrolled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCurrentWorkstationEnrolled(Boolean(localStorage.getItem('hms_workstation_token')));
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // 1. Fetch user role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      setUserRole(profile?.role || user.user_metadata?.role || 'STAFF');
    }

    // 2. Fetch system settings
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setForm({
        hospital_name: data.hospital_name || 'HMS Medical Center',
        brand_title: data.brand_title || '',
        tagline: data.tagline || 'Integrated Healthcare & Clinical Operations System',
        logo_url: data.logo_url || '',
        default_currency: data.default_currency || 'USD',
        currency_symbol: data.currency_symbol || '$',
        currency_position: data.currency_position === 'suffix' ? 'suffix' : 'prefix',
        tax_rate: data.tax_rate || 0,
        consultation_fee: Number(data.consultation_fee) || 150.0,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        payment_methods: (data.payment_methods || ['CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'BANK_TRANSFER', 'CHEQUE'])
          .map((m: string) => (typeof m === 'string' ? m.trim() : ''))
          .filter((m: string) => m.length > 0),
        insurance_providers: (data.insurance_providers || ['NHIMA', 'Prudential', 'Sanlam', 'Madison Health', 'Professional Life', 'Medland Direct'])
          .map((p: string) => (typeof p === 'string' ? p.trim() : ''))
          .filter((p: string) => p.length > 0),
        geofence_enabled: data.geofence_enabled ?? false,
        geofence_latitude: (data.geofence_latitude && data.geofence_latitude !== 0) ? data.geofence_latitude : -15.3875,
        geofence_longitude: (data.geofence_longitude && data.geofence_longitude !== 0) ? data.geofence_longitude : 28.3228,
        geofence_radius_meters: data.geofence_radius_meters ?? 500,
        geofence_enforce_roles: (data.geofence_enforce_roles || ['DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'ACCOUNTANT', 'STAFF'])
          .map((r: string) => (typeof r === 'string' ? r.trim() : ''))
          .filter((r: string) => r.length > 0),
        geofence_allow_admin_bypass: data.geofence_allow_admin_bypass ?? true,
        geofence_network_check_enabled: data.geofence_network_check_enabled ?? true,
        geofence_allowed_subnets: (data.geofence_allowed_subnets && data.geofence_allowed_subnets.length > 0)
          ? data.geofence_allowed_subnets
          : ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12', '127.0.0.1/32', '::1/128'],
        geofence_allowed_ips: data.geofence_allowed_ips || [],
        geofence_trusted_workstations_enabled: data.geofence_trusted_workstations_enabled ?? true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchSettings(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchSettings]);

  const handleCurrencySelect = (code: string) => {
    const preset = SUPPORTED_CURRENCIES.find(c => c.code === code);
    if (preset) {
      setForm(prev => ({
        ...prev,
        default_currency: preset.code,
        currency_symbol: preset.symbol,
        currency_position: preset.position
      }));
    }
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.trim()) return;
    const formatted = newPaymentMethod.trim().toUpperCase().replace(/\s+/g, '_');
    if (!form.payment_methods.includes(formatted)) {
      setForm(prev => ({ ...prev, payment_methods: [...prev.payment_methods, formatted] }));
    }
    setNewPaymentMethod('');
  };

  const handleRemovePaymentMethod = (method: string) => {
    setForm(prev => ({ ...prev, payment_methods: prev.payment_methods.filter(m => m !== method) }));
  };

  const handleAddInsuranceProvider = () => {
    if (!newInsuranceProvider.trim()) return;
    const formatted = newInsuranceProvider.trim();
    if (!form.insurance_providers.includes(formatted)) {
      setForm(prev => ({ ...prev, insurance_providers: [...prev.insurance_providers, formatted] }));
    }
    setNewInsuranceProvider('');
  };

  const handleRemoveInsuranceProvider = (provider: string) => {
    setForm(prev => ({ ...prev, insurance_providers: prev.insurance_providers.filter(p => p !== provider) }));
  };

  const fetchWorkstations = useCallback(async () => {
    setLoadingWorkstations(true);
    const res = await listTrustedWorkstationsAction();
    if (res.success && res.workstations) {
      setTrustedWorkstations(res.workstations);
    }
    setLoadingWorkstations(false);
  }, []);

  const fetchClientNetworkInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/geofence-config');
      if (res.ok) {
        const data = await res.json();
        if (data.clientIp) setDetectedClientIp(data.clientIp);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'geofence') {
      void fetchWorkstations();
      void fetchClientNetworkInfo();
    }
  }, [activeTab, fetchWorkstations, fetchClientNetworkInfo]);

  const handleAuthorizeThisComputer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workstationEnrollName.trim()) return;
    setEnrollingWorkstation(true);
    try {
      const res = await authorizeCurrentWorkstationAction(workstationEnrollName.trim());
      if (res.success && res.token) {
        localStorage.setItem('hms_workstation_token', res.token);
        setIsCurrentWorkstationEnrolled(true);
        setIsEnrollModalOpen(false);
        setWorkstationEnrollName('');
        setStatus({
          type: 'success',
          title: 'Workstation Enrolled',
          message: `This computer has been successfully enrolled as "${res.workstation?.name || 'Trusted Terminal'}". Staff can now log in without GPS prompts.`,
        });
        await fetchWorkstations();
      } else {
        alert(res.error || 'Failed to authorize workstation.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error enrolling workstation.');
    } finally {
      setEnrollingWorkstation(false);
    }
  };

  const handleRevokeWorkstation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke authorization for "${name}"? Users on that computer will be required to meet network or GPS policy.`)) return;
    const res = await revokeTrustedWorkstationAction(id);
    if (res.success) {
      await fetchWorkstations();
      setStatus({
        type: 'success',
        title: 'Workstation Revoked',
        message: `Authorization for "${name}" has been disabled.`,
      });
    } else {
      alert(res.error || 'Failed to revoke workstation.');
    }
  };

  const handleAddSubnet = () => {
    if (!newSubnetInput.trim()) return;
    const clean = newSubnetInput.trim();
    if (!form.geofence_allowed_subnets.includes(clean)) {
      setForm(prev => ({ ...prev, geofence_allowed_subnets: [...prev.geofence_allowed_subnets, clean] }));
    }
    setNewSubnetInput('');
  };

  const handleRemoveSubnet = (subnet: string) => {
    setForm(prev => ({ ...prev, geofence_allowed_subnets: prev.geofence_allowed_subnets.filter(s => s !== subnet) }));
  };

  const handleAddIp = () => {
    if (!newIpInput.trim()) return;
    const clean = newIpInput.trim();
    if (!form.geofence_allowed_ips.includes(clean)) {
      setForm(prev => ({ ...prev, geofence_allowed_ips: [...prev.geofence_allowed_ips, clean] }));
    }
    setNewIpInput('');
  };

  const handleRemoveIp = (ip: string) => {
    setForm(prev => ({ ...prev, geofence_allowed_ips: prev.geofence_allowed_ips.filter(i => i !== ip) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN') {
      alert('Only System Administrators can modify global hospital settings.');
      return;
    }

    setSaving(true);
    const cleanedForm = {
      ...form,
      hospital_name: form.hospital_name.trim() || 'HMS Medical Center',
      payment_methods: form.payment_methods.map(m => m.trim()).filter(Boolean),
      insurance_providers: form.insurance_providers.map(p => p.trim()).filter(Boolean),
      geofence_enforce_roles: form.geofence_enforce_roles.map(r => r.trim()).filter(Boolean),
      geofence_latitude: Number.isNaN(form.geofence_latitude) ? -15.3875 : form.geofence_latitude,
      geofence_longitude: Number.isNaN(form.geofence_longitude) ? 28.3228 : form.geofence_longitude,
      geofence_radius_meters: (Number.isNaN(form.geofence_radius_meters) || form.geofence_radius_meters < 10) ? 500 : form.geofence_radius_meters,
      geofence_network_check_enabled: form.geofence_network_check_enabled,
      geofence_allowed_subnets: form.geofence_allowed_subnets.map(s => s.trim()).filter(Boolean),
      geofence_allowed_ips: form.geofence_allowed_ips.map(ip => ip.trim()).filter(Boolean),
      geofence_trusted_workstations_enabled: form.geofence_trusted_workstations_enabled,
    };

    const res = await updateSystemSettingsAction(cleanedForm);

    if (res.error) {
      setStatus({ type: 'error', title: 'Save Failed', message: res.error });
    } else {
      setStatus({ 
        type: 'success', 
        title: 'Settings Saved', 
        message: 'System settings, payment methods, perimeter security, and accepted insurance providers updated successfully.' 
      });
      await fetchSettings();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-slate-400 font-bold">
        <Loader2 className="animate-spin mx-auto mb-2" size={32} />
        Loading system settings...
      </div>
    );
  }

  const handleDetectCurrentLocation = () => {
    const isHttpNetwork = typeof window !== 'undefined' && 
      window.location.protocol !== 'https:' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      if (isHttpNetwork) {
        alert(
          'Geolocation is blocked by your browser because this site is accessed over unencrypted HTTP (e.g. ' +
          window.location.host +
          ').\n\nTo enable location detection on this computer:\n1. Open chrome://flags (or edge://flags)\n2. Search "Insecure origins treated as secure"\n3. Add "' +
          window.location.origin +
          '" and click Relaunch.\n\nAlternatively, enter the facility coordinates manually.'
        );
      } else {
        alert('Geolocation is not supported by your browser.');
      }
      return;
    }

    setDetectingGps(true);

    const tryIpFallback = async (originalErr?: string) => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            setForm((prev) => ({
              ...prev,
              geofence_latitude: Number(Number(data.latitude).toFixed(6)),
              geofence_longitude: Number(Number(data.longitude).toFixed(6)),
            }));
            setDetectingGps(false);
            alert(
              `Estimated location detected via IP Network (${data.city || 'Local City'}, ${data.region || ''}, ${data.country_name || ''}).\n\nCoordinates: ${data.latitude}, ${data.longitude}.\n\n(Note: Hardware GPS/Wi-Fi positioning was unavailable on this PC, so approximate network coordinates were used. You can fine-tune them in the inputs).`
            );
            return;
          }
        }
      } catch (ipErr) {
        console.warn('IP fallback failed:', ipErr);
      }

      setDetectingGps(false);
      alert(
        `Failed to acquire hardware GPS position: ${originalErr || 'Position unavailable'}.\n\nCommon causes on Desktop PCs:\n1. Wired Ethernet desktop with no Wi-Fi card/beacons or GPS hardware.\n2. Windows "Default location" is not set in Windows Settings -> Privacy -> Location.\n3. Windows "Geolocation Service" (lfsvc) is stopped or disabled in services.msc.\n\nYou can type your facility's exact Latitude & Longitude coordinates directly into the inputs.`
      );
    };

    const tryBrowserLocation = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            geofence_latitude: Number(pos.coords.latitude.toFixed(6)),
            geofence_longitude: Number(pos.coords.longitude.toFixed(6)),
          }));
          setDetectingGps(false);
        },
        (err) => {
          console.warn('GPS attempt failed (highAccuracy=' + highAccuracy + '):', err.code, err.message);
          if (highAccuracy) {
            // High accuracy GPS failed (indoors or no satellite fix), try low accuracy / Wi-Fi triangulation
            tryBrowserLocation(false);
          } else {
            // Both hardware and Wi-Fi positioning failed, attempt IP fallback
            if (err.code === 1) {
              setDetectingGps(false);
              alert(
                'Location access was denied by your browser.\n\nPlease click the lock/tune icon in the browser address bar, set Location to "Allow", and ensure Windows Settings -> Privacy -> Location is turned ON.'
              );
            } else {
              void tryIpFallback(err.message);
            }
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 5000 : 8000, maximumAge: 60000 }
      );
    };

    tryBrowserLocation(true);
  };

  const handleToggleEnforcedRole = (role: string) => {
    setForm((prev) => {
      const exists = prev.geofence_enforce_roles.includes(role);
      const updated = exists
        ? prev.geofence_enforce_roles.filter((r) => r !== role)
        : [...prev.geofence_enforce_roles, role];
      return { ...prev, geofence_enforce_roles: updated };
    });
  };

  const navTabs = [
    { id: 'general', label: 'General & Branding', icon: Building },
    { id: 'financial', label: 'Currency & Finance', icon: DollarSign },
    { id: 'payments', label: 'Payment Options', icon: CreditCard },
    { id: 'insurance', label: 'Insurance Providers', icon: Shield },
    { id: 'geofence', label: 'Geo-Fence & Security', icon: MapPin },
    { id: 'notifications', label: 'Email & Notifications', icon: Mail },
    { id: 'tv_broadcast', label: 'TV Broadcast', icon: Tv },
    { id: 'data_management', label: 'Data Purge & Wipe', icon: Trash2 },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="sticky top-20 z-40 bg-slate-100/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
              <SettingsIcon size={24} />
            </div>
            Hospital Settings & Preferences
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage default currency, payment methods, insurance providers, and facility branding.</p>
        </div>
      </div>

      {userRole !== 'ADMIN' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs font-bold">
            You are currently viewing settings in read-only mode. Administrator permissions are required to modify currency, payment options, and facility configuration.
          </p>
        </div>
      )}

      {/* Tab Controls */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-3 scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap",
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Forms */}
      {activeTab !== 'notifications' && (
        <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tab 1: General & Branding */}
        {activeTab === 'general' && (
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
                <Building size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Hospital & Clinic Details</h2>
                <p className="text-xs text-slate-500 font-medium">Facility name, tagline, and logo printed on patient receipts, medical reports, and invoices.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Hospital / Clinic Name (Full Legal Title)</label>
                <input 
                  required 
                  value={form.hospital_name}
                  onChange={e => setForm({...form, hospital_name: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="e.g. Dr. Kunda Bwalya Memorial Clinic"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Brand Title (Top Nav Header Display)</label>
                <input 
                  value={form.brand_title}
                  onChange={e => setForm({...form, brand_title: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="e.g. HMS Clinic (defaults to Hospital Name if blank)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Brand Tagline / Subtitle</label>
                <input 
                  value={form.tagline}
                  onChange={e => setForm({...form, tagline: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="e.g. Integrated Healthcare & Clinical Operations"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Brand Logo / Icon URL</label>
                <div className="flex gap-4 items-center">
                  <input 
                    value={form.logo_url}
                    onChange={e => setForm({...form, logo_url: e.target.value})}
                    disabled={userRole !== 'ADMIN'}
                    placeholder="https://example.com/hospital-logo.png"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  />
                  {form.logo_url && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={form.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Tax / VAT Rate (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={form.tax_rate}
                  onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})}
                  disabled={userRole !== 'ADMIN'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Contact Phone</label>
                <input 
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="+260..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Official Email</label>
                <input 
                  type="email"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="info@hospital.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Physical Address (Displayed on Landing Page & Invoices)</label>
                <input 
                  value={form.address}
                  onChange={e => setForm({...form, address: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="e.g. 123 Health Avenue, Medical District"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Currency & Financial */}
        {activeTab === 'financial' && (
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <DollarSign size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Default Currency & Financial Format</h2>
                <p className="text-xs text-slate-500 font-medium">Set the primary currency for patient invoices, payments, pharmacy pricing, and financial analytics.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Select Preset Currency</label>
                <select 
                  value={form.default_currency}
                  onChange={e => handleCurrencySelect(e.target.value)}
                  disabled={userRole !== 'ADMIN'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                >
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name} ({curr.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Currency Symbol</label>
                <input 
                  required 
                  value={form.currency_symbol}
                  onChange={e => setForm({...form, currency_symbol: e.target.value})}
                  disabled={userRole !== 'ADMIN'}
                  placeholder="e.g. $, K, €, £, R"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Symbol Position</label>
                <select 
                  value={form.currency_position}
                  onChange={e => setForm({...form, currency_position: e.target.value as 'prefix' | 'suffix'})}
                  disabled={userRole !== 'ADMIN'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                >
                  <option value="prefix">Prefix (e.g. {form.currency_symbol}150.00)</option>
                  <option value="suffix">Suffix (e.g. 150.00 {form.currency_symbol})</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">
                  Standard OPD Consultation Fee ({form.currency_symbol})
                </label>
                <div className="relative max-w-md">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                    {form.currency_symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.consultation_fee}
                    onChange={(e) =>
                      setForm({ ...form, consultation_fee: parseFloat(e.target.value) || 0 })
                    }
                    disabled={userRole !== 'ADMIN'}
                    placeholder="e.g. 150.00"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium ml-1">
                  Base fee applied to outpatient consultation tickets and front desk intake billing.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Currency Preview</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {formatCurrencyAmount(1250, form.currency_symbol, form.currency_position)}
                </p>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                <span className="font-bold text-slate-700">Code:</span> {form.default_currency} &bull; <span className="font-bold text-slate-700">Symbol:</span> {form.currency_symbol}
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Payment Options */}
        {activeTab === 'payments' && (
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Allowed Payment Methods</h2>
                <p className="text-xs text-slate-500 font-medium">Configure active payment methods available in the patient checkout and billing dropdown menus.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {form.payment_methods.map(method => (
                  <span key={method} className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    {method.replace('_', ' ')}
                    {userRole === 'ADMIN' && (
                      <button 
                        type="button" 
                        onClick={() => handleRemovePaymentMethod(method)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {userRole === 'ADMIN' && (
                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="text" 
                    placeholder="Add payment method (e.g. MOBILE_MONEY, CHEQUE)" 
                    value={newPaymentMethod}
                    onChange={e => setNewPaymentMethod(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-500/20 max-w-md w-full"
                  />
                  <button 
                    type="button"
                    onClick={handleAddPaymentMethod}
                    className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Add Method
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 4: Insurance Providers */}
        {activeTab === 'insurance' && (
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Accepted Insurance Companies</h2>
                <p className="text-xs text-slate-500 font-medium font-sans">Manage insurance providers available for selection during patient registration and invoice settlement.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {form.insurance_providers.map(provider => (
                  <span key={provider} className="bg-purple-50 border border-purple-200 text-purple-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    {provider}
                    {userRole === 'ADMIN' && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveInsuranceProvider(provider)}
                        className="text-purple-400 hover:text-rose-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {userRole === 'ADMIN' && (
                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="text" 
                    placeholder="Add insurance provider (e.g. NHIMA, Sanlam)" 
                    value={newInsuranceProvider}
                    onChange={e => setNewInsuranceProvider(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-500/20 max-w-md w-full"
                  />
                  <button 
                    type="button"
                    onClick={handleAddInsuranceProvider}
                    className="bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-800 transition-all flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Add Insurance
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 5: Geo-Fence & Security */}
        {activeTab === 'geofence' && (
          <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Perimeter Security & Geofence Policy</h2>
                  <p className="text-xs text-slate-500 font-medium">Configure perimeter access controls for hospital workstations, local networks, and mobile devices.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  form.geofence_enabled ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                )}>
                  {form.geofence_enabled ? "Perimeter Policy Active" : "Perimeter Policy Disabled"}
                </span>
              </div>
            </div>

            {/* Enable Master Toggle Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Navigation size={16} className="text-brand-600" />
                  Enable Perimeter & Location Restriction
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xl">
                  When enabled, workforce users must satisfy perimeter authorization (Hospital LAN/Wi-Fi, Trusted Workstation, or GPS boundary) to sign in.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  checked={form.geofence_enabled}
                  onChange={e => setForm({ ...form, geofence_enabled: e.target.checked })}
                  disabled={userRole !== 'ADMIN'}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* SECTION 1: HOSPITAL NETWORK (LAN / WI-FI) AUTHENTICATION */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Wifi size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Hospital Local Network (LAN / Wi-Fi) Whitelist</h3>
                    <p className="text-xs text-slate-500 font-medium">Instantly verifies desktop PCs (via USB Wi-Fi or Ethernet) and mobile phones connected to hospital network.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={form.geofence_network_check_enabled}
                      onChange={e => setForm({ ...form, geofence_network_check_enabled: e.target.checked })}
                      disabled={userRole !== 'ADMIN'}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {detectedClientIp && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>Your Current Client IP: <strong className="font-mono">{detectedClientIp}</strong></span>
                  </div>
                  {userRole === 'ADMIN' && !form.geofence_allowed_ips.includes(detectedClientIp) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!form.geofence_allowed_ips.includes(detectedClientIp)) {
                          setForm(prev => ({ ...prev, geofence_allowed_ips: [...prev.geofence_allowed_ips, detectedClientIp] }));
                        }
                      }}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline"
                    >
                      + Add IP to Whitelist
                    </button>
                  )}
                </div>
              )}

              {/* Subnet List */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Allowed Subnets (CIDR Notation)
                </label>
                <div className="flex flex-wrap gap-2">
                  {form.geofence_allowed_subnets.map(subnet => (
                    <span 
                      key={subnet}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                    >
                      {subnet}
                      {userRole === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubnet(subnet)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input 
                      type="text" 
                      placeholder="e.g. 192.168.1.0/24 or 10.0.1.0/24" 
                      value={newSubnetInput}
                      onChange={e => setNewSubnetInput(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500/20 max-w-xs w-full"
                    />
                    <button 
                      type="button"
                      onClick={handleAddSubnet}
                      className="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Subnet
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: TRUSTED WORKSTATIONS (ONE-CLICK ENROLLMENT) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Trusted Workstations (Terminal Enrollment)</h3>
                    <p className="text-xs text-slate-500 font-medium">Authorize stationary desktop PCs (Reception, OPD, Pharmacy, Lab). Bypasses GPS permanently on that machine.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={form.geofence_trusted_workstations_enabled}
                      onChange={e => setForm({ ...form, geofence_trusted_workstations_enabled: e.target.checked })}
                      disabled={userRole !== 'ADMIN'}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Current Computer Status Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0",
                    isCurrentWorkstationEnrolled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  )}>
                    <Laptop size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {isCurrentWorkstationEnrolled ? "This Computer is Enrolled as a Trusted Workstation" : "This Computer is Not Yet Enrolled"}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isCurrentWorkstationEnrolled ? "Staff can sign in from this browser without GPS permissions or location checks." : "Enroll this stationary computer so staff can sign in without needing GPS."}
                    </p>
                  </div>
                </div>

                {userRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 shrink-0 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    {isCurrentWorkstationEnrolled ? "Re-Authorize This PC" : "Authorize This Computer"}
                  </button>
                )}
              </div>

              {/* Workstations Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Enrolled Hospital Workstations ({trustedWorkstations.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => void fetchWorkstations()}
                    disabled={loadingWorkstations}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    {loadingWorkstations ? <Loader2 size={12} className="animate-spin" /> : null}
                    Refresh List
                  </button>
                </div>

                {trustedWorkstations.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No workstations enrolled yet. Click &quot;Authorize This Computer&quot; to register this terminal.</p>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Terminal Name</th>
                          <th className="px-4 py-3">Enrolled Date</th>
                          <th className="px-4 py-3">Last Active</th>
                          <th className="px-4 py-3">Status</th>
                          {userRole === 'ADMIN' && <th className="px-4 py-3 text-right">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {trustedWorkstations.map(wks => (
                          <tr key={wks.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                              <Monitor size={14} className="text-indigo-600 shrink-0" />
                              {wks.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(wks.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {wks.last_used_at ? new Date(wks.last_used_at).toLocaleString() : 'Never'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                wks.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              )}>
                                {wks.is_active ? "Active" : "Revoked"}
                              </span>
                            </td>
                            {userRole === 'ADMIN' && (
                              <td className="px-4 py-3 text-right">
                                {wks.is_active ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeWorkstation(wks.id, wks.name)}
                                    className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                                  >
                                    Revoke
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-xs">Revoked</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: PHYSICAL GPS GEOFENCE (FALLBACK & ROAMING) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <MapPin size={16} className="text-amber-600" />
                    Physical GPS Boundary (Roaming Mobile Devices & Laptops)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Used as a fallback for devices outside the hospital local network or unenrolled hardware.</p>
                </div>
                {userRole === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={detectingGps}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {detectingGps ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                    Detect My Current GPS Location
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Latitude (°N/S)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.geofence_latitude}
                    onChange={e => setForm({ ...form, geofence_latitude: parseFloat(e.target.value) || 0 })}
                    disabled={userRole !== 'ADMIN'}
                    placeholder="-15.387500"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Longitude (°E/W)</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.geofence_longitude}
                    onChange={e => setForm({ ...form, geofence_longitude: parseFloat(e.target.value) || 0 })}
                    disabled={userRole !== 'ADMIN'}
                    placeholder="28.322800"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Allowed Radius (Meters)</label>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    value={form.geofence_radius_meters}
                    onChange={e => setForm({ ...form, geofence_radius_meters: parseInt(e.target.value) || 500 })}
                    disabled={userRole !== 'ADMIN'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Quick Preset Pills */}
              {userRole === 'ADMIN' && (
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-400 mr-2">Quick Presets:</span>
                  {[
                    { label: '100m (Building)', value: 100 },
                    { label: '250m (Campus)', value: 250 },
                    { label: '500m (Default)', value: 500 },
                    { label: '1km (Zone)', value: 1000 },
                    { label: '5km (District)', value: 5000 },
                  ].map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setForm({ ...form, geofence_radius_meters: preset.value })}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        form.geofence_radius_meters === preset.value
                          ? "bg-brand-50 border-brand-300 text-brand-700 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Targeted Roles */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Enforced Workforce Roles</h3>
                  <p className="text-xs text-slate-500 font-medium">Select which personnel roles require physical presence within the facility perimeter to log in.</p>
                </div>
                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-3 text-xs font-bold text-brand-600">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, geofence_enforce_roles: [...WORKFORCE_ROLES] })}
                      className="hover:underline"
                    >
                      Select All
                    </button>
                    <span>&bull;</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, geofence_enforce_roles: [] })}
                      className="hover:underline text-slate-400"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {WORKFORCE_ROLES.map(role => {
                  const checked = form.geofence_enforce_roles.includes(role);
                  return (
                    <label
                      key={role}
                      className={clsx(
                        "flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-all",
                        checked
                          ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleEnforcedRole(role)}
                        disabled={userRole !== 'ADMIN'}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span>{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Admin Bypass Option */}
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">System Administrator Remote Access Bypass</h4>
                <p className="text-xs text-amber-700 font-medium">Exempt users with ADMIN role from geo-fencing checks so system administrators can perform remote maintenance.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={form.geofence_allow_admin_bypass}
                  onChange={e => setForm({ ...form, geofence_allow_admin_bypass: e.target.checked })}
                  disabled={userRole !== 'ADMIN'}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>

            {/* Config Summary Card */}
            <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-400" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Configured Perimeter Parameters</p>
                </div>
                <p className="text-sm font-bold text-slate-200">
                  Network Whitelist: <span className="text-emerald-400 font-bold">{form.geofence_network_check_enabled ? 'Active' : 'Off'}</span> &bull; Workstations: <span className="text-emerald-400 font-bold">{trustedWorkstations.filter(w => w.is_active).length} Active</span> &bull; GPS Radius: <span className="text-emerald-400 font-bold">{formatDistance(form.geofence_radius_meters)}</span>
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium text-right">
                <span className="font-bold text-white">{form.geofence_enforce_roles.length}</span> of {WORKFORCE_ROLES.length} roles subject to perimeter restriction
              </div>
            </div>
          </section>
        )}

        {/* Global Save Button (for settings tabs 1-4) */}
        {userRole === 'ADMIN' && (
          <div className="flex justify-end pt-2">
            <button 
              disabled={saving}
              type="submit"
              className="bg-brand-600 text-white px-8 py-3.5 rounded-2xl text-sm font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save System Settings
            </button>
          </div>
        )}
        </form>
      )}

      {/* Tab 5: Email Notifications uses its own independent form. */}
      {activeTab === 'notifications' && (
        <div className="animate-in fade-in duration-300">
          <EmailNotificationSettingsPanel canEdit={userRole === 'ADMIN'} />
        </div>
      )}

      {/* Tab 7: Smart TV Queue Broadcast Management */}
      {activeTab === 'tv_broadcast' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-xs">
                <Tv size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Smart TV Queue Broadcast
                  <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active Feature
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Broadcasting live OPD queue announcements to Smart TVs using connection links and activation codes.
                </p>
              </div>
            </div>

            {userRole === 'ADMIN' && (
              <button
                onClick={() => setIsTvModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 shrink-0"
              >
                <Radio size={16} className="animate-pulse" />
                <span>Manage TV Links & Codes</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio size={18} className="text-brand-600" />
                Direct TV Pairing Link
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Generates a direct URL (e.g. <code>https://staff.kundahealthcare.org/tv?code=TV-849201</code>) that allows Smart TVs to connect instantly without typing passwords.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield size={18} className="text-emerald-600" />
                6-Digit TV Activation Code
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Open <code>/tv</code> on any TV browser and enter the unique 6-digit activation code (e.g. <code>TV-849201</code>). Codes can be revoked at any time by Administrators.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DATA PURGE & CLIENT HANDOVER TAB */}
      {activeTab === 'data_management' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700 uppercase tracking-wide">
                <ShieldAlert size={13} />
                Admin Danger Zone
              </div>
              <h3 className="text-xl font-black text-slate-900">Permanent Data Purge & Wipe</h3>
              <p className="text-xs text-slate-500 font-medium">
                Categorically delete test records or perform a complete database reset before handing the system over to the client.
              </p>
            </div>

            <Link
              href="/hospital/admin/data-management"
              className="inline-flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 transition-all shrink-0"
            >
              <Trash2 size={16} />
              Open Data Management Console
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Database size={18} className="text-rose-600" />
                Categorical Data Deletion
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Delete specific transactional datasets independently without affecting other functional areas. Supported categories:
              </p>
              <ul className="text-xs text-slate-600 font-bold space-y-1.5 list-disc list-inside">
                <li>Patient Registry & Medical Records</li>
                <li>Appointments & Walk-in Queues</li>
                <li>Clinical SOAP Notes, Vitals, Labs & Radiology</li>
                <li>Billing Invoices, Cashier Payments & Claims</li>
                <li>Inpatient Ward Admissions & Treatment Sheets</li>
                <li>Blood Bank Inventory & Donor Logs</li>
                <li>Pharmacy Inventory & Stock Movements</li>
                <li>HR Payroll Disbursements & Shift Rosters</li>
              </ul>
            </div>

            <div className="p-6 bg-linear-to-br from-rose-950 to-slate-900 border border-rose-800/40 rounded-2xl text-white space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 uppercase tracking-wide">
                  <Sparkles size={12} />
                  Client Handover Master Action
                </div>
                <h4 className="text-base font-black text-white">Full System Reset</h4>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Atomically purge all demo transactional data while safely preserving core configuration (system settings, departments, wards, rooms, and admin accounts).
                </p>
              </div>

              <Link
                href="/hospital/admin/data-management"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black text-center shadow-lg shadow-rose-600/30 transition-all block"
              >
                Launch Data Management
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Authorize This Computer */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Authorize This Computer</h3>
                  <p className="text-xs text-slate-500 font-medium">Enroll this browser as a stationary terminal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAuthorizeThisComputer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Workstation Identifier / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reception Desk 1, OPD Clinic A, Pharmacy Main"
                  value={workstationEnrollName}
                  onChange={e => setWorkstationEnrollName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  A cryptographic authorization token will be saved in this browser. Workforce members can sign in on this machine without GPS prompts or external hardware.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrollingWorkstation || !workstationEnrollName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {enrollingWorkstation ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Enroll Computer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <TvBroadcastModal isOpen={isTvModalOpen} onClose={() => setIsTvModalOpen(false)} />

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
