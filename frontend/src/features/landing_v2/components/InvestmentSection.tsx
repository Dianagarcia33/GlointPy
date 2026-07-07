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

export function InvestmentSection() {
  const cards = ["Análisis Estratégico", "Gestión Profesional", "Mercados Digitales", "Crecimiento Escalable"];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${GOLD}18 0%, transparent 70%)` }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Badge text="GLOINT Investment" gold />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              Invertimos en el{" "}
              <span style={{ color: GOLD }}>futuro digital</span>.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-10">
              GLOINT Investment identifica oportunidades estratégicas dentro de la economía
              digital para generar crecimiento sostenible y maximizar el potencial del capital
              administrado.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {cards.map((c) => (
                <div
                  key={c}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(197,155,78,0.08)", border: `1px solid ${GOLD}33` }}
                >
                  <div className="w-2 h-2 rounded-full mb-3" style={{ background: GOLD }} />
                  <div className="text-white font-semibold text-sm">{c}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fake financial chart */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs text-slate-400 tracking-widest">RENDIMIENTO</div>
                <div className="text-2xl font-black text-white mt-1">+34.8%</div>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(197,155,78,0.15)", color: GOLD }}
              >
                2026
              </div>
            </div>
            <svg viewBox="0 0 320 140" className="w-full">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30"
                fill="none"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30 L320 140 L0 140Z"
                fill="url(#chartGrad)"
              />
              {[40, 120, 200, 280].map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={[100, 70, 40, 20][i]}
                  r="4"
                  fill={GOLD}
                />
              ))}
            </svg>
            <div className="flex justify-between mt-4">
              {["Ene", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => (
                <span key={m} className="text-xs text-slate-500">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Place Section ─────────────────────────────────────────────────────
