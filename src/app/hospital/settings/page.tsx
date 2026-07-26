'use client'

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, DollarSign, Building, Phone, Mail, Save, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { SUPPORTED_CURRENCIES, formatCurrencyAmount } from '@/utils/currency';
import StatusModal from '@/components/hospital/StatusModal';

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error', title: string, message: string } | null>(null);

  const [form, setForm] = useState({
    hospital_name: 'HMS Clinic',
    default_currency: 'USD',
    currency_symbol: '$',
    currency_position: 'prefix' as 'prefix' | 'suffix',
    tax_rate: 0,
    phone: '',
    email: '',
    address: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);

    // 1. Fetch user role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setUserRole(profile?.role || user.user_metadata?.role || 'STAFF');
    }

    // 2. Fetch system settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettingsId(data.id);
      setForm({
        hospital_name: data.hospital_name || 'HMS Clinic',
        default_currency: data.default_currency || 'USD',
        currency_symbol: data.currency_symbol || '$',
        currency_position: data.currency_position || 'prefix',
        tax_rate: data.tax_rate || 0,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || ''
      });
    }
    setLoading(false);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN') {
      alert('Only System Administrators can modify global hospital settings.');
      return;
    }

    setSaving(true);
    const payload = {
      ...form,
      updated_at: new Date().toISOString()
    };

    let res;
    if (settingsId) {
      res = await supabase.from('system_settings').update(payload).eq('id', settingsId);
    } else {
      res = await supabase.from('system_settings').insert(payload);
    }

    if (res.error) {
      setStatus({ type: 'error', title: 'Save Failed', message: res.error.message });
    } else {
      setStatus({ 
        type: 'success', 
        title: 'Settings Saved', 
        message: `Default currency updated to ${form.default_currency} (${form.currency_symbol}). Changes applied globally across all billing and financial reports.` 
      });
      fetchSettings();
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20">
              <SettingsIcon size={24} />
            </div>
            Hospital Settings & Preferences
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Manage default currency, localization, and facility branding.</p>
        </div>
      </div>

      {userRole !== 'ADMIN' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <p className="text-xs font-bold">
            You are currently viewing settings in read-only mode. Administrator permissions are required to modify currency and facility configuration.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Currency & Financial Localization */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
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
          </div>

          {/* Live Preview Box */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Currency Preview</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrencyAmount(1250, form.currency_symbol, form.currency_position)}
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-700">Code:</span> {form.default_currency} &bull; <span className="font-bold text-slate-700">Symbol:</span> {form.currency_symbol} &bull; <span className="font-bold text-slate-700">Placement:</span> {form.currency_position}
            </div>
          </div>
        </section>

        {/* Facility Information & Branding */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-black">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Hospital & Clinic Details</h2>
              <p className="text-xs text-slate-500 font-medium">Facility name printed on patient receipts, medical reports, and invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Hospital / Clinic Name</label>
              <input 
                required 
                value={form.hospital_name}
                onChange={e => setForm({...form, hospital_name: e.target.value})}
                disabled={userRole !== 'ADMIN'}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
              />
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
          </div>
        </section>

        {userRole === 'ADMIN' && (
          <div className="flex justify-end">
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
