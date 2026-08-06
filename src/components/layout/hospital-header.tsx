"use client";

import Link from "next/link";
import { Bell, ChevronDown, HeartPulse, Menu, LogOut, User as UserIcon, Settings, LogIn } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { useMobileNav } from "./mobile-nav-context";
import { useState, useEffect } from "react";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/utils/supabase/client";
import OPDCheckInModal from "../hospital/OPDCheckInModal";

import { NotificationCenterDropdown } from "./NotificationCenterDropdown";

export function HospitalHeader() {
  const { toggle } = useMobileNav();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [brandTitle, setBrandTitle] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    const fetchUserAndSettings = async () => {
      const [{ data: authData }, { data: settings }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("system_settings").select("hospital_name, brand_title, logo_url, tagline").limit(1).maybeSingle(),
      ]);

      if (settings?.hospital_name) {
        setHospitalName(settings.hospital_name);
      }
      setBrandTitle(settings?.brand_title?.trim() || settings?.hospital_name || "");

      if (settings?.logo_url) {
        setLogoUrl(settings.logo_url);
      }
      if (settings?.tagline) {
        setTagline(settings.tagline);
      }

      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();
        
        setUser({
          ...profile,
          email: authData.user.email
        });
      }
    };
    fetchUserAndSettings();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-50">
      {/* Left side / Brand & Search Bar */}
      <div className="flex items-center gap-4 sm:gap-10">
        <button 
          onClick={toggle}
          className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl"
        >
          <Menu size={24} />
        </button>

        <Link href="/" className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
              <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="bg-brand-500 p-2 rounded-xl text-white shadow-sm shadow-brand-500/20">
              <HeartPulse size={24} strokeWidth={2.5} />
            </div>
          )}
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-base leading-tight text-slate-900">
              {brandTitle}
            </span>
            {tagline && (
              <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                {tagline}
              </span>
            )}
          </div>
        </Link>

        <GlobalSearch variant="hospital" className="w-80 hidden md:block" />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        {/* Quick Actions */}
        <button 
          onClick={() => setIsCheckInOpen(true)}
          className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
        >
          <LogIn size={16} />
          <span>OPD Check-in</span>
        </button>

        <div className="w-px h-6 bg-slate-200 hidden md:block" />

        {/* Notifications */}
        <NotificationCenterDropdown />

        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 pr-3 rounded-full transition-all hover:bg-slate-100 shadow-sm"
          >
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {user ? `${user.first_name?.[0] || 'S'}${user.last_name?.[0] || 'T'}` : '...'}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Loading...'}
              </p>
              <p className="text-xs text-brand-600 font-medium">
                {user?.role || 'HOSPITAL STAFF'}
              </p>
            </div>
            <ChevronDown size={16} className={`text-slate-400 ml-1 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
          </button>

          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-slate-100 mb-1">
                  <p className="text-sm font-bold text-slate-900">
                    {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '...'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || '...'}</p>
                </div>
                
                <Link 
                  href="/hospital/hr"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                >
                  <UserIcon size={16} />
                  My Personnel Profile
                </Link>
                <Link 
                  href="/hospital/settings"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                >
                  <Settings size={16} />
                  System Settings
                </Link>
                
                <div className="h-px bg-slate-100 my-1" />
                
                <button 
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <OPDCheckInModal 
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />
    </header>
  );
}
