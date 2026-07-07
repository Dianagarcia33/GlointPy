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

export function Stats() {
  const stats = [
    { value: 1000, prefix: "+", suffix: "", label: "Clientes impactados" },
    { value: 500, prefix: "+", suffix: "", label: "Operaciones gestionadas" },
    { value: 3, prefix: "", suffix: "", label: "Unidades estratégicas" },
    { value: 100, prefix: "", suffix: "%", label: "Compromiso con la innovación" },
  ];

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK2}, #0d1526)` }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, ${GOLD}08, transparent, ${ORANGE}08)` }} />
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, prefix, suffix, label }, i) => (
            <FadeUp key={label} delay={i * 0.1}>
              <div
                className="text-4xl md:text-5xl font-black mb-2"
                style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {prefix}<AnimatedCounter value={value} suffix={suffix} />
              </div>
              <div className="text-slate-400 text-sm">{label}</div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Aliados ──────────────────────────────────────────────────────────────────
