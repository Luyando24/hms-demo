import {
  ShieldCheck,
  Clock,
  Microscope,
  HeartHandshake,
  Award,
  BadgeCheck,
} from "lucide-react";

const WHY_US_ITEMS = [
  {
    icon: ShieldCheck,
    title: "Accredited & Certified",
    desc: "Our facility meets international standards with ISO accreditation and continuously updated clinical protocols.",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Clock,
    title: "24/7 Emergency Care",
    desc: "Round-the-clock emergency services with a dedicated trauma team and fully equipped resuscitation bays.",
    gradient: "from-red-500 to-rose-600",
  },
  {
    icon: Microscope,
    title: "Advanced Diagnostics",
    desc: "On-site laboratory and radiology with rapid turnaround, ensuring faster and more accurate diagnoses.",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    icon: HeartHandshake,
    title: "Patient-Centred Care",
    desc: "We treat every patient with dignity, compassion, and respect — your comfort and wellbeing drives everything we do.",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Award,
    title: "Expert Specialists",
    desc: "A multidisciplinary team of experienced consultants, surgeons, and clinical specialists across all departments.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: BadgeCheck,
    title: "Transparent Billing",
    desc: "No hidden fees. Clear pricing with insurance support, flexible payment options, and comprehensive receipts.",
    gradient: "from-indigo-500 to-blue-700",
  },
];

export function WhyUs() {
  return (
    <section id="why-us" className="py-24 px-6 bg-[#060f1e] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            <ShieldCheck size={13} />
            Why Choose Us
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5 leading-tight">
            Healthcare you can{" "}
            <span className="text-cyan-400">trust.</span>
          </h2>
          <p className="text-lg text-slate-400 font-medium leading-relaxed">
            We combine modern medical technology with genuine compassion to deliver outcomes
            that matter most — your health and peace of mind.
          </p>
        </div>

        {/* Why Us grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_US_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group bg-white/5 border border-white/8 rounded-3xl p-7 hover:bg-white/8 hover:border-white/15 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <h3 className="text-lg font-black text-white mb-2 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
