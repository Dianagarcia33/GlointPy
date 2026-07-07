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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 55%)` }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
            Nuestra propuesta
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Conoce cómo{" "}
            <span style={{ color: ORANGE }}>trabajamos</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Un proceso claro y orientado a resultados que nos permite generar valor
            real para cada emprendedor, inversionista y empresa que confía en GLOINT.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pasos.map((p) => (
            <div
              key={p.n}
              className="p-6 rounded-2xl relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="absolute top-4 right-4 text-4xl font-black opacity-10 select-none"
                style={{ color: GOLD }}
              >
                {p.n}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                {p.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

