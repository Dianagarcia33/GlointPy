import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, TrendingUp, ChevronDown } from "lucide-react";

const trustItems = [
  { icon: Shield, label: "Transacciones Seguras" },
  { icon: Clock, label: "Liquidez Inmediata" },
  { icon: TrendingUp, label: "Cashback Logístico" },
];

export const HeroBanner: React.FC = () => {
  const [displayText, setDisplayText] = useState("");
  const fullText = "Liquidez en minutos para tu ecommerce";
  
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setDisplayText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(timer);
      }
    }, 40);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="banner-section relative w-full min-h-screen max-w-full overflow-hidden flex flex-col justify-center bg-slate-950">
      
      {/* Video background */}
      <video
        src="/banner.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover block opacity-40 mix-blend-luminosity"
      />

      {/* Clean Solid Overlay for readability */}
      <div className="absolute inset-0 bg-slate-900/60 z-10" />

      {/* Main content - Minimal & Structured */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-4 md:px-8 mt-16 text-center">
        
        {/* Massive Typography */}
        <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold font-montserrat text-white leading-[1.1] tracking-tight mb-8">
          {displayText}
          <span className="text-brand-500 animate-pulse font-light ml-1">|</span>
        </h1>

        {/* Clean Subtitle */}
        <p className="text-slate-300 text-lg md:text-2xl font-light font-inter mb-12 max-w-3xl mx-auto leading-relaxed">
          Convierte tus ventas en dinero real sin ciclos de desembolso, optimiza el flujo de caja de tu emprendimiento al 100%.
        </p>

        {/* Solid Functional CTA */}
        <div className="flex justify-center mb-16">
          <Link
            to="/register"
            className="group inline-flex items-center gap-3 px-10 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-lg rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            Regístrate hoy
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* Structured Trust Strip (No glows, just clean borders) */}
        <div className="inline-flex flex-col sm:flex-row items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className={`flex items-center gap-3 px-6 py-4 ${i < trustItems.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-white/20' : ''}`}>
                <Icon className="w-5 h-5 text-brand-400" />
                <span className="text-white text-sm font-semibold tracking-wide font-inter">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimal Scroll Indicator */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center">
        <div className="flex flex-col items-center gap-2 text-white/50">
          <span className="text-xs font-bold tracking-[0.2em] uppercase">Explorar</span>
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </div>
    </div>
  );
};
