'use client'

import { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, DollarSign, Building, Save, Loader2, ShieldAlert, CreditCard, Shield, Plus, X, Mail, MapPin, Navigation, Crosshair, Tv, Radio } from 'lucide-react';
import clsx from 'clsx';
import { createClient } from '@/utils/supabase/client';
import { SUPPORTED_CURRENCIES, formatCurrencyAmount } from '@/utils/currency';
import StatusModal from '@/components/hospital/StatusModal';
import { EmailNotificationSettingsPanel } from '@/components/hospital/EmailNotificationSettingsPanel';
import { updateSystemSettingsAction } from '@/app/hospital/actions';
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
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'payments' | 'insurance' | 'notifications' | 'geofence' | 'tv_broadcast'>('general');
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
  });

  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newInsuranceProvider, setNewInsuranceProvider] = useState('');

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
    };

    const res = await updateSystemSettingsAction(cleanedForm);

    if (res.error) {
      setStatus({ type: 'error', title: 'Save Failed', message: res.error });
    } else {
      setStatus({ 
        type: 'success', 
        title: 'Settings Saved', 
        message: 'System settings, payment methods, and accepted insurance providers updated successfully.' 
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
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
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
        alert(`Failed to detect GPS location: ${err.message}`);
        setDetectingGps(false);
      },
      { enableHighAccuracy: true }
    );
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
                  <h2 className="text-lg font-black text-slate-900">Geographical Fencing & Access Controls</h2>
                  <p className="text-xs text-slate-500 font-medium">Restrict workforce system access strictly within designated physical facility boundaries.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                  form.geofence_enabled ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                )}>
                  {form.geofence_enabled ? "Geo-fence Active" : "Geo-fence Disabled"}
                </span>
              </div>
            </div>

            {/* Enable Toggle Card */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Navigation size={16} className="text-brand-600" />
                  Enable Geographical Access Restriction
                </h3>
                <p className="text-xs text-slate-500 font-medium max-w-xl">
                  When enabled, workforce users attempting to log in outside the designated GPS radius will be denied access to clinical and administrative portals.
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

            {/* Location Coordinates & Radius */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Facility Center Coordinates & Allowed Radius</h3>
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
                  <p className="text-xs text-slate-500 font-medium">Select which personnel roles require physical presence within the geo-fence boundary to log in.</p>
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
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Configured Geo-Fence Parameters</p>
                </div>
                <p className="text-sm font-bold text-slate-200">
                  Center: <span className="font-mono text-emerald-400">{form.geofence_latitude.toFixed(6)}, {form.geofence_longitude.toFixed(6)}</span> &bull; Radius: <span className="text-emerald-400 font-bold">{formatDistance(form.geofence_radius_meters)}</span>
                </p>
              </div>
              <div className="text-xs text-slate-400 font-medium text-right">
                <span className="font-bold text-white">{form.geofence_enforce_roles.length}</span> of {WORKFORCE_ROLES.length} roles subject to GPS restriction
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
