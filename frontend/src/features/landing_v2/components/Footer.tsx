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

export function Footer() {
  return (
    <footer style={{ background: "#080e1b" }} className="pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div
              className="text-2xl font-black tracking-widest mb-4"
              style={{
                background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              GLOINT
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Ecosistema empresarial de inversión, comercio digital y tecnología.
            </p>
            <div className="flex gap-3">
              {/* Icons removed */}
            </div>
          </div>

          {/* Empresa */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2">
              {["Inicio", "Nosotros", "Servicios", "Contacto"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Unidades */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Unidades</h4>
            <ul className="space-y-2">
              {["GLOINT Investment", "GLOINT Place", "GLOINT Tech"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Política de privacidad", "Términos y condiciones"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Mail size={13} style={{ color: GOLD }} />
                contacto@gloint.com
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Phone size={13} style={{ color: GOLD }} />
                +57 300 000 0000
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <MapPin size={13} style={{ color: GOLD }} />
                Colombia
              </div>
            </div>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-slate-600 text-xs">
            © GLOINT 2026. Todos los derechos reservados.
          </p>
          <p className="text-slate-600 text-xs">
            Hecho con visión estratégica.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOSOTROS PAGE
// ══════════════════════════════════════════════════════════════════════════════

