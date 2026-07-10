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
export function Aliados() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Howden"];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <FadeUp>
          <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Respaldados por</div>
          <h2 className="text-2xl md:text-3xl font-black mb-12" style={{ color: DARK }}>
            Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
          </h2>
        </FadeUp>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
          {partners.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ scale: 1.06, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              className="h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8" }}
            >
              {p}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
