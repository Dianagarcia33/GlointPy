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

export function PlaceSection() {
  const products = [
    { name: "Tecnología Premium", tag: "Exclusivo", emoji: "💻" },
    { name: "Accesorios Lifestyle", tag: "Tendencia", emoji: "🎧" },
    { name: "Wellness & Salud", tag: "Popular", emoji: "🌿" },
    { name: "Hogar Inteligente", tag: "Nuevo", emoji: "🏠" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge text="GLOINT Place" />
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
            Productos que marcan{" "}
            <span style={{ color: ORANGE }}>diferencia</span>.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Seleccionamos productos innovadores y de alta demanda para ofrecer una
            experiencia de compra diferenciada a consumidores que valoran calidad,
            diseño y exclusividad.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((p, i) => (
            <div
              key={p.name}
              className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div className="text-5xl mb-4">{p.emoji}</div>
              <div
                className="text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: ORANGE }}
              >
                {p.tag}
              </div>
              <div className="font-bold text-sm" style={{ color: DARK }}>{p.name}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {[
            { icon: <Package size={18} />, label: "Productos Exclusivos" },
            { icon: <Shield size={18} />, label: "Compras Seguras" },
            { icon: <Truck size={18} />, label: "Envíos a toda Colombia" },
            { icon: <Star size={18} />, label: "Experiencia Premium" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
              style={{ background: "#fff7ed", border: `1px solid ${ORANGE}33`, color: DARK }}
            >
              <span style={{ color: ORANGE }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Tech Section ──────────────────────────────────────────────────────
