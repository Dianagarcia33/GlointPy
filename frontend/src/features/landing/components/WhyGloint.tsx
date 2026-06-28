import React from "react";
import { Zap, FileCheck, Users, TrendingUp } from "lucide-react";

const partnerLogos = [
  '/logos/IMG-20251003-WA0001.jpg',
  '/logos/IMG-20251003-WA0002.jpg',
  '/logos/IMG-20251003-WA0003.jpg',
  '/logos/IMG-20251003-WA0004.jpg',
  '/logos/IMG-20251003-WA0005.jpg',
  '/logos/IMG-20251003-WA0006.jpg',
  '/logos/IMG-20251003-WA0007.jpg',
  '/logos/IMG-20251003-WA0008.jpg'
];

const imgapp = '/imagen app.png';

const reasons = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Dinero en minutos",
    description: "Recibe tu capital sin demoras. Procesos ágiles pensados para que tu negocio nunca se detenga.",
  },
  {
    icon: <FileCheck className="w-6 h-6" />,
    title: "Sin papeleo",
    description: "Todo es digital y rápido. Olvídate de trámites físicos, firma y gestiona desde cualquier dispositivo.",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Acompañamiento real",
    description: "Un equipo especializado te guía en cada paso, desde la solicitud hasta el crecimiento de tu negocio.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Escalabilidad garantizada",
    description: "Soluciones que crecen contigo. Desde tu primer paquete hasta inversiones millonarias, te acompañamos.",
  },
];

export const WhyGloint: React.FC = () => {
  return (
    <div className="w-full bg-white font-inter">

      {/* ── Part 1: Why Gloint — Trust Architecture ── */}
      <section className="py-24 px-4 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <span className="text-brand-500 text-sm font-bold uppercase tracking-widest mb-4 block">Nuestra ventaja</span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 font-montserrat tracking-tight leading-[1.1]">
                ¿Por qué elegir <span className="text-brand-500">GLOINT?</span>
              </h2>
            </div>
            <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-sm">
              Descubre las razones que nos hacen únicos en el mercado financiero.
            </p>
          </div>

          {/* Grid Minimalista */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {reasons.map((reason, idx) => (
              <div key={idx} className="group">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 mb-6 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                  {reason.icon}
                </div>
                <h3 className="text-slate-900 font-bold text-xl font-montserrat mb-3 tracking-tight">
                  {reason.title}
                </h3>
                <p className="text-slate-600 text-base leading-relaxed">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Part 2: Partner logos — Minimal Wall ── */}
      <section className="py-24 px-4 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Respaldados por</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-montserrat tracking-tight">
              Aliados Estratégicos
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
            {partnerLogos.map((logo, idx) => (
              <div
                key={idx}
                className="flex items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl h-32 hover:border-brand-200 hover:shadow-sm transition-all"
              >
                <img
                  src={logo}
                  alt={`Aliado estratégico ${idx + 1}`}
                  className="w-full h-full object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Part 3: App Download CTA — Structured Clean ── */}
      <section className="py-24 px-4 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden flex flex-col lg:flex-row items-center">
            
            {/* Text Side */}
            <div className="w-full lg:w-1/2 p-12 md:p-16 text-center lg:text-left">
              <span className="text-brand-400 text-sm font-bold uppercase tracking-widest mb-4 block">Nuestra tecnología</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight font-montserrat tracking-tight mb-6">
                Lleva el control en tu bolsillo
              </h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-md mx-auto lg:mx-0">
                Descarga la App de GLOINT y gestiona tus solicitudes, pagos y capital en tiempo real.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <a
                  href="https://play.google.com/store/apps/details?id=com.dianadev.gloint&hl=es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-4 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold transition-colors"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.66,17.03L5.67,21.06L14.88,12L16.81,15.12M18.66,6.97L16.81,8.88L14.88,12L5.67,2.94L18.66,6.97M17.5,12L19.58,13.14C20.15,13.45 20.15,14.55 19.58,14.86L17.5,16V8L17.5,12Z" />
                  </svg>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase text-slate-500 mb-1">Disponible en</span>
                    <span className="text-lg">Google Play</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Image Side */}
            <div className="w-full lg:w-1/2 bg-slate-800 flex justify-center items-center p-12 lg:p-0 min-h-[400px]">
              <img
                alt="Gloint App Móvil"
                src={imgapp}
                className="w-full max-w-[320px] h-auto object-contain transform translate-y-8 lg:translate-y-12"
              />
            </div>
            
          </div>
        </div>
      </section>

    </div>
  );
};
