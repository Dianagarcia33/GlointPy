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
import { CONTACT_INFO } from "../../../constants/contactInfo";

export function Hero() {
  const whatsappLink = CONTACT_INFO.whatsappLink;
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 60%, #0d1a35 100%)` }}
    >
      {/* Abstract decorative lines */}
      <motion.svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        animate={{ opacity: [0.12, 0.22, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="100%" stopColor={ORANGE} />
          </linearGradient>

          <radialGradient id="dotGlow">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.9" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Líneas diagonales en movimiento */}
        {[...Array(8)].map((_, i) => (
          <motion.line
            key={i}
            x1={i * 180}
            y1="0"
            x2={i * 180 + 300}
            y2="800"
            stroke="url(#lg1)"
            strokeWidth="1.5"
            animate={{
              x1: [i * 180 - 30, i * 180 + 30, i * 180 - 30],
              x2: [i * 180 + 270, i * 180 + 330, i * 180 + 270],
              opacity: [0.25, 0.75, 0.25],
            }}
            transition={{
              duration: 8 + i * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}

        {/* Círculos grandes */}
        <motion.circle
          cx="900"
          cy="200"
          r="180"
          fill="none"
          stroke={GOLD}
          strokeWidth="1.2"
          animate={{
            r: [180, 215, 180],
            opacity: [0.2, 0.55, 0.2],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.circle
          cx="900"
          cy="200"
          r="120"
          fill="none"
          stroke={ORANGE}
          strokeWidth="0.8"
          animate={{
            r: [120, 150, 120],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Gráfico financiero */}
        <motion.polyline
          points="600,400 700,300 820,350 950,250 1050,320"
          fill="none"
          stroke="url(#lg1)"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: 1,
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            pathLength: {
              duration: 2.5,
              delay: 0.8,
            },
            opacity: {
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        />

        {/* Puntos del gráfico */}
        {[700, 820, 950].map((x, i) => (
          <motion.circle
            key={i}
            cx={x}
            cy={[300, 350, 250][i]}
            r="4"
            fill={GOLD}
            animate={{
              r: [4, 8, 4],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Partículas flotantes */}
        {[
          [180, 180],
          [330, 520],
          [480, 220],
          [760, 150],
          [1080, 480],
          [970, 620],
          [220, 650],
          [1120, 180],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={`particle-${i}`}
            cx={cx}
            cy={cy}
            r={i % 2 === 0 ? 2 : 3}
            fill="url(#dotGlow)"
            animate={{
              cy: [cy, cy - 25, cy],
              opacity: [0.15, 0.8, 0.15],
              r: [2, 4, 2],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.svg>

      {/* Gold glow */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)` }}
        animate={{ x: [0, 80, 20, -60, 0], y: [0, -50, 30, -20, 0], scale: [1, 1.15, 0.95, 1.1, 1], opacity: [0.5, 0.8, 0.6, 0.75, 0.5],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge text="Ecosistema Empresarial" gold />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-[1.14] tracking-tight mb-6 font-montserrat"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Impulsamos el crecimiento empresarial a través{" "}
          <motion.span
            style={{ color: GOLD }}
            animate={{ textShadow: [`0 0 0px ${GOLD}`, `0 0 18px ${GOLD}88`, `0 0 0px ${GOLD}`] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            inversión
          </motion.span>
          ,{" "}
          <motion.span
            style={{ color: ORANGE }}
            animate={{ textShadow: [`0 0 0px ${ORANGE}`, `0 0 18px ${ORANGE}88`, `0 0 0px ${ORANGE}`] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1, ease: "easeInOut" }}
          >
            comercio digital
          </motion.span>{" "}
          y tecnología.
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-slate-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10 font-normal"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          GLOINT es un grupo empresarial que desarrolla soluciones innovadoras en inversión,
          comercio electrónico y transformación tecnológica. Nuestro objetivo es generar
          oportunidades sostenibles para inversionistas, clientes y empresas que buscan
          crecer en la economía digital.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 rounded-xl font-bold text-white text-base font-montserrat tracking-tight shadow-xl shadow-brand-500/25 border border-white/20 relative overflow-hidden group cursor-pointer"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
            onClick={() => {
              const element = document.getElementById("unidades");
              if (element) element.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <span className="relative z-10">Conocer nuestras unidades</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2, backgroundColor: "rgba(197,155,78,0.14)" }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 rounded-xl font-bold text-base font-montserrat tracking-tight border backdrop-blur-md transition-all cursor-pointer"
            style={{ border: `1px solid ${GOLD}60`, color: GOLD, background: "rgba(197,155,78,0.06)" }}
            onClick={() => window.open(whatsappLink, "_blank")}
          >
            Contactar un asesor
          </motion.button>
        </motion.div>

        {/* Mini stats */}
        <motion.div
          className="mt-14 grid grid-cols-3 gap-3 sm:gap-6 max-w-lg mx-auto p-2 sm:p-3 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.08] shadow-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          {[
            { n: 1000, suffix: "+", label: "Clientes" },
            { n: 500, suffix: "+", label: "Operaciones" },
            { n: 3, suffix: "", label: "Unidades" },
          ].map(({ n, suffix, label }, index) => (
            <motion.div
              key={label}
              className="text-center py-2 px-1 rounded-xl hover:bg-white/[0.04] transition-colors"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + index * 0.15 }}
              whileHover={{ y: -2, scale: 1.02 }}
            >
              <motion.div className="text-2xl sm:text-3xl font-black font-montserrat tracking-tight" style={{ color: GOLD }}>
                <AnimatedCounter value={n} suffix={suffix} />
              </motion.div>

              <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wider font-montserrat">
                {label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-10 flex flex-col items-center text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          <span className="text-[10px] uppercase tracking-[0.25em] mb-2 font-montserrat font-bold">Explora</span>
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-lg"
          >
            ↓
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
          <path d="M0,35 C360,65 1080,10 1440,40 L1440,60 L0,60 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
