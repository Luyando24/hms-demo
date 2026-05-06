import Link from "next/link";
import { ArrowRight, ActivitySquare } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-40 pb-20 px-6 overflow-hidden min-h-[90vh] flex items-center">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-100/50 blur-3xl opacity-60 mix-blend-multiply" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-emerald-50/50 blur-3xl opacity-60 mix-blend-multiply" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ActivitySquare className="text-brand-500 w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide text-slate-700">24/7 Emergency & Outpatient Care</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-slate-900 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150">
          World-class healthcare, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-emerald-400">
            close to home.
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          At Marybegg Hospital, we combine compassionate care with state-of-the-art medical technology to provide the best possible outcomes for you and your family.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
          <Link 
            href="/book" 
            className="group flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 w-full sm:w-auto"
          >
            Book Appointment
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/login" 
            className="flex items-center justify-center px-8 py-4 rounded-full text-lg font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all w-full sm:w-auto"
          >
            Patient Portal
          </Link>
        </div>
      </div>
    </section>
  );
}
