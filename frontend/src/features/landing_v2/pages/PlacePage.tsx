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

export function PlacePage() {
  const navigate = useNavigate();

  const categories = [
    { emoji: "💻", name: "Tecnología Premium", tag: "Exclusivo", tagColor: "#3b82f6" },
    { emoji: "🎧", name: "Accesorios Lifestyle", tag: "Tendencia", tagColor: ORANGE },
    { emoji: "🌿", name: "Wellness & Salud", tag: "Popular", tagColor: "#10b981" },
    { emoji: "🏠", name: "Hogar Inteligente", tag: "Nuevo", tagColor: GOLD },
    { emoji: "👟", name: "Moda & Calzado", tag: "Exclusivo", tagColor: "#8b5cf6" },
    { emoji: "🧴", name: "Belleza & Cuidado", tag: "Tendencia", tagColor: "#ec4899" },
    { emoji: "🎮", name: "Gaming & Tech", tag: "Popular", tagColor: "#3b82f6" },
    { emoji: "🍳", name: "Cocina & Hogar", tag: "Nuevo", tagColor: "#f59e0b" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ORANGE}18 0%, transparent 70%)` }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}10` }}>
            <ShoppingBag size={13} /> GLOINT Place
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Productos que marcan <span style={{ color: ORANGE }}>diferencia</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Plataforma de comercio electrónico enfocada en productos innovadores, diferenciadores y de tendencia, con cobertura de envíos a nivel nacional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>
              Ver catálogo
            </button>
            <button className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: `1px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}10` }}>
              Registrarme como vendedor
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" fill="none"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#ffffff" /></svg></div>
      </section>

      {/* Por qué Place */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>¿Por qué elegirnos?</div>
              <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: DARK }}>
                La experiencia de compra que <span style={{ color: ORANGE }}>mereces</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                Seleccionamos productos innovadores y de alta demanda para ofrecer una experiencia de compra diferenciada a consumidores que valoran calidad, diseño y exclusividad. Trabajamos con proveedores certificados para garantizar autenticidad en cada pedido.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Package size={18} />, label: "Productos exclusivos", desc: "Catálogo curado de alta demanda" },
                  { icon: <Shield size={18} />, label: "Compras seguras", desc: "Pago cifrado y verificado" },
                  { icon: <Truck size={18} />, label: "Envíos nacionales", desc: "Cobertura en toda Colombia" },
                  { icon: <Star size={18} />, label: "Calidad garantizada", desc: "Proveedores certificados" },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${ORANGE}12`, color: ORANGE }}>{icon}</div>
                    <div className="font-bold text-xs mb-0.5" style={{ color: DARK }}>{label}</div>
                    <div className="text-slate-400 text-xs">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ background: DARK, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="p-4 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-3 flex-1 h-5 rounded-md bg-white/5 flex items-center px-2">
                  <span className="text-xs text-slate-500">place.gloint.com</span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {categories.slice(0, 4).map((c) => (
                    <div key={c.name} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-3xl mb-1">{c.emoji}</div>
                      <div className="text-xs font-bold mb-0.5" style={{ color: c.tagColor }}>{c.tag}</div>
                      <div className="text-white text-xs font-semibold leading-tight">{c.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }}>
                  <span className="text-sm font-bold" style={{ color: ORANGE }}>Envío gratis</span>
                  <span className="text-xs text-slate-400">En pedidos +$50.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Catálogo</div>
            <h2 className="text-2xl md:text-3xl font-black" style={{ color: DARK }}>
              Nuestras <span style={{ color: ORANGE }}>categorías</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c) => (
              <div key={c.name} className="rounded-2xl p-5 text-center transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <div className="text-4xl mb-2">{c.emoji}</div>
                <div className="text-xs font-bold mb-1" style={{ color: c.tagColor }}>{c.tag}</div>
                <div className="font-semibold text-sm" style={{ color: DARK }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo comprar */}
      <section className="py-20" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Proceso</div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Cómo <span style={{ color: ORANGE }}>comprar</span></h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { n: "01", title: "Elige tu producto", desc: "Navega nuestro catálogo curado y encuentra lo que necesitas." },
              { n: "02", title: "Pago seguro", desc: "Paga con tus métodos favoritos: PSE, tarjeta o Wompi." },
              { n: "03", title: "Confirmación", desc: "Recibes la confirmación de pedido y número de seguimiento." },
              { n: "04", title: "Entrega express", desc: "Tu pedido llega a cualquier ciudad de Colombia con trazabilidad." },
            ].map((s) => (
              <div key={s.n} className="p-5 rounded-2xl relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="absolute top-3 right-3 text-4xl font-black opacity-10 select-none" style={{ color: ORANGE }}>{s.n}</div>
                <div className="font-bold text-white text-sm mb-2">{s.title}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a0d00 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 50%, ${ORANGE}18 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Descubre productos que <span style={{ color: ORANGE }}>marcan tendencia</span>.
          </h2>
          <p className="text-slate-300 mb-10">Únete a miles de compradores que eligen GLOINT Place por su calidad, variedad y servicio.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>Explorar catálogo</button>
            <button onClick={() => { navigate('/investment'); window.scrollTo({ top: 0 }); }} className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}>Ver GLOINT Investment</button>
          </div>
        </div>
      </section>

      <SharedFooter  />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOINT TECH PAGE
// ══════════════════════════════════════════════════════════════════════════════
