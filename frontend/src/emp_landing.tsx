import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, ShoppingBag, Cpu, BarChart2, Shield, Globe, Zap,
  ChevronRight, Menu, X, ArrowRight, CheckCircle, Users, Package,
  Truck, Wallet, Map, Activity, Star, Linkedin, Twitter, Instagram,
  Facebook, Mail, Phone, MapPin, Award, Target, Handshake, Clock,
  BookOpen, Building2, FileCheck, Heart, Lightbulb, Scale
} from "lucide-react";
import { motion, AnimatePresence, useInView, useMotionValue, useSpring } from "motion/react";

type Page = "home" | "nosotros" | "investment" | "place" | "tech" | "contacto" | "registro";

// ─── Animation primitives ─────────────────────────────────────────────────────
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  useEffect(() => { if (inView) mv.set(value); }, [inView, mv, value]);

  return <span ref={ref}>{display.toLocaleString()}{suffix}</span>;
}

// ─── Brand colours ────────────────────────────────────────────────────────────
const DARK = "#0d1526";
const DARK2 = "#111827";
const GOLD = "#C59B4E";
const ORANGE = "#F97316";

// ─── Nav ──────────────────────────────────────────────────────────────────────
const SERVICE_LINKS: { label: string; id: Page; color: string; desc: string }[] = [
  { label: "GLOINT Investment", id: "investment", color: GOLD, desc: "Gestión estratégica de capital digital" },
  { label: "GLOINT Place", id: "place", color: ORANGE, desc: "E-commerce de productos exclusivos" },
  { label: "GLOINT Tech", id: "tech", color: "#60a5fa", desc: "Tecnología para PyMEs" },
];

function Nav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
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

  const go = (id: Page) => {
    setPage(id);
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
          <button className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: "#cbd5e1" }}>
            Iniciar sesión
          </button>
          <button
            onClick={() => go("registro")}
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
          {(["home", "nosotros"] as Page[]).map((id) => (
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
          <button onClick={() => go("registro")} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold w-full" style={{ background: ORANGE, color: "#fff" }}>
            Crear Cuenta
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Badge pill ────────────────────────────────────────────────────────────────
function Badge({ text, gold }: { text: string; gold?: boolean }) {
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
function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 60%, #0d1a35 100%)` }}
    >
      {/* Abstract decorative lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="100%" stopColor={ORANGE} />
          </linearGradient>
        </defs>
        {[...Array(8)].map((_, i) => (
          <line
            key={i}
            x1={i * 180}
            y1="0"
            x2={i * 180 + 300}
            y2="800"
            stroke="url(#lg1)"
            strokeWidth="1"
          />
        ))}
        <circle cx="900" cy="200" r="180" fill="none" stroke={GOLD} strokeWidth="1" />
        <circle cx="900" cy="200" r="120" fill="none" stroke={ORANGE} strokeWidth="0.5" />
        <polyline
          points="600,400 700,300 820,350 950,250 1050,320"
          fill="none"
          stroke="url(#lg1)"
          strokeWidth="2"
        />
        {[700, 820, 950].map((x, i) => (
          <circle key={i} cx={x} cy={[300, 350, 250][i]} r="4" fill={GOLD} />
        ))}
      </svg>

      {/* Gold glow */}
      <div
        className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Badge text="Ecosistema Empresarial" gold />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-6xl font-black text-white leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Impulsamos el crecimiento empresarial a través de{" "}
          <span style={{ color: GOLD }}>inversión</span>,{" "}
          <span style={{ color: ORANGE }}>comercio digital</span> y tecnología.
        </motion.h1>

        <motion.p
          className="text-slate-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          GLOINT es un grupo empresarial que desarrolla soluciones innovadoras en inversión,
          comercio electrónico y transformación tecnológica. Nuestro objetivo es generar
          oportunidades sostenibles para inversionistas, clientes y empresas que buscan
          crecer en la economía digital.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-white text-base"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
          >
            Conocer nuestras unidades
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-base"
            style={{
              border: `1px solid ${GOLD}`,
              color: GOLD,
              background: "rgba(197,155,78,0.08)",
            }}
          >
            Contactar un asesor
          </motion.button>
        </motion.div>

        {/* Mini stats */}
        <motion.div
          className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          {[
            { n: "+1000", label: "Clientes" },
            { n: "+500", label: "Operaciones" },
            { n: "3", label: "Unidades" },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-black" style={{ color: GOLD }}>{n}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 55 960 0 720 30C480 60 240 10 0 40L0 60Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}

// ─── Quiénes somos ────────────────────────────────────────────────────────────
function QuienesSomos() {
  const indicators = [
    { icon: <Zap size={18} />, label: "Innovación" },
    { icon: <TrendingUp size={18} />, label: "Escalabilidad" },
    { icon: <Cpu size={18} />, label: "Tecnología" },
    { icon: <BarChart2 size={18} />, label: "Crecimiento" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <Badge text="Quiénes Somos" />
          <h2 className="text-3xl md:text-4xl font-black leading-tight mb-6" style={{ color: DARK }}>
            Construimos oportunidades en la{" "}
            <span style={{ color: ORANGE }}>economía digital</span>.
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            En GLOINT combinamos experiencia empresarial, innovación tecnológica y visión
            estratégica para desarrollar negocios escalables que generan valor para nuestros
            clientes, inversionistas y aliados.
          </p>
          <p className="text-slate-600 leading-relaxed mb-10">
            Nuestro ecosistema integra soluciones financieras, comercio electrónico y
            tecnología aplicada para responder a las necesidades de un mercado en constante
            evolución.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {indicators.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "#f8fafc", border: `1px solid #e2e8f0` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})`, color: "#fff" }}
                >
                  {icon}
                </div>
                <span className="font-semibold text-sm" style={{ color: DARK }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visual */}
        <div className="relative">
          <div
            className="rounded-2xl p-8 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full"
              style={{ background: `radial-gradient(circle, ${GOLD}33 0%, transparent 70%)` }}
            />
            <div className="relative z-10">
              <div className="text-xs font-semibold tracking-widest mb-4" style={{ color: GOLD }}>
                GLOINT ECOSYSTEM
              </div>
              {[
                { name: "GLOINT Investment", color: GOLD, icon: <TrendingUp size={16} /> },
                { name: "GLOINT Place", color: ORANGE, icon: <ShoppingBag size={16} /> },
                { name: "GLOINT Tech", color: "#60a5fa", icon: <Cpu size={16} /> },
              ].map(({ name, color, icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-4 mb-4 last:mb-0 p-4 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}22`, color }}
                  >
                    {icon}
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{name}</div>
                    <div className="text-slate-400 text-xs mt-0.5">Unidad estratégica</div>
                  </div>
                  <ChevronRight size={16} className="ml-auto" style={{ color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Unidades de Negocio ──────────────────────────────────────────────────────
function Unidades() {
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
    },
  ];

  return (
    <section className="py-24" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge text="Nuestras Unidades" />
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
            Tres unidades.{" "}
            <span style={{ color: ORANGE }}>Un mismo propósito.</span>
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Creamos soluciones especializadas que impulsan el crecimiento de personas,
            empresas e inversionistas.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((c, i) => (
            <FadeUp key={c.title} delay={i * 0.12}>
            <motion.div
              className="rounded-2xl overflow-hidden flex flex-col h-full"
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
              whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.12)" }}
              transition={{ duration: 0.25 }}
            >
              {/* Card header */}
              <div
                className="p-6 flex items-center gap-4 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
              >
                <div
                  className="absolute right-4 top-4 text-5xl font-black opacity-10 select-none"
                  style={{ color: c.color }}
                >
                  0{i + 1}
                </div>
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.color}22`, color: c.color }}
                >
                  {c.icon}
                </div>
                <div>
                  <div
                    className="text-xs font-semibold tracking-widest uppercase mb-1"
                    style={{ color: c.color }}
                  >
                    {c.tag}
                  </div>
                  <div className="text-white font-bold text-sm leading-tight">{c.title}</div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{c.desc}</p>
                <ul className="space-y-2 flex-1">
                  {c.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: c.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="mt-6 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: c.color, color: c.color === "#60a5fa" ? DARK : "#fff" }}
                >
                  {c.btn} <ArrowRight size={15} />
                </motion.button>
              </div>
            </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Investment Section ────────────────────────────────────────────────
function InvestmentSection() {
  const cards = ["Análisis Estratégico", "Gestión Profesional", "Mercados Digitales", "Crecimiento Escalable"];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${GOLD}18 0%, transparent 70%)` }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Badge text="GLOINT Investment" gold />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              Invertimos en el{" "}
              <span style={{ color: GOLD }}>futuro digital</span>.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-10">
              GLOINT Investment identifica oportunidades estratégicas dentro de la economía
              digital para generar crecimiento sostenible y maximizar el potencial del capital
              administrado.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {cards.map((c) => (
                <div
                  key={c}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(197,155,78,0.08)", border: `1px solid ${GOLD}33` }}
                >
                  <div className="w-2 h-2 rounded-full mb-3" style={{ background: GOLD }} />
                  <div className="text-white font-semibold text-sm">{c}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Fake financial chart */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-xs text-slate-400 tracking-widest">RENDIMIENTO</div>
                <div className="text-2xl font-black text-white mt-1">+34.8%</div>
              </div>
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: "rgba(197,155,78,0.15)", color: GOLD }}
              >
                2026
              </div>
            </div>
            <svg viewBox="0 0 320 140" className="w-full">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30"
                fill="none"
                stroke={GOLD}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M0 120 L40 100 L80 110 L120 70 L160 80 L200 40 L240 50 L280 20 L320 30 L320 140 L0 140Z"
                fill="url(#chartGrad)"
              />
              {[40, 120, 200, 280].map((x, i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={[100, 70, 40, 20][i]}
                  r="4"
                  fill={GOLD}
                />
              ))}
            </svg>
            <div className="flex justify-between mt-4">
              {["Ene", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => (
                <span key={m} className="text-xs text-slate-500">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Place Section ─────────────────────────────────────────────────────
function PlaceSection() {
  const products = [
    { name: "Tecnología Premium", tag: "Exclusivo", emoji: "💻" },
    { name: "Accesorios Lifestyle", tag: "Tendencia", emoji: "🎧" },
    { name: "Wellness & Salud", tag: "Popular", emoji: "🌿" },
    { name: "Hogar Inteligente", tag: "Nuevo", emoji: "🏠" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge text="GLOINT Place" />
          <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
            Productos que marcan{" "}
            <span style={{ color: ORANGE }}>diferencia</span>.
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Seleccionamos productos innovadores y de alta demanda para ofrecer una
            experiencia de compra diferenciada a consumidores que valoran calidad,
            diseño y exclusividad.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {products.map((p, i) => (
            <div
              key={p.name}
              className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1"
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              <div className="text-5xl mb-4">{p.emoji}</div>
              <div
                className="text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: ORANGE }}
              >
                {p.tag}
              </div>
              <div className="font-bold text-sm" style={{ color: DARK }}>{p.name}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {[
            { icon: <Package size={18} />, label: "Productos Exclusivos" },
            { icon: <Shield size={18} />, label: "Compras Seguras" },
            { icon: <Truck size={18} />, label: "Envíos a toda Colombia" },
            { icon: <Star size={18} />, label: "Experiencia Premium" },
          ].map(({ icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium"
              style={{ background: "#fff7ed", border: `1px solid ${ORANGE}33`, color: DARK }}
            >
              <span style={{ color: ORANGE }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── GLOINT Tech Section ──────────────────────────────────────────────────────
function TechSection() {
  const techCards = [
    {
      icon: <Truck size={22} />,
      title: "Seguimiento de Entregas",
      desc: "Monitoreo en tiempo real de operaciones logísticas.",
    },
    {
      icon: <Wallet size={22} />,
      title: "Billetera Empresarial",
      desc: "Automatización de desembolsos a proveedores.",
    },
    {
      icon: <Map size={22} />,
      title: "Planeación Inteligente",
      desc: "Optimización de rutas y recursos.",
    },
    {
      icon: <Activity size={22} />,
      title: "Control Operativo",
      desc: "Trazabilidad completa de procesos.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK2 }}>
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Dashboard mockup */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 text-xs text-slate-500">GLOINT Tech — Dashboard</div>
            </div>
            {/* Fake metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Entregas hoy", val: "142", color: "#60a5fa" },
                { label: "Eficiencia", val: "98.2%", color: GOLD },
                { label: "Rutas activas", val: "34", color: ORANGE },
                { label: "Ahorro ops.", val: "28%", color: "#34d399" },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-lg font-black" style={{ color }}>{val}</div>
                </div>
              ))}
            </div>
            {/* Fake bar chart */}
            <div className="flex items-end gap-2 h-24 mt-4">
              {[60, 80, 50, 90, 70, 95, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md"
                  style={{
                    height: `${h}%`,
                    background: i === 5
                      ? `linear-gradient(180deg, ${GOLD}, ${ORANGE})`
                      : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                <span key={d} className="text-xs text-slate-500 flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>

          <div>
            <Badge text="GLOINT Tech" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              Tecnología para empresas que quieren{" "}
              <span style={{ color: "#60a5fa" }}>crecer</span>.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8">
              Ayudamos a pequeñas y medianas empresas a digitalizar y optimizar sus
              operaciones mediante soluciones tecnológicas diseñadas para mejorar la
              productividad y el control operativo.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {techCards.map((c) => (
                <div
                  key={c.title}
                  className="p-4 rounded-xl"
                  style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}
                  >
                    {c.icon}
                  </div>
                  <div className="text-white font-semibold text-sm mb-1">{c.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Por qué elegir GLOINT ────────────────────────────────────────────────────
function WhyGloint() {
  const reasons = [
    {
      n: "01",
      icon: <Zap size={24} />,
      title: "Dinero en minutos",
      desc: "Recibe tu capital sin demoras. Procesos ágiles pensados para que tu negocio nunca se detenga.",
    },
    {
      n: "02",
      icon: <Globe size={24} />,
      title: "Sin papeleo",
      desc: "Todo es digital y rápido. Olvídate de trámites físicos, firma y gestiona desde cualquier dispositivo.",
    },
    {
      n: "03",
      icon: <Users size={24} />,
      title: "Acompañamiento real",
      desc: "Un equipo especializado te guía en cada paso, desde la solicitud hasta el crecimiento de tu negocio.",
    },
    {
      n: "04",
      icon: <TrendingUp size={24} />,
      title: "Escalabilidad garantizada",
      desc: "Soluciones que crecen contigo. Desde tu primer paquete hasta inversiones millonarias, te acompañamos.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 60%)`,
        }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <FadeUp className="text-center mb-16">
          <Badge text="Nuestra Diferencia" gold />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            ¿Por qué elegir{" "}
            <span style={{ color: ORANGE }}>GLOINT</span>?
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Descubre las razones que nos hacen únicos en el mercado financiero.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map((r, i) => (
            <FadeUp key={r.title} delay={i * 0.1}>
            <motion.div
              className="p-6 rounded-2xl relative overflow-hidden h-full"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              whileHover={{ y: -6, background: "rgba(255,255,255,0.07)" }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="absolute top-4 right-4 text-4xl font-black opacity-10 select-none"
                style={{ color: GOLD }}
              >
                {r.n}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                {r.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{r.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: 1000, prefix: "+", suffix: "", label: "Clientes impactados" },
    { value: 500, prefix: "+", suffix: "", label: "Operaciones gestionadas" },
    { value: 3, prefix: "", suffix: "", label: "Unidades estratégicas" },
    { value: 100, prefix: "", suffix: "%", label: "Compromiso con la innovación" },
  ];

  return (
    <section
      className="py-20 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK2}, #0d1526)` }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(90deg, ${GOLD}08, transparent, ${ORANGE}08)` }} />
      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, prefix, suffix, label }, i) => (
            <FadeUp key={label} delay={i * 0.1}>
              <div
                className="text-4xl md:text-5xl font-black mb-2"
                style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {prefix}<AnimatedCounter value={value} suffix={suffix} />
              </div>
              <div className="text-slate-400 text-sm">{label}</div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Aliados ──────────────────────────────────────────────────────────────────
function Aliados() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Rappi"];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <FadeUp>
          <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Respaldados por</div>
          <h2 className="text-2xl md:text-3xl font-black mb-12" style={{ color: DARK }}>
            Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
          </h2>
        </FadeUp>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
          {partners.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ scale: 1.06, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              className="h-16 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#94a3b8" }}
            >
              {p}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${DARK} 0%, #162040 50%, #1a1000 100%)`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 60% 50%, ${GOLD}22 0%, transparent 60%)`,
        }}
      />
      {/* Gold line accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />

      <FadeUp className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">
          Conoce cómo GLOINT puede impulsar tu{" "}
          <span style={{ color: GOLD }}>crecimiento</span>.
        </h2>
        <p className="text-slate-300 text-lg mb-10">
          Descubre nuestras soluciones en inversión, comercio digital y tecnología empresarial.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-white text-base"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
          >
            Hablar con un asesor
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="px-8 py-4 rounded-xl font-bold text-base"
            style={{
              border: `1px solid rgba(255,255,255,0.2)`,
              color: "#fff",
              background: "rgba(255,255,255,0.06)",
            }}
          >
            Explorar unidades de negocio
          </motion.button>
        </div>
      </FadeUp>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
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
              {[Linkedin, Twitter, Instagram, Facebook].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                >
                  <Icon size={16} />
                </a>
              ))}
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
                +57 320 957 3995
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

function NosotrosAcerca({ setPage }: { setPage: (p: Page) => void }) {
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
              <span className="font-semibold" style={{ color: ORANGE }}>más de 30 años de experiencia</span>{" "}
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
                  Certificado en la Superintendencia de Sociedades de Colombia.
                  Empresa legalmente constituida y operativa bajo normativa vigente.
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
                { icon: <Award size={20} />, value: "+10", label: "Años de experiencia del equipo fundador" },
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

function NosotrosComoTrabajamos() {
  const pasos = [
    {
      n: "01",
      icon: <Lightbulb size={24} />,
      title: "Identificamos oportunidades",
      desc: "Analizamos el mercado digital para detectar sectores con alto potencial de crecimiento y retorno sostenible.",
    },
    {
      n: "02",
      icon: <Target size={24} />,
      title: "Diseñamos estrategias",
      desc: "Construimos planes de acción personalizados que conectan inversión, tecnología y comercio para cada cliente.",
    },
    {
      n: "03",
      icon: <Handshake size={24} />,
      title: "Ejecutamos con aliados",
      desc: "Nos apoyamos en una red de socios estratégicos para garantizar resultados reales y medibles en cada proyecto.",
    },
    {
      n: "04",
      icon: <TrendingUp size={24} />,
      title: "Escalamos juntos",
      desc: "Acompañamos a nuestros clientes en cada etapa del crecimiento, ajustando las soluciones conforme evolucionan.",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: DARK }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${GOLD}12 0%, transparent 55%)` }}
      />
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
            Nuestra propuesta
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Conoce cómo{" "}
            <span style={{ color: ORANGE }}>trabajamos</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Un proceso claro y orientado a resultados que nos permite generar valor
            real para cada emprendedor, inversionista y empresa que confía en GLOINT.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {pasos.map((p) => (
            <div
              key={p.n}
              className="p-6 rounded-2xl relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="absolute top-4 right-4 text-4xl font-black opacity-10 select-none"
                style={{ color: GOLD }}
              >
                {p.n}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${GOLD}18`, color: GOLD }}
              >
                {p.icon}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NosotrosMisionVision() {
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
              Impulsar el crecimiento de emprendedores, empresas e inversionistas mediante
              soluciones innovadoras en inversión, comercio electrónico y tecnología,
              generando oportunidades sostenibles en la economía digital latinoamericana.
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
              Ser el ecosistema empresarial de referencia en Latinoamérica, reconocido
              por conectar talento, capital y tecnología para crear negocios escalables
              que transformen la vida de miles de emprendedores.
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

function NosotrosEcosistema() {
  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "#f8fafc" }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>
            Nuestro ecosistema
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-4" style={{ color: DARK }}>
            Tres unidades. <span style={{ color: ORANGE }}>Un mismo propósito.</span>
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto text-sm">
            Cada unidad nació para resolver un desafío específico de la economía digital,
            y juntas forman un ecosistema integrado de crecimiento.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <TrendingUp size={26} />,
              color: GOLD,
              name: "GLOINT Investment",
              role: "Gestión de capital",
              desc: "Identificamos y administramos oportunidades de inversión en mercados digitales de alto potencial, maximizando el retorno para nuestros inversionistas.",
              items: ["Portafolios digitales", "Cashback logístico", "Acciones comercializables"],
            },
            {
              icon: <ShoppingBag size={26} />,
              color: ORANGE,
              name: "GLOINT Place",
              role: "Comercio electrónico",
              desc: "Plataforma de e-commerce con productos exclusivos, compras seguras y cobertura de envíos en toda Colombia con trazabilidad completa.",
              items: ["Productos de tendencia", "Envíos nacionales", "Experiencia premium"],
            },
            {
              icon: <Cpu size={26} />,
              color: "#60a5fa",
              name: "GLOINT Tech",
              role: "Tecnología empresarial",
              desc: "Herramientas tecnológicas para digitalizar y optimizar operaciones logísticas en PyMEs, reduciendo costos y aumentando la productividad.",
              items: ["Seguimiento logístico", "Billetera empresarial", "Optimización de rutas"],
            },
          ].map((u) => (
            <div
              key={u.name}
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
            >
              <div
                className="p-6 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}
              >
                <div
                  className="absolute right-4 top-4 w-12 h-12 rounded-full opacity-20"
                  style={{ background: u.color }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${u.color}22`, color: u.color }}
                >
                  {u.icon}
                </div>
                <div className="text-white font-black text-base">{u.name}</div>
                <div className="text-xs font-semibold mt-1" style={{ color: u.color }}>{u.role}</div>
              </div>
              <div className="p-6">
                <p className="text-slate-500 text-sm leading-relaxed mb-5">{u.desc}</p>
                <ul className="space-y-2">
                  {u.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm" style={{ color: DARK }}>
                      <CheckCircle size={14} style={{ color: u.color }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NosotrosAliados() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Rappi"];
  return (
    <section className="py-20" style={{ background: DARK }}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>
          Respaldados por
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-12">
          Aliados <span style={{ color: ORANGE }}>Estratégicos</span>
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {partners.map((p) => (
            <div
              key={p}
              className="h-16 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NosotrosCTA() {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 50%, #1a1000 100%)` }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 60% 50%, ${GOLD}22 0%, transparent 60%)` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
      />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">
          Sé parte del <span style={{ color: GOLD }}>ecosistema GLOINT</span>.
        </h2>
        <p className="text-slate-300 mb-10 leading-relaxed">
          Únete a más de 1.000 clientes que ya confían en GLOINT para crecer en
          la economía digital. Nuestros asesores están listos para acompañarte.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            className="px-8 py-4 rounded-xl font-bold text-white text-base transition-all hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
          >
            Hablar con un asesor
          </button>
          <button
            className="px-8 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}
          >
            Conocer nuestros servicios
          </button>
        </div>
      </div>
    </section>
  );
}

function NosotrosFooter({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer style={{ background: "#080e1b" }} className="pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div
              className="text-2xl font-black tracking-widest mb-4"
              style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              GLOINT
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Ecosistema empresarial de inversión, comercio digital y tecnología.
            </p>
            <div className="flex gap-3">
              {[Linkedin, Twitter, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2">
              {[{ l: "Inicio", p: "home" as Page }, { l: "Nosotros", p: "nosotros" as Page }].map(({ l, p }) => (
                <li key={l}>
                  <button onClick={() => { setPage(p); window.scrollTo({ top: 0 }); }} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button>
                </li>
              ))}
              {["Servicios", "Contacto"].map((l) => (
                <li key={l}><a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Servicios</h4>
            <ul className="space-y-2">
              {([["GLOINT Investment", "investment"], ["GLOINT Place", "place"], ["GLOINT Tech", "tech"]] as [string, Page][]).map(([l, p]) => (
                <li key={l}><button onClick={() => { setPage(p); window.scrollTo({ top: 0 }); }} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Política de privacidad", "Términos y condiciones"].map((l) => (
                <li key={l}><a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Mail size={13} style={{ color: GOLD }} /> contacto@gloint.com</div>
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Phone size={13} style={{ color: GOLD }} /> +57 320 957 3995</div>
              <div className="flex items-center gap-2 text-slate-500 text-xs"><MapPin size={13} style={{ color: GOLD }} /> Colombia</div>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-slate-600 text-xs">© GLOINT 2026. Todos los derechos reservados.</p>
          <p className="text-slate-600 text-xs">Hecho con visión estratégica.</p>
        </div>
      </div>
    </footer>
  );
}

function NosotrosPage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <>
      <NosotrosAcerca setPage={setPage} />
      <NosotrosComoTrabajamos />
      <NosotrosMisionVision />
      <NosotrosEcosistema />
      <NosotrosAliados />
      <NosotrosCTA />
      <NosotrosFooter setPage={setPage} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED FOOTER (used by all service pages)
// ══════════════════════════════════════════════════════════════════════════════
function SharedFooter({ setPage }: { setPage: (p: Page) => void }) {
  const go = (p: Page) => { setPage(p); window.scrollTo({ top: 0 }); };
  return (
    <footer style={{ background: "#080e1b" }} className="pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="text-2xl font-black tracking-widest mb-4" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              GLOINT
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">Ecosistema empresarial de inversión, comercio digital y tecnología.</p>
            <div className="flex gap-3">
              {[Linkedin, Twitter, Instagram, Facebook].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}><Icon size={16} /></a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2">
              {([["Inicio", "home"], ["Nosotros", "nosotros"]] as [string, Page][]).map(([l, p]) => (
                <li key={l}><button onClick={() => go(p)} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
              <li><a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Servicios</h4>
            <ul className="space-y-2">
              {([["GLOINT Investment", "investment"], ["GLOINT Place", "place"], ["GLOINT Tech", "tech"]] as [string, Page][]).map(([l, p]) => (
                <li key={l}><button onClick={() => go(p)} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {["Política de privacidad", "Términos y condiciones"].map((l) => (
                <li key={l}><a href="#" className="text-slate-500 text-sm hover:text-white transition-colors">{l}</a></li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Mail size={13} style={{ color: GOLD }} /> contacto@gloint.com</div>
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Phone size={13} style={{ color: GOLD }} /> +57 320 957 3995</div>
              <div className="flex items-center gap-2 text-slate-500 text-xs"><MapPin size={13} style={{ color: GOLD }} /> Colombia</div>
            </div>
          </div>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-slate-600 text-xs">© GLOINT 2026. Todos los derechos reservados.</p>
          <p className="text-slate-600 text-xs">Hecho con visión estratégica.</p>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOINT INVESTMENT PAGE
// ══════════════════════════════════════════════════════════════════════════════
function InvestmentPage({ setPage }: { setPage: (p: Page) => void }) {
  const plans = [
    { name: "Básico", emoji: "🥉", range: "25 a 50 /mes", cashback: "$200", color: "#94a3b8" },
    { name: "Plata", emoji: "🥈", range: "51 a 100 /mes", cashback: "$500", color: "#cbd5e1" },
    { name: "Oro", emoji: "🥇", range: "101 a 300 /mes", cashback: "$800", color: GOLD },
    { name: "Elite", emoji: "👑", range: "301 en adelante", cashback: "$1.100", color: ORANGE, top: true },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}>
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice">
            <defs><linearGradient id="ig1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={GOLD} /><stop offset="100%" stopColor={ORANGE} /></linearGradient></defs>
            {[...Array(7)].map((_, i) => <line key={i} x1={i * 200} y1="0" x2={i * 200 + 250} y2="500" stroke="url(#ig1)" strokeWidth="1" />)}
            <circle cx="950" cy="180" r="200" fill="none" stroke={GOLD} strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}20 0%, transparent 70%)` }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${GOLD}`, color: GOLD, background: `${GOLD}10` }}>
            <TrendingUp size={13} /> GLOINT Investment
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Invertimos en el{" "}<span style={{ color: GOLD }}>futuro digital</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Unidad especializada en la gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}>
              Comenzar a invertir
            </button>
            <button className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: `1px solid ${GOLD}`, color: GOLD, background: `${GOLD}10` }}>
              Ver planes de cashback
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" fill="none"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#f8fafc" /></svg></div>
      </section>

      {/* Qué es */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Sobre la unidad</div>
              <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: DARK }}>
                Capital que trabaja para <span style={{ color: GOLD }}>ti</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                El <span className="font-semibold" style={{ color: DARK }}>Cashback Logístico GLOINT</span> es un modelo de retorno financiero diseñado para premiar a los comerciantes que realizan envíos y ventas constantes mediante plataformas logísticas aliadas.
              </p>
              <p className="text-slate-600 leading-relaxed mb-8">
                Cada operación completada te devuelve un porcentaje en forma de <span className="font-semibold" style={{ color: ORANGE }}>bonificación y cashback</span> que puede ser redimido o usado como saldo para nuevas inversiones dentro del ecosistema GLOINT.
              </p>
              <div className="flex items-start gap-3 p-4 rounded-xl mb-3" style={{ background: `${GOLD}10`, border: `1px solid ${GOLD}30` }}>
                <TrendingUp size={18} className="flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                <p className="text-sm font-semibold" style={{ color: DARK }}>
                  💡 En pocas palabras: cada venta genera liquidez y cada operación devuelve dinero.
                </p>
              </div>
            </div>
            {/* Chart */}
            <div className="rounded-2xl p-6" style={{ background: DARK, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-slate-400 tracking-widest">RENDIMIENTO ACUMULADO</div>
                  <div className="text-2xl font-black text-white mt-1">+34.8% <span className="text-sm font-normal text-green-400">↑</span></div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${GOLD}18`, color: GOLD }}>2026</div>
              </div>
              <svg viewBox="0 0 300 120" className="w-full">
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 100 L37 85 L75 88 L112 60 L150 68 L187 38 L225 44 L262 20 L300 26" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M0 100 L37 85 L75 88 L112 60 L150 68 L187 38 L225 44 L262 20 L300 26 L300 120 L0 120Z" fill="url(#invGrad)" />
                {[37, 112, 187, 262].map((x, i) => <circle key={i} cx={x} cy={[85, 60, 38, 20][i]} r="4" fill={GOLD} />)}
              </svg>
              <div className="flex justify-between mt-2">
                {["Ene", "Mar", "May", "Jul", "Sep", "Nov"].map((m) => <span key={m} className="text-xs text-slate-600">{m}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Beneficios</div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              ¿Por qué invertir con <span style={{ color: GOLD }}>GLOINT</span>?
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: <Zap size={22} />, title: "Retorno inmediato", desc: "Cashback aplicado automáticamente en cada entrega exitosa sin demoras." },
              { icon: <Shield size={22} />, title: "Capital protegido", desc: "Operamos con plataformas logísticas certificadas y aliadas estratégicas." },
              { icon: <TrendingUp size={22} />, title: "Crecimiento escalable", desc: "Cuanto más operas, más ganas. El sistema premia la consistencia." },
              { icon: <Users size={22} />, title: "Asesoría personalizada", desc: "Un experto de GLOINT te acompaña para maximizar tu portafolio." },
            ].map((c, i) => (
              <FadeUp key={c.title} delay={i * 0.1}>
                <motion.div className="p-5 rounded-2xl h-full" style={{ background: `${GOLD}0A`, border: `1px solid ${GOLD}25` }} whileHover={{ y: -4, background: `${GOLD}14` }} transition={{ duration: 0.2 }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${GOLD}18`, color: GOLD }}>{c.icon}</div>
                  <div className="text-white font-bold text-sm mb-1">{c.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{c.desc}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Esquema de bonificación */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Planes</div>
            <h2 className="text-2xl md:text-3xl font-black mb-3" style={{ color: DARK }}>
              🔥 Esquema de Bonificación de{" "}
              <span style={{ color: GOLD }}>Entregas Exitosas</span>
            </h2>
            <p className="text-slate-500 text-sm">Beneficios según tu volumen mensual de envíos</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p, i) => (
              <FadeUp key={p.name} delay={i * 0.1}>
                <motion.div
                  className="rounded-2xl p-6 text-center relative h-full"
                  style={{ background: "#fff", border: `2px solid ${p.color}30`, boxShadow: p.top ? `0 8px 30px ${ORANGE}20` : "0 2px 12px rgba(0,0,0,0.06)" }}
                  whileHover={{ y: -6, boxShadow: `0 16px 40px ${p.color}25` }}
                  transition={{ duration: 0.25 }}
                >
                  {p.top && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold" style={{ background: ORANGE, color: "#fff" }}>TOP</div>
                  )}
                  <div className="text-3xl mb-2">{p.emoji}</div>
                  <div className="font-black text-base mb-1" style={{ color: p.color }}>{p.name}</div>
                  <div className="text-slate-400 text-xs mb-4">{p.range} entregas/mes</div>
                  <div className="text-4xl font-black mb-1" style={{ color: p.color }}>{p.cashback}</div>
                  <div className="text-slate-400 text-xs">Cashback mensual</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-20" style={{ background: DARK2 }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: GOLD }}>Proceso</div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Cómo <span style={{ color: GOLD }}>funciona</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", title: "Regístrate", desc: "Crea tu cuenta en GLOINT y accede al panel de inversionista en minutos, sin papeleo." },
              { n: "02", title: "Opera con aliados", desc: "Realiza envíos a través de plataformas logísticas aliadas a GLOINT para acumular cashback." },
              { n: "03", title: "Cobra tu retorno", desc: "Recibe tu bonificación mensual automáticamente según tu volumen de entregas exitosas." },
            ].map((s) => (
              <div key={s.n} className="p-6 rounded-2xl relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="absolute top-4 right-4 text-5xl font-black opacity-10 select-none" style={{ color: GOLD }}>{s.n}</div>
                <div className="text-white font-bold text-base mb-2">{s.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a1000 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 60% 50%, ${GOLD}22 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Empieza a generar <span style={{ color: GOLD }}>retornos hoy</span>.
          </h2>
          <p className="text-slate-300 mb-10">Únete al programa de inversión logística de GLOINT y haz que cada entrega cuente.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}>Comenzar ahora</button>
            <button onClick={() => { setPage("nosotros"); window.scrollTo({ top: 0 }); }} className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}>Conocer más sobre GLOINT</button>
          </div>
        </div>
      </section>

      <SharedFooter setPage={setPage} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOINT PLACE PAGE
// ══════════════════════════════════════════════════════════════════════════════
function PlacePage({ setPage }: { setPage: (p: Page) => void }) {
  const categories = [
    { emoji: "💻", name: "Tecnología Premium", tag: "Exclusivo", tagColor: "#3b82f6" },
    { emoji: "🎧", name: "Accesorios Lifestyle", tag: "Tendencia", tagColor: ORANGE },
    { emoji: "🌿", name: "Wellness & Salud", tag: "Popular", tagColor: "#10b981" },
    { emoji: "🏠", name: "Hogar Inteligente", tag: "Nuevo", tagColor: GOLD },
    { emoji: "👟", name: "Moda & Calzado", tag: "Exclusivo", tagColor: "#8b5cf6" },
    { emoji: "🧴", name: "Belleza & Cuidado", tag: "Tendencia", tagColor: "#ec4899" },
    { emoji: "🎮", name: "Gaming & Tech", tag: "Popular", tagColor: "#3b82f6" },
    { emoji: "🍳", name: "Cocina & Hogar", tag: "Nuevo", tagColor: "#f59e0b" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}>
        <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ORANGE}18 0%, transparent 70%)` }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}10` }}>
            <ShoppingBag size={13} /> GLOINT Place
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Productos que marcan <span style={{ color: ORANGE }}>diferencia</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Plataforma de comercio electrónico enfocada en productos innovadores, diferenciadores y de tendencia, con cobertura de envíos a nivel nacional.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>
              Ver catálogo
            </button>
            <button className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: `1px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}10` }}>
              Registrarme como vendedor
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" fill="none"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#ffffff" /></svg></div>
      </section>

      {/* Por qué Place */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>¿Por qué elegirnos?</div>
              <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: DARK }}>
                La experiencia de compra que <span style={{ color: ORANGE }}>mereces</span>
              </h2>
              <p className="text-slate-600 leading-relaxed mb-8">
                Seleccionamos productos innovadores y de alta demanda para ofrecer una experiencia de compra diferenciada a consumidores que valoran calidad, diseño y exclusividad. Trabajamos con proveedores certificados para garantizar autenticidad en cada pedido.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <Package size={18} />, label: "Productos exclusivos", desc: "Catálogo curado de alta demanda" },
                  { icon: <Shield size={18} />, label: "Compras seguras", desc: "Pago cifrado y verificado" },
                  { icon: <Truck size={18} />, label: "Envíos nacionales", desc: "Cobertura en toda Colombia" },
                  { icon: <Star size={18} />, label: "Calidad garantizada", desc: "Proveedores certificados" },
                ].map(({ icon, label, desc }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${ORANGE}12`, color: ORANGE }}>{icon}</div>
                    <div className="font-bold text-xs mb-0.5" style={{ color: DARK }}>{label}</div>
                    <div className="text-slate-400 text-xs">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ background: DARK, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="p-4 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="ml-3 flex-1 h-5 rounded-md bg-white/5 flex items-center px-2">
                  <span className="text-xs text-slate-500">place.gloint.com</span>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {categories.slice(0, 4).map((c) => (
                    <div key={c.name} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="text-3xl mb-1">{c.emoji}</div>
                      <div className="text-xs font-bold mb-0.5" style={{ color: c.tagColor }}>{c.tag}</div>
                      <div className="text-white text-xs font-semibold leading-tight">{c.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }}>
                  <span className="text-sm font-bold" style={{ color: ORANGE }}>Envío gratis</span>
                  <span className="text-xs text-slate-400">En pedidos +$50.000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Catálogo</div>
            <h2 className="text-2xl md:text-3xl font-black" style={{ color: DARK }}>
              Nuestras <span style={{ color: ORANGE }}>categorías</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c) => (
              <div key={c.name} className="rounded-2xl p-5 text-center transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <div className="text-4xl mb-2">{c.emoji}</div>
                <div className="text-xs font-bold mb-1" style={{ color: c.tagColor }}>{c.tag}</div>
                <div className="font-semibold text-sm" style={{ color: DARK }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo comprar */}
      <section className="py-20" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Proceso</div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Cómo <span style={{ color: ORANGE }}>comprar</span></h2>
          </div>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { n: "01", title: "Elige tu producto", desc: "Navega nuestro catálogo curado y encuentra lo que necesitas." },
              { n: "02", title: "Pago seguro", desc: "Paga con tus métodos favoritos: PSE, tarjeta o Wompi." },
              { n: "03", title: "Confirmación", desc: "Recibes la confirmación de pedido y número de seguimiento." },
              { n: "04", title: "Entrega express", desc: "Tu pedido llega a cualquier ciudad de Colombia con trazabilidad." },
            ].map((s) => (
              <div key={s.n} className="p-5 rounded-2xl relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="absolute top-3 right-3 text-4xl font-black opacity-10 select-none" style={{ color: ORANGE }}>{s.n}</div>
                <div className="font-bold text-white text-sm mb-2">{s.title}</div>
                <div className="text-slate-400 text-xs leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a0d00 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 50%, ${ORANGE}18 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            Descubre productos que <span style={{ color: ORANGE }}>marcan tendencia</span>.
          </h2>
          <p className="text-slate-300 mb-10">Únete a miles de compradores que eligen GLOINT Place por su calidad, variedad y servicio.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>Explorar catálogo</button>
            <button onClick={() => { setPage("investment"); window.scrollTo({ top: 0 }); }} className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}>Ver GLOINT Investment</button>
          </div>
        </div>
      </section>

      <SharedFooter setPage={setPage} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GLOINT TECH PAGE
// ══════════════════════════════════════════════════════════════════════════════
function TechPage({ setPage }: { setPage: (p: Page) => void }) {
  const BLUE = "#60a5fa";

  const services = [
    { icon: <Globe size={22} />, title: "Desarrollo Web a la Medida", desc: "Creamos sitios web, portales corporativos y plataformas digitales completamente personalizadas para tu negocio, desde el diseño hasta el despliegue.", color: BLUE },
    { icon: <ShoppingBag size={22} />, title: "E-Commerce Personalizado", desc: "Desarrollamos tiendas en línea con experiencias de compra únicas, integración de pagos, gestión de inventario y paneles de administración a tu medida.", color: ORANGE },
    { icon: <Cpu size={22} />, title: "Aplicaciones Empresariales", desc: "Sistemas de gestión, CRMs, ERPs y herramientas internas que automatizan los procesos clave de tu empresa y mejoran la productividad de tu equipo.", color: GOLD },
    { icon: <Activity size={22} />, title: "Integraciones y APIs", desc: "Conectamos tus sistemas existentes con nuevas plataformas mediante integraciones robustas y APIs personalizadas, eliminando silos de información.", color: "#34d399" },
    { icon: <Zap size={22} />, title: "Automatización de Procesos", desc: "Identificamos flujos repetitivos en tu operación y los automatizamos con tecnología, liberando tiempo y reduciendo errores humanos.", color: "#a78bfa" },
    { icon: <Shield size={22} />, title: "Consultoría Tecnológica", desc: "Te acompañamos desde el diagnóstico hasta la implementación: definimos la arquitectura correcta y las herramientas más adecuadas para tu proyecto.", color: "#fb7185" },
  ];

  const steps = [
    { n: "01", title: "Reunión de Discovery", desc: "Entendemos tu negocio, tus objetivos y los retos que quieres resolver con tecnología. Sin compromisos, sin tecnicismos." },
    { n: "02", title: "Propuesta a la Medida", desc: "Diseñamos una solución técnica personalizada con alcance claro, tecnologías definidas y tiempos de entrega realistas." },
    { n: "03", title: "Desarrollo Iterativo", desc: "Construimos en ciclos cortos con entregas parciales para que veas el avance y puedas dar feedback en cada etapa." },
    { n: "04", title: "Entrega y Soporte", desc: "Desplegamos la solución, capacitamos a tu equipo y te acompañamos en el período de estabilización post-lanzamiento." },
  ];

  const techs = ["React", "Next.js", "Node.js", "Python", "PostgreSQL", "MongoDB", "AWS", "Firebase", "Docker", "Stripe", "Figma", "TypeScript"];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-36 pb-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0d1e3a 100%)` }}>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${BLUE}15 0%, transparent 70%)` }} />
        <div className="absolute bottom-1/3 left-1/4 w-60 h-60 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)` }} />
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${BLUE}`, color: BLUE, background: `${BLUE}10` }}>
            <Cpu size={13} /> GLOINT Tech
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
            Desarrollos digitales <span style={{ color: BLUE }}>a la medida</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Construimos soluciones tecnológicas personalizadas: desde aplicaciones web y e-commerce hasta sistemas empresariales complejos, siempre adaptados exactamente a lo que tu negocio necesita.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { setPage("contacto"); window.scrollTo({ top: 0 }); }}
              className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(90deg, ${BLUE}, #3b82f6)` }}
            >
              Solicitar propuesta
            </button>
            <button className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: `1px solid ${BLUE}`, color: BLUE, background: `${BLUE}10` }}>
              Ver nuestro proceso
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 50" fill="none"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#f8fafc" /></svg>
        </div>
      </section>

      {/* Qué hacemos */}
      <section className="py-24" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Servicios</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
              ¿Qué <span style={{ color: BLUE }}>desarrollamos</span>?
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              Cada proyecto es único. Trabajamos contigo para entender tu visión y traducirla en una solución digital que realmente funcione.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <FadeUp key={s.title} delay={i * 0.08}>
                <motion.div
                  className="p-6 rounded-2xl bg-white h-full"
                  style={{ border: "1px solid #e2e8f0" }}
                  whileHover={{ y: -6, boxShadow: `0 12px 32px ${s.color}15` }}
                  transition={{ duration: 0.22 }}
                >
                  <motion.div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${s.color}15`, color: s.color }}
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {s.icon}
                  </motion.div>
                  <h3 className="font-bold text-sm mb-2" style={{ color: DARK }}>{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Por qué a la medida */}
      <section className="py-24" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Nuestra diferencia</div>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                Sin plantillas. Sin atajos. Solo <span style={{ color: BLUE }}>soluciones reales</span>.
              </h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                No usamos temas genéricos ni soluciones prefabricadas. Cada línea de código que escribimos responde a un requerimiento concreto de tu negocio. Eso garantiza que el resultado sea exactamente lo que necesitas, ni más ni menos.
              </p>
              <p className="text-slate-400 leading-relaxed mb-10">
                Trabajamos con metodologías ágiles, comunicación directa y entregas iterativas para que siempre tengas visibilidad del avance y puedas ajustar el rumbo cuando lo necesites.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Código limpio", desc: "Mantenible y escalable" },
                  { label: "Ágil", desc: "Entregas parciales frecuentes" },
                  { label: "Transparente", desc: "Comunicación directa" },
                  { label: "Escalable", desc: "Crece con tu negocio" },
                ].map(({ label, desc }) => (
                  <div key={label} className="p-4 rounded-xl" style={{ background: `${BLUE}0A`, border: `1px solid ${BLUE}20` }}>
                    <div className="w-2 h-2 rounded-full mb-2" style={{ background: BLUE }} />
                    <div className="text-white font-bold text-sm">{label}</div>
                    <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-slate-500">gloint-tech / proyecto-cliente.ts</span>
              </div>
              <div className="p-5 font-mono text-xs leading-relaxed">
                <div><span style={{ color: "#ff79c6" }}>const</span> <span style={{ color: "#50fa7b" }}>proyecto</span> <span style={{ color: "#f8f8f2" }}>= {"{"}</span></div>
                <div className="ml-4"><span style={{ color: "#8be9fd" }}>cliente</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Tu empresa"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                <div className="ml-4"><span style={{ color: "#8be9fd" }}>tipo</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Desarrollo a la medida"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                <div className="ml-4"><span style={{ color: "#8be9fd" }}>stack</span><span style={{ color: "#f8f8f2" }}>: [</span><span style={{ color: "#f1fa8c" }}>"React"</span><span style={{ color: "#f8f8f2" }}>, </span><span style={{ color: "#f1fa8c" }}>"Node.js"</span><span style={{ color: "#f8f8f2" }}>, </span><span style={{ color: "#f1fa8c" }}>"PostgreSQL"</span><span style={{ color: "#f8f8f2" }}>],</span></div>
                <div className="ml-4"><span style={{ color: "#8be9fd" }}>entrega</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Iterativa"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                <div className="ml-4"><span style={{ color: "#8be9fd" }}>soporte</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#50fa7b" }}>true</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                <div><span style={{ color: "#f8f8f2" }}>{"}"}</span></div>
                <div className="mt-3"><span style={{ color: "#6272a4" }}>// Listo para escalar 🚀</span></div>
                <div className="mt-1"><span style={{ color: "#ff79c6" }}>export default</span> <span style={{ color: "#50fa7b" }}>proyecto</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proceso */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Metodología</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
              Nuestro <span style={{ color: BLUE }}>proceso</span> de trabajo
            </h2>
            <p className="text-slate-500 max-w-lg mx-auto text-sm">
              Un flujo claro y colaborativo para que tu proyecto llegue a buen puerto, siempre.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, idx) => (
              <div key={s.n} className="relative">
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px -translate-y-0 z-0" style={{ background: `linear-gradient(90deg, ${BLUE}50, transparent)` }} />
                )}
                <div className="p-6 rounded-2xl relative z-10" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg mb-4"
                    style={{ background: `linear-gradient(135deg, ${BLUE}, #3b82f6)`, color: "#fff" }}
                  >
                    {s.n}
                  </div>
                  <h3 className="font-bold text-sm mb-2" style={{ color: DARK }}>{s.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack tecnológico */}
      <section className="py-16" style={{ background: DARK2 }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Tecnologías</div>
          <h2 className="text-xl font-black text-white mb-8">
            Trabajamos con el <span style={{ color: BLUE }}>mejor stack</span> del mercado
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {techs.map((t) => (
              <span
                key={t}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: `${BLUE}0F`, border: `1px solid ${BLUE}25`, color: "#94a3b8" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="py-16" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { n: "+50", label: "Proyectos entregados" },
              { n: "100%", label: "Código a la medida" },
              { n: "0", label: "Plantillas genéricas" },
              { n: "24/7", label: "Soporte post-lanzamiento" },
            ].map(({ n, label }) => (
              <div key={label}>
                <div
                  className="text-3xl md:text-4xl font-black mb-2"
                  style={{ background: `linear-gradient(90deg, ${BLUE}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  {n}
                </div>
                <div className="text-slate-400 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0a1628 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 50%, ${BLUE}15 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            ¿Tienes un proyecto en <span style={{ color: BLUE }}>mente</span>?
          </h2>
          <p className="text-slate-300 mb-10 leading-relaxed">
            Cuéntanos qué necesitas construir. Te respondemos con una propuesta técnica sin compromisos, pensada exclusivamente para tu negocio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { setPage("contacto"); window.scrollTo({ top: 0 }); }}
              className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(90deg, ${BLUE}, #3b82f6)` }}
            >
              Solicitar propuesta
            </button>
            <button
              onClick={() => { setPage("nosotros"); window.scrollTo({ top: 0 }); }}
              className="px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}
            >
              Conocer más sobre GLOINT
            </button>
          </div>
        </div>
      </section>

      <SharedFooter setPage={setPage} />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// CONTACTO PAGE
// ══════════════════════════════════════════════════════════════════════════════
function ContactoPage({ setPage }: { setPage: (p: Page) => void }) {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", asunto: "", mensaje: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      {/* Hero — warm white with orange glow, matching the image */}
      <section className="relative pt-32 pb-20 overflow-hidden" style={{ background: "#fff" }}>
        {/* Warm glow top-center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${ORANGE}18 0%, transparent 65%)` }}
        />
        <div
          className="absolute top-0 right-0 w-[400px] h-[300px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${GOLD}12 0%, transparent 70%)` }}
        />

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          {/* Title */}
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl md:text-5xl font-black mb-4" style={{ color: ORANGE }}>
              Contáctanos
            </h1>
            <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
              Estamos aquí para ayudarte a potencializar tu negocio.{" "}
              <span className="font-semibold" style={{ color: DARK }}>Conocemos y construimos juntos tu éxito.</span>
            </p>
          </motion.div>

          {/* Two-column layout */}
          <div className="grid md:grid-cols-2 gap-10 items-start">

            {/* Left — company info */}
            <FadeUp delay={0.1}><div className="flex flex-col gap-5">
              {/* Company card */}
              <div
                className="rounded-2xl p-6"
                style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${GOLD}, ${ORANGE})` }}
                  >
                    <span className="text-white font-black text-sm">G</span>
                  </div>
                  <div>
                    <div className="font-black text-sm leading-tight" style={{ color: DARK }}>
                      GLOINT INTERNATIONAL PARTNERS SAS
                    </div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">NIT: 901524385-5</div>
                    <div className="text-xs text-slate-400 mt-0.5">Bogotá, Colombia</div>
                  </div>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Potencializamos negocios a través de conexiones estratégicas, financiamiento inteligente y soluciones innovadoras.
                </p>
              </div>

              {/* Ubicación */}
              <div
                className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${ORANGE}12`, color: ORANGE }}
                >
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: DARK }}>Ubicación</div>
                  <div className="text-slate-500 text-sm">Calle 13 No. 14-21 oficina 20</div>
                  <div className="text-slate-500 text-sm">Bogotá, Colombia</div>
                </div>
              </div>

              {/* WhatsApp */}
              <div
                className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#dcfce7", color: "#16a34a" }}
                >
                  {/* WhatsApp icon via SVG */}
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#16a34a">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: DARK }}>WhatsApp</div>
                  <a
                    href="https://wa.me/573242040657"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold transition-colors hover:opacity-80"
                    style={{ color: "#16a34a" }}
                  >
                    +57 324 204 657
                  </a>
                </div>
              </div>

              {/* Email */}
              <div
                className="rounded-2xl p-5 flex items-start gap-4"
                style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${GOLD}12`, color: GOLD }}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: DARK }}>Correo</div>
                  <a href="mailto:contacto@gloint.com" className="text-sm font-semibold" style={{ color: GOLD }}>
                    contacto@gloint.com
                  </a>
                </div>
              </div>

              {/* Redes */}
              <div className="flex gap-3 pt-1">
                {[
                  { Icon: Linkedin, color: "#0077b5" },
                  { Icon: Instagram, color: "#e1306c" },
                  { Icon: Facebook, color: "#1877f2" },
                  { Icon: Twitter, color: "#1da1f2" },
                ].map(({ Icon, color }, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                    style={{ background: `${color}12`, color }}
                  >
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div></FadeUp>

            {/* Right — form */}
            <FadeUp delay={0.2}>
            <div
              className="rounded-2xl p-8"
              style={{ background: "#fff", border: "1px solid #e2e8f0", boxShadow: "0 4px 30px rgba(0,0,0,0.07)" }}
            >
              {sent ? (
                <div className="text-center py-12">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: `${ORANGE}15`, color: ORANGE }}
                  >
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black mb-2" style={{ color: DARK }}>¡Mensaje enviado!</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    Gracias por contactarnos. Un asesor de GLOINT se comunicará contigo en las próximas horas.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                    style={{ background: ORANGE, color: "#fff" }}
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-black mb-1" style={{ color: DARK }}>Envía un Mensaje</h2>
                    <p className="text-slate-400 text-sm">Tu asesor personal estará listo para guiarte</p>
                  </div>

                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: DARK }}>
                          Nombre completo <span style={{ color: ORANGE }}>*</span>
                        </label>
                        <input
                          required
                          value={form.nombre}
                          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                          placeholder="Tu nombre"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: DARK,
                            fontFamily: "inherit",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: DARK }}>
                          Email <span style={{ color: ORANGE }}>*</span>
                        </label>
                        <input
                          required
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="tu@email.com"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: DARK,
                            fontFamily: "inherit",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: DARK }}>Teléfono</label>
                        <input
                          value={form.telefono}
                          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                          placeholder="+57 320 957 3995"
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: DARK,
                            fontFamily: "inherit",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold" style={{ color: DARK }}>Asunto</label>
                        <select
                          value={form.asunto}
                          onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all appearance-none"
                          style={{
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            color: form.asunto ? DARK : "#94a3b8",
                            fontFamily: "inherit",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                        >
                          <option value="" disabled>Selecciona un tema</option>
                          <option value="investment">GLOINT Investment</option>
                          <option value="place">GLOINT Place</option>
                          <option value="tech">GLOINT Tech</option>
                          <option value="consultoria">Consultoría</option>
                          <option value="alianza">Alianza estratégica</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold" style={{ color: DARK }}>
                        Mensaje <span style={{ color: ORANGE }}>*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={form.mensaje}
                        onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                        placeholder="Cuéntanos sobre tu proyecto o necesidad..."
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                        style={{
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          color: DARK,
                          fontFamily: "inherit",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = ORANGE)}
                        onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                      />
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                    >
                      Enviar mensaje <ArrowRight size={16} />
                    </motion.button>

                    <p className="text-center text-xs text-slate-400">
                      Al enviar, aceptas nuestra{" "}
                      <a href="#" className="underline" style={{ color: ORANGE }}>política de privacidad</a>.
                    </p>
                  </form>
                </>
              )}
            </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Map / CTA strip */}
      <section className="py-16" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: <Clock size={20} />, title: "Horario de atención", lines: ["Lunes a viernes", "8:00 am – 6:00 pm"], color: GOLD },
              { icon: <Phone size={20} />, title: "Llámanos", lines: ["+57 324 204 657", "Atención inmediata"], color: ORANGE },
              { icon: <Mail size={20} />, title: "Escríbenos", lines: ["contacto@gloint.com", "Respuesta en 24 h"], color: "#60a5fa" },
            ].map(({ icon, title, lines, color }) => (
              <div
                key={title}
                className="flex items-center gap-4 p-5 rounded-2xl"
                style={{ background: "#fff", border: "1px solid #e2e8f0" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}12`, color }}
                >
                  {icon}
                </div>
                <div>
                  <div className="font-bold text-sm mb-0.5" style={{ color: DARK }}>{title}</div>
                  {lines.map((l) => <div key={l} className="text-slate-500 text-xs">{l}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="py-20 relative overflow-hidden" style={{ background: DARK }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${ORANGE}15 0%, transparent 55%)` }} />
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
            ¿Prefieres que te <span style={{ color: ORANGE }}>llamemos</span>?
          </h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Déjanos tu número y un asesor GLOINT se comunicará contigo en menos de 24 horas.
          </p>
          <a
            href="https://wa.me/573242040657"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
            style={{ background: "#16a34a" }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Escribir por WhatsApp
          </a>
        </div>
      </section>

      <SharedFooter setPage={setPage} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRO PAGE — multi-step, dual role
// ══════════════════════════════════════════════════════════════════════════════
type RegistroRole = "cliente" | "inversionista" | null;
type RegistroStep = "role" | "form" | "docs" | "success";

function FileDropZone({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className="w-full rounded-xl cursor-pointer transition-all select-none"
      style={{
        border: `2px dashed ${file ? "#22c55e" : dragging ? ORANGE : "#d1d5db"}`,
        background: file ? "#f0fdf4" : dragging ? `${ORANGE}08` : "#fff",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); }} />
      {file ? (
        <>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#dcfce7" }}>
            <CheckCircle size={22} style={{ color: "#16a34a" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#16a34a" }}>{file.name}</span>
          <span className="text-xs" style={{ color: "#86efac" }}>Archivo cargado correctamente</span>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#f3f4f6" }}>
            <Package size={20} style={{ color: "#9ca3af" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: DARK }}>{label}</span>
          <span className="text-xs" style={{ color: "#9ca3af" }}>Arrastra aquí o haz clic para seleccionar</span>
        </>
      )}
    </div>
  );
}

function RegistroPage({ setPage }: { setPage: (p: Page) => void }) {
  const [step, setStep] = useState<RegistroStep>("role");
  const [role, setRole] = useState<RegistroRole>(null);
  const [showPass, setShowPass] = useState(false);

  const [personal, setPersonal] = useState({ nombre: "", tipoDoc: "", documento: "", celular: "", ciudad: "", fechaNac: "", email: "", password: "" });
  const [bancario, setBancario] = useState({ banco: "", tipoCuenta: "", numCuenta: "", titular: "" });
  const [empresa, setEmpresa] = useState({ nombreEmpresa: "", nit: "", sector: "", direccion: "" });
  const [docFrente, setDocFrente] = useState<File | null>(null);
  const [docReverso, setDocReverso] = useState<File | null>(null);
  const [docExtra, setDocExtra] = useState<File | null>(null);

  // ── Shared input helpers ──────────────────────────────────────────────────
  const F = "w-full px-3.5 py-3 rounded-xl text-sm outline-none transition-all";
  const S = { border: "1.5px solid #e5e7eb", background: "#f9fafb", color: DARK, fontFamily: "inherit" };
  const fo = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.target.style.borderColor = ORANGE);
  const bl = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => (e.target.style.borderColor = "#e5e7eb");
  const Lbl = ({ t, req }: { t: string; req?: boolean }) => (
    <label className="text-xs font-semibold block mb-1.5" style={{ color: "#6b7280" }}>
      {t}{req && <span style={{ color: ORANGE }}> *</span>}
    </label>
  );

  // ── Step data ─────────────────────────────────────────────────────────────
  const STEPS = [
    { label: "Perfil", icon: <Users size={13} /> },
    { label: "Datos", icon: <FileCheck size={13} /> },
    { label: "Documentos", icon: <Package size={13} /> },
  ];
  const stepIdx = { role: 0, form: 1, docs: 2, success: 3 }[step];

  // ── Section header ────────────────────────────────────────────────────────
  const SectionHead = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2.5 py-2.5 mb-1" style={{ borderBottom: `2px solid #f3f4f6` }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}15`, color: ORANGE }}>{icon}</div>
      <span className="font-bold text-sm" style={{ color: DARK }}>{title}</span>
    </div>
  );

  // ── Card shell shared by form + docs ─────────────────────────────────────
  const CardHeader = () => (
    <div className="flex flex-col items-center pb-5 mb-5" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `linear-gradient(135deg, ${GOLD}22, ${ORANGE}22)` }}
      >
        <Users size={24} style={{ color: ORANGE }} />
      </div>
      <h2 className="text-xl font-black" style={{ color: DARK }}>Crear Cuenta</h2>
      <p className="text-slate-400 text-xs text-center mt-1 max-w-xs">
        Únete a la plataforma financiera que impulsa cientos de negocios a escalar más rápido.
      </p>
      <div
        className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
        style={{ border: `1.5px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}08` }}
      >
        {role === "inversionista" ? "Registro de Inversionista" : "Registro de Cliente"}
      </div>
    </div>
  );

  const FooterLinks = () => (
    <div className="flex flex-col items-center gap-2 mt-5">
      <p className="text-xs text-slate-400">
        ¿Ya tienes una cuenta?{" "}
        <button className="font-semibold" style={{ color: ORANGE }}>Iniciar Sesión</button>
      </p>
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#d1d5db" }}>
        <Shield size={11} /> Encriptación AES-256 de grado bancario
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: step === "role" ? "#f1f5f9" : "#0f172a" }}>

      {/* ── STEP 0: Role selection ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
      {step === "role" && (
        <motion.div
          key="role"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="min-h-screen flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-8 py-5">
            <button
              onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}
              className="text-xl font-black tracking-widest"
              style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              GLOINT
            </button>
            <button className="text-sm font-medium" style={{ color: "#64748b" }}>
              ¿Ya tienes cuenta? <span style={{ color: ORANGE }}>Inicia Sesión</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h1 className="text-3xl md:text-5xl font-black mb-4" style={{ color: DARK }}>
                Bienvenido a <span style={{ color: ORANGE }}>GLOINT</span>
              </h1>
              <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                Selecciona el perfil con el que deseas unirte a nuestra plataforma para personalizar tu experiencia.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-5 w-full max-w-2xl">
              {([
                {
                  id: "cliente" as RegistroRole,
                  gradient: `linear-gradient(135deg, #1e293b, #0f172a)`,
                  iconBg: "rgba(255,255,255,0.08)",
                  icon: <Building2 size={28} style={{ color: "#94a3b8" }} />,
                  tag: "Para empresas",
                  title: "Quiero ser Cliente",
                  desc: "Busca liquidez inmediata, factoring o pago anticipado de facturas logísticas para tu empresa.",
                  cta: "Continuar como Cliente",
                  ctaColor: "#fff",
                },
                {
                  id: "inversionista" as RegistroRole,
                  gradient: `linear-gradient(135deg, ${DARK}, #1a1200)`,
                  iconBg: `${GOLD}22`,
                  icon: <TrendingUp size={28} style={{ color: GOLD }} />,
                  tag: "Para inversionistas",
                  title: "Quiero Invertir",
                  desc: "Genera rentabilidad participando en oportunidades de inversión dentro del ecosistema GLOINT.",
                  cta: "Continuar como Inversionista",
                  ctaColor: GOLD,
                },
              ] as any[]).map(({ id, gradient, iconBg, icon, tag, title, desc, cta, ctaColor }, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.12 }}
                  whileHover={{ y: -6, boxShadow: "0 20px 50px rgba(0,0,0,0.18)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setRole(id); setStep("form"); }}
                  className="text-left p-7 rounded-3xl overflow-hidden relative"
                  style={{ background: gradient, boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}
                >
                  {/* Glow */}
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ctaColor}15 0%, transparent 70%)` }} />
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: iconBg }}>
                    {icon}
                  </div>
                  <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: ctaColor === "#fff" ? "rgba(255,255,255,0.4)" : `${ctaColor}99` }}>
                    {tag}
                  </div>
                  <div className="font-black text-lg mb-3 text-white leading-tight">{title}</div>
                  <div className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>{desc}</div>
                  <div className="flex items-center gap-2 text-sm font-bold" style={{ color: ctaColor }}>
                    {cta} <ArrowRight size={15} />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── STEPS 1 + 2: Form layout ───────────────────────────────────────── */}
      {(step === "form" || step === "docs") && (
        <motion.div
          key="form-shell"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="min-h-screen flex"
        >
          {/* Left panel — branding (hidden on mobile) */}
          <div
            className="hidden lg:flex flex-col justify-between w-96 flex-shrink-0 p-10 relative overflow-hidden"
            style={{ background: `linear-gradient(160deg, ${DARK} 0%, #1a1200 100%)` }}
          >
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${GOLD}15 0%, transparent 70%)` }} />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ORANGE}10 0%, transparent 70%)` }} />

            {/* Logo */}
            <button
              onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}
              className="text-2xl font-black tracking-widest w-fit"
              style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              GLOINT
            </button>

            {/* Step indicator */}
            <div className="flex flex-col gap-4 relative z-10">
              {STEPS.map((s, i) => {
                const done = i < stepIdx - 1;
                const active = i === stepIdx - 1;
                return (
                  <div key={s.label} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: done ? "#22c55e" : active ? ORANGE : "rgba(255,255,255,0.08)",
                        color: done || active ? "#fff" : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {done ? <CheckCircle size={15} /> : s.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: active ? "#fff" : done ? "#22c55e" : "rgba(255,255,255,0.35)" }}>
                        Paso {i + 1}
                      </div>
                      <div className="text-xs" style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)" }}>
                        {s.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom trust badges */}
            <div className="flex flex-col gap-2 relative z-10">
              {[
                { icon: <Shield size={14} />, text: "AES-256 de grado bancario" },
                { icon: <CheckCircle size={14} />, text: "Datos encriptados" },
                { icon: <Globe size={14} />, text: "Conforme con regulación colombiana" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {icon} {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — form */}
          <div className="flex-1 overflow-y-auto flex items-start justify-center bg-white px-4 py-10">
            {/* Mobile step bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}
                className="text-lg font-black tracking-widest"
                style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                GLOINT
              </button>
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === stepIdx - 1 ? "24px" : "8px",
                      background: i < stepIdx - 1 ? "#22c55e" : i === stepIdx - 1 ? ORANGE : "#e5e7eb",
                    }}
                  />
                ))}
              </div>
            </div>

            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}
              className="w-full max-w-lg pt-12 lg:pt-0"
            >
              {/* ── Form step ─────────────────────────────────────────── */}
              {step === "form" && (
                <>
                  <CardHeader />
                  <form onSubmit={(e) => { e.preventDefault(); setStep("docs"); }} className="flex flex-col gap-4">
                    <SectionHead icon={<Users size={14} />} title="Datos Personales" />

                    <div>
                      <Lbl t="Nombre Completo" req />
                      <input required value={personal.nombre} onChange={e => setPersonal({ ...personal, nombre: e.target.value })} placeholder="Tu nombre completo" className={F} style={S} onFocus={fo} onBlur={bl} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Lbl t="Tipo de Documento" />
                        <select value={personal.tipoDoc} onChange={e => setPersonal({ ...personal, tipoDoc: e.target.value })} className={F} style={{ ...S, appearance: "none" as any }} onFocus={fo} onBlur={bl}>
                          <option value="">Selecciona...</option>
                          <option>Cédula de Ciudadanía</option>
                          <option>Cédula de Extranjería</option>
                          <option>Pasaporte</option>
                          <option>NIT</option>
                        </select>
                      </div>
                      <div>
                        <Lbl t="Número de Documento" req />
                        <input required value={personal.documento} onChange={e => setPersonal({ ...personal, documento: e.target.value })} placeholder="N° documento" className={F} style={S} onFocus={fo} onBlur={bl} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Lbl t="Celular" req />
                        <input required value={personal.celular} onChange={e => setPersonal({ ...personal, celular: e.target.value })} placeholder="+57 320 957 3995" className={F} style={S} onFocus={fo} onBlur={bl} />
                      </div>
                      <div>
                        <Lbl t="Ciudad" req />
                        <select value={personal.ciudad} onChange={e => setPersonal({ ...personal, ciudad: e.target.value })} className={F} style={{ ...S, appearance: "none" as any }} onFocus={fo} onBlur={bl}>
                          <option value="">Selecciona...</option>
                          {["Bogotá","Medellín","Cali","Barranquilla","Cartagena","Bucaramanga","Pereira","Manizales","Otra"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <Lbl t="Fecha de Nacimiento" />
                      <input type="date" value={personal.fechaNac} onChange={e => setPersonal({ ...personal, fechaNac: e.target.value })} className={F} style={S} onFocus={fo} onBlur={bl} />
                    </div>

                    <div>
                      <Lbl t="Correo Electrónico" req />
                      <input required type="email" value={personal.email} onChange={e => setPersonal({ ...personal, email: e.target.value })} placeholder="correo@ejemplo.com" className={F} style={S} onFocus={fo} onBlur={bl} />
                    </div>

                    <div>
                      <Lbl t="Contraseña" req />
                      <div className="relative">
                        <input required type={showPass ? "text" : "password"} value={personal.password} onChange={e => setPersonal({ ...personal, password: e.target.value })} placeholder="Mínimo 8 caracteres" className={F} style={{ ...S, paddingRight: "44px" }} onFocus={fo} onBlur={bl} />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }}>
                          {showPass ? <X size={16} /> : <Shield size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Datos Bancarios — Inversionista */}
                    {role === "inversionista" && (
                      <>
                        <SectionHead icon={<Wallet size={14} />} title="Datos Bancarios para Desembolsos" />
                        <div>
                          <Lbl t="Banco" req />
                          <select value={bancario.banco} onChange={e => setBancario({ ...bancario, banco: e.target.value })} className={F} style={{ ...S, appearance: "none" as any }} onFocus={fo} onBlur={bl}>
                            <option value="">Selecciona banco...</option>
                            {["Bancolombia","Banco de Bogotá","Davivienda","BBVA","Banco Popular","Nequi","Daviplata","Otro"].map(b => <option key={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Lbl t="Tipo de Cuenta" />
                            <select value={bancario.tipoCuenta} onChange={e => setBancario({ ...bancario, tipoCuenta: e.target.value })} className={F} style={{ ...S, appearance: "none" as any }} onFocus={fo} onBlur={bl}>
                              <option value="">Selecciona...</option>
                              <option>Ahorros</option>
                              <option>Corriente</option>
                            </select>
                          </div>
                          <div>
                            <Lbl t="N° de Cuenta" />
                            <input value={bancario.numCuenta} onChange={e => setBancario({ ...bancario, numCuenta: e.target.value })} placeholder="000000000" className={F} style={S} onFocus={fo} onBlur={bl} />
                          </div>
                        </div>
                        <div>
                          <Lbl t="Titular de la Cuenta" />
                          <input value={bancario.titular} onChange={e => setBancario({ ...bancario, titular: e.target.value })} placeholder="Nombre del titular" className={F} style={S} onFocus={fo} onBlur={bl} />
                        </div>
                      </>
                    )}

                    {/* Datos Empresa — Cliente */}
                    {role === "cliente" && (
                      <>
                        <SectionHead icon={<Building2 size={14} />} title="Datos de la Empresa" />
                        <div>
                          <Lbl t="Nombre de la Empresa" req />
                          <input required value={empresa.nombreEmpresa} onChange={e => setEmpresa({ ...empresa, nombreEmpresa: e.target.value })} placeholder="Razón social" className={F} style={S} onFocus={fo} onBlur={bl} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Lbl t="NIT" />
                            <input value={empresa.nit} onChange={e => setEmpresa({ ...empresa, nit: e.target.value })} placeholder="000000000-0" className={F} style={S} onFocus={fo} onBlur={bl} />
                          </div>
                          <div>
                            <Lbl t="Sector" />
                            <select value={empresa.sector} onChange={e => setEmpresa({ ...empresa, sector: e.target.value })} className={F} style={{ ...S, appearance: "none" as any }} onFocus={fo} onBlur={bl}>
                              <option value="">Selecciona...</option>
                              {["Logística","Comercio","Tecnología","Manufactura","Servicios","Agro","Otro"].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <Lbl t="Dirección" />
                          <input value={empresa.direccion} onChange={e => setEmpresa({ ...empresa, direccion: e.target.value })} placeholder="Calle, ciudad" className={F} style={S} onFocus={fo} onBlur={bl} />
                        </div>
                      </>
                    )}

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2 flex items-center justify-center gap-2"
                      style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                    >
                      Continuar <ArrowRight size={15} />
                    </motion.button>

                    <div className="text-center">
                      <button type="button" onClick={() => setStep("role")} className="text-xs" style={{ color: "#9ca3af" }}>
                        ← Cambiar tipo de perfil
                      </button>
                    </div>
                    <FooterLinks />
                  </form>
                </>
              )}

              {/* ── Docs step ─────────────────────────────────────────── */}
              {step === "docs" && (
                <>
                  <CardHeader />

                  <div className="mb-6 p-4 rounded-2xl flex items-start gap-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <Shield size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#d97706" }} />
                    <div>
                      <div className="font-bold text-sm mb-0.5" style={{ color: "#92400e" }}>Verificación de identidad</div>
                      <div className="text-xs leading-relaxed" style={{ color: "#a16207" }}>
                        Para cumplir con la regulación colombiana, necesitamos verificar tu identidad. Los archivos deben ser legibles y estar vigentes.
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mb-6">
                    <FileDropZone
                      label={role === "cliente" ? "RUT de la empresa" : "Cédula — Parte frontal"}
                      sublabel={role === "cliente" ? "Resolución de habilitación tributaria" : "Foto clara del frente de tu cédula"}
                      file={docFrente}
                      onFile={setDocFrente}
                    />
                    <FileDropZone
                      label={role === "cliente" ? "Cámara de Comercio" : "Cédula — Parte posterior"}
                      sublabel={role === "cliente" ? "No mayor a 90 días" : "Foto clara del reverso de tu cédula"}
                      file={docReverso}
                      onFile={setDocReverso}
                    />
                    {role === "cliente" && (
                      <FileDropZone
                        label="Estado de cuenta bancario"
                        sublabel="Últimos 3 meses · PDF o imagen"
                        file={docExtra}
                        onFile={setDocExtra}
                      />
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setStep("success")}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                  >
                    Finalizar registro <ArrowRight size={15} />
                  </motion.button>

                  <div className="mt-3 text-center">
                    <button onClick={() => setStep("form")} className="text-xs" style={{ color: "#9ca3af" }}>
                      ← Volver a datos personales
                    </button>
                  </div>
                  <FooterLinks />
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* ── STEP 3: Success ────────────────────────────────────────────────── */}
      {step === "success" && (
        <motion.div
          key="success"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: "#f1f5f9" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-3xl p-10 text-center"
            style={{ background: "#fff", boxShadow: "0 24px 80px rgba(0,0,0,0.12)" }}
          >
            {/* Animated ring */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
                <motion.circle
                  cx="48" cy="48" r="44"
                  fill="none" stroke="#dcfce7" strokeWidth="6"
                />
                <motion.circle
                  cx="48" cy="48" r="44"
                  fill="none" stroke="#22c55e" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="276.5"
                  initial={{ strokeDashoffset: 276.5 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                />
              </svg>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 220 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CheckCircle size={36} style={{ color: "#16a34a" }} />
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: ORANGE }}>
                Registro Exitoso
              </div>
              <h2 className="text-2xl font-black mb-3" style={{ color: DARK }}>¡Bienvenido a GLOINT!</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-1">
                Tu cuenta como <span className="font-semibold" style={{ color: ORANGE }}>
                  {role === "inversionista" ? "Inversionista" : "Cliente"}
                </span> fue creada exitosamente.
              </p>
              <p className="text-slate-400 text-xs mb-8">
                Recibirás un correo de confirmación. Nuestro equipo revisará tu solicitud en las próximas 24 horas.
              </p>

              {/* Info strip */}
              <div className="flex justify-around mb-8 py-4 rounded-2xl" style={{ background: "#f8fafc" }}>
                {[
                  { label: "Verificación", value: "24 hrs" },
                  { label: "Soporte", value: "24/7" },
                  { label: "Seguridad", value: "AES-256" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <div className="font-black text-sm" style={{ color: DARK }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{label}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setPage("home"); window.scrollTo({ top: 0 }); }}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm"
                  style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                >
                  Ir al inicio
                </motion.button>
                <button
                  onClick={() => { setStep("role"); setRole(null); setDocFrente(null); setDocReverso(null); setDocExtra(null); }}
                  className="text-xs py-2"
                  style={{ color: "#9ca3af" }}
                >
                  Crear otra cuenta
                </button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <Nav page={page} setPage={setPage} />
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {page === "home" && (
            <>
              <Hero />
              <QuienesSomos />
              <Unidades />
              <InvestmentSection />
              <PlaceSection />
              <TechSection />
              <WhyGloint />
              <Stats />
              <Aliados />
              <CTAFinal />
              <Footer />
            </>
          )}
          {page === "nosotros" && <NosotrosPage setPage={setPage} />}
          {page === "investment" && <InvestmentPage setPage={setPage} />}
          {page === "place" && <PlacePage setPage={setPage} />}
          {page === "tech" && <TechPage setPage={setPage} />}
          {page === "contacto" && <ContactoPage setPage={setPage} />}
          {page === "registro" && <RegistroPage setPage={setPage} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
