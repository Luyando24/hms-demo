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
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 z-50">
        {/* Left side / Brand & Search Bar */}
        <div className="flex items-center gap-4 sm:gap-8">
          <button 
            onClick={toggle}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl"
          >
            <Menu size={22} />
          </button>

          <Link href="/" className="flex items-center gap-2.5">
            {logoUrl ? (
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoUrl} alt={hospitalName} className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-slate-900 p-1.5 rounded-lg text-white shadow-xs">
                <HeartPulse size={18} strokeWidth={2.2} />
              </div>
            )}
            <div className="hidden sm:flex flex-col">
              <span className="font-bold text-sm tracking-tight text-slate-900">
                {brandTitle}
              </span>
              {tagline && (
                <span className="text-[10px] font-medium text-slate-400 leading-none">
                  {tagline}
                </span>
              )}
            </div>
          </Link>

          <GlobalSearch variant="hospital" className="w-72 hidden md:block" />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <button 
            onClick={() => setIsCheckInOpen(true)}
            className="hidden md:flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
          >
            <LogIn size={14} />
            <span>Patient Intake</span>
          </button>

          <div className="w-px h-5 bg-slate-200 hidden md:block" />

          {/* Notifications */}
          <NotificationCenterDropdown />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 bg-white border border-slate-200/80 p-1 pr-2.5 rounded-xl transition-all hover:bg-slate-50 shadow-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user ? `${user.first_name?.[0] || 'S'}${user.last_name?.[0] || 'T'}` : '...'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Loading...'}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold leading-none">
                  {user?.role || 'STAFF'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 ml-0.5 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsProfileOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-lg z-20 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900">
                      {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '...'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || '...'}</p>
                  </div>
                  
                  <Link 
                    href="/hospital/hr"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <UserIcon size={14} />
                    My Personnel Profile
                  </Link>
                  <Link 
                    href="/hospital/settings"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Settings size={14} />
                    System Settings
                  </Link>
                  
                  <div className="h-px bg-slate-100 my-1" />
                  
                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <OPDCheckInModal 
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
      />
    </>
  );
}
