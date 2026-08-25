import Link from "next/link";
import {
  TestTube2,
  FlaskConical,
  Microscope,
  Droplet,
  Activity,
  HeartPulse,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
  Sparkles,
} from "lucide-react";

export interface LabTestItem {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  turnaroundTime: string;
  sampleType: string;
  popular?: boolean;
}

export const COMMON_LAB_TESTS: LabTestItem[] = [
  {
    id: "fbc",
    name: "Full Blood Count (FBC / CBC)",
    code: "HEM-001",
    category: "Hematology",
    description:
      "Evaluates overall health and detects a wide range of disorders including anemia, infection, inflammation, and leukemia.",
    turnaroundTime: "30 - 45 mins",
    sampleType: "Whole Blood (EDTA)",
    popular: true,
  },
  {
    id: "cmp",
    name: "Comprehensive Metabolic Panel (CMP)",
    code: "BIO-004",
    category: "Clinical Biochemistry",
    description:
      "Evaluates kidney function (BUN/Creatinine), liver enzymes (ALT/AST), blood glucose, protein levels, and electrolyte balance.",
    turnaroundTime: "1 - 2 Hours",
    sampleType: "Serum / Plasma",
    popular: true,
  },
  {
    id: "lipid",
    name: "Lipid & Cholesterol Profile",
    code: "BIO-008",
    category: "Cardiovascular Health",
    description:
      "Measures Total Cholesterol, HDL (good), LDL (bad), and Triglycerides to evaluate cardiovascular risk and arterial health.",
    turnaroundTime: "1 - 2 Hours",
    sampleType: "Serum (Fasting)",
  },
  {
    id: "malaria-infectious",
    name: "Malaria Rapid & Blood Film Exam",
    code: "MIC-012",
    category: "Parasitology & Infection",
    description:
      "Detects Plasmodium parasite antigens with rapid diagnostic confirmation and microscopic parasite density quantification.",
    turnaroundTime: "20 - 30 mins",
    sampleType: "Capillary / Venous Blood",
    popular: true,
  },
  {
    id: "hba1c",
    name: "HbA1c & Fasting Blood Glucose",
    code: "END-003",
    category: "Endocrinology / Diabetes",
    description:
      "Measures average 3-month blood sugar control for diabetic diagnosis, management, and metabolic screening.",
    turnaroundTime: "45 - 60 mins",
    sampleType: "Whole Blood",
  },
  {
    id: "urinalysis",
    name: "Complete Urinalysis & Microscopy",
    code: "PAT-002",
    category: "Clinical Pathology",
    description:
      "Assesses urinary tract health, kidney filtration, protein leakage, infection indicators, and microscopic sediment casts.",
    turnaroundTime: "20 - 30 mins",
    sampleType: "Clean Catch Urine",
  },
  {
    id: "thyroid",
    name: "Thyroid Function Panel (FT3, FT4, TSH)",
    code: "IMM-007",
    category: "Immunology & Hormones",
    description:
      "Evaluates thyroid gland activity to diagnose hyperthyroidism, hypothyroidism, and endocrine metabolic disorders.",
    turnaroundTime: "2 - 3 Hours",
    sampleType: "Serum",
  },
  {
    id: "serology",
    name: "Viral Serology & Hepatitis Screening",
    code: "SER-005",
    category: "Serology & Virology",
    description:
      "Sensitive screening for Hepatitis B (HBsAg), Hepatitis C (HCV Ab), and HIV 1/2 with rapid confidential reporting.",
    turnaroundTime: "30 - 45 mins",
    sampleType: "Serum / Whole Blood",
  },
];

const LAB_CAPABILITIES = [
  {
    icon: Clock,
    title: "Rapid Turnaround",
    description: "Emergency & routine testing processed with computerized automated analyzers.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Controlled",
    description: "Calibrated to international standards with rigorous double-blind QC checks.",
  },
  {
    icon: FileCheck2,
    title: "Digital Lab Reports",
    description: "Results sent directly to your secure Patient Portal and attending physician.",
  },
];

export function LabTests() {
  return (
    <section id="lab-tests" className="py-24 px-6 bg-slate-50 relative z-20 border-t border-slate-200">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-extrabold uppercase tracking-wider">
            <FlaskConical className="w-4 h-4 text-brand-600" />
            Diagnostic Pathology & Laboratory
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Diagnostic & Lab Tests Commonly Offered
          </h2>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
            Accurate, reliable clinical laboratory investigations equipped with advanced automated analyzers for inpatient, outpatient, and preventive wellness checkups.
          </p>
        </div>

        {/* Highlight Stats / Feature Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {LAB_CAPABILITIES.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 font-bold">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{cap.title}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Common Lab Tests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {COMMON_LAB_TESTS.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl hover:border-brand-400 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
            >
              {test.popular && (
                <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-xs">
                  Common
                </div>
              )}

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <TestTube2 size={24} />
                </div>

                <div>
                  <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase tracking-wider rounded-md mb-2">
                    {test.category}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-brand-600 transition-colors">
                    {test.name}
                  </h3>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  {test.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 font-semibold">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Sample:</span>
                  <span className="text-slate-800 font-bold text-[11px] truncate max-w-[130px] text-right">
                    {test.sampleType}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Results:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Clock size={11} /> {test.turnaroundTime}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Call to Action Banner */}
        <div className="bg-linear-to-r from-slate-900 via-brand-950 to-slate-900 rounded-3xl p-8 md:p-10 text-white border border-brand-800/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-brand-300">
              <Microscope size={15} /> Comprehensive Clinical Diagnostics
            </div>
            <h3 className="text-2xl font-black tracking-tight text-white">
              Need specialized diagnostic testing or a routine health screening?
            </h3>
            <p className="text-sm text-slate-300 font-medium max-w-2xl">
              Walk-in requests and physician referrals are accepted 24/7 at our main laboratory reception.
            </p>
          </div>

          <Link
            href="/book-appointment"
            className="px-8 py-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-brand-600/40 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 shrink-0"
          >
            Book Lab Test / Appointment
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
