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

export function WhyGloint() {
  const reasons = [
    {
      n: "01",
      icon: <Zap size={24} />,
      title: "Dinero en minutos",
      desc: "Recibe tu capital sin demoras. Procesos ágiles pensados para que tu negocio nunca se detenga.",
    },
    {
      n: "02",
      icon: <Globe size={24} />,
      title: "Sin papeleo",
      desc: "Todo es digital y rápido. Olvídate de trámites físicos, firma y gestiona desde cualquier dispositivo.",
    },
    {
      n: "03",
      icon: <Users size={24} />,
      title: "Acompañamiento real",
      desc: "Un equipo especializado te guía en cada paso, desde la solicitud hasta el crecimiento de tu negocio.",
    },
    {
      n: "04",
      icon: <TrendingUp size={24} />,
      title: "Escalabilidad garantizada",
      desc: "Soluciones que crecen contigo. Desde tu primer paquete hasta inversiones millonarias, te acompañamos.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 60%)`,
        }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <FadeUp className="text-center mb-16">
          <Badge text="Nuestra Diferencia" gold />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            ¿Por qué elegir{" "}
            <span style={{ color: ORANGE }}>GLOINT</span>?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Descubre las razones que nos hacen únicos en el mercado financiero.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((r, i) => (
            <FadeUp key={r.title} delay={i * 0.1}>
            <motion.div
              className="p-6 rounded-2xl relative overflow-hidden h-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              whileHover={{ y: -6, background: "rgba(255,255,255,0.07)" }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="absolute top-4 right-4 text-4xl font-black opacity-10 select-none"
                style={{ color: GOLD }}
              >
                {r.n}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                {r.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{r.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────
