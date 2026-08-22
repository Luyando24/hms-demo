'use client';

import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Eye,
  EyeOff,
  Wand2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  User,
  Mail,
  Shield,
} from 'lucide-react';
import { changeStaffPasswordAction } from '@/app/hospital/staff/actions';
import StatusModal from './StatusModal';
import clsx from 'clsx';

interface ChangeStaffPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  staffMember: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    staff_number?: string | null;
    role?: string | null;
  } | null;
}

function generateClientSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomPart = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  const numPart = Math.floor(10 + Math.random() * 90);
  return `Hms@${randomPart}${numPart}!`;
}

export default function ChangeStaffPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  staffMember,
}: ChangeStaffPasswordModalProps) {
  const [mode, setMode] = useState<'CUSTOM' | 'AUTO'>('AUTO');
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Result State
  const [updatedCredentials, setUpdatedCredentials] = useState<{
    email: string;
    newPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !staffMember) return null;

  const handleResetState = () => {
    setCustomPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setUpdatedCredentials(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleResetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let passwordToSend: string | undefined = undefined;
    const isAuto = mode === 'AUTO';

    if (!isAuto) {
      if (!customPassword || customPassword.length < 8) {
        setErrorMsg('Password must be at least 8 characters long.');
        return;
      }
      if (customPassword !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify your entries.');
        return;
      }
      passwordToSend = customPassword;
    }

    setLoading(true);

    try {
      const result = await changeStaffPasswordAction({
        staffId: staffMember.id,
        newPassword: passwordToSend,
        autoGenerate: isAuto,
      });

      if (!result.success || !result.newPassword) {
        throw new Error(result.error || 'Failed to update staff password.');
      }

      setUpdatedCredentials({
        email: result.email || staffMember.email || '',
        newPassword: result.newPassword,
      });
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while resetting the password.');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = async () => {
    if (!updatedCredentials) return;
    const text = `Hospital Staff Portal Login Credentials:
Email: ${updatedCredentials.email}
New Password: ${updatedCredentials.newPassword}
Portal URL: ${window.location.origin}/login/staff`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const staffIdDisplay =
    staffMember.staff_number ||
    `HMS-${staffMember.role?.slice(0, 3)}-${staffMember.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Change Staff Password</h2>
              <p className="text-xs text-slate-500 font-medium">
                Admin credential reset & authentication override
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
          {/* Target Staff Information Badge */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm shrink-0">
                <User size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">
                  {staffMember.first_name} {staffMember.last_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-500">
                    {staffIdDisplay}
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    {staffMember.role || 'STAFF'}
                  </span>
                </div>
              </div>
            </div>

            {staffMember.email && (
              <span className="text-xs text-slate-500 font-medium truncate max-w-[140px] text-right hidden sm:block">
                {staffMember.email}
              </span>
            )}
          </div>

          {/* Success View */}
          {updatedCredentials ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-black text-emerald-950">Password Updated Successfully</h4>
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    The new password is now active in the authentication system. Share the temporary
                    credentials securely with the staff member.
                  </p>
                </div>
              </div>

              {/* Password Display Box */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>New Staff Password</span>
                  <span className="text-emerald-400 font-mono">Active</span>
                </div>
                <div className="p-3 bg-slate-800/90 rounded-xl font-mono text-base sm:text-lg font-black text-emerald-300 tracking-wider break-all select-all flex items-center justify-between">
                  <span>{updatedCredentials.newPassword}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Staff Email: <span className="text-slate-200 font-bold">{updatedCredentials.email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} /> Credentials Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy Full Credentials & Portal Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <form id="change-password-form" onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('AUTO')}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5',
                    mode === 'AUTO'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <Wand2 size={14} /> Auto-Generate
                </button>
                <button
                  type="button"
                  onClick={() => setMode('CUSTOM')}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5',
                    mode === 'CUSTOM'
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  <Lock size={14} /> Custom Password
                </button>
              </div>

              {/* Mode A: AUTO-GENERATE */}
              {mode === 'AUTO' && (
                <div className="p-4 bg-brand-50/60 border border-brand-200/70 rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-black text-brand-900 uppercase tracking-wider">
                    <Wand2 size={15} className="text-brand-600" /> Automated Secure Password
                  </div>
                  <p className="text-xs text-brand-800 leading-relaxed font-medium">
                    A cryptographically randomized temporary password meeting all complexity
                    requirements will be generated and assigned to this staff account.
                  </p>
                </div>
              )}

              {/* Mode B: CUSTOM PASSWORD */}
              {mode === 'CUSTOM' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider text-[11px]">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        placeholder="Enter new password (min. 8 characters)..."
                        className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wider text-[11px]">
                      Confirm New Password *
                    </label>
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password to verify..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
          {updatedCredentials ? (
            <button
              onClick={handleClose}
              type="button"
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors"
            >
              Done & Close
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                type="button"
                className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                type="submit"
                form="change-password-form"
                className="flex-[2] bg-brand-600 text-white px-5 py-3 rounded-xl text-xs font-black hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <KeyRound size={16} /> Update Password
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
