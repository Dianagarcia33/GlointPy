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
  return (
    <span
      className="inline-block px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase mb-4"
      style={{
        border: `1px solid ${gold ? GOLD : ORANGE}`,
        color: gold ? GOLD : ORANGE,
        background: gold ? "rgba(197,155,78,0.08)" : "rgba(249,115,22,0.08)",
      }}
    >
      {text}
    </span>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
