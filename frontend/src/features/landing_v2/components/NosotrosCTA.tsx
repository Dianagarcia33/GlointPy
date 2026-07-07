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

export function NosotrosCTA() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 50%, #1a1000 100%)` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 60% 50%, ${GOLD}22 0%, transparent 60%)` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
          Sé parte del <span style={{ color: GOLD }}>ecosistema GLOINT</span>.
        </h2>
        <p className="text-slate-300 mb-10 leading-relaxed">
          Únete a más de 1.000 clientes que ya confían en GLOINT para crecer en
          la economía digital. Nuestros asesores están listos para acompañarte.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-8 py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
          >
            Hablar con un asesor
          </button>
          <button
            className="px-8 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}
          >
            Conocer nuestros servicios
          </button>
        </div>
      </div>
    </section>
  );
}

