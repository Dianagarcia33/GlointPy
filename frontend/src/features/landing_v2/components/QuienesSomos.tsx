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

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <Badge text="Quiénes Somos" />
          <h2 className="text-3xl md:text-4xl font-black leading-tight mb-6" style={{ color: DARK }}>
            Construimos oportunidades en la{" "}
            <span style={{ color: ORANGE }}>economía digital</span>.
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            En GLOINT combinamos experiencia empresarial, innovación tecnológica y visión
            estratégica para desarrollar negocios escalables que generan valor para nuestros
            clientes, inversionistas y aliados.
          </p>
          <p className="text-slate-600 leading-relaxed mb-10">
            Nuestro ecosistema integra soluciones financieras, comercio electrónico y
            tecnología aplicada para responder a las necesidades de un mercado en constante
            evolución.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {indicators.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "#f8fafc", border: `1px solid #e2e8f0` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`, color: "#fff" }}
                >
                  {icon}
                </div>
                <span className="font-semibold text-sm" style={{ color: DARK }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual */}
        <div className="relative">
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full"
              style={{ background: `radial-gradient(circle, ${GOLD}33 0%, transparent 70%)` }}
            />
            <div className="relative z-10">
              <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: GOLD }}>
                GLOINT ECOSYSTEM
              </div>
              {[
                { name: "GLOINT Investment", color: GOLD, icon: <TrendingUp size={16} /> },
                { name: "GLOINT Place", color: ORANGE, icon: <ShoppingBag size={16} /> },
                { name: "GLOINT Tech", color: "#60a5fa", icon: <Cpu size={16} /> },
              ].map(({ name, color, icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-4 mb-4 last:mb-0 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">Unidad estratégica</div>
                  </div>
                  <ChevronRight size={16} className="ml-auto" style={{ color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Unidades de Negocio ──────────────────────────────────────────────────────
