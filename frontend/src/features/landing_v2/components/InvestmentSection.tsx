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

export function InvestmentSection() {
  const cards = [
    "Análisis Estratégico",
    "Gestión Profesional",
    "Mercados Digitales",
    "Crecimiento Escalable",
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>

      {/* Glow principal */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${GOLD}18 0%, transparent 70%)` }}
        animate={{
          x: ["-50%", "-45%", "-50%"],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Partículas decorativas */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{
            background: GOLD,
            left: `${10 + i * 11}%`,
            top: `${20 + (i % 4) * 18}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.15, 0.7, 0.15],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* CONTENIDO */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge text="GLOINT Investment" gold />
            </motion.div>

            <motion.h2
              className="text-3xl md:text-4xl font-black text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              Invertimos en el{" "}
              <motion.span
                style={{ color: GOLD }}
                animate={{
                  textShadow: [
                    `0 0 0px ${GOLD}`,
                    `0 0 16px ${GOLD}55`,
                    `0 0 0px ${GOLD}`,
                  ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                futuro digital
              </motion.span>
              .
            </motion.h2>

            <motion.p
              className="text-slate-400 leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              GLOINT Investment identifica oportunidades estratégicas dentro de la economía
              digital para generar crecimiento sostenible y maximizar el potencial del capital
              administrado.
            </motion.p>

            {/* CARDS */}
            <div className="grid grid-cols-2 gap-4">
              {cards.map((c, i) => (
                <motion.div
                  key={c}
                  className="p-4 rounded-xl relative overflow-hidden cursor-default"
                  style={{ background: "rgba(197,155,78,0.08)",
                    border: `1px solid ${GOLD}33`,
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.35,
                    delay: 0.2 + i * 0.05,
                  }}
                  whileHover={{
                    y: -5,
                    backgroundColor: "rgba(197,155,78,0.13)",
                    borderColor: `${GOLD}66`,
                    boxShadow: `0 10px 30px ${GOLD}12`,
                  }}
                >

                  {/* Línea luminosa */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{ background: GOLD }}
                    initial={{ scaleY: 0 }}
                    whileHover={{ scaleY: 1 }}
                    transition={{ duration: 0.25 }}
                  />

                  {/* Punto */}
                  <motion.div
                    className="w-2 h-2 rounded-full mb-3"
                    style={{ background: GOLD }}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />

                  <div className="text-white font-semibold text-sm">
                    {c}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>


          {/* GRÁFICO */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          >

            {/* Glow detrás del gráfico */}
            <motion.div
              className="absolute -inset-8 rounded-3xl pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${GOLD}12 0%, transparent 65%)`,
              }}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div
              className="relative rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
              whileHover={{
                borderColor: `${GOLD}44`,
                boxShadow: `0 20px 60px ${GOLD}10`,
              }}
              transition={{ duration: 0.3 }}
            >

              {/* HEADER DEL CHART */}
              <div className="flex items-center justify-between mb-6">

                <div>
                  <div className="text-xs text-slate-400 tracking-widest">
                    RENDIMIENTO
                  </div>

                  <motion.div
                    className="text-2xl font-black text-white mt-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.6,
                      delay: 0.4,
                      type: "spring",
                    }}
                  >
                    +34.8%
                  </motion.div>
                </div>

                <motion.div
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: "rgba(197,155,78,0.15)",
                    color: GOLD,
                  }}
                  animate={{
                    boxShadow: [
                      `0 0 0px ${GOLD}00`,
                      `0 0 12px ${GOLD}33`,
                      `0 0 0px ${GOLD}00`,
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                  }}
                >
                  2026
                </motion.div>
              </div>


              {/* CHART */}
              <div className="relative">

                {/* Grid horizontal */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="border-t border-slate-700 w-full"
                    />
                  ))}
                </div>

                <svg
                  viewBox="0 0 320 140"
                  className="w-full relative z-10"
                >
                  <defs>
                    <linearGradient
                      id="chartGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={GOLD}
                        stopOpacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stopColor={GOLD}
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Área */}
                  <motion.path
                    d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30 L320 140 L0 140Z"
                    fill="url(#chartGrad)"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.5,
                      delay: 1.2,
                    }}
                  />

                  {/* Línea */}
                  <motion.path
                    d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30"
                    fill="none"
                    stroke={GOLD}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    initial={{
                      pathLength: 0,
                      opacity: 0,
                    }}
                    whileInView={{
                      pathLength: 1,
                      opacity: 1,
                    }}
                    viewport={{ once: true }}
                    transition={{
                      pathLength: {
                        duration: 2,
                        delay: 0.5,
                        ease: "easeInOut",
                      },
                      opacity: {
                        duration: 0.3,
                        delay: 0.5,
                      },
                    }}
                  />

                  {/* Puntos */}
                  {[40, 120, 200, 280].map((x, i) => (
                    <motion.circle
                      key={i}
                      cx={x}
                      cy={[100, 70, 40, 20][i]}
                      r="4"
                      fill={GOLD}
                      initial={{
                        scale: 0,
                        opacity: 0,
                      }}
                      whileInView={{
                        scale: 1,
                        opacity: 1,
                      }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.4,
                        delay: 0.9 + i * 0.25,
                        type: "spring",
                      }}
                    />
                  ))}

                  {/* Punto final pulsante */}
                  <motion.circle
                    cx="320"
                    cy="30"
                    r="5"
                    fill={GOLD}
                    animate={{
                      r: [5, 9, 5],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </svg>
              </div>


              {/* MESES */}
              <div className="flex justify-between mt-4">
                {["Ene", "Mar", "May", "Jul", "Sep", "Nov"].map((m, i) => (
                  <motion.span
                    key={m}
                    className="text-xs text-slate-500"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.3,
                      delay: 1 + i * 0.08,
                    }}
                  >
                    {m}
                  </motion.span>
                ))}
              </div>

              {/* ESTADO */}
              <motion.div
                className="flex items-center gap-2 mt-6 text-xs text-slate-400"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: 1.5,
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

                Crecimiento proyectado
              </motion.div>

            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Place Section ─────────────────────────────────────────────────────
