"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { HeartPulse, ArrowRight, User, Lock, Stethoscope, ShieldAlert, AlertCircle } from "lucide-react";
import { signIn } from "./actions";
import { useSearchParams } from "next/navigation";

type TabType = "patient" | "staff" | "admin";

function LoginContent() {
  const [activeTab, setActiveTab] = useState<TabType>("patient");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-4 font-sans">
      
      {/* Header Area */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-md mb-6">
          <HeartPulse size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2">Welcome back</h1>
        <p className="text-slate-500 text-[15px]">Please enter your details to sign in</p>
      </div>

      {/* Main Card */}
      <div className="bg-white w-full max-w-[500px] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex bg-slate-50/80 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab("patient")}
            className={`flex-1 py-4 text-[14px] font-medium text-center transition-all relative ${
              activeTab === "patient" ? "text-brand-600 bg-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Patient
            {activeTab === "patient" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("staff")}
            className={`flex-1 py-4 text-[14px] font-medium text-center transition-all relative border-l border-slate-100 ${
              activeTab === "staff" ? "text-brand-600 bg-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff
            {activeTab === "staff" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-4 text-[14px] font-medium text-center transition-all relative border-l border-slate-100 ${
              activeTab === "admin" ? "text-brand-600 bg-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Admin
            {activeTab === "admin" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-[20px] font-bold text-slate-900 mb-1">
              {activeTab === "patient" && "Patient Login"}
              {activeTab === "staff" && "Staff Login"}
              {activeTab === "admin" && "Administrator Login"}
            </h2>
            <p className="text-[14px] text-slate-500">
              {activeTab === "patient" && "Sign in to your patient account"}
              {activeTab === "staff" && "Sign in to your hospital staff account"}
              {activeTab === "admin" && "Sign in to the system console"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle size={20} />
              <p className="text-[13px] font-medium">{error}</p>
            </div>
          )}

          <form action={async (formData) => {
            setIsLoading(true);
            await signIn(formData);
            setIsLoading(false);
          }} className="space-y-5">
            <input type="hidden" name="role" value={activeTab.toUpperCase()} />
            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-2">
                {activeTab === "patient" ? "Email Address" : "Email Address"}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {activeTab === "patient" ? <User size={18} /> : activeTab === "staff" ? <Stethoscope size={18} /> : <ShieldAlert size={18} />}
                </div>
                <input 
                  name="email"
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none transition-all text-[14px] text-slate-900 placeholder:text-slate-400"
                  placeholder={activeTab === "patient" ? "patient@example.com" : "admin@hospital.com"}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] font-bold text-slate-900 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  name="password"
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#f0f4f8] border border-transparent focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl outline-none transition-all text-[14px] text-slate-900 placeholder:text-slate-400 tracking-widest"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded focus:ring-2 focus:ring-brand-500/20 checked:border-brand-600 checked:bg-brand-600 transition-all cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[13px] text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <Link href="#" className="text-[13px] font-medium text-brand-600 hover:text-brand-700 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand-600 text-white font-medium text-[15px] py-3 rounded-xl hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-600/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2 group"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[13px] text-slate-500">
              Don't have an account? <Link href="#" className="font-medium text-brand-600 hover:text-brand-700 transition-colors">Contact your administrator</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="w-32 h-4 bg-slate-200 rounded"></div>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
