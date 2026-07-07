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

import { useNavigate } from "react-router-dom";
export function Nav() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = location.pathname === "/" ? "home" : location.pathname.substring(1);

  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [mobileServices, setMobileServices] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (id: string) => {
    navigate(id === "home" ? "/" : `/${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOpen(false);
    setDropdown(false);
  };

  const serviceActive = ["investment", "place", "tech"].includes(page);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? DARK : "transparent",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => go("home")}
          className="text-2xl font-black tracking-widest select-none"
          style={{
            background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          GLOINT
        </button>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {/* Inicio */}
          <li>
            <button
              onClick={() => go("home")}
              className="text-sm font-medium transition-colors"
              style={{
                color: page === "home" ? ORANGE : "#cbd5e1",
                borderBottom: page === "home" ? `2px solid ${ORANGE}` : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              Inicio
            </button>
          </li>
          {/* Nosotros */}
          <li>
            <button
              onClick={() => go("nosotros")}
              className="text-sm font-medium transition-colors"
              style={{
                color: page === "nosotros" ? ORANGE : "#cbd5e1",
                borderBottom: page === "nosotros" ? `2px solid ${ORANGE}` : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              Nosotros
            </button>
          </li>
          {/* Servicios — dropdown */}
          <li ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdown(!dropdown)}
              className="flex items-center gap-1 text-sm font-medium transition-colors"
              style={{
                color: serviceActive ? ORANGE : "#cbd5e1",
                borderBottom: serviceActive ? `2px solid ${ORANGE}` : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              Servicios
              <ChevronRight
                size={14}
                className="transition-transform duration-200"
                style={{ transform: dropdown ? "rotate(90deg)" : "rotate(0deg)" }}
              />
            </button>

            {dropdown && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl overflow-hidden py-2"
                style={{
                  background: DARK,
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
              >
                {/* Arrow */}
                <div
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
                  style={{ background: DARK, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", borderRight: "none" }}
                />
                {SERVICE_LINKS.map(({ label, id, color, desc }) => (
                  <button
                    key={id}
                    onClick={() => go(id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}18`, color }}
                    >
                      {id === "investment" ? <TrendingUp size={15} /> : id === "place" ? <ShoppingBag size={15} /> : <Cpu size={15} />}
                    </div>
                    <div>
                      <div className="text-white text-xs font-bold">{label}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </li>
          {/* Contacto */}
          <li>
            <button
              onClick={() => go("contacto")}
              className="text-sm font-medium transition-colors"
              style={{
                color: page === "contacto" ? ORANGE : "#cbd5e1",
                borderBottom: page === "contacto" ? `2px solid ${ORANGE}` : "2px solid transparent",
                paddingBottom: "2px",
              }}
            >
              Contacto
            </button>
          </li>
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "#cbd5e1" }}>
            Iniciar sesión
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
            style={{ background: ORANGE, color: "#fff" }}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: DARK2 }} className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-1">
          {(["home", "nosotros"]).map((id) => (
            <button key={id} onClick={() => go(id)} className="text-white text-sm font-medium py-2 text-left capitalize">
              {id === "home" ? "Inicio" : "Nosotros"}
            </button>
          ))}
          {/* Mobile services accordion */}
          <button
            onClick={() => setMobileServices(!mobileServices)}
            className="flex items-center justify-between text-white text-sm font-medium py-2"
            style={{ color: serviceActive ? ORANGE : "#fff" }}
          >
            Servicios
            <ChevronRight size={14} style={{ transform: mobileServices ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>
          {mobileServices && (
            <div className="ml-4 flex flex-col gap-2 mb-2">
              {SERVICE_LINKS.map(({ label, id, color }) => (
                <button
                  key={id}
                  onClick={() => go(id)}
                  className="text-sm py-1.5 text-left font-medium"
                  style={{ color }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => go("contacto")} className="text-white text-sm font-medium py-2 text-left">Contacto</button>
          <button onClick={() => navigate('/register')} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold w-full" style={{ background: ORANGE, color: "#fff" }}>
            Crear Cuenta
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Badge pill ────────────────────────────────────────────────────────────────
