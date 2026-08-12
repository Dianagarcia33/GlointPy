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

export function NosotrosComoTrabajamos() {
  const pasos = [
    {
      n: "01",
      icon: <Lightbulb size={24} />,
      title: "Identificamos oportunidades",
      desc: "Analizamos el mercado digital para detectar sectores con alto potencial de crecimiento y retorno sostenible.",
    },
    {
      n: "02",
      icon: <Target size={24} />,
      title: "Diseñamos estrategias",
      desc: "Construimos planes de acción personalizados que conectan inversión, tecnología y comercio para cada cliente.",
    },
    {
      n: "03",
      icon: <Handshake size={24} />,
      title: "Ejecutamos con aliados",
      desc: "Nos apoyamos en una red de socios estratégicos para garantizar resultados reales y medibles en cada proyecto.",
    },
    {
      n: "04",
      icon: <TrendingUp size={24} />,
      title: "Escalamos juntos",
      desc: "Acompañamos a nuestros clientes en cada etapa del crecimiento, ajustando las soluciones conforme evolucionan.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 55%)` }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* HEADER */}
        <div className="text-center mb-16">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
            Nuestra propuesta
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Conoce cómo <span style={{ color: ORANGE }}>trabajamos</span>
          </h2>

          <p className="text-slate-400 max-w-xl mx-auto">
            Un proceso claro y orientado a resultados que nos permite generar valor
            real para cada emprendedor, inversionista y empresa que confía en GLOINT.
          </p>
        </div>

        {/* PROCESO */}
        <div className="relative">

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">

            {pasos.map((p, i) => (
              <motion.div
                key={p.n}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative group"
              >

                {/* Tarjeta */}
                <motion.div
                  className="h-full p-6 rounded-2xl relative overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  whileHover={{ y: -6, borderColor: `${GOLD}45`, boxShadow: `0 15px 35px rgba(0,0,0,0.2)` }}
                >

                  {/* Número gigante */}
                  <div
                    className="absolute top-4 right-4 text-3xl font-black opacity-[0.07] select-none pointer-events-none"
                    style={{ color: GOLD }}
                  >
                    {p.n}
                  </div>

                  {/* Icono */}
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: `${GOLD}18`, color: GOLD }}
                  >
                    {p.icon}
                  </div>

                  <h3 className="text-white font-bold text-base mb-3 relative z-10">
                    {p.title}
                  </h3>

                  <p className="text-slate-400 text-sm leading-relaxed relative z-10">
                    {p.desc}
                  </p>

                  {/* Línea decorativa */}
                  <div
                    className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
                    style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                  />
                </motion.div>

              </motion.div>
            ))}

          </div>
        </div>

        {/* CIERRE */}
        <motion.div
          className="text-center mt-10 pt-1"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium"
            style={{ background: `${GOLD}0D`, border: `1px solid ${GOLD}25`, color: "#94a3b8" }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD, boxShadow: `0 0 8px ${GOLD}` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            De la oportunidad al crecimiento
          </div>
        </motion.div>

      </div>
    </section>
  );
}
