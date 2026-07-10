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

export function Unidades() {
  const cards = [
    {
      title: "GLOINT INVESTMENT",
      tag: "Inversión",
      icon: <TrendingUp size={28} />,
      color: GOLD,
      desc: "Unidad especializada en la gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.",
      benefits: [
        "Estrategias de inversión innovadoras",
        "Participación en negocios digitales escalables",
        "Administración profesional del capital",
        "Crecimiento patrimonial sostenible",
      ],
      btn: "Conocer Investment",
    },
    {
      title: "GLOINT PLACE",
      tag: "E-Commerce",
      icon: <ShoppingBag size={28} />,
      color: ORANGE,
      desc: "Plataforma de comercio electrónico enfocada en productos innovadores, diferenciadores y de tendencia, con cobertura de envíos a nivel nacional.",
      benefits: [
        "Productos exclusivos",
        "Compras seguras",
        "Envíos a toda Colombia",
        "Experiencia moderna y confiable",
      ],
      btn: "Explorar Place",
    },
    {
      title: "GLOINT TECH",
      tag: "Tecnología",
      icon: <Cpu size={28} />,
      color: "#60a5fa",
      desc: "Plataforma tecnológica diseñada para optimizar operaciones logísticas y automatizar procesos empresariales mediante herramientas accesibles para pequeñas y medianas empresas.",
      benefits: [
        "Automatización operativa",
        "Seguimiento logístico",
        "Billetera digital integrada",
        "Optimización de rutas",
      ],
      btn: "Descubrir Tech",
    },
  ];

  return (
    <section id="unidades" className="py-24" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge text="Nuestras Unidades" />
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
            Tres unidades.{" "}
            <span style={{ color: ORANGE }}>Un mismo propósito.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Creamos soluciones especializadas que impulsan el crecimiento de personas,
            empresas e inversionistas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((c, i) => (
            <FadeUp key={c.title} delay={i * 0.12}>
            <motion.div
              className="rounded-2xl overflow-hidden flex flex-col h-full"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
              whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }}
              transition={{ duration: 0.25 }}
            >
              {/* Card header */}
              <div
                className="p-6 flex items-center gap-4 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
              >
                <div
                  className="absolute right-4 top-4 text-5xl font-black opacity-10 select-none"
                  style={{ color: c.color }}
                >
                  0{i + 1}
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.color}22`, color: c.color }}
                >
                  {c.icon}
                </div>
                <div>
                  <div
                    className="text-xs font-semibold tracking-widest uppercase mb-1"
                    style={{ color: c.color }}
                  >
                    {c.tag}
                  </div>
                  <div className="text-white font-bold text-sm leading-tight">{c.title}</div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{c.desc}</p>
                <ul className="space-y-2 flex-1">
                  {c.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: c.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="mt-6 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: c.color, color: c.color === "#60a5fa" ? DARK : "#fff" }}
                >
                  {c.btn} <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Investment Section ────────────────────────────────────────────────
