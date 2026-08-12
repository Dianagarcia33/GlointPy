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
import { Badge } from "./Badge";

export function Unidades() {
  const cards = [
    {
      title: "GLOINT INVESTMENT",
      tag: "Inversión",
      icon: <TrendingUp size={28} />,
      color: GOLD,
      desc: "Unidad especializada en la gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.",
      benefits: [
        "Estrategias de inversión innovadoras",
        "Participación en negocios digitales escalables",
        "Administración profesional del capital",
        "Crecimiento patrimonial sostenible",
      ],
      btn: "Conocer Investment",
      path: "/investment",
    },
    {
      title: "GLOINT PLACE",
      tag: "E-Commerce",
      icon: <ShoppingBag size={28} />,
      color: ORANGE,
      desc: "Plataforma de comercio electrónico enfocada en productos innovadores, diferenciadores y de tendencia, con cobertura de envíos a nivel nacional.",
      benefits: [
        "Productos exclusivos",
        "Compras seguras",
        "Envíos a toda Colombia",
        "Experiencia moderna y confiable",
      ],
      btn: "Explorar Place",
      path: "/place",
    },
    {
      title: "GLOINT TECH",
      tag: "Tecnología",
      icon: <Cpu size={28} />,
      color: "#60a5fa",
      desc: "Plataforma tecnológica diseñada para optimizar operaciones logísticas y automatizar procesos empresariales mediante herramientas accesibles para pequeñas y medianas empresas.",
      benefits: [
        "Automatización operativa",
        "Seguimiento logístico",
        "Billetera digital integrada",
        "Optimización de rutas",
      ],
      btn: "Descubrir Tech",
      path: "/tech",
    },
  ];

  return (
    <section id="unidades" className="py-24 overflow-hidden" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto px-6">

        {/* ENCABEZADO */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <Badge text="Nuestras Unidades" />

          <motion.h2
            className="text-3xl md:text-4xl font-black mb-4"
            style={{ color: DARK }}
          >
            Tres unidades.{" "}
            <motion.span
              style={{ color: ORANGE }}
              animate={{
                textShadow: [
                  `0 0 0px ${ORANGE}`,
                  `0 0 14px ${ORANGE}44`,
                  `0 0 0px ${ORANGE}`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              Un mismo propósito.
            </motion.span>
          </motion.h2>

          <p className="text-slate-500 max-w-xl mx-auto">
            Creamos soluciones especializadas que impulsan el crecimiento de personas,
            empresas e inversionistas.
          </p>
        </motion.div>

        {/* TARJETAS */}
        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              className="relative"
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.7,
                delay: i * 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
            >

              {/* HALO DE LA TARJETA */}
              <motion.div
                className="absolute -inset-3 rounded-3xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${c.color}20 0%, transparent 70%)` }}
                animate={{
                  scale: [1, 1.04, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 5 + i,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
              />

              <motion.div
                className="relative rounded-2xl overflow-hidden flex flex-col h-full"
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
                whileHover={{
                  y: -10,
                  boxShadow: `0 20px 45px ${c.color}25`,
                  borderColor: `${c.color}55`,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >

                {/* HEADER */}
                <div
                  className="p-6 flex items-center gap-4 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
                >

                  {/* Número */}
                  <motion.div
                    className="absolute right-4 top-0 text-7xl font-black opacity-10 select-none"
                    style={{ color: c.color }}
                    animate={{
                      y: [0, -5, 0],
                      opacity: [0.07, 0.14, 0.07],
                    }}
                    transition={{
                      duration: 4 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    0{i + 1}
                  </motion.div>

                  {/* Glow */}
                  <motion.div
                    className="absolute -right-10 -top-10 w-40 h-40 rounded-full"
                    style={{ background: `radial-gradient(circle, ${c.color}25 0%, transparent 70%)` }}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.4, 0.8, 0.4],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      delay: i * 0.5,
                    }}
                  />

                  {/* Icono */}
                  <motion.div
                    className="relative z-10 w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${c.color}22`, color: c.color }}
                    whileHover={{
                      scale: 1.1,
                      rotate: 5,
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {c.icon}
                  </motion.div>

                  <div className="relative z-10">
                    <div
                      className="text-xs font-semibold tracking-widest uppercase mb-1"
                      style={{ color: c.color }}
                    >
                      {c.tag}
                    </div>

                    <div className="text-white font-bold text-sm leading-tight">
                      {c.title}
                    </div>
                  </div>

                  {/* Línea luminosa */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px]"
                    style={{ background: c.color }}
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.2,
                      delay: 0.4 + i * 0.15,
                      ease: "easeOut",
                    }}
                  />
                </div>

                {/* BODY */}
                <div className="p-6 flex flex-col flex-1">

                  <motion.p
                    className="text-slate-500 text-sm leading-relaxed mb-6"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
                  >
                    {c.desc}
                  </motion.p>

                  {/* BENEFICIOS */}
                  <ul className="space-y-2 flex-1">
                    {c.benefits.map((b, benefitIndex) => (
                      <motion.li
                        key={b}
                        className="flex items-start gap-2 text-sm text-slate-700"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.35,
                          delay: 0.55 + i * 0.15 + benefitIndex * 0.08,
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className="mt-0.5 flex-shrink-0"
                        >
                          <CheckCircle size={15} style={{ color: c.color }} />
                        </motion.div>

                        {b}
                      </motion.li>
                    ))}
                  </ul>

                  {/* BOTÓN */}
                  <Link
                    to={c.path}
                    onClick={() => window.scrollTo({ top: 0 })}
                    className="w-full"
                  >
                    <motion.button
                      whileHover={{
                        scale: 1.03,
                        boxShadow: `0 8px 20px ${c.color}35`,
                      }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-6 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                      style={{
                        background: c.color,
                        color: c.color === "#60a5fa" ? DARK : "#fff",
                      }}
                    >
                      {c.btn}

                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.3,
                        }}
                      >
                        <ArrowRight size={15} />
                      </motion.span>
                    </motion.button>
                  </Link>

                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* INDICADOR INFERIOR */}
        <motion.div
          className="flex justify-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="w-20 h-1 rounded-full"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
            animate={{
              scaleX: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

      </div>
    </section>
  );
}
