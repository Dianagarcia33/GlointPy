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

export function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 60%, #0d1a35 100%)` }}
    >
      {/* Abstract decorative lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="100%" stopColor={ORANGE} />
          </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1={i * 180}
            y1="0"
            x2={i * 180 + 300}
            y2="800"
            stroke="url(#lg1)"
            strokeWidth="1"
          />
        ))}
        <circle cx="900" cy="200" r="180" fill="none" stroke={GOLD} strokeWidth="1" />
        <circle cx="900" cy="200" r="120" fill="none" stroke={ORANGE} strokeWidth="0.5" />
        <polyline
          points="600,400 700,300 820,350 950,250 1050,320"
          fill="none"
          stroke="url(#lg1)"
          strokeWidth="2"
        />
        {[700, 820, 950].map((x, i) => (
          <circle key={i} cx={x} cy={[300, 350, 250][i]} r="4" fill={GOLD} />
        ))}
      </svg>

      {/* Gold glow */}
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge text="Ecosistema Empresarial" gold />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl font-black text-white leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Impulsamos el crecimiento empresarial a través de{" "}
          <span style={{ color: GOLD }}>inversión</span>,{" "}
          <span style={{ color: ORANGE }}>comercio digital</span> y tecnología.
        </motion.h1>

        <motion.p
          className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          GLOINT es un grupo empresarial que desarrolla soluciones innovadoras en inversión,
          comercio electrónico y transformación tecnológica. Nuestro objetivo es generar
          oportunidades sostenibles para inversionistas, clientes y empresas que buscan
          crecer en la economía digital.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-white text-base"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
            onClick={() => {
              const element = document.getElementById("unidades");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Conocer nuestras unidades
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-base"
            style={{
              border: `1px solid ${GOLD}`,
              color: GOLD,
              background: "rgba(197,155,78,0.08)",
            }}
          >
            Contactar un asesor
          </motion.button>
        </motion.div>

        {/* Mini stats */}
        <motion.div
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          {[
            { n: "+1000", label: "Clientes" },
            { n: "+500", label: "Operaciones" },
            { n: "3", label: "Unidades" },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black" style={{ color: GOLD }}>{n}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 55 960 0 720 30C480 60 240 10 0 40L0 60Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
