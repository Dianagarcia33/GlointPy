import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRightCircle, ChevronDown } from "lucide-react";

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
    }, 80);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="banner-section relative w-full h-[500px] md:h-[1024px] max-w-full overflow-hidden -mt-16 pt-24 md:pt-16 group">
      {/* Capa extra para cubrir completamente las esquinas del navbar */}
      <div className="absolute top-0 left-0 w-full h-24 md:h-20 bg-gradient-to-b from-slate-900 to-transparent z-10"></div>
      
      {/* Partículas flotantes de fondo */}
      <div className="absolute inset-0 z-5">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 bg-gradient-to-br from-brand-400 to-yellow-500 rounded-full animate-float opacity-30`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          ></div>
        ))}
      </div>
      
      {/* 
        NOTA: Para que el video cargue en GlointPy, 
        asegúrate de copiar 'banner.mp4' dentro de la carpeta 'frontend/public/'
      */}
      <video
        src="/banner.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover block transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Overlay mejorado con gradientes de la marca */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/20 via-black/40 to-black/60 transition-all duration-500 group-hover:from-black/30 group-hover:via-black/50 group-hover:to-black/70 z-20" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-brand-900/10 via-transparent to-yellow-900/10 z-21" />
      
      {/* Contenido centrado */}
      <div className="absolute inset-0 z-30 flex items-center justify-center px-4">
        <div className="w-full max-w-[794px] text-center animate-fadeIn">
          {/* Título con efecto de escritura */}
          <div className="text-white text-3xl md:text-6xl font-bold font-montserrat mb-4 md:mb-8 min-h-[4rem] md:min-h-[8rem] flex items-center justify-center">
            <span className="animate-slideInUp transform transition-all duration-700 hover:scale-105">
              {displayText}
              <span className="animate-ping text-brand-400">|</span>
            </span>
          </div>
          
          <div className="text-white text-lg md:text-4xl font-medium font-montserrat mb-6 md:mb-8 animate-slideInUp transform transition-all duration-700 hover:scale-105 delay-200">
            Convierte tus ventas en dinero real sin ciclos de desembolso, optimiza el flujo de caja de tu emprendimiento al 100%.
          </div>
          
          <Link 
            to="/register" 
            className="inline-flex px-6 md:px-8 py-2.5 bg-gradient-to-r from-brand-500 to-brand-400 rounded-2xl justify-center items-center gap-2 cursor-pointer transform transition-all duration-500 hover:scale-110 hover:from-brand-400 hover:to-yellow-500 hover:shadow-2xl hover:shadow-brand-400/50 animate-bounce-slow group/button relative overflow-hidden shadow-lg shadow-brand-500/30"
          >
            {/* Efecto de onda al hacer hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover/button:translate-x-full transition-transform duration-700"></div>
            
            {/* Pulso de fondo */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-400 to-yellow-400 rounded-2xl opacity-0 group-hover/button:opacity-20 animate-pulse transition-opacity duration-300"></div>
            
            {/* Icono animado usando Lucide React */}
            <ArrowRightCircle className="w-5 h-5 md:w-6 md:h-6 text-white transform transition-all duration-300 group-hover/button:rotate-12 group-hover/button:scale-110 relative z-10" />
            
            <div className="text-white text-lg md:text-3xl font-semibold font-montserrat relative transform transition-all duration-300 group-hover/button:translate-x-1 z-10">
              Regístrate hoy
            </div>
            
            {/* Efecto de partículas flotantes mejorado */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white/60 rounded-full animate-ping opacity-0 group-hover/button:opacity-100 transition-opacity duration-500 delay-100"></div>
              <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-yellow-300/60 rounded-full animate-ping opacity-0 group-hover/button:opacity-100 transition-opacity duration-500 delay-300"></div>
              <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-brand-300/60 rounded-full animate-ping opacity-0 group-hover/button:opacity-100 transition-opacity duration-500 delay-500"></div>
              <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-white/40 rounded-full animate-ping opacity-0 group-hover/button:opacity-100 transition-opacity duration-500 delay-700"></div>
            </div>
          </Link>
        </div>
      </div>
      
      {/* Flecha animada para scroll */}
      <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center animate-bounce">
        <div className="flex flex-col items-center text-white/70 hover:text-white transition-colors duration-300 cursor-pointer group/scroll">
          <span className="text-sm font-montserrat mb-2 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 text-center">Descubre más</span>
          <ChevronDown className="w-6 h-6 animate-bounce-slow" />
        </div>
      </div>
    </div>
  );
};
