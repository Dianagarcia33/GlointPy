import React from "react";
import { motion } from "motion/react";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { DARK, GOLD, ORANGE } from "../utils/constants";

export function NosotrosCTA() {
  return (
    <section
      className="py-24 md:py-28 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 50%, #1a1000 100%)` }}
    >

      {/* BRILLO CENTRAL */}
      <div
        className="absolute left-1/2 top-1/2 w-[500px] h-[500px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}18 0%, transparent 65%)` }}
      />

      {/* HALO SUPERIOR */}
      <motion.div
        className="absolute left-1/2 top-0 w-[700px] h-[250px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${ORANGE}12 0%, transparent 70%)` }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* LÍNEA INFERIOR */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />

      {/* DECORACIÓN CIRCULAR */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-[360px] h-[360px] md:w-[500px] md:h-[500px] rounded-full border pointer-events-none"
        style={{ borderColor: `${GOLD}10` }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        transformTemplate={({ scale }) =>
          `translate(-50%, -50%) scale(${scale})`
        }
      />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">

        {/* ETIQUETA */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-semibold"
          style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}25`, color: GOLD }}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles size={14} />
          Estamos listos para ayudarte
        </motion.div>

        {/* TÍTULO */}
        <motion.h2
          className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Sé parte del{" "}
          <span
            style={{
              background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ecosistema GLOINT
          </span>
        </motion.h2>

        {/* DESCRIPCIÓN */}
        <motion.p
          className="text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed text-sm md:text-base"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Únete a más de 1.000 clientes que ya confían en GLOINT para crecer
          en la economía digital. Nuestros asesores están listos para
          acompañarte.
        </motion.p>

        {/* BOTONES */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >

          {/* PRIMARIO */}
          <motion.button
            className="group px-7 py-4 rounded-xl font-bold text-white text-sm md:text-base flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, boxShadow: `0 10px 30px ${GOLD}25` }}
            whileHover={{ scale: 1.04, boxShadow: `0 15px 40px ${GOLD}40` }}
            whileTap={{ scale: 0.97 }}
          >
            <MessageCircle size={18} />
            Hablar con un asesor
            <ArrowRight
              size={17}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </motion.button>

          {/* SECUNDARIO */}
          <motion.button
            className="px-7 py-4 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2"
            style={{ border: "1px solid rgba(255,255,255,0.18)", color: "#fff", background: "rgba(255,255,255,0.05)" }}
            whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.1)", borderColor: `${GOLD}50` }}
            whileTap={{ scale: 0.97 }}
          >
            Conocer nuestros servicios
            <ArrowRight size={17} />
          </motion.button>

        </motion.div>

        {/* INDICADOR INFERIOR */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-10 text-xs text-slate-500"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
          />
          Innovación · Tecnología · Crecimiento
        </motion.div>

      </div>
    </section>
  );
}