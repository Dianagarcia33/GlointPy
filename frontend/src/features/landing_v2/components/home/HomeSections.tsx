import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform, useScroll } from "motion/react";
import { ArrowRight, TrendingUp, ShoppingBag, Cpu, Zap, FileCheck, Layers, Rocket, Mail, Phone, MapPin, Package, Truck, ShieldCheck, Wallet, Route } from "lucide-react";
import { CONTACT_INFO } from "../../../../constants/contactInfo";
import { AnimatedCounter } from "../../utils/animations";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const wrap = "max-w-[1200px] mx-auto px-4 sm:px-6";

/** Tarjeta con foco dorado que sigue al cursor. */
function SpotCard({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div onMouseMove={onMove} className={`gl-spot ${className}`} style={style}>
      {children}
    </div>
  );
}

function SectionHead({ n, label, title, children }: { n: string; label: string; title: string; children?: React.ReactNode }) {
  return (
    <Reveal className="max-w-2xl mb-14">
      <p className="flex items-center gap-4 mb-5">
        <span className="gl-outline font-montserrat font-extrabold text-5xl leading-none" aria-hidden>{n}</span>
        <span className="gl-eyebrow">{label}</span>
      </p>
      <h2 className="font-montserrat font-extrabold text-3xl sm:text-5xl tracking-tight leading-[1.1]">{title}</h2>
      {children && <p className="mt-5 text-lg" style={{ color: "var(--g-text-muted)" }}>{children}</p>}
    </Reveal>
  );
}

/* ───────────────────────── Hero ───────────────────────── */
const DUST = [
  { l: "12%", t: "70%", d: "0s" }, { l: "24%", t: "40%", d: "2s" }, { l: "38%", t: "82%", d: "4s" }, { l: "52%", t: "30%", d: "1s" },
  { l: "63%", t: "74%", d: "5s" }, { l: "74%", t: "22%", d: "3s" }, { l: "86%", t: "60%", d: "6s" }, { l: "93%", t: "35%", d: "7s" },
];

function TiltLogo() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 14 });
  const sy = useSpring(my, { stiffness: 70, damping: 14 });
  const rotY = useTransform(sx, [-1, 1], [-12, 12]);
  const rotX = useTransform(sy, [-1, 1], [10, -10]);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
    my.set(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  const onLeave = () => { mx.set(0); my.set(0); };
  return (
    <div onMouseMove={onMove} onMouseLeave={onLeave} className="relative w-full max-w-[520px] aspect-square mx-auto">
      <div aria-hidden className="gl-beam" style={{ inset: "-12%" }} />
      <div aria-hidden className="gl-ring gl-spin-slow" style={{ width: "96%", height: "96%" }} />
      <div aria-hidden className="gl-ring gl-ring-dash gl-spin-rev" style={{ width: "78%", height: "78%" }} />
      <div aria-hidden className="gl-ring" style={{ width: "60%", height: "60%", opacity: 0.5 }} />
      <motion.div className="gl-logo absolute inset-0" style={{ transformPerspective: 900, rotateX: reduce ? 0 : rotX, rotateY: reduce ? 0 : rotY }}>
        <div className="gl-float h-full w-full flex items-center justify-center">
          <img src="/logos/brand/full.jpg" alt="GLOINT Group" className="w-[88%] h-auto" />
        </div>
      </motion.div>
    </div>
  );
}

export function HomeHero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.2]);
  const scrollToUnits = () => document.getElementById("unidades")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section ref={ref} className="gl-grain relative overflow-hidden pt-28 pb-10 sm:pt-32 lg:min-h-[100svh] lg:flex lg:flex-col lg:justify-center">
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(55% 55% at 75% 40%, rgba(212,165,55,0.18), transparent 70%), radial-gradient(40% 40% at 0% 100%, rgba(201,204,209,0.06), transparent 70%)" }} />
      <div aria-hidden className="gl-grid" />
      {DUST.map((p, i) => <span key={i} aria-hidden className="gl-dust" style={{ left: p.l, top: p.t, animationDelay: p.d }} />)}

      <div className={`${wrap} relative grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center`}>
        <motion.div className="order-2 lg:order-1" style={{ y: textY, opacity: fade }}>
          <p className="gl-eyebrow mb-6 flex items-center gap-3"><span aria-hidden className="inline-block h-px w-10" style={{ background: "var(--g-gold)" }} />Grupo empresarial</p>
          <h1 className="font-montserrat font-extrabold text-[2.5rem] leading-[1.04] sm:text-6xl lg:text-[4.25rem] tracking-[-0.02em]">
            Inversión, comercio digital y tecnología en{" "}
            <span style={{ color: "var(--g-gold-light)", textShadow: "0 0 40px rgba(212,165,55,0.45)" }}>un solo grupo.</span>
          </h1>
          <p className="mt-7 text-base sm:text-lg max-w-xl" style={{ color: "var(--g-text-muted)" }}>
            GLOINT desarrolla soluciones innovadoras en inversión, comercio electrónico y transformación tecnológica
            para generar oportunidades sostenibles a inversionistas, clientes y empresas.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <button onClick={scrollToUnits} className="gl-btn-primary h-14 px-8 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center gap-2">
              Conocer nuestras unidades <ArrowRight size={16} />
            </button>
            <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-secondary h-14 px-8 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">
              Hablar con un asesor
            </a>
          </div>
        </motion.div>
        <div className="order-1 lg:order-2"><TiltLogo /></div>
      </div>

      {/* Marquesina de unidades */}
      <div aria-hidden className="gl-marquee relative mt-12 lg:mt-16 py-5 overflow-hidden" style={{ borderTop: "1px solid var(--g-border)", borderBottom: "1px solid var(--g-border)" }}>
        <div className="gl-marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {["Investment", "Place", "Tech", "Inversión", "Comercio digital", "Tecnología"].map((t, i) => (
                <span key={`${k}-${i}`} className="flex items-center">
                  <span className={`font-montserrat font-extrabold text-3xl sm:text-4xl tracking-tight px-8 ${i % 2 ? "gl-outline" : ""}`} style={i % 2 ? undefined : { color: "var(--g-silver)" }}>{t}</span>
                  <span className="text-xl" style={{ color: "var(--g-gold)" }}>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Unidades (bento) ───────────────────────── */
function TechMock() {
  const bars = [38, 52, 44, 66, 58, 78, 92];
  return (
    <div aria-hidden className="rounded-lg overflow-hidden w-full" style={{ background: "var(--g-bg)", border: "1px solid var(--g-border)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(212,165,55,0.08)" }}>
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ borderBottom: "1px solid var(--g-border)" }}>
        {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full" style={{ background: i === 0 ? "var(--g-gold)" : "var(--g-surface-2)" }} />)}
        <span className="ml-3 h-2 w-24 rounded-full" style={{ background: "var(--g-surface-2)" }} />
      </div>
      <div className="grid grid-cols-5 gap-3 p-4">
        <div className="col-span-3 flex items-end gap-1.5 h-28">
          {bars.map((h, i) => (
            <div key={i} className="gl-bar flex-1 rounded-sm" style={{ height: `${h}%`, animationDelay: `${i * 0.25}s`, background: i === bars.length - 1 ? "linear-gradient(180deg, var(--g-gold-light), var(--g-gold-deep))" : "var(--g-surface-2)" }} />
          ))}
        </div>
        <div className="col-span-2 rounded-md p-2.5 flex flex-col justify-between" style={{ background: "var(--g-surface-2)" }}>
          <Wallet size={16} style={{ color: "var(--g-gold)" }} />
          <div><span className="block h-1.5 w-12 rounded-full mb-1.5" style={{ background: "var(--g-silver)", opacity: 0.5 }} /><span className="block h-2.5 w-16 rounded-full" style={{ background: "var(--g-gold)" }} /></div>
        </div>
        <svg viewBox="0 0 300 50" className="col-span-5 w-full h-12" fill="none">
          <path d="M6 38 C 60 6, 100 46, 150 24 S 250 6, 294 20" stroke="var(--g-gold)" strokeWidth="1.5" className="gl-dash" />
          {[6, 150, 294].map((x, i) => <circle key={i} cx={x} cy={[38, 24, 20][i]} r="4" fill="var(--g-bg)" stroke="var(--g-gold-light)" strokeWidth="1.5" />)}
        </svg>
      </div>
    </div>
  );
}

function PlaceMock() {
  const items = [
    { icon: ShoppingBag, t: "Productos exclusivos", r: -6, y: 0 },
    { icon: ShieldCheck, t: "Compras seguras", r: 3, y: 10 },
    { icon: Truck, t: "Envíos a toda Colombia", r: -2, y: 20 },
  ];
  return (
    <div aria-hidden className="relative mt-6 h-48">
      {items.map(({ icon: Icon, t, r, y }, i) => (
        <div key={t} className="absolute left-0 right-0 mx-auto w-[88%] flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold"
          style={{ top: y + i * 50, transform: `rotate(${r}deg)`, zIndex: i, background: i === 2 ? "linear-gradient(135deg, var(--g-gold-light), var(--g-gold) 60%, var(--g-gold-deep))" : "var(--g-surface-2)", color: i === 2 ? "var(--g-on-gold)" : "var(--g-text)", border: "1px solid var(--g-border)", boxShadow: "0 12px 30px -10px rgba(0,0,0,0.7)" }}>
          <Icon size={18} strokeWidth={1.75} />{t}
        </div>
      ))}
    </div>
  );
}

export function HomeUnits() {
  return (
    <section id="unidades" className="gl-grain relative py-20 sm:py-32 overflow-hidden" style={{ background: "var(--g-surface)" }}>
      <div aria-hidden className="absolute -left-40 top-20 h-[480px] w-[480px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(212,165,55,0.1), transparent 70%)" }} />
      <div className={`${wrap} relative`}>
        <SectionHead n="01" label="Nuestras unidades" title="Tres unidades, un mismo propósito.">
          Soluciones especializadas que impulsan el crecimiento de personas, empresas e inversionistas.
        </SectionHead>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Investment — protagonista */}
          <Reveal className="lg:col-span-7">
            <SpotCard className="h-full rounded-xl p-8 sm:p-10 flex flex-col" style={{ background: "linear-gradient(160deg, #1c1608 0%, var(--g-surface-2) 55%)", border: "1px solid var(--g-gold-deep)" }}>
              <img src="/logos/brand/investment-3d.png" alt="" aria-hidden className="gl-float absolute -right-6 -bottom-6 w-[46%] max-w-[320px] pointer-events-none select-none" style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.7))" }} />
              <TrendingUp size={28} strokeWidth={1.5} style={{ color: "var(--g-gold)" }} aria-hidden />
              <p className="gl-eyebrow mt-6">Inversión</p>
              <h3 className="font-montserrat font-extrabold text-3xl sm:text-4xl mt-2">GLOINT Investment</h3>
              <p className="mt-4 max-w-md" style={{ color: "var(--g-text-muted)" }}>
                Gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.
              </p>
              <ul className="mt-6 space-y-2 text-sm max-w-[55%] sm:max-w-[50%]">
                {["Estrategias de inversión innovadoras", "Participación en negocios digitales escalables", "Administración profesional del capital", "Crecimiento patrimonial sostenible"].map((p) => (
                  <li key={p} className="flex gap-2"><span aria-hidden style={{ color: "var(--g-gold)" }}>—</span>{p}</li>
                ))}
              </ul>
              <Link to="/investment" className="gl-btn-primary mt-8 self-start h-12 px-6 rounded-lg font-montserrat font-bold text-sm inline-flex items-center gap-2 relative z-10">
                Conocer Investment <ArrowRight size={16} />
              </Link>
            </SpotCard>
          </Reveal>

          {/* Place */}
          <Reveal className="lg:col-span-5" delay={0.1}>
            <SpotCard className="h-full rounded-xl p-8 flex flex-col" style={{ background: "var(--g-bg)", border: "1px solid var(--g-border)" }}>
              <div className="flex items-center gap-3"><Package size={22} strokeWidth={1.5} style={{ color: "var(--g-silver)" }} aria-hidden /><p className="gl-eyebrow">E-commerce</p></div>
              <h3 className="font-montserrat font-extrabold text-2xl mt-3">GLOINT Place</h3>
              <p className="mt-3 text-sm" style={{ color: "var(--g-text-muted)" }}>Comercio electrónico de productos innovadores y de tendencia.</p>
              <PlaceMock />
              <Link to="/place" className="mt-auto pt-4 self-start text-sm font-semibold inline-flex items-center gap-2 hover:underline" style={{ color: "var(--g-gold-light)" }}>
                Explorar Place <ArrowRight size={14} />
              </Link>
            </SpotCard>
          </Reveal>

          {/* Tech — ancho completo */}
          <Reveal className="lg:col-span-12" delay={0.15}>
            <SpotCard className="rounded-xl p-8 sm:p-10 grid md:grid-cols-2 gap-10 items-center" style={{ background: "var(--g-bg)", border: "1px solid var(--g-border)" }}>
              <div>
                <div className="flex items-center gap-3"><Cpu size={22} strokeWidth={1.5} style={{ color: "var(--g-silver)" }} aria-hidden /><p className="gl-eyebrow">Tecnología</p></div>
                <h3 className="font-montserrat font-extrabold text-2xl sm:text-3xl mt-3">GLOINT Tech</h3>
                <p className="mt-3 max-w-md" style={{ color: "var(--g-text-muted)" }}>
                  Herramientas accesibles para que pequeñas y medianas empresas automaticen su operación y optimicen su logística.
                </p>
                <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                  {[[Route, "Optimización de rutas"], [Truck, "Seguimiento logístico"], [Wallet, "Billetera digital integrada"]].map(([Icon, t]) => {
                    const I = Icon as typeof Route;
                    return <li key={t as string} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ border: "1px solid var(--g-border)", color: "var(--g-silver)" }}><I size={14} style={{ color: "var(--g-gold)" }} aria-hidden />{t as string}</li>;
                  })}
                </ul>
                <Link to="/tech" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: "var(--g-gold-light)" }}>
                  Descubrir Tech <ArrowRight size={14} />
                </Link>
              </div>
              <TechMock />
            </SpotCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Quiénes somos ───────────────────────── */
export function HomeAbout() {
  const facts: { v: number; p: string; l: string }[] = [
    { v: 1000, p: "+", l: "clientes impactados" },
    { v: 500, p: "+", l: "operaciones gestionadas" },
    { v: 3, p: "", l: "unidades de negocio" },
  ];
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      <img src="/logos/brand/g.jpg" alt="" aria-hidden className="gl-logo absolute -right-24 top-1/2 -translate-y-1/2 w-[560px] opacity-[0.07] pointer-events-none select-none" />
      <div className={`${wrap} relative`}>
        <div className="grid lg:grid-cols-2 gap-12 items-end mb-16">
          <Reveal>
            <p className="flex items-center gap-4 mb-5"><span className="gl-outline font-montserrat font-extrabold text-5xl leading-none" aria-hidden>02</span><span className="gl-eyebrow">Quiénes somos</span></p>
            <h2 className="font-montserrat font-extrabold text-3xl sm:text-5xl tracking-tight leading-[1.1]">Un grupo para crecer en la economía digital.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg max-w-lg" style={{ color: "var(--g-text-muted)" }}>
              GLOINT genera oportunidades sostenibles para inversionistas, clientes y empresas que buscan crecer en la economía digital.
            </p>
            <p className="mt-4 text-sm" style={{ color: "var(--g-text-muted)" }}>{CONTACT_INFO.companyName} · NIT {CONTACT_INFO.nit} · {CONTACT_INFO.cityCountry}</p>
            <Link to="/about" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: "var(--g-gold-light)" }}>
              Conocer más sobre nosotros <ArrowRight size={14} />
            </Link>
          </Reveal>
        </div>
        <dl className="grid sm:grid-cols-3">
          {facts.map((f, i) => (
            <Reveal key={f.l} delay={0.08 * i}>
              <div className="py-8 sm:px-8 first:sm:pl-0" style={{ borderTop: "1px solid var(--g-gold-deep)", borderLeft: i ? "1px solid var(--g-border)" : undefined }}>
                <dd className="font-montserrat font-extrabold text-6xl sm:text-7xl tracking-tight" style={{ color: "var(--g-silver)" }}>
                  <span style={{ color: "var(--g-gold)" }}>{f.p}</span><AnimatedCounter value={f.v} />
                </dd>
                <dt className="mt-3 text-sm uppercase tracking-[0.18em]" style={{ color: "var(--g-text-muted)" }}>{f.l}</dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────── Por qué GLOINT ───────────────────────── */
const WHY = [
  { icon: Zap, title: "Dinero en minutos", desc: "Recibe tus operaciones sin demoras. Procesos ágiles pensados para que tu negocio nunca se detenga." },
  { icon: FileCheck, title: "Sin papeleo", desc: "Todo es digital y rápido. Firma y gestiona desde cualquier dispositivo, sin trámites físicos." },
  { icon: Layers, title: "Soluciones tecnológicas", desc: "Sistemas empresariales adaptados exactamente a lo que tu negocio necesita." },
  { icon: Rocket, title: "Escalabilidad", desc: "Soluciones que crecen contigo, desde tu primer paquete hasta inversiones." },
];

export function HomeWhy() {
  return (
    <section className="gl-grain relative py-20 sm:py-32" style={{ background: "var(--g-surface)" }}>
      <div className={`${wrap} grid lg:grid-cols-[0.8fr_1.2fr] gap-14`}>
        <div className="lg:sticky lg:top-28 self-start">
          <Reveal>
            <p className="flex items-center gap-4 mb-5"><span className="gl-outline font-montserrat font-extrabold text-5xl leading-none" aria-hidden>03</span><span className="gl-eyebrow">Nuestra diferencia</span></p>
            <h2 className="font-montserrat font-extrabold text-3xl sm:text-5xl tracking-tight leading-[1.1]">Por qué elegir GLOINT.</h2>
          </Reveal>
        </div>
        <ul>
          {WHY.map((w, i) => {
            const Icon = w.icon;
            return (
              <Reveal key={w.title} delay={0.05}>
                <li>
                  <SpotCard className="group flex gap-6 py-8 px-2 sm:px-6 rounded-lg" style={{ borderTop: "1px solid var(--g-border)" }}>
                    <span className="gl-outline font-montserrat font-extrabold text-5xl leading-none w-16 shrink-0 transition-colors group-hover:text-[color:var(--g-gold)]" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-montserrat font-bold text-xl flex items-center gap-3"><Icon size={20} strokeWidth={1.5} style={{ color: "var(--g-gold)" }} aria-hidden />{w.title}</h3>
                      <p className="mt-2 max-w-md" style={{ color: "var(--g-text-muted)" }}>{w.desc}</p>
                    </div>
                  </SpotCard>
                </li>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── Aliados ───────────────────────── */
export function HomeAllies() {
  const partners = ["Wompi", "IRIS", "Bold", "PayU", "Bancolombia", "Howden", "Yoint", "Due Legal"];
  return (
    <section className="py-16 sm:py-20" aria-label="Aliados estratégicos">
      <Reveal>
        <p className="gl-eyebrow text-center mb-8">Aliados estratégicos</p>
        <div className="gl-marquee overflow-hidden" style={{ borderTop: "1px solid var(--g-border)", borderBottom: "1px solid var(--g-border)" }}>
          <ul className="gl-marquee-track" style={{ animationDuration: "32s" }}>
            {[0, 1].map((k) => partners.map((p) => (
              <li key={`${k}-${p}`} aria-hidden={k === 1} className="flex items-center">
                <span className="font-montserrat font-bold text-2xl tracking-wide px-12 py-7" style={{ color: "var(--g-text-muted)" }}>{p}</span>
                <span aria-hidden style={{ color: "var(--g-gold-deep)" }}>✦</span>
              </li>
            )))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Cierre ───────────────────────── */
export function HomeFinalCTA() {
  return (
    <section className="gl-grain relative py-24 sm:py-36 text-center overflow-hidden" style={{ background: "var(--g-surface)" }}>
      <div aria-hidden className="gl-beam" style={{ left: "50%", top: "50%", width: 900, height: 900, marginLeft: -450, marginTop: -450, opacity: 0.35 }} />
      <img src="/logos/brand/g.jpg" alt="" aria-hidden className="gl-logo absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] max-w-none opacity-[0.12] pointer-events-none select-none" />
      <Reveal className={`${wrap} relative`}>
        <h2 className="font-montserrat font-extrabold text-4xl sm:text-6xl tracking-tight max-w-3xl mx-auto leading-[1.05]">¿Listo para crecer con <span style={{ color: "var(--g-gold-light)" }}>GLOINT</span>?</h2>
        <p className="mt-6 text-lg max-w-xl mx-auto" style={{ color: "var(--g-text-muted)" }}>Cuéntanos qué necesitas y un asesor te acompaña en el siguiente paso.</p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-primary h-14 px-9 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">Hablar con un asesor</a>
          <Link to="/onboarding" className="gl-btn-secondary h-14 px-9 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">Crear cuenta</Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ───────────────────────── Pie ───────────────────────── */
export function HomeFooter() {
  const linkCls = "text-sm hover:underline";
  const muted = { color: "var(--g-text-muted)" };
  return (
    <footer className="pt-16 pb-8" style={{ background: "var(--g-surface)", borderTop: "1px solid var(--g-border)" }}>
      <div className={wrap}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <img src="/logos/brand/wordmark.jpg" alt="GLOINT Group" className="gl-logo h-10 w-auto -ml-1" />
            <p className="mt-4 text-sm" style={muted}>Ecosistema empresarial de inversión, comercio digital y tecnología.</p>
            <div className="mt-5 flex gap-4 text-sm">
              <a href={CONTACT_INFO.socials.facebook} target="_blank" rel="noopener noreferrer" className={linkCls} style={muted}>Facebook</a>
              <a href={CONTACT_INFO.socials.instagram} target="_blank" rel="noopener noreferrer" className={linkCls} style={muted}>Instagram</a>
            </div>
          </div>
          <nav aria-label="Empresa">
            <h3 className="font-montserrat font-semibold text-sm mb-4">Empresa</h3>
            <ul className="space-y-2">
              <li><Link to="/" className={linkCls} style={muted}>Inicio</Link></li>
              <li><Link to="/about" className={linkCls} style={muted}>Nosotros</Link></li>
              <li><Link to="/contact" className={linkCls} style={muted}>Contacto</Link></li>
            </ul>
          </nav>
          <nav aria-label="Unidades">
            <h3 className="font-montserrat font-semibold text-sm mb-4">Unidades</h3>
            <ul className="space-y-2">
              <li><Link to="/investment" className={linkCls} style={muted}>GLOINT Investment</Link></li>
              <li><Link to="/place" className={linkCls} style={muted}>GLOINT Place</Link></li>
              <li><Link to="/tech" className={linkCls} style={muted}>GLOINT Tech</Link></li>
            </ul>
          </nav>
          <div>
            <h3 className="font-montserrat font-semibold text-sm mb-4">Legal y contacto</h3>
            <ul className="space-y-2">
              <li><Link to="/privacidad" className={linkCls} style={muted}>Política de privacidad</Link></li>
              <li><Link to="/terminos" className={linkCls} style={muted}>Términos y condiciones</Link></li>
              <li><Link to="/legal" className={linkCls} style={muted}>Aviso legal</Link></li>
            </ul>
            <ul className="mt-5 space-y-2 text-xs" style={muted}>
              <li className="flex gap-2"><Mail size={14} className="shrink-0 mt-0.5" style={{ color: "var(--g-gold)" }} aria-hidden /><a href={`mailto:${CONTACT_INFO.email}`} className="hover:underline break-all">{CONTACT_INFO.email}</a></li>
              <li className="flex gap-2"><Phone size={14} className="shrink-0 mt-0.5" style={{ color: "var(--g-gold)" }} aria-hidden /><a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{CONTACT_INFO.phone}</a></li>
              <li className="flex gap-2"><MapPin size={14} className="shrink-0 mt-0.5" style={{ color: "var(--g-gold)" }} aria-hidden />{CONTACT_INFO.fullAddress}</li>
            </ul>
          </div>
        </div>
        <p className="pt-6 text-xs" style={{ ...muted, borderTop: "1px solid var(--g-border)" }}>© GLOINT 2026. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
