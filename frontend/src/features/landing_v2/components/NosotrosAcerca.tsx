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

export function NosotrosAcerca() {
  return (
    <section className="pt-32 pb-0 bg-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start pb-20">

          {/* Left — story */}
          <div>
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>
              Quiénes somos
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-2" style={{ color: DARK }}>
              Acerca de{" "}
              <span style={{ color: ORANGE }}>Nosotros</span>
            </h1>
            <div className="text-xs font-semibold tracking-widest uppercase mb-8" style={{ color: "#94a3b8" }}>
              GLOINT INTERNATIONAL VENTURES S.A.
            </div>

            <p className="text-slate-600 leading-relaxed mb-4">
              Nace en el 2022, fruto de la visión de un grupo de emprendedores con{" "}
              <span className="font-semibold" style={{ color: ORANGE }}>más de 3 años de experiencia</span>{" "}
              en diferentes mercados que desean crear herramientas y soluciones para{" "}
              <span className="font-semibold" style={{ color: DARK }}>potenciar el crecimiento de otros emprendedores</span>.
            </p>
            <p className="text-slate-600 leading-relaxed mb-10">
              Nos especializamos en conectar inversión estratégica, comercio electrónico
              y tecnología aplicada bajo un mismo ecosistema, generando valor real para
              clientes, inversionistas y aliados en la economía digital latinoamericana.
            </p>

            {/* Constitución Legal card */}
            <div
              className="flex items-start gap-4 p-5 rounded-2xl"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                <FileCheck size={20} />
              </div>
              <div>
                <div className="font-bold text-sm mb-1" style={{ color: DARK }}>Constitución Legal</div>
                <div className="text-slate-500 text-xs leading-relaxed">
                  Certificado en la Cámara de Comercio de Bogotá, Colombia. Nuestra empresa se encuentra legalmente constituida y registrada conforme a la normativa vigente, lo que garantiza su plena operatividad y cumplimiento de las disposiciones legales aplicables en el país.
                </div>
              </div>
            </div>
          </div>

          {/* Right — year + stats */}
          <div className="flex flex-col gap-8">
            {/* Year block */}
            <div
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
            >
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)` }}
              />
              <div
                className="text-7xl md:text-8xl font-black leading-none mb-2 relative z-10"
                style={{
                  background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                2022
              </div>
              <div className="text-slate-400 text-sm relative z-10">Año de fundación</div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-4">
              {[
                { icon: <Award size={20} />, value: "+3", label: "Años de experiencia del equipo fundador" },
                { icon: <Heart size={20} />, value: "100%", label: "Compromiso total con nuestros clientes" },
                { icon: <Clock size={20} />, value: "24/7", label: "Disponibilidad y soporte continuo" },
              ].map(({ icon, value, label }) => (
                <div key={value} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${ORANGE}15`, color: ORANGE }}
                  >
                    {icon}
                  </div>
                  <div>
                    <span className="font-black text-lg" style={{ color: DARK }}>{value}</span>
                    <span className="text-slate-500 text-sm ml-2">{label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wave into next section */}
      <div style={{ background: DARK }}>
        <svg viewBox="0 0 1440 60" fill="none">
          <path d="M0 0L1440 0L1440 40C1200 5 960 60 720 30C480 0 240 50 0 20L0 0Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
