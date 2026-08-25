import React from "react";
import { motion } from "motion/react";
import {
  Award, Heart, Clock, FileCheck, Building2
} from "lucide-react";
import { DARK, GOLD, ORANGE } from "../utils/constants";

export function NosotrosAcerca() {
  const stats = [
    { icon: <Award size={20} />, value: "+3", label: "Años de experiencia del equipo fundador" },
    { icon: <Heart size={20} />, value: "100%", label: "Compromiso total con nuestros clientes" },
    { icon: <Clock size={20} />, value: "24/7", label: "Disponibilidad y soporte continuo" },
  ];

  return (
    <section className="pt-28 md:pt-32 pb-0 bg-white relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-60" style={{ background: `radial-gradient(circle, ${GOLD}10 0%, transparent 65%)` }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* CONTENIDO PRINCIPAL */}
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-start pb-20">

          {/* IZQUIERDA */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7 }}
          >

            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>
              Quiénes somos
            </div>

            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3" style={{ color: DARK }}>
              Acerca de{" "}
              <span style={{ color: ORANGE }}>Nosotros</span>
            </h1>

            <div className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: "#94a3b8" }}>
              GLOINT INTERNATIONAL PARTNERS S.A.S.
            </div>

            <p className="text-slate-600 leading-relaxed mb-4">
              Nace en el 2022, fruto de la visión de un grupo de emprendedores con{" "}
              <span className="font-semibold" style={{ color: ORANGE }}>más de 3 años de experiencia</span>{" "}
              en diferentes mercados que desean crear herramientas y soluciones para{" "}
              <span className="font-semibold" style={{ color: DARK }}>potenciar el crecimiento de otros emprendedores</span>.
            </p>

            <p className="text-slate-600 leading-relaxed mb-10">
              Nos especializamos en conectar inversión estratégica, comercio electrónico
              y tecnología aplicada bajo un mismo ecosistema, generando valor real para
              clientes, inversionistas y aliados en la economía digital latinoamericana.
            </p>

            {/* CONSTITUCIÓN LEGAL */}
            <motion.div
              className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
              whileHover={{ y: -3, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
            >

              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                <FileCheck size={20} />
              </div>

              <div>
                <div className="font-bold text-sm mb-1" style={{ color: DARK }}>
                  Constitución Legal
                </div>

                <div className="text-slate-500 text-xs leading-relaxed">
                  Certificado en la Cámara de Comercio de Bogotá, Colombia.
                  Nuestra empresa se encuentra legalmente constituida y registrada
                  conforme a la normativa vigente, lo que garantiza su plena
                  operatividad y cumplimiento de las disposiciones legales
                  aplicables en el país.
                </div>
              </div>

            </motion.div>

          </motion.div>


          {/* DERECHA */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="flex flex-col gap-8"
          >

            {/* AÑO */}
            <motion.div
              className="rounded-3xl p-8 md:p-10 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
            >

              {/* Glow */}
              <motion.div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${GOLD}28 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative z-10">

                <div
                  className="text-7xl md:text-8xl font-black leading-none mb-3"
                  style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  2022
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Building2 size={15} style={{ color: GOLD }} />
                  Año de fundación
                </div>

              </div>
            </motion.div>


            {/* ESTADÍSTICAS */}
            <div className="space-y-4">

              {stats.map(({ icon, value, label }, i) => (
                <motion.div
                  key={value}
                  className="group flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: "#fff", border: "1px solid #e2e8f0" }}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
                  whileHover={{ x: 5, borderColor: `${ORANGE}55`, boxShadow: "0 8px 24px rgba(0,0,0,0.05)" }}
                >

                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${ORANGE}15`, color: ORANGE }}
                  >
                    {icon}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-lg" style={{ color: DARK }}>
                        {value}
                      </span>

                      <span className="text-slate-500 text-sm">
                        {label}
                      </span>
                    </div>
                  </div>

                </motion.div>
              ))}

            </div>

          </motion.div>

        </div>
      </div>


      {/* WAVE */}
      <div style={{ background: DARK }}>
        <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto block">
          <path d="M0 0L1440 0L1440 40C1200 5 960 60 720 30C480 0 240 50 0 20L0 0Z" fill="#ffffff" />
        </svg>
      </div>

    </section>
  );
}