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

export function NosotrosMisionVision() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Misión */}
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >
            <div
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)` }}
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: `${GOLD}20`, color: GOLD }}
            >
              <Target size={22} />
            </div>
            <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: GOLD }}>
              Misión
            </div>
            <p className="text-slate-300 leading-relaxed text-sm relative z-10">
              Desarrollar empresas sostenibles que generen crecimiento económico, innovación y bienestar para clientes, colaboradores, inversionistas y aliados estratégicos
            </p>
          </div>

          {/* Visión */}
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, #fff7ed 0%, #fff 100%)`, border: `1px solid ${ORANGE}20` }}
          >
            <div
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${ORANGE}15 0%, transparent 70%)` }}
            />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
              style={{ background: `${ORANGE}15`, color: ORANGE }}
            >
              <Lightbulb size={22} />
            </div>
            <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ORANGE }}>
              Visión
            </div>
            <p className="text-slate-600 leading-relaxed text-sm relative z-10">
              Consolidar a GLOINT GROUP como uno de los grupos empresariales más innovadores de Latinoamérica, integrando soluciones de tecnología, logística, servicios financieros, comercio electrónico e inversión.
            </p>
          </div>
        </div>

        {/* Valores */}
        <div className="text-center mb-12">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>
            Nuestros valores
          </div>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: DARK }}>
            Lo que nos <span style={{ color: ORANGE }}>define</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {[
            { icon: <Zap size={20} />, title: "Innovación", desc: "Buscamos siempre nuevas formas de crear valor.", color: GOLD },
            { icon: <Scale size={20} />, title: "Integridad", desc: "Actuamos con transparencia y responsabilidad.", color: "#60a5fa" },
            { icon: <Users size={20} />, title: "Comunidad", desc: "Crecemos juntos, poniendo a las personas primero.", color: ORANGE },
            { icon: <TrendingUp size={20} />, title: "Escalabilidad", desc: "Diseñamos para el largo plazo desde el inicio.", color: "#34d399" },
            { icon: <Globe size={20} />, title: "Visión global", desc: "Pensamos en grande con impacto local y regional.", color: "#a78bfa" },
            { icon: <Heart size={20} />, title: "Compromiso", desc: "100% enfocados en el éxito de nuestros clientes.", color: "#fb7185" },
          ].map(({ icon, title, desc, color }) => (
            <div
              key={title}
              className="p-5 rounded-2xl flex flex-col gap-3"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${color}15`, color }}
              >
                {icon}
              </div>
              <div className="font-bold text-sm" style={{ color: DARK }}>{title}</div>
              <div className="text-slate-500 text-xs leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
