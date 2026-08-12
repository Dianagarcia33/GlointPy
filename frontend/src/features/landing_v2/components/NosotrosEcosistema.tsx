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

export function NosotrosEcosistema() {
  const unidades = [
    {
      icon: <TrendingUp size={26} />,
      color: GOLD,
      name: "GLOINT Investment",
      role: "Gestión de capital",
      desc: "Identificamos y administramos oportunidades de inversión en mercados digitales de alto potencial, maximizando el retorno para nuestros inversionistas.",
      items: [
        "Portafolios digitales",
        "Cashback logístico",
        "Acciones comercializables",
      ],
    },
    {
      icon: <ShoppingBag size={26} />,
      color: ORANGE,
      name: "GLOINT Place",
      role: "Comercio electrónico",
      desc: "Plataforma de e-commerce con productos exclusivos, compras seguras y cobertura de envíos en toda Colombia con trazabilidad completa.",
      items: [
        "Productos de tendencia",
        "Envíos nacionales",
        "Experiencia premium",
      ],
    },
    {
      icon: <Cpu size={26} />,
      color: "#60a5fa",
      name: "GLOINT Tech",
      role: "Tecnología empresarial",
      desc: "Herramientas tecnológicas para digitalizar y optimizar operaciones logísticas en PyMEs, reduciendo costos y aumentando la productividad.",
      items: [
        "Seguimiento logístico",
        "Billetera empresarial",
        "Optimización de rutas",
      ],
    },
  ];

  return (
    <section
      className="py-20 md:py-24 relative overflow-hidden"
      style={{ background: "#f8fafc" }}
    >
      {/* Fondo decorativo */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, ${GOLD}10 0%, transparent 70%)`,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">

        {/* HEADER */}
        <FadeUp>
          <div className="text-center mb-12 md:mb-14">
            <div
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: ORANGE }}
            >
              Nuestro ecosistema
            </div>

            <h2
              className="text-2xl md:text-3xl font-black mb-4"
              style={{ color: DARK }}
            >
              Tres unidades.{" "}
              <span style={{ color: ORANGE }}>
                Un mismo propósito.
              </span>
            </h2>

            <p className="text-slate-500 max-w-lg mx-auto text-sm leading-relaxed">
              Cada unidad nació para resolver un desafío específico de la
              economía digital, y juntas forman un ecosistema integrado
              de crecimiento.
            </p>
          </div>
        </FadeUp>

        {/* TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {unidades.map((u, index) => (
            <motion.div
              key={u.name}
              className="rounded-2xl overflow-hidden flex flex-col h-full"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.12,
              }}
              whileHover={{
                y: -6,
                boxShadow: "0 14px 35px rgba(0,0,0,0.09)",
              }}
            >

              {/* CABECERA */}
              <div
                className="p-6 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)`,
                }}
              >
                {/* Decoración */}
                <div
                  className="absolute -right-6 -top-6 w-24 h-24 rounded-full"
                  style={{
                    background: u.color,
                    opacity: 0.12,
                  }}
                />

                <div
                  className="absolute right-6 bottom-0 w-20 h-20 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${u.color}18 0%, transparent 70%)`,
                  }}
                />

                {/* Icono */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 relative z-10"
                  style={{
                    background: `${u.color}22`,
                    color: u.color,
                  }}
                >
                  {u.icon}
                </div>

                {/* Nombre */}
                <div className="text-white font-black text-base relative z-10">
                  {u.name}
                </div>

                {/* Rol */}
                <div
                  className="text-xs font-semibold mt-1 relative z-10"
                  style={{ color: u.color }}
                >
                  {u.role}
                </div>
              </div>

              {/* CONTENIDO */}
              <div className="p-6 flex flex-col flex-1">

                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {u.desc}
                </p>

                {/* Lista */}
                <ul className="space-y-3 mt-auto">
                  {u.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: DARK }}
                    >
                      <CheckCircle
                        size={15}
                        className="flex-shrink-0"
                        style={{ color: u.color }}
                      />

                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MENSAJE INFERIOR */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
            style={{
              background: "#fff",
              border: `1px solid ${GOLD}25`,
              color: "#64748b",
              boxShadow: "0 3px 12px rgba(0,0,0,0.04)",
            }}
          >
            <motion.span
              className="w-2 h-2 rounded-full"
              style={{ background: GOLD }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />

            Tres unidades conectadas por una misma visión
          </div>
        </motion.div>

      </div>
    </section>
  );
}