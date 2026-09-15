import {
  Stethoscope,
  Activity,
  Microscope,
  Heart,
  ShieldPlus,
  Pill,
  Radio,
  Baby,
  LucideIcon,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export interface DepartmentItem {
  id: string;
  name: string;
  description: string | null;
}

interface FeaturesProps {
  departments?: DepartmentItem[];
}

interface FeatureVisual {
  icon: LucideIcon;
  gradient: string;
  accent: string;
  fallbackDesc: string;
}

const DEPARTMENT_VISUALS: Record<string, FeatureVisual> = {
  OPD: {
    icon: Stethoscope,
    gradient: "from-emerald-500 to-teal-600",
    accent: "emerald",
    fallbackDesc:
      "Comprehensive outpatient consultations, routine check-ups, and preventative care by our experienced clinicians.",
  },
  ER: {
    icon: Activity,
    gradient: "from-red-500 to-rose-600",
    accent: "red",
    fallbackDesc:
      "24/7 emergency services equipped for critical trauma, urgent resuscitation, and immediate medical response.",
  },
  Laboratory: {
    icon: Microscope,
    gradient: "from-blue-500 to-indigo-600",
    accent: "blue",
    fallbackDesc:
      "State-of-the-art pathology and hematology testing with rapid turnaround times and precision diagnostics.",
  },
  Pharmacy: {
    icon: Pill,
    gradient: "from-amber-500 to-orange-600",
    accent: "amber",
    fallbackDesc:
      "Full-service pharmaceutical dispensing, prescription management, and critical drug supply management.",
  },
  Radiology: {
    icon: Radio,
    gradient: "from-purple-500 to-violet-600",
    accent: "purple",
    fallbackDesc:
      "Advanced diagnostic imaging including digital X-ray, ultrasound scanning, and PACS archiving.",
  },
  IPD: {
    icon: ShieldPlus,
    gradient: "from-cyan-500 to-blue-600",
    accent: "cyan",
    fallbackDesc:
      "Inpatient ward admissions, private rooms, intensive care nursing, and multi-specialty inpatient treatment.",
  },
  Maternity: {
    icon: Baby,
    gradient: "from-pink-500 to-rose-500",
    accent: "pink",
    fallbackDesc:
      "Dedicated maternity ward with pre-natal care, skilled birth attendants, and post-natal support services.",
  },
  Cardiology: {
    icon: Heart,
    gradient: "from-red-400 to-pink-600",
    accent: "red",
    fallbackDesc:
      "Specialized cardiovascular diagnostics, ECG monitoring, and heart disease management programs.",
  },
};

const DEFAULT_FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  { id: "def-1", name: "OPD", description: null },
  { id: "def-2", name: "ER", description: null },
  { id: "def-3", name: "Laboratory", description: null },
  { id: "def-4", name: "Pharmacy", description: null },
  { id: "def-5", name: "Radiology", description: null },
  { id: "def-6", name: "IPD", description: null },
];

export function Features({ departments = [] }: FeaturesProps) {
  const activeDepartments = departments.length > 0 ? departments : DEFAULT_FALLBACK_DEPARTMENTS;

  return (
    <section id="services" className="py-24 px-6 bg-[#f8fafc] relative z-20">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            <Stethoscope size={13} />
            Clinical Departments
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-5 leading-tight">
            Specialized care for
            <span className="text-cyan-600"> every need.</span>
          </h2>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            From emergency response to routine check-ups, our departments are equipped with
            modern technology and expert clinicians to serve your health needs.
          </p>
        </div>

        {/* Department grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeDepartments.map((dept, idx) => {
            const visual = DEPARTMENT_VISUALS[dept.name] || {
              icon: Stethoscope,
              gradient: "from-slate-600 to-slate-800",
              accent: "slate",
              fallbackDesc:
                "Dedicated medical department offering expert care and specialized clinical services.",
            };
            const IconComp = visual.icon;
            const desc = dept.description || visual.fallbackDesc;

            return (
              <div
                key={dept.id || idx}
                className="group bg-white border border-slate-200 rounded-3xl p-7 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${visual.gradient} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <IconComp size={26} strokeWidth={2} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                  {dept.name}
                </h3>
                <p className="text-slate-500 leading-relaxed text-sm font-medium mb-6 line-clamp-3">
                  {desc}
                </p>

                {/* CTA */}
                <Link
                  href="/book-appointment"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-cyan-600 hover:text-cyan-700 transition-colors group/cta"
                >
                  Book Consultation
                  <ArrowRight
                    size={14}
                    className="group-hover/cta:translate-x-0.5 transition-transform"
                  />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/book-appointment"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-[15px] transition-all shadow-xl hover:shadow-slate-900/30 hover:-translate-y-0.5"
          >
            <Stethoscope size={18} />
            Book a Consultation Today
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
