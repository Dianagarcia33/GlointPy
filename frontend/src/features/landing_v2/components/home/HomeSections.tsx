import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, TrendingUp, ShoppingBag, Cpu, Zap, FileCheck, Layers, Rocket, Mail, Phone, MapPin } from "lucide-react";
import { CONTACT_INFO } from "../../../../constants/contactInfo";

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const wrap = "max-w-[1200px] mx-auto px-4 sm:px-6";

/* ───────────────────────── Hero ───────────────────────── */
export function HomeHero() {
  const scrollToUnits = () => document.getElementById("unidades")?.scrollIntoView({ behavior: "smooth" });
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24 lg:min-h-[100svh] lg:flex lg:items-center">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(60% 50% at 78% 45%, rgba(212,165,55,0.14), transparent 70%)" }}
      />
      <div className={`${wrap} relative grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center`}>
        <div className="order-2 lg:order-1">
          <p className="gl-eyebrow mb-5">Grupo empresarial</p>
          <h1 className="font-montserrat font-extrabold text-[2.25rem] leading-[1.1] sm:text-5xl lg:text-[3.5rem] tracking-tight">
            Inversión, comercio digital y tecnología en un solo grupo.
          </h1>
          <p className="mt-6 text-base sm:text-lg max-w-xl" style={{ color: "var(--g-text-muted)" }}>
            GLOINT desarrolla soluciones innovadoras en inversión, comercio electrónico y transformación tecnológica
            para generar oportunidades sostenibles a inversionistas, clientes y empresas.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <button onClick={scrollToUnits} className="gl-btn-primary h-12 px-7 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center gap-2">
              Conocer nuestras unidades <ArrowRight size={16} />
            </button>
            <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-secondary h-12 px-7 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">
              Hablar con un asesor
            </a>
          </div>
        </div>
        <div className="order-1 lg:order-2 flex justify-center">
          <img
            src="/logos/brand/full.jpg"
            alt="GLOINT Group"
            className="gl-logo w-[220px] sm:w-[320px] lg:w-full lg:max-w-[460px] h-auto"
          />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Unidades ───────────────────────── */
const UNITS = [
  {
    title: "GLOINT Investment",
    tag: "Inversión",
    icon: TrendingUp,
    desc: "Gestión estratégica de capital enfocada en oportunidades dentro de mercados digitales y modelos de comercio electrónico de alto potencial.",
    points: ["Estrategias de inversión innovadoras", "Participación en negocios digitales escalables", "Administración profesional del capital", "Crecimiento patrimonial sostenible"],
    cta: "Conocer Investment",
    path: "/investment",
  },
  {
    title: "GLOINT Place",
    tag: "E-commerce",
    icon: ShoppingBag,
    desc: "Comercio electrónico de productos innovadores y de tendencia, con envíos a toda Colombia.",
    points: ["Productos exclusivos", "Compras seguras"],
    cta: "Explorar Place",
    path: "/place",
  },
  {
    title: "GLOINT Tech",
    tag: "Tecnología",
    icon: Cpu,
    desc: "Herramientas accesibles para que pequeñas y medianas empresas automaticen su operación y su logística.",
    points: ["Seguimiento logístico", "Billetera digital integrada"],
    cta: "Descubrir Tech",
    path: "/tech",
  },
];

export function HomeUnits() {
  const [main, ...rest] = UNITS;
  const MainIcon = main.icon;
  return (
    <section id="unidades" className="py-16 sm:py-24" style={{ background: "var(--g-surface)" }}>
      <div className={wrap}>
        <Reveal className="max-w-2xl mb-12">
          <p className="gl-eyebrow mb-4">Nuestras unidades</p>
          <h2 className="font-montserrat font-bold text-3xl sm:text-4xl tracking-tight">Tres unidades, un mismo propósito.</h2>
          <p className="mt-4" style={{ color: "var(--g-text-muted)" }}>
            Soluciones especializadas que impulsan el crecimiento de personas, empresas e inversionistas.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-5 gap-5">
          <Reveal className="lg:col-span-3">
            <article className="h-full rounded-lg p-7 sm:p-9 flex flex-col" style={{ background: "var(--g-surface-2)", border: "1px solid var(--g-gold-deep)" }}>
              <MainIcon size={28} strokeWidth={1.5} style={{ color: "var(--g-gold)" }} aria-hidden />
              <p className="gl-eyebrow mt-6">{main.tag}</p>
              <h3 className="font-montserrat font-bold text-2xl sm:text-3xl mt-2">{main.title}</h3>
              <p className="mt-4 max-w-xl" style={{ color: "var(--g-text-muted)" }}>{main.desc}</p>
              <ul className="mt-6 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {main.points.map((p) => (
                  <li key={p} className="flex gap-2"><span aria-hidden style={{ color: "var(--g-gold)" }}>—</span>{p}</li>
                ))}
              </ul>
              <Link to={main.path} className="gl-btn-primary mt-8 self-start h-12 px-6 rounded-lg font-montserrat font-bold text-sm inline-flex items-center gap-2">
                {main.cta} <ArrowRight size={16} />
              </Link>
            </article>
          </Reveal>

          <div className="lg:col-span-2 grid gap-5">
            {rest.map((u, i) => {
              const Icon = u.icon;
              return (
                <Reveal key={u.title} delay={0.1 * (i + 1)}>
                  <article className="h-full rounded-lg p-6 sm:p-7 flex flex-col" style={{ background: "var(--g-bg)", border: "1px solid var(--g-border)" }}>
                    <div className="flex items-center gap-3">
                      <Icon size={22} strokeWidth={1.5} style={{ color: "var(--g-silver)" }} aria-hidden />
                      <p className="gl-eyebrow">{u.tag}</p>
                    </div>
                    <h3 className="font-montserrat font-bold text-xl mt-3">{u.title}</h3>
                    <p className="mt-2 text-sm" style={{ color: "var(--g-text-muted)" }}>{u.desc}</p>
                    <Link to={u.path} className="mt-5 self-start text-sm font-semibold inline-flex items-center gap-2 hover:underline" style={{ color: "var(--g-gold-light)" }}>
                      {u.cta} <ArrowRight size={14} />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Quiénes somos ───────────────────────── */
export function HomeAbout() {
  const facts = [
    { n: "+1000", l: "clientes impactados" },
    { n: "+500", l: "operaciones gestionadas" },
    { n: "3", l: "unidades de negocio" },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className={`${wrap} grid lg:grid-cols-2 gap-12 items-start`}>
        <Reveal>
          <p className="gl-eyebrow mb-4">Quiénes somos</p>
          <h2 className="font-montserrat font-bold text-3xl sm:text-4xl tracking-tight">Un grupo para crecer en la economía digital.</h2>
          <p className="mt-5 max-w-xl" style={{ color: "var(--g-text-muted)" }}>
            GLOINT es un grupo empresarial que genera oportunidades sostenibles para inversionistas, clientes y empresas que buscan crecer
            en la economía digital.
          </p>
          <p className="mt-5 text-sm" style={{ color: "var(--g-text-muted)" }}>
            {CONTACT_INFO.companyName} · NIT {CONTACT_INFO.nit} · {CONTACT_INFO.cityCountry}
          </p>
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: "var(--g-gold-light)" }}>
            Conocer más sobre nosotros <ArrowRight size={14} />
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <dl className="grid grid-cols-3 gap-4" style={{ borderTop: "1px solid var(--g-border)" }}>
            {facts.map((f) => (
              <div key={f.l} className="pt-6">
                <dt className="sr-only">{f.l}</dt>
                <dd className="font-montserrat font-extrabold text-3xl sm:text-5xl" style={{ color: "var(--g-silver)" }}>{f.n}</dd>
                <p className="mt-2 text-xs sm:text-sm" style={{ color: "var(--g-text-muted)" }}>{f.l}</p>
              </div>
            ))}
          </dl>
        </Reveal>
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
    <section className="py-16 sm:py-24" style={{ background: "var(--g-surface)" }}>
      <div className={`${wrap} grid lg:grid-cols-[0.8fr_1.2fr] gap-12`}>
        <Reveal>
          <p className="gl-eyebrow mb-4">Nuestra diferencia</p>
          <h2 className="font-montserrat font-bold text-3xl sm:text-4xl tracking-tight">Por qué elegir GLOINT.</h2>
        </Reveal>
        <ul>
          {WHY.map((w, i) => {
            const Icon = w.icon;
            return (
              <Reveal key={w.title} delay={0.05 * i}>
                <li className="flex gap-5 py-6" style={{ borderTop: "1px solid var(--g-border)" }}>
                  <Icon size={24} strokeWidth={1.5} className="shrink-0 mt-1" style={{ color: "var(--g-silver)" }} aria-hidden />
                  <div>
                    <h3 className="font-montserrat font-bold text-lg">{w.title}</h3>
                    <p className="mt-1" style={{ color: "var(--g-text-muted)" }}>{w.desc}</p>
                  </div>
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
    <section className="py-16 sm:py-20">
      <div className={wrap}>
        <Reveal>
          <p className="gl-eyebrow text-center mb-8">Aliados estratégicos</p>
          <ul className="flex flex-wrap justify-center gap-x-10 gap-y-5">
            {partners.map((p) => (
              <li key={p} className="font-montserrat font-bold text-xl tracking-wide" style={{ color: "var(--g-text-muted)" }}>{p}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Cierre ───────────────────────── */
export function HomeFinalCTA() {
  return (
    <section className="py-20 sm:py-28 text-center relative overflow-hidden" style={{ background: "var(--g-surface)" }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(50% 70% at 50% 100%, rgba(212,165,55,0.14), transparent 70%)" }} />
      <Reveal className={`${wrap} relative`}>
        <img src="/logos/brand/g.jpg" alt="" aria-hidden className="gl-logo h-20 w-auto mx-auto mb-8" />
        <h2 className="font-montserrat font-bold text-3xl sm:text-4xl tracking-tight max-w-2xl mx-auto">¿Listo para crecer con GLOINT?</h2>
        <p className="mt-4 max-w-xl mx-auto" style={{ color: "var(--g-text-muted)" }}>Cuéntanos qué necesitas y un asesor te acompaña en el siguiente paso.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-primary h-12 px-7 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">
            Hablar con un asesor
          </a>
          <Link to="/onboarding" className="gl-btn-secondary h-12 px-7 rounded-lg font-montserrat font-bold text-sm inline-flex items-center justify-center">
            Crear cuenta
          </Link>
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
