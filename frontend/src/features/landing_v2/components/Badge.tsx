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

export function Badge({ text, gold }: { text: string; gold?: boolean }) {
  const color = gold ? GOLD : ORANGE;
  return (
    <span
      className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase mb-4 border transition-all select-none font-montserrat shadow-xs"
      style={{
        borderColor: `${color}40`,
        color: color,
        background: gold ? "rgba(197,155,78,0.08)" : "rgba(249,115,22,0.08)",
        boxShadow: `0 2px 10px ${color}15`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {text}
    </span>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
