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

            <h2 className="text-2xl md:text-3xl font-black" style={{ color: DARK }}>
              Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
            </h2>

            <p className="text-slate-500 text-sm mt-4 max-w-lg mx-auto">
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
                      className="text-xs tracking-[0.3em] font-bold"
                      style={{ color: GOLD }}
                      animate={{ opacity: [0.8, 1, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      GLOINT
                    </motion.div>

                    <div className="text-[9px] text-slate-400 mt-1 font-medium">
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
                  className="relative w-32 h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer select-none"
                  style={{ 
                    background: "#fff", 
                    border: `1px solid ${GOLD}40`, 
                    color: "#64748b", 
                    boxShadow: "0 6px 20px rgba(0,0,0,0.06)" 
                  }}
                  whileHover={{ scale: 1.08, color: DARK, borderColor: GOLD, boxShadow: `0 10px 30px ${GOLD}30` }}
                  transition={{ duration: 0.2 }}
                >
                  {item.name}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* MÓVIL */}
          <div className="md:hidden grid grid-cols-2 gap-4 px-2">
            {partners.map((partner, i) => (
              <motion.div
                key={partner}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <motion.div
                  className="relative h-16 w-full rounded-xl flex items-center justify-center font-bold text-sm"
                  style={{ 
                    background: "#fff", 
                    border: `1px solid ${GOLD}35`, 
                    color: "#64748b", 
                    boxShadow: "0 6px 20px rgba(0,0,0,0.06)" 
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{ background: "#f8fafc", border: `1px solid ${GOLD}25`, color: "#64748b" }}
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
