import React, { useState, useEffect } from "react";
import { Zap, FileCheck, Users, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

// Asumimos que los logos están en public/logos/ y la app en public/
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
    accent: "from-brand-500 to-amber-400",
    iconColor: "text-brand-400",
    iconBg: "bg-brand-500/10 border-brand-500/20",
  },
  {
    icon: <FileCheck className="w-6 h-6" />,
    title: "Sin papeleo",
    description: "Todo es digital y rápido. Olvídate de trámites físicos, firma y gestiona desde cualquier dispositivo.",
    accent: "from-amber-400 to-yellow-300",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Acompañamiento real",
    description: "Un equipo especializado te guía en cada paso, desde la solicitud hasta el crecimiento de tu negocio.",
    accent: "from-brand-400 to-amber-300",
    iconColor: "text-brand-400",
    iconBg: "bg-brand-500/10 border-brand-500/20",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Escalabilidad garantizada",
    description: "Soluciones que crecen contigo. Desde tu primer paquete hasta inversiones millonarias, te acompañamos.",
    accent: "from-yellow-400 to-brand-500",
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10 border-yellow-400/20",
  },
];

export const WhyGloint: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const logosPerSlide = 4;
  const totalSlides = Math.ceil(partnerLogos.length / logosPerSlide);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 3000);
    return () => clearInterval(interval);
  }, [totalSlides, isAutoPlaying]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

  return (
    <div className="w-full">

      {/* ── Part 1: Why Gloint — Dark premium ── */}
      <section className="relative bg-slate-900 py-24 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
          {/* Golden glow top-right */}
          <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-400/8 to-brand-500/5 rounded-full blur-[120px]" />
          {/* brand glow bottom-left */}
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-brand-600/8 rounded-full blur-[100px]" />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Nuestra diferencia
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              ¿Por qué elegir{" "}
              <span className="bg-gradient-to-r from-brand-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                GLOINT?
              </span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Descubre las razones que nos hacen únicos en el mercado financiero.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {reasons.map((reason, idx) => (
              <div
                key={idx}
                className="group bg-slate-800/50 border border-white/5 rounded-2xl p-6 hover:border-amber-400/30 hover:bg-slate-800/80 transition-all duration-400 relative overflow-hidden"
              >
                {/* Animated top accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${reason.accent} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-t-2xl`} />

                {/* Subtle hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/3 via-transparent to-brand-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

                {/* Icon */}
                <div className={`relative w-12 h-12 ${reason.iconBg} border rounded-xl flex items-center justify-center ${reason.iconColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  {reason.icon}
                </div>

                {/* Watermark number */}
                <div className="absolute top-4 right-5 text-4xl font-black text-white/[0.04] select-none group-hover:text-amber-400/[0.08] transition-colors duration-300">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-amber-300 transition-colors duration-300 relative">
                  {reason.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300 relative">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Part 2: Partner logos — light break ── */}
      <section className="relative bg-white py-16 px-4 overflow-hidden border-t border-slate-100">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-50 rounded-full blur-[100px] opacity-60" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-50 rounded-full blur-[80px] opacity-60" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Respaldados por</p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
              Aliados{" "}
              <span className="bg-gradient-to-r from-brand-500 to-amber-400 bg-clip-text text-transparent">
                Estratégicos
              </span>
            </h3>
          </div>

          {/* Carousel */}
          <div
            className="relative overflow-hidden"
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {partnerLogos
                      .slice(slideIndex * logosPerSlide, (slideIndex + 1) * logosPerSlide)
                      .map((logo, logoIndex) => {
                        const globalIndex = slideIndex * logosPerSlide + logoIndex;
                        return (
                          <div
                            key={globalIndex}
                            className="group flex items-center justify-center p-5 bg-white border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md hover:shadow-amber-400/10 transition-all duration-300 h-28"
                          >
                            <img
                              src={logo}
                              alt={`Aliado estratégico ${globalIndex + 1}`}
                              className="w-full h-full object-contain grayscale group-hover:grayscale-0 opacity-50 group-hover:opacity-100 transition-all duration-400 group-hover:scale-105"
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            {/* Nav controls */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={prevSlide}
                className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-500 hover:border-brand-300 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`rounded-full transition-all duration-300 ${currentSlide === index
                      ? 'w-6 h-2.5 bg-gradient-to-r from-brand-500 to-amber-400'
                      : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'
                      }`}
                  />
                ))}
              </div>
              <button
                onClick={nextSlide}
                className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-500 hover:border-brand-300 transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Part 3: App Download CTA ── */}
      <section className="relative bg-slate-900 py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
            {/* Glow effects */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-400/10 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px]" />
            {/* Golden top border accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between p-10 md:p-16 gap-12">
              {/* Image */}
              <div className="w-full lg:w-1/2 flex justify-center items-center order-2 lg:order-1">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-brand-500/20 via-amber-400/10 to-yellow-300/10 blur-3xl rounded-full scale-90 group-hover:scale-110 transition-transform duration-700" />
                  <img
                    alt="Gloint App Móvil"
                    src={imgapp}
                    className="relative z-10 w-full max-w-[420px] h-auto object-contain transition-all duration-700 group-hover:scale-105 drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)]"
                  />
                </div>
              </div>

              {/* Text */}
              <div className="w-full lg:w-1/2 text-center lg:text-left space-y-6 order-1 lg:order-2">
                <div className="space-y-4">
                  <span className="inline-block px-4 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest">
                    Nuestra tecnología
                  </span>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                    Lleva el control{" "}
                    <span className="bg-gradient-to-r from-brand-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
                      en tu bolsillo
                    </span>
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                    Descarga la App de <strong className="text-slate-200">GLOINT</strong> y gestiona tus solicitudes, pagos y capital en tiempo real.
                  </p>
                </div>

                <div className="flex flex-col items-center lg:items-start gap-3 pt-2">
                  <a
                    href="https://play.google.com/store/apps/details?id=com.dianadev.gloint&hl=es"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-4 px-8 py-4 font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-brand-500 rounded-2xl shadow-lg shadow-amber-400/20 hover:shadow-amber-400/40 hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
                  >
                    <svg className="w-7 h-7 transition-transform group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.66,17.03L5.67,21.06L14.88,12L16.81,15.12M18.66,6.97L16.81,8.88L14.88,12L5.67,2.94L18.66,6.97M17.5,12L19.58,13.14C20.15,13.45 20.15,14.55 19.58,14.86L17.5,16V8L17.5,12Z" />
                    </svg>
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[11px] uppercase opacity-75 mb-1 tracking-wider font-medium">Disponible en</span>
                      <span className="text-xl tracking-tight">Google Play</span>
                    </div>
                  </a>
                  <p className="text-slate-600 text-xs">* Próximamente disponible también en iOS App Store</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
