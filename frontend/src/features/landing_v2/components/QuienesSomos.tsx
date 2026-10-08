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

export function QuienesSomos() {
  const indicators = [
    { icon: <Zap size={18} />, label: "Innovación" },
    { icon: <TrendingUp size={18} />, label: "Escalabilidad" },
    { icon: <Cpu size={18} />, label: "Tecnología" },
    { icon: <BarChart2 size={18} />, label: "Crecimiento" },
  ];

  const units = [
    { name: "GLOINT Investment", color: GOLD, icon: <TrendingUp size={16} /> },
    { name: "GLOINT Place", color: ORANGE, icon: <ShoppingBag size={16} /> },
    { name: "GLOINT Tech", color: "#60a5fa", icon: <Cpu size={16} /> },
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">

        {/* CONTENIDO IZQUIERDO */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge text="Quiénes Somos" />
          </motion.div>

          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight tracking-tight mb-6 font-montserrat"
            style={{ color: DARK }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Construimos oportunidades en la{" "}
            <motion.span
              style={{ color: ORANGE }}
              animate={{
                textShadow: [
                  `0 0 0px ${ORANGE}`,
                  `0 0 16px ${ORANGE}55`,
                  `0 0 0px ${ORANGE}`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              economía digital
            </motion.span>
            .
          </motion.h2>

          <motion.p
            className="text-slate-600 leading-relaxed mb-4 text-base sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            En GLOINT combinamos experiencia empresarial, innovación tecnológica y visión
            estratégica para desarrollar negocios escalables que generan valor para nuestros
            clientes, inversionistas y aliados.
          </motion.p>

          <motion.p
            className="text-slate-600 leading-relaxed mb-10 text-base sm:text-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            Nuestro ecosistema integra soluciones financieras, comercio electrónico y
            tecnología aplicada para responder a las necesidades de un mercado en constante
            evolución.
          </motion.p>

          {/* INDICADORES */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
            {indicators.map(({ icon, label }, index) => (
              <motion.div
                key={label}
                className="flex items-center gap-3 p-3.5 rounded-2xl cursor-default bg-slate-50/80 border border-slate-200/80 shadow-2xs transition-all group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45 + index * 0.1 }}
                whileHover={{
                  y: -4,
                  scale: 1.02,
                  borderColor: `${GOLD}66`,
                  backgroundColor: "#ffffff",
                  boxShadow: `0 12px 25px ${DARK}10`,
                }}
              >
                <motion.div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`, color: "#fff" }}
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {icon}
                </motion.div>

                <span className="font-bold text-sm tracking-tight font-montserrat" style={{ color: DARK }}>
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* VISUAL DERECHO */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >

          {/* Glow exterior */}
          <motion.div
            className="absolute -inset-6 rounded-[2rem] pointer-events-none"
            style={{ background: `radial-gradient(circle, ${GOLD}18 0%, transparent 65%)` }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <div
            className="rounded-3xl p-7 sm:p-8 relative overflow-hidden border border-slate-800 shadow-2xl"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >
            {/* Top specular highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Glow interno */}
            <motion.div
              className="absolute top-0 right-0 w-48 h-48 rounded-full"
              style={{ background: `radial-gradient(circle, ${GOLD}44 0%, transparent 70%)` }}
              animate={{
                x: [0, 30, 0],
                y: [0, 20, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Segundo glow */}
            <motion.div
              className="absolute bottom-0 left-0 w-40 h-40 rounded-full"
              style={{ background: `radial-gradient(circle, ${ORANGE}20 0%, transparent 70%)` }}
              animate={{
                x: [0, -20, 0],
                y: [0, -25, 0],
              }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10">

              <motion.div
                className="text-[11px] font-extrabold tracking-widest uppercase mb-5 font-montserrat flex items-center gap-2"
                style={{ color: GOLD }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
                GLOINT ECOSYSTEM
              </motion.div>

              {/* UNIDADES */}
              {units.map(({ name, color, icon }, index) => (
                <motion.div
                  key={name}
                  className="flex items-center gap-4 mb-3.5 last:mb-0 p-4 rounded-2xl cursor-default relative overflow-hidden backdrop-blur-xs transition-all"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: 0.3 + index * 0.15,
                  }}
                  whileHover={{
                    x: 6,
                    backgroundColor: "rgba(255,255,255,0.09)",
                    borderColor: `${color}55`,
                  }}
                >

                  {/* Línea luminosa al hacer hover */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5"
                    style={{ background: color }}
                    initial={{ scaleY: 0 }}
                    whileHover={{ scaleY: 1 }}
                    transition={{ duration: 0.25 }}
                  />

                  <motion.div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border border-white/10"
                    style={{ background: `${color}25`, color }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {icon}
                  </motion.div>

                  <div>
                    <div className="text-white font-bold text-sm tracking-tight font-montserrat">
                      {name}
                    </div>

                    <div className="text-slate-400 text-xs mt-0.5 font-medium">
                      Unidad estratégica
                    </div>
                  </div>

                  <motion.div
                    className="ml-auto"
                    animate={{ x: [0, 3, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.4,
                      ease: "easeInOut",
                    }}
                  >
                    <ChevronRight size={16} style={{ color }} />
                  </motion.div>
                </motion.div>
              ))}

              {/* Línea inferior decorativa */}
              <motion.div
                className="mt-7 h-px origin-left"
                style={{ background: `linear-gradient(90deg, ${GOLD}, transparent)` }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.8 }}
              />

              <motion.div
                className="flex items-center gap-2 mt-4 text-xs text-slate-400 font-medium font-montserrat"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: GOLD }}
                  animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Ecosistema conectado
              </motion.div>

            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// ─── Unidades de Negocio ──────────────────────────────────────────────────────
