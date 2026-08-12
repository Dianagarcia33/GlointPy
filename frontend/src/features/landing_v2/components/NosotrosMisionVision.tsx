import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, ShoppingBag, Cpu, BarChart2, Shield, Globe, Zap,
  ChevronRight, Menu, X, ArrowRight, CheckCircle, Users, Package,
  Truck, Wallet, Map, Activity, Star, 
  Mail, Phone, MapPin, Award, Target, Handshake, Clock,
  BookOpen, Building2, FileCheck, Heart, Lightbulb, Scale
} from "lucide-react";
import { FadeUp, FadeIn, AnimatedCounter } from "../utils/animations";
import { DARK, DARK2, GOLD, ORANGE, SERVICE_LINKS } from "../utils/constants";

export function NosotrosMisionVision() {
  const valores = [
    { icon: <Zap size={20} />, title: "Innovación", desc: "Buscamos siempre nuevas formas de crear valor.", color: GOLD },
    { icon: <Scale size={20} />, title: "Integridad", desc: "Actuamos con transparencia y responsabilidad.", color: "#60a5fa" },
    { icon: <Users size={20} />, title: "Comunidad", desc: "Crecemos juntos, poniendo a las personas primero.", color: ORANGE },
    { icon: <TrendingUp size={20} />, title: "Escalabilidad", desc: "Diseñamos para el largo plazo desde el inicio.", color: "#34d399" },
    { icon: <Globe size={20} />, title: "Visión global", desc: "Pensamos en grande con impacto local y regional.", color: "#a78bfa" },
    { icon: <Heart size={20} />, title: "Compromiso", desc: "100% enfocados en el éxito de nuestros clientes.", color: "#fb7185" },
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" style={{ background: `radial-gradient(ellipse, ${GOLD}08 0%, transparent 70%)` }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* MISIÓN / VISIÓN */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">

          {/* MISIÓN */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-8 md:p-10 relative overflow-hidden group"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}25 0%, transparent 70%)` }} />

            <motion.div
              className="absolute top-6 right-7 text-7xl font-black opacity-[0.04] select-none"
              style={{ color: GOLD }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              M
            </motion.div>

            <div className="relative z-10">

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${GOLD}18`, color: GOLD, border: `1px solid ${GOLD}25` }}
              >
                <Target size={24} />
              </div>

              <div className="text-xs font-bold tracking-[0.25em] uppercase mb-3" style={{ color: GOLD }}>
                Nuestra misión
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-white mb-5">
                Crear valor que{" "}
                <span style={{ color: GOLD }}>trascienda</span>.
              </h2>

              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                Desarrollar empresas sostenibles que generen crecimiento económico,
                innovación y bienestar para clientes, colaboradores, inversionistas
                y aliados estratégicos.
              </p>

              <div className="mt-7 flex items-center gap-2 text-xs text-slate-500">
                <span className="w-8 h-px" style={{ background: GOLD }} />
                Crecimiento · Innovación · Bienestar
              </div>

            </div>
          </motion.div>


          {/* VISIÓN */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-8 md:p-10 relative overflow-hidden group"
            style={{ background: "linear-gradient(135deg, #fff7ed 0%, #fff 100%)", border: `1px solid ${ORANGE}20` }}
          >
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ORANGE}18 0%, transparent 70%)` }} />

            <motion.div
              className="absolute top-6 right-7 text-7xl font-black opacity-[0.05] select-none"
              style={{ color: ORANGE }}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
            >
              V
            </motion.div>

            <div className="relative z-10">

              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: `${ORANGE}15`, color: ORANGE, border: `1px solid ${ORANGE}25` }}
              >
                <Lightbulb size={24} />
              </div>

              <div className="text-xs font-bold tracking-[0.25em] uppercase mb-3" style={{ color: ORANGE }}>
                Nuestra visión
              </div>

              <h2 className="text-2xl md:text-3xl font-black mb-5" style={{ color: DARK }}>
                Pensar en grande.{" "}
                <span style={{ color: ORANGE }}>Construir futuro.</span>
              </h2>

              <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                Consolidar a GLOINT GROUP como uno de los grupos empresariales más
                innovadores de Latinoamérica, integrando soluciones de tecnología,
                logística, servicios financieros, comercio electrónico e inversión.
              </p>

              <div className="mt-7 flex items-center gap-2 text-xs text-slate-400">
                <span className="w-8 h-px" style={{ background: ORANGE }} />
                Tecnología · Logística · Finanzas · Comercio · Inversión
              </div>

            </div>
          </motion.div>

        </div>


        {/* VALORES */}
        <div className="text-center mb-12">

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>
              Nuestros valores
            </div>

            <h2 className="text-3xl md:text-4xl font-black" style={{ color: DARK }}>
              Lo que nos <span style={{ color: ORANGE }}>define</span>
            </h2>

            <p className="text-slate-500 text-sm max-w-xl mx-auto mt-4">
              Principios que guían nuestras decisiones, nuestras relaciones y la
              manera en que construimos cada proyecto.
            </p>
          </motion.div>

        </div>


        {/* GRID VALORES */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">

          {valores.map(({ icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              whileHover={{ y: -6 }}
              className="p-5 md:p-6 rounded-2xl relative overflow-hidden group"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            >

              {/* Brillo */}
              <div
                className="absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }}
              />

              {/* Icono */}
              <motion.div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 relative z-10"
                style={{ background: `${color}15`, color }}
                whileHover={{ scale: 1.1, rotate: 4 }}
              >
                {icon}
              </motion.div>

              <div className="font-bold text-sm md:text-base mb-2 relative z-10" style={{ color: DARK }}>
                {title}
              </div>

              <div className="text-slate-500 text-xs md:text-sm leading-relaxed relative z-10">
                {desc}
              </div>

              {/* Línea inferior */}
              <div
                className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
                style={{ background: color }}
              />

            </motion.div>
          ))}

        </div>


        {/* CIERRE */}
        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium"
            style={{ background: "#f8fafc", border: `1px solid ${GOLD}25`, color: "#64748b" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }} />
            Valores que convierten nuestra visión en acción
          </div>
        </motion.div>

      </div>
    </section>
  );
}