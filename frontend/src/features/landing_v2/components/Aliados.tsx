import React from "react";
import { motion } from "motion/react";
import { FadeUp } from "../utils/animations";
import { DARK, GOLD, ORANGE } from "../utils/constants";

export function Aliados() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Howden", "Yoint", "Due Legal"];

  // Posiciones en el viewport SVG de 1000x500
  // x, y representan el centro exacto donde se ubica cada tarjeta
  const layout = [
    { name: "Wompi",       x: 120, y: 80,  left: "12%", top: "16%" },
    { name: "IRIS",        x: 350, y: 130, left: "35%", top: "26%" },
    { name: "Bold",        x: 670, y: 70,  left: "67%", top: "14%" },
    { name: "PayU",        x: 880, y: 140, left: "88%", top: "28%" },
    { name: "Bancolombia", x: 140, y: 400, left: "14%", top: "80%" },
    { name: "Howden",      x: 370, y: 440, left: "37%", top: "88%" },
    { name: "Yoint",       x: 650, y: 390, left: "65%", top: "78%" },
    { name: "Due Legal",   x: 880, y: 420, left: "88%", top: "84%" },
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">

      {/* Fondo decorativo */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}10 0%, transparent 65%)` }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* HEADER */}
        <FadeUp>
          <div className="text-center mb-16">
            <motion.div
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: GOLD }}
              animate={{ letterSpacing: ["0.2em", "0.3em", "0.2em"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Respaldados por
            </motion.div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-montserrat tracking-tight" style={{ color: DARK }}>
              Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
            </h2>

            <p className="text-slate-600 text-sm sm:text-base mt-4 max-w-lg mx-auto font-normal">
              Construimos relaciones estratégicas con empresas que comparten
              nuestra visión de innovación y crecimiento.
            </p>
          </div>
        </FadeUp>

        {/* NETWORK */}
        <div className="relative max-w-5xl mx-auto">

          {/* DESKTOP */}
          <div className="hidden md:block relative h-[520px] w-full">

            {/* LÍNEAS SVG (Nacen todas desde 500,250 y se ocultan tras GLOINT) */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none z-0" 
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
            >
              {layout.map((item, i) => (
                <motion.path
                  key={i}
                  d={`M500 250 L${item.x} ${item.y}`}
                  fill="none"
                  stroke={GOLD}
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  strokeDasharray="4 6"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: "easeOut" }}
                />
              ))}
            </svg>

            {/* GLOINT (NODO CENTRAL OPAGO QUE TAPA EL ORIGEN DE LAS LÍNEAS) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <motion.div
                className="relative flex items-center justify-center"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, type: "spring" }}
              >
                {/* Anillos de pulso */}
                <motion.div
                  className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{ border: `1px solid ${GOLD}30` }}
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                <motion.div
                  className="absolute -inset-4 rounded-full pointer-events-none"
                  style={{ border: `1px solid ${ORANGE}40` }}
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />

                {/* Círculo Principal Solid / Opaco */}
                <motion.div
                  className="w-32 h-32 rounded-full flex items-center justify-center relative shadow-2xl"
                  style={{ 
                    background: DARK, 
                    border: `2px solid ${GOLD}`, 
                    boxShadow: `0 0 35px ${GOLD}30` 
                  }}
                  animate={{ boxShadow: [`0 0 20px ${GOLD}20`, `0 0 45px ${GOLD}40`, `0 0 20px ${GOLD}20`] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="text-center">
                    <motion.div
                      className="text-sm tracking-[0.3em] font-black font-montserrat"
                      style={{ color: GOLD }}
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      GLOINT
                    </motion.div>

                    <div className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider font-montserrat">
                      aliados
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* TARJETAS */}
            {layout.map((item, i) => (
              <motion.div
                key={item.name}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: item.left, top: item.top }}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08, type: "spring" }}
              >
                <motion.div
                  className="relative w-32 sm:w-36 h-16 rounded-2xl flex items-center justify-center font-extrabold text-sm cursor-pointer select-none bg-white border border-slate-200/90 shadow-2xs font-montserrat"
                  style={{ 
                    color: DARK, 
                  }}
                  whileHover={{ scale: 1.08, borderColor: GOLD, boxShadow: `0 12px 30px ${GOLD}25` }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="relative z-10">{item.name}</span>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* MÓVIL */}
          <div className="md:hidden grid grid-cols-2 gap-3.5 px-2">
            {partners.map((partner, i) => (
              <motion.div
                key={partner}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <motion.div
                  className="relative h-16 w-full rounded-2xl flex items-center justify-center font-extrabold text-sm font-montserrat bg-white border border-slate-200/90 shadow-2xs"
                  style={{ 
                    color: DARK, 
                  }}
                  whileTap={{ scale: 0.97 }}
                >
                  {partner}
                </motion.div>
              </motion.div>
            ))}
          </div>

        </div>

        {/* TEXTO INFERIOR */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold font-montserrat shadow-2xs"
            style={{ background: "#f8fafc", border: `1px solid ${GOLD}30`, color: "#64748b" }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Una red que impulsa nuestro crecimiento
          </div>
        </motion.div>

      </div>
    </section>
  );
}
// ─── CTA Final ────────────────────────────────────────────────────────────────
