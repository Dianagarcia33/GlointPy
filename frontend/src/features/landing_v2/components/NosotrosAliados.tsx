import React from "react";
import { motion } from "motion/react";
import { DARK, GOLD, ORANGE } from "../utils/constants";

export function NosotrosAliados() {
  const layout = [
    { name: "Wompi", left: "10%", top: "25%", x: 100, y: 130 },
    { name: "IRIS", left: "28%", top: "12%", x: 280, y: 62 },
    { name: "Bold", left: "72%", top: "12%", x: 720, y: 62 },
    { name: "PayU", left: "90%", top: "25%", x: 900, y: 130 },
    { name: "Bancolombia", left: "10%", top: "75%", x: 100, y: 390 },
    { name: "Howden", left: "28%", top: "88%", x: 280, y: 458 },
    { name: "Yoint", left: "72%", top: "88%", x: 720, y: 458 },
    { name: "Due Legal", left: "90%", top: "75%", x: 900, y: 390 },
  ];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: DARK }}>
      {/* Fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at 50% 50%, ${GOLD}10 0%, transparent 55%)` }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
            Respaldados por
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
            Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
          </h2>

          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Construimos relaciones estratégicas con empresas que comparten
            nuestra visión de innovación y crecimiento.
          </p>
        </div>

        {/* RED DESKTOP */}
        <div className="relative max-w-5xl mx-auto h-[520px] hidden md:block">

          {/* LÍNEAS */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 1000 520"
              preserveAspectRatio="none"
            >
              {layout.map((item, i) => (
                <motion.path
                  key={i}
                  d={`M500 260 L${item.x} ${item.y}`}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.5"
                  strokeOpacity="0.35"
                  strokeDasharray="4 7"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                />
              ))}
            </svg>
          </div>

          {/* GLOINT CENTRAL */}
          {/* GLOINT CENTRAL */}
          <motion.div
            className="absolute left-1/2 top-[260px] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, type: "spring" }}
          >
            {/* Anillo exterior */}
            <motion.div
              className="absolute -inset-10 rounded-full"
              style={{ border: `1px solid ${GOLD}25` }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Anillo interior */}
            <motion.div
              className="absolute -inset-5 rounded-full"
              style={{ border: `1px solid ${ORANGE}40` }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />

            {/* Núcleo */}
            <motion.div
              className="w-32 h-32 rounded-full flex items-center justify-center relative shadow-2xl pointer-events-auto"
              style={{ background: "#0b1120", border: `2px solid ${GOLD}`, boxShadow: `0 0 40px ${GOLD}25` }}
              animate={{ boxShadow: [`0 0 25px ${GOLD}15`, `0 0 55px ${GOLD}35`, `0 0 25px ${GOLD}15`] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="text-center">
                <div className="text-xs tracking-[0.3em] font-bold" style={{ color: GOLD }}>
                  GLOINT
                </div>

                <div className="text-[9px] text-slate-400 mt-1 font-medium">
                  aliados
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* TARJETAS */}
          {layout.map((item, i) => (
            <motion.div
              key={item.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ left: item.left, top: item.top }}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.06, type: "spring" }}
            >
              <motion.div
                className="relative w-36 h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer select-none"
                style={{ background: "#0f172a", border: `1px solid ${GOLD}40`, color: "#e2e8f0", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}
                whileHover={{ scale: 1.08, y: -4, color: "#fff", borderColor: GOLD, boxShadow: `0 10px 30px ${GOLD}35` }}
                transition={{ duration: 0.2 }}
              >
                {item.name}
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* MOBILE */}
        <div className="grid grid-cols-2 gap-4 md:hidden">
          {layout.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="h-16 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "#0f172a", border: `1px solid ${GOLD}20`, color: "#94a3b8" }}
            >
              {item.name}
            </motion.div>
          ))}
        </div>

        {/* TEXTO INFERIOR */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}20`, color: "#94a3b8" }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
            />
            Una red que impulsa nuestro crecimiento
          </div>
        </motion.div>

      </div>
    </section>
  );
}