import { 
  Stethoscope, 
  Activity, 
  Baby, 
  Microscope, 
  Heart, 
  ShieldPlus,
  Pill,
  CreditCard,
  Building2,
  Radio,
  LucideIcon
} from "lucide-react";

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
  color: string;
  fallbackDesc: string;
}

const DEPARTMENT_VISUALS: Record<string, FeatureVisual> = {
  OPD: {
    icon: Stethoscope,
    color: "bg-emerald-100 text-emerald-600",
    fallbackDesc: "Comprehensive outpatient consultations, routine medical check-ups, and preventative clinical care.",
  },
  ER: {
    icon: Activity,
    color: "bg-red-100 text-red-600",
    fallbackDesc: "24/7 emergency room services equipped for critical trauma, urgent resuscitation, and immediate medical care.",
  },
  Laboratory: {
    icon: Microscope,
    color: "bg-blue-100 text-blue-600",
    fallbackDesc: "State-of-the-art pathology testing, hematology diagnostics, and automated clinical lab specimen analysis.",
  },
  Pharmacy: {
    icon: Pill,
    color: "bg-amber-100 text-amber-600",
    fallbackDesc: "Full-service pharmaceutical dispensing, prescription management, and critical stock drug supplies.",
  },
  Radiology: {
    icon: Radio,
    color: "bg-purple-100 text-purple-600",
    fallbackDesc: "Advanced diagnostic imaging including digital X-ray scans, ultrasound imaging, and PACS archiving.",
  },
  IPD: {
    icon: ShieldPlus,
    color: "bg-indigo-100 text-indigo-600",
    fallbackDesc: "Inpatient ward admissions, intensive care nursing, private rooms, and multi-specialty inpatient care.",
  },
  Reception: {
    icon: Building2,
    color: "bg-teal-100 text-teal-600",
    fallbackDesc: "Front desk triage, patient check-in, appointments scheduling, and visitor administration.",
  },
  Billing: {
    icon: CreditCard,
    color: "bg-sky-100 text-sky-600",
    fallbackDesc: "Transparent billing, insurance claim processing, flexible payment options, and cashier support.",
  },
};

const DEFAULT_FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  { id: "def-1", name: "OPD", description: "Outpatient Department / General Consultations" },
  { id: "def-2", name: "ER", description: "Emergency Room / Trauma & Urgent Care" },
  { id: "def-3", name: "Laboratory", description: "Diagnostic pathology testing and hematology" },
  { id: "def-4", name: "Pharmacy", description: "Medication dispensing and pharmaceutical supplies" },
  { id: "def-5", name: "Radiology", description: "X-Ray, CT, and Ultrasound diagnostic imaging" },
  { id: "def-6", name: "IPD", description: "Inpatient Wards and specialized room admissions" },
];

export function Features({ departments = [] }: FeaturesProps) {
  const activeDepartments = departments.length > 0 ? departments : DEFAULT_FALLBACK_DEPARTMENTS;

  return (
    <section id="services" className="py-24 px-6 bg-white relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold uppercase tracking-wider mb-4">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            Specialized Hospital Departments
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Comprehensive care for your family.
          </h2>
          <p className="text-xl text-slate-600">
            From routine check-ups to specialized emergency care, our clinical departments support your entire health journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeDepartments.map((dept, idx) => {
            const visual = DEPARTMENT_VISUALS[dept.name] || {
              icon: Stethoscope,
              color: "bg-brand-100 text-brand-600",
              fallbackDesc: "Dedicated medical department offering expert care and specialized clinical services.",
            };
            const IconComp = visual.icon;
            const desc = dept.description || visual.fallbackDesc;

            return (
              <div 
                key={dept.id || idx} 
                className="card-rounded bg-slate-50 border border-slate-200 p-10 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${visual.color} group-hover:scale-110 transition-transform duration-300`}>
                  <IconComp size={32} strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">
                  {dept.name}
                </h3>
                <p className="text-slate-600 leading-relaxed text-base font-medium">
                  {desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
