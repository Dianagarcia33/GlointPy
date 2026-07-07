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

export function NosotrosAliados() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Rappi"];
  return (
    <section className="py-20" style={{ background: DARK }}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
          Respaldados por
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-12">
          Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {partners.map((p) => (
            <div
              key={p}
              className="h-16 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

