import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const creditcard = "/creditcard.png";
const consultoriaAvanzada = "/consultoriaAvanzada.png";
const cursosYAlianzas = "/cursosYAlianzas.png";
const programaInvestment = "/programaInvestment.png";

const services = [
  {
    image: creditcard,
    tag: "Fintech",
    number: "01",
    title: "Liquidez Rápida para E-Commerce",
    description: "Recibe capital en minutos. Adelantamos tus fondos digitales a dinero real para que mantengas tu negocio en movimiento sin esperas.",
    link: "/servicios/cashback-logistico",
    highlight: true,
  },
  {
    image: consultoriaAvanzada,
    tag: "Estrategia",
    number: "02",
    title: "Consultoría Avanzada",
    description: "Potencializamos tu negocio desde adentro: procesos, estrategia y rentabilidad para escalar de forma sólida.",
    link: "/servicios/factoring-logistico",
    highlight: false,
  },
  {
    image: cursosYAlianzas,
    tag: "Educación",
    number: "03",
    title: "Cursos y Alianzas",
    description: "Formación especializada y acceso a mentores clave del mundo empresarial y financiero.",
    link: "/",
    highlight: false,
  },
  {
    image: programaInvestment,
    tag: "Inversión",
    number: "04",
    title: "Programa Investment",
    description: "Invierte y participa en el crecimiento de programas con gran potencial de rentabilidad.",
    link: "/",
    highlight: false,
  },
];

export const MainServices: React.FC = () => {
  return (
    <section className="bg-slate-50 py-28 px-4 font-inter">
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Clean & Structured */}
        <div className="mb-16 md:flex justify-between items-end gap-8">
          <div className="max-w-2xl">
            <span className="text-brand-500 text-sm font-bold uppercase tracking-widest mb-4 block">Nuestras Soluciones</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 font-montserrat tracking-tight leading-[1.1]">
              Nuestros Servicios <span className="text-brand-500">Principales</span>
            </h2>
          </div>
          <p className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-sm mt-6 md:mt-0">
            Soluciones financieras y empresariales diseñadas para impulsar tu crecimiento con rapidez y seguridad.
          </p>
        </div>

        {/* Bento Grid - Light Mode */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Card (Left) */}
          <Link
            to={services[0].link}
            className="group md:col-span-7 bg-white rounded-3xl border border-slate-200 p-10 flex flex-col justify-between min-h-[420px] hover:border-brand-500/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-auto">
                <span className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest rounded-lg">
                  {services[0].tag}
                </span>
                <span className="text-slate-200 font-black text-5xl font-montserrat">
                  {services[0].number}
                </span>
              </div>

              <div className="mt-12">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center p-3 mb-8 group-hover:scale-105 transition-transform duration-300">
                  <img src={services[0].image} alt="" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-slate-900 font-extrabold text-3xl md:text-4xl font-montserrat mb-4 tracking-tight group-hover:text-brand-600 transition-colors">
                  {services[0].title}
                </h3>
                <p className="text-slate-600 text-lg leading-relaxed max-w-lg">
                  {services[0].description}
                </p>
              </div>
            </div>
            
            <div className="absolute right-8 bottom-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Side Cards (Right Stack) */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {services.slice(1).map((s) => (
              <Link
                key={s.number}
                to={s.link}
                className="group bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start hover:border-brand-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 flex-shrink-0 bg-slate-50 rounded-xl flex items-center justify-center p-3 group-hover:bg-brand-50 transition-colors">
                  <img src={s.image} alt={s.title} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">{s.tag}</span>
                    <span className="text-slate-200 font-black text-xl font-montserrat">{s.number}</span>
                  </div>
                  <h3 className="text-slate-900 font-bold text-xl font-montserrat mb-2 group-hover:text-brand-600 transition-colors tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

        </div>

        {/* Action Footer */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 gap-6">
          <p className="text-slate-600 font-medium">¿Tu empresa ya está lista para el siguiente nivel?</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
          >
            Habla con un asesor
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
};
