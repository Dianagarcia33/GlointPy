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

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK2 }}>
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Dashboard mockup */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 text-xs text-slate-500">GLOINT Tech — Dashboard</div>
            </div>
            {/* Fake metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Entregas hoy", val: "142", color: "#60a5fa" },
                { label: "Eficiencia", val: "98.2%", color: GOLD },
                { label: "Rutas activas", val: "34", color: ORANGE },
                { label: "Ahorro ops.", val: "28%", color: "#34d399" },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-lg font-black" style={{ color }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Fake bar chart */}
            <div className="flex items-end gap-2 h-24 mt-4">
              {[60, 80, 50, 90, 70, 95, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: i === 5
                      ? `linear-gradient(180deg, ${GOLD}, ${ORANGE})`
                      : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <span key={d} className="text-xs text-slate-500 flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>

          <div>
            <Badge text="GLOINT Tech" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              Tecnología para empresas que quieren{" "}
              <span style={{ color: "#60a5fa" }}>crecer</span>.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Ayudamos a pequeñas y medianas empresas a digitalizar y optimizar sus
              operaciones mediante soluciones tecnológicas diseñadas para mejorar la
              productividad y el control operativo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {techCards.map((c) => (
                <div
                  key={c.title}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                  >
                    {c.icon}
                  </div>
                  <div className="text-white font-semibold text-sm mb-1">{c.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Por qué elegir GLOINT ────────────────────────────────────────────────────
