import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Rutas a las imágenes en la carpeta public/ (donde las pegaste)
const creditcard = "/creditcard.png";
const consultoriaAvanzada = "/consultoriaAvanzada.png";
const cursosYAlianzas = "/cursosYAlianzas.png";
const programaInvestment = "/programaInvestment.png";

const services = [
  {
    image: creditcard,
    tag: "Fintech",
    title: "Liquidez Rápida para E-Commerce",
    description:
      "Recibe capital en minutos. Adelantamos tus fondos digitales a dinero real para que mantengas tu negocio en movimiento sin esperas.",
    link: "/servicios/cashback-logistico",
    iconBg: "bg-brand-50 border-brand-100",
  },
  {
    image: consultoriaAvanzada,
    tag: "Estrategia",
    title: "Consultoría Avanzada",
    description:
      "Potencializamos tu negocio desde adentro: procesos, estrategia, rentabilidad y estructura para escalar de forma sólida.",
    link: "/servicios/factoring-logistico",
    iconBg: "bg-brand-50 border-brand-100",
  },
  {
    image: cursosYAlianzas,
    tag: "Educación",
    title: "Cursos y Alianzas",
    description:
      "Formación especializada, acceso a mentores, networking y convenios con aliados clave para tu crecimiento empresarial.",
    link: "/",
    iconBg: "bg-brand-50 border-brand-100",
  },
  {
    image: programaInvestment,
    tag: "Inversión",
    title: "Programa Investment",
    description:
      "Invierte desde $50.000 hasta $50 millones y participa en el crecimiento de programas con gran potencial. Adquiere paquetes de acciones comercializables.",
    link: "/",
    iconBg: "bg-brand-50 border-brand-100",
  },
];

export const MainServices: React.FC = () => {
  return (
    <section className="relative bg-white py-24 px-4 overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-50 rounded-full blur-[120px] opacity-60 -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-50 rounded-full blur-[140px] opacity-50 translate-y-1/2 -translate-x-1/4" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-brand-50 border border-brand-200 rounded-full text-brand-600 text-xs font-bold uppercase tracking-widest mb-4">
            Lo que ofrecemos
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            Nuestros Servicios{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
              Principales
            </span>
          </h2>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Soluciones financieras y empresariales diseñadas para impulsar tu
            crecimiento con rapidez y seguridad.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((service, index) => (
            <Link
              key={index}
              to={service.link}
              className="group relative bg-white border border-slate-200 rounded-2xl p-6 md:p-8 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/10 transition-all duration-400 overflow-hidden flex gap-6 items-center"
            >
              {/* Subtle hover fill */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-50/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

              {/* Image container */}
              <div className="relative flex-shrink-0">
                <div className={`w-16 h-16 md:w-20 md:h-20 ${service.iconBg} border rounded-2xl flex items-center justify-center overflow-hidden p-3 transition-all duration-300 group-hover:shadow-sm group-hover:scale-105`}>
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 relative">
                <span className="inline-block px-2.5 py-0.5 bg-brand-50 border border-brand-200 text-brand-600 text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                  {service.tag}
                </span>
                <h3 className="text-slate-900 font-bold text-lg md:text-xl mb-2 leading-tight group-hover:text-brand-600 transition-colors duration-300">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  {service.description}
                </p>
                <span className="inline-flex items-center gap-1.5 text-brand-500 text-sm font-semibold opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  Conoce más
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </div>

              {/* Watermark number */}
              <div className="absolute top-4 right-6 text-6xl font-black text-slate-100 select-none group-hover:text-brand-100 transition-colors duration-500">
                {String(index + 1).padStart(2, '0')}
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <p className="text-slate-400 text-sm mb-4">¿Listo para dar el siguiente paso?</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:shadow-brand-500/20 transition-all duration-300 active:scale-[0.98]"
          >
            Habla con un asesor
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
