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

  const benefits = [
    { icon: <Package size={18} />, label: "Productos Exclusivos" },
    { icon: <Shield size={18} />, label: "Compras Seguras" },
    { icon: <Truck size={18} />, label: "Envíos a toda Colombia" },
    { icon: <Star size={18} />, label: "Experiencia Premium" },
  ];

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* ENCABEZADO */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <Badge text="GLOINT Place" />

          <motion.h2
            className="text-3xl md:text-4xl font-black mb-4"
            style={{ color: DARK }}
          >
            Productos que marcan{" "}
            <motion.span
              style={{ color: ORANGE }}
              animate={{ textShadow: [`0 0 0px ${ORANGE}`, `0 0 14px ${ORANGE}44`, `0 0 0px ${ORANGE}`] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              diferencia
            </motion.span>
            .
          </motion.h2>

          <motion.p
            className="text-slate-500 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Seleccionamos productos innovadores y de alta demanda para ofrecer una
            experiencia de compra diferenciada a consumidores que valoran calidad,
            diseño y exclusividad.
          </motion.p>
        </motion.div>

        {/* PRODUCTOS */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((p, i) => (
            <motion.div
              key={p.name}
              className="rounded-2xl p-6 text-center relative overflow-hidden cursor-default"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -8, scale: 1.02, borderColor: `${ORANGE}55`, boxShadow: `0 16px 35px ${ORANGE}18` }}
            >

              {/* Glow */}
              <motion.div
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${ORANGE}18 0%, transparent 70%)` }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Emoji */}
              <motion.div
                className="relative z-10 text-5xl mb-4"
                animate={{ y: [0, -5, 0], rotate: [0, 2, 0, -2, 0] }}
                transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                whileHover={{ scale: 1.2, rotate: 8 }}
              >
                {p.emoji}
              </motion.div>

              {/* TAG */}
              <motion.div
                className="text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: ORANGE }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.35 + i * 0.07 }}
              >
                {p.tag}
              </motion.div>

              <div className="font-bold text-sm relative z-10" style={{ color: DARK }}>
                {p.name}
              </div>

              {/* Línea inferior */}
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full"
                style={{ background: ORANGE }}
                initial={{ width: 0 }}
                whileHover={{ width: "50%" }}
                transition={{ duration: 0.25 }}
              />
            </motion.div>
          ))}
        </div>

        {/* BENEFICIOS */}
        <motion.div
          className="flex flex-wrap justify-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          {benefits.map(({ icon, label }, i) => (
            <motion.div
              key={label}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium cursor-default"
              style={{ background: "#fff7ed", border: `1px solid ${ORANGE}33`, color: DARK }}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
              whileHover={{ y: -4, scale: 1.04, borderColor: `${ORANGE}66`, boxShadow: `0 8px 20px ${ORANGE}15` }}
            >
              <motion.span
                style={{ color: ORANGE }}
                whileHover={{ scale: 1.2, rotate: 8 }}
              >
                {icon}
              </motion.span>

              {label}
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
// ─── GLOINT Tech Section ──────────────────────────────────────────────────────
