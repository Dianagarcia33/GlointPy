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
            className="text-3xl md:text-4xl font-black leading-tight mb-6"
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
                  `0 0 12px ${ORANGE}44`,
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
            className="text-slate-600 leading-relaxed mb-4"
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
            className="text-slate-600 leading-relaxed mb-10"
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
          <div className="grid grid-cols-2 gap-4">
            {indicators.map(({ icon, label }, index) => (
              <motion.div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-default"
                style={{ background: "#f8fafc", border: `1px solid #e2e8f0` }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.45 + index * 0.1 }}
                whileHover={{
                  y: -5,
                  scale: 1.02,
                  borderColor: `${GOLD}66`,
                  boxShadow: `0 10px 25px ${DARK}10`,
                }}
              >
                <motion.div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`, color: "#fff" }}
                  whileHover={{ rotate: 8, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {icon}
                </motion.div>

                <span className="font-semibold text-sm" style={{ color: DARK }}>
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
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >

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
                className="text-xs font-semibold tracking-widest mb-4"
                style={{ color: GOLD }}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                GLOINT ECOSYSTEM
              </motion.div>

              {/* UNIDADES */}
              {units.map(({ name, color, icon }, index) => (
                <motion.div
                  key={name}
                  className="flex items-center gap-4 mb-4 last:mb-0 p-4 rounded-xl cursor-default relative overflow-hidden"
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
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22`, color }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {icon}
                  </motion.div>

                  <div>
                    <div className="text-white font-semibold text-sm">
                      {name}
                    </div>

                    <div className="text-slate-400 text-xs mt-0.5">
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
                className="flex items-center gap-2 mt-4 text-xs text-slate-400"
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
