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
import { NosotrosAcerca } from "../components/NosotrosAcerca";
import { NosotrosComoTrabajamos } from "../components/NosotrosComoTrabajamos";
import { NosotrosMisionVision } from "../components/NosotrosMisionVision";
import { NosotrosEcosistema } from "../components/NosotrosEcosistema";
import { NosotrosAliados } from "../components/NosotrosAliados";
import { NosotrosCTA } from "../components/NosotrosCTA";
import { NosotrosFooter } from "../components/NosotrosFooter";

export function NosotrosPage() {
  return (
    <>
      <NosotrosAcerca  />
      <NosotrosComoTrabajamos />
      <NosotrosMisionVision />
      <NosotrosEcosistema />
      <NosotrosAliados />
      <NosotrosCTA />
      <NosotrosFooter  />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED FOOTER (used by all service pages)
// ══════════════════════════════════════════════════════════════════════════════
