import { Stethoscope, Activity, Baby, Microscope, Heart, ShieldPlus } from "lucide-react";

const features = [
  {
    title: "General Practice",
    description: "Comprehensive medical care for everyday health concerns, check-ups, and preventative medicine.",
    icon: Stethoscope,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "24/7 Emergency Care",
    description: "Round-the-clock emergency room services equipped to handle critical situations and trauma.",
    icon: Activity,
    color: "bg-red-100 text-red-600",
  },
  {
    title: "Maternity & Pediatrics",
    description: "Specialized care for expectant mothers and comprehensive pediatric services for children.",
    icon: Baby,
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Advanced Diagnostics",
    description: "State-of-the-art laboratory and radiology services including MRI, CT scans, and X-rays.",
    icon: Microscope,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Cardiology",
    description: "Expert heart care including diagnostic testing, treatments, and cardiac rehabilitation.",
    icon: Heart,
    color: "bg-rose-100 text-rose-600",
  },
  {
    title: "Specialized Surgery",
    description: "Modern surgical theaters staffed by experienced surgeons across various specialties.",
    icon: ShieldPlus,
    color: "bg-indigo-100 text-indigo-600",
  },
];

export function Features() {
  return (
    <section id="services" className="py-24 px-6 bg-white relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-6">
            Comprehensive care for your family.
          </h2>
          <p className="text-xl text-slate-600">
            From routine check-ups to specialized treatments, our expert team is here to support your health journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="card-rounded bg-slate-50 border border-slate-200 p-10 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon size={32} strokeWidth={2} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed text-lg">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
