import { UserCheck, Stethoscope, Award, HeartHandshake } from "lucide-react";

export interface DoctorProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  department_name?: string | null;
}

interface DoctorsProps {
  doctors?: DoctorProfile[];
}

const DEFAULT_DOCTORS: DoctorProfile[] = [
  {
    id: "default-1",
    first_name: "Sarah",
    last_name: "Banda",
    role: "Chief Cardiologist",
    department_name: "Cardiology & Vascular",
  },
  {
    id: "default-2",
    first_name: "Michael",
    last_name: "Mwape",
    role: "Senior Surgeon",
    department_name: "General & Trauma Surgery",
  },
  {
    id: "default-3",
    first_name: "Elena",
    last_name: "Phiri",
    role: "Pediatric Specialist",
    department_name: "Pediatrics & Maternal Care",
  },
  {
    id: "default-4",
    first_name: "David",
    last_name: "Mulenga",
    role: "Diagnostic Pathologist",
    department_name: "Laboratory & Radiology",
  },
];

export function Doctors({ doctors = [] }: DoctorsProps) {
  const displayDoctors = doctors.length > 0 ? doctors : DEFAULT_DOCTORS;

  return (
    <section id="doctors" className="py-24 px-6 bg-slate-50 relative z-20 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-extrabold uppercase tracking-wider mb-4">
            <UserCheck className="w-4 h-4 text-brand-600" />
            Medical Excellence Team
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Meet our specialist physicians & doctors.
          </h2>
          <p className="text-xl text-slate-600 leading-relaxed">
            Our multi-disciplinary team of dedicated clinicians and specialists provide round-the-clock medical care.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayDoctors.map((doctor, idx) => {
            const fullName = `Dr. ${doctor.first_name || ""} ${doctor.last_name || ""}`.trim() || "Specialist Physician";
            const roleTitle = doctor.role ? doctor.role.replaceAll("_", " ") : "Medical Officer";
            const dept = doctor.department_name || "Clinical Services";

            return (
              <div 
                key={doctor.id || idx}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-black text-2xl mb-6 shadow-md group-hover:scale-105 transition-transform">
                    <Stethoscope size={36} />
                  </div>
                  
                  <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider rounded-full mb-3">
                    {dept}
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                    {fullName}
                  </h3>
                  
                  <p className="text-sm font-semibold text-brand-700 mb-4 capitalize">
                    {roleTitle}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <HeartHandshake size={14} /> Available for Consult
                  </span>
                  <Award size={16} className="text-amber-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
