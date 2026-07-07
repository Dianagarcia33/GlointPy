import { useNavigate } from "react-router-dom";
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
import { SharedFooter } from "../components/SharedFooter";

export function InvestmentPage() {
  const navigate = useNavigate();

  const plans = [
    { name: "Básico", emoji: "🥉", range: "25 a 50 /mes", cashback: "$200", color: "#94a3b8" },
    { name: "Plata", emoji: "🥈", range: "51 a 100 /mes", cashback: "$500", color: "#cbd5e1" },
    { name: "Oro", emoji: "🥇", range: "101 a 300 /mes", cashback: "$800", color: GOLD },
    { name: "Elite", emoji: "👑", range: "301 en adelante", cashback: "$1.100", color: ORANGE, top: true },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}>
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice">
            <defs><linearGradient id="ig1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={GOLD} /><stop offset="100%" stopColor={ORANGE} /></linearGradient></defs>
            {[...Array(7)].map((_, i) => <line key={i} x1={i * 200} y1="0" x2={i * 200 + 250} y2="500" stroke="url(#ig1)" strokeWidth="1" />)}
            <circle cx="950" cy="180" r="200" fill="none" stroke={GOLD} strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}20 0%, transparent 70%)` }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${GOLD}`, color: GOLD, background: `${GOLD}10` }}>
            <TrendingUp size={13} /> GLOINT Investment
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Invertimos en el{" "}<span style={{ color: GOLD }}>futuro digital</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Unidad especializada en la gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}>
              Comenzar a invertir
            </button>
            <button className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: `1px solid ${GOLD}`, color: GOLD, background: `${GOLD}10` }}>
              Ver planes de cashback
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" fill="none"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#f8fafc" /></svg></div>
      </section>

      {/* Qué es */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Sobre la unidad</div>
              <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: DARK }}>
                Capital que trabaja para <span style={{ color: GOLD }}>ti</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                El <span className="font-semibold" style={{ color: DARK }}>Cashback Logístico GLOINT</span> es un modelo de retorno financiero diseñado para premiar a los comerciantes que realizan envíos y ventas constantes mediante plataformas logísticas aliadas.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Cada operación completada te devuelve un porcentaje en forma de <span className="font-semibold" style={{ color: ORANGE }}>bonificación y cashback</span> que puede ser redimido o usado como saldo para nuevas inversiones dentro del ecosistema GLOINT.
              </p>
              <div className="flex items-start gap-3 p-4 rounded-xl mb-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                <TrendingUp size={18} className="flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <p className="text-sm font-semibold" style={{ color: DARK }}>
                  💡 En pocas palabras: cada venta genera liquidez y cada operación devuelve dinero.
                </p>
              </div>
            </div>
            {/* Chart */}
            <div className="rounded-2xl p-6" style={{ background: DARK, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-400 tracking-widest">RENDIMIENTO ACUMULADO</div>
                  <div className="text-2xl font-black text-white mt-1">+34.8% <span className="text-sm font-normal text-green-400">↑</span></div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${GOLD}18`, color: GOLD }}>2026</div>
              </div>
              <svg viewBox="0 0 300 120" className="w-full">
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 100 L37 85 L75 88 L112 60 L150 68 L187 38 L225 44 L262 20 L300 26" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M0 100 L37 85 L75 88 L112 60 L150 68 L187 38 L225 44 L262 20 L300 26 L300 120 L0 120Z" fill="url(#invGrad)" />
                {[37, 112, 187, 262].map((x, i) => <circle key={i} cx={x} cy={[85, 60, 38, 20][i]} r="4" fill={GOLD} />)}
              </svg>
              <div className="flex justify-between mt-2">
                {["Ene", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => <span key={m} className="text-xs text-slate-600">{m}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Beneficios</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              ¿Por qué invertir con <span style={{ color: GOLD }}>GLOINT</span>?
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Zap size={22} />, title: "Retorno inmediato", desc: "Cashback aplicado automáticamente en cada entrega exitosa sin demoras." },
              { icon: <Shield size={22} />, title: "Capital protegido", desc: "Operamos con plataformas logísticas certificadas y aliadas estratégicas." },
              { icon: <TrendingUp size={22} />, title: "Crecimiento escalable", desc: "Cuanto más operas, más ganas. El sistema premia la consistencia." },
              { icon: <Users size={22} />, title: "Asesoría personalizada", desc: "Un experto de GLOINT te acompaña para maximizar tu portafolio." },
            ].map((c, i) => (
              <FadeUp key={c.title} delay={i * 0.1}>
                <motion.div className="p-5 rounded-2xl h-full" style={{ background: `${GOLD}0A`, border: `1px solid ${GOLD}25` }} whileHover={{ y: -4, background: `${GOLD}14` }} transition={{ duration: 0.2 }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${GOLD}18`, color: GOLD }}>{c.icon}</div>
                  <div className="text-white font-bold text-sm mb-1">{c.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{c.desc}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Esquema de bonificación */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Planes</div>
            <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: DARK }}>
              🔥 Esquema de Bonificación de{" "}
              <span style={{ color: GOLD }}>Entregas Exitosas</span>
            </h2>
            <p className="text-slate-500 text-sm">Beneficios según tu volumen mensual de envíos</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.1}>
                <motion.div
                  className="rounded-2xl p-6 text-center relative h-full"
                  style={{ background: "#fff", border: `2px solid ${p.color}30`, boxShadow: p.top ? `0 8px 30px ${ORANGE}20` : "0 2px 12px rgba(0,0,0,0.06)" }}
                  whileHover={{ y: -6, boxShadow: `0 16px 40px ${p.color}25` }}
                  transition={{ duration: 0.25 }}
                >
                  {p.top && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: ORANGE, color: "#fff" }}>TOP</div>
                  )}
                  <div className="text-3xl mb-2">{p.emoji}</div>
                  <div className="font-black text-base mb-1" style={{ color: p.color }}>{p.name}</div>
                  <div className="text-slate-400 text-xs mb-4">{p.range} entregas/mes</div>
                  <div className="text-4xl font-black mb-1" style={{ color: p.color }}>{p.cashback}</div>
                  <div className="text-slate-400 text-xs">Cashback mensual</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20" style={{ background: DARK2 }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Proceso</div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Cómo <span style={{ color: GOLD }}>funciona</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Regístrate", desc: "Crea tu cuenta en GLOINT y accede al panel de inversionista en minutos, sin papeleo." },
              { n: "02", title: "Opera con aliados", desc: "Realiza envíos a través de plataformas logísticas aliadas a GLOINT para acumular cashback." },
              { n: "03", title: "Cobra tu retorno", desc: "Recibe tu bonificación mensual automáticamente según tu volumen de entregas exitosas." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="absolute top-4 right-4 text-5xl font-black opacity-10 select-none" style={{ color: GOLD }}>{s.n}</div>
                <div className="text-white font-bold text-base mb-2">{s.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a1000 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 60% 50%, ${GOLD}22 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Empieza a generar <span style={{ color: GOLD }}>retornos hoy</span>.
          </h2>
          <p className="text-slate-300 mb-10">Únete al programa de inversión logística de GLOINT y haz que cada entrega cuente.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}>Comenzar ahora</button>
            <button onClick={() => { navigate('/nosotros'); window.scrollTo({ top: 0 }); }} className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}>Conocer más sobre GLOINT</button>
          </div>
        </div>
      </section>

      <SharedFooter  />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOINT PLACE PAGE
// ══════════════════════════════════════════════════════════════════════════════
