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
import { Badge } from "./Badge";

export function TechSection() {
  const techCards = [
    {
      icon: <Truck size={22} />,
      title: "Seguimiento de Entregas",
      desc: "Monitoreo en tiempo real de operaciones logísticas.",
    },
    {
      icon: <Wallet size={22} />,
      title: "Billetera Empresarial",
      desc: "Automatización de desembolsos a proveedores.",
    },
    {
      icon: <Map size={22} />,
      title: "Planeación Inteligente",
      desc: "Optimización de rutas y recursos.",
    },
    {
      icon: <Activity size={22} />,
      title: "Control Operativo",
      desc: "Trazabilidad completa de procesos.",
    },
  ];

  const metrics = [
    { label: "Entregas hoy", val: "142", color: "#60a5fa" },
    { label: "Eficiencia", val: "98.2%", color: GOLD },
    { label: "Rutas activas", val: "34", color: ORANGE },
    { label: "Ahorro ops.", val: "28%", color: "#34d399" },
  ];

  const chartValues = [60, 80, 50, 90, 70, 95, 65];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK2 }}>

      {/* Glow de fondo */}
      <motion.div
        className="absolute -left-32 top-1/3 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* DASHBOARD */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >

            {/* Glow */}
            <motion.div
              className="absolute -inset-6 rounded-3xl pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(96,165,250,0.14) 0%, transparent 65%)" }}
              animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="relative rounded-3xl p-6 sm:p-7 overflow-hidden border border-white/10 shadow-2xl backdrop-blur-md bg-slate-950/80"
              whileHover={{ borderColor: "rgba(96,165,250,0.35)", boxShadow: "0 20px 60px rgba(96,165,250,0.08)" }}
              transition={{ duration: 0.3 }}
            >
              {/* Top specular highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              {/* Barra superior */}
              <motion.div
                className="flex items-center gap-2 mb-6"
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/90" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/90" />
                <div className="ml-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-montserrat">
                  GLOINT Tech — Dashboard
                </div>

                {/* Indicador online */}
                <motion.div
                  className="ml-auto flex items-center gap-2 text-xs font-semibold text-emerald-400 font-montserrat px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Online
                </motion.div>
              </motion.div>

              {/* MÉTRICAS */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {metrics.map(({ label, val, color }, i) => (
                  <motion.div
                    key={label}
                    className="p-3.5 rounded-2xl relative overflow-hidden bg-white/[0.04] border border-white/[0.07]"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                    whileHover={{ y: -3, backgroundColor: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-[11px] font-medium text-slate-400 mb-1 font-montserrat uppercase tracking-wider">{label}</div>

                    <motion.div
                      className="text-xl font-black font-montserrat tracking-tight"
                      style={{ color }}
                      initial={{ opacity: 0, scale: 0.7 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.4 + i * 0.08, type: "spring" }}
                    >
                      {val}
                    </motion.div>

                    <motion.div
                      className="absolute bottom-0 left-0 h-[2px]"
                      style={{ background: color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: "45%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.5 + i * 0.08 }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* GRÁFICO */}
              <div className="flex items-end gap-2 h-24 mt-6">
                {chartValues.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t-lg origin-bottom"
                    style={{ height: `${h}%`, background: i === 5 ? `linear-gradient(180deg, ${GOLD}, ${ORANGE})` : "rgba(255,255,255,0.1)" }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.55 + i * 0.08, ease: "easeOut" }}
                    whileHover={{ opacity: 0.8, scaleY: 1.05 }}
                  />
                ))}
              </div>

              {/* DÍAS */}
              <div className="flex justify-between mt-2">
                {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
                  <motion.span
                    key={d}
                    className="text-xs font-bold text-slate-400 flex-1 text-center font-montserrat"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: 0.9 + i * 0.05 }}
                  >
                    {d}
                  </motion.span>
                ))}
              </div>

              {/* Estado */}
              <motion.div
                className="flex items-center gap-2 mt-6 text-xs text-slate-400 font-medium font-montserrat"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.2 }}
              >
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Operaciones funcionando correctamente
              </motion.div>

            </motion.div>
          </motion.div>


          {/* CONTENIDO DERECHO */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge text="GLOINT Tech" />
            </motion.div>

            <motion.h2
              className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 font-montserrat tracking-tight leading-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              Tecnología para empresas que quieren{" "}
              <motion.span
                style={{ color: "#60a5fa" }}
                animate={{ textShadow: ["0 0 0px #60a5fa", "0 0 16px #60a5fa55", "0 0 0px #60a5fa"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                crecer
              </motion.span>
              .
            </motion.h2>

            <motion.p
              className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 font-normal"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Ayudamos a pequeñas y medianas empresas a digitalizar y optimizar sus
              operaciones mediante soluciones tecnológicas diseñadas para mejorar la
              productividad y el control operativo.
            </motion.p>

            {/* CARDS TECH */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
              {techCards.map((c, i) => (
                <motion.div
                  key={c.title}
                  className="p-4 sm:p-5 rounded-2xl relative overflow-hidden cursor-default bg-white/[0.04] border border-white/[0.08] transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
                  whileHover={{ y: -4, backgroundColor: "rgba(96,165,250,0.08)", borderColor: "rgba(96,165,250,0.35)", boxShadow: "0 12px 30px rgba(96,165,250,0.12)" }}
                >

                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-blue-400/20 shadow-xs"
                    style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}
                    whileHover={{ scale: 1.1, rotate: 6 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {c.icon}
                  </motion.div>

                  <div className="text-white font-bold text-sm sm:text-base mb-1 font-montserrat tracking-tight leading-snug">
                    {c.title}
                  </div>

                  <div className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {c.desc}
                  </div>

                  {/* Brillo lateral */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{ background: "#60a5fa" }}
                    initial={{ scaleY: 0 }}
                    whileHover={{ scaleY: 1 }}
                    transition={{ duration: 0.25 }}
                  />

                </motion.div>
              ))}
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ─── Por qué elegir GLOINT ────────────────────────────────────────────────────
