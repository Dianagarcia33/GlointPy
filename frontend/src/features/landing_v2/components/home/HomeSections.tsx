import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Plus, MapPin, Mail, Phone, Clock, AlertTriangle } from "lucide-react";
import { CONTACT_INFO } from "../../../../constants/contactInfo";

const wrap = "max-w-[1200px] mx-auto px-4 sm:px-8";
const muted = { color: "var(--g-text-muted)" };
const dMuted = { color: "rgba(245,243,238,0.82)" };

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Aviso de riesgo: borrador visible hasta que lo apruebe el área legal. */
export function RiskNotice({ id }: { id?: string }) {
  return (
    <aside id={id} className="rounded-lg p-5 sm:p-6 flex gap-4" style={{ background: "var(--g-warn-bg)", borderLeft: "4px solid var(--g-gold-line)", color: "var(--g-warn-text)" }} aria-label="Aviso de riesgo">
      <AlertTriangle size={22} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-base">Aviso de riesgo</p>
        <p className="mt-1">
          Toda inversión implica riesgos, incluida la posible pérdida parcial o total del capital. Las rentabilidades se presentan como proyecciones y no constituyen una garantía.
        </p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider">Borrador: pendiente de revisión y aprobación del área legal</p>
      </div>
    </aside>
  );
}

/* ───────────────────────── Portada ───────────────────────── */
export function HomeHero() {
  const data = [
    { k: "Razón social", v: CONTACT_INFO.companyName },
    { k: "NIT", v: CONTACT_INFO.nit },
    { k: "Registro", v: "Cámara de Comercio de Bogotá" },
    { k: "Domicilio", v: CONTACT_INFO.cityCountry },
  ];
  return (
    <section className="gl-on-ink relative isolate overflow-hidden min-h-[100svh] lg:min-h-[880px] flex flex-col justify-end text-white" style={{ background: "#050A14" }}>
      <img src="/photos/hero-bogota.jpg" alt="Vista aérea de Bogotá al atardecer" width={1800} height={1200} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(90deg, rgba(5,10,20,0.94) 0%, rgba(5,10,20,0.80) 42%, rgba(5,10,20,0.32) 100%), linear-gradient(0deg, rgba(5,10,20,0.92) 0%, transparent 38%)" }} />

      <div className={`${wrap} w-full pt-40 pb-16 sm:pb-20`}>
        <p className="gl-eyebrow mb-8 flex items-center gap-4"><span aria-hidden className="inline-block h-px w-12" style={{ background: "var(--g-gold)" }} />Grupo empresarial · Bogotá, Colombia</p>
        <h1 className="gl-serif text-[2.75rem] sm:text-7xl lg:text-[5.25rem] leading-[1.03] max-w-4xl">
          Inversión con contratos claros y gestión profesional del capital.
        </h1>
        <p className="mt-8 text-lg sm:text-xl leading-relaxed max-w-2xl" style={dMuted}>
          GLOINT es un grupo empresarial con tres unidades: inversión, comercio electrónico y tecnología.
          GLOINT Investment gestiona capital en mercados digitales y modelos de comercio electrónico.
        </p>
        <div className="mt-11 flex flex-col sm:flex-row gap-3">
          <a href="#como-funciona" className="gl-btn-primary h-14 px-8 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2">
            Ver cómo funciona <ArrowRight size={16} />
          </a>
          <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-secondary h-14 px-8 rounded-lg font-semibold text-sm inline-flex items-center justify-center">
            Hablar con un asesor
          </a>
        </div>
        <p className="mt-6 text-sm" style={dMuted}>
          Toda inversión implica riesgos. <a href="#riesgos" className="underline underline-offset-4" style={{ color: "var(--g-gold-light)" }}>Leer el aviso de riesgo</a>.
        </p>
      </div>

      <div style={{ borderTop: "1px solid rgba(245,243,238,0.22)", background: "rgba(5,10,20,0.72)" }}>
        <dl className={`${wrap} grid grid-cols-2 lg:grid-cols-4`}>
          {data.map(({ k, v }, i) => (
            <div key={k} className="py-6 pr-6 lg:px-8 lg:first:pl-0" style={{ borderLeft: i ? "1px solid rgba(245,243,238,0.16)" : undefined, paddingLeft: i ? 24 : 0 }}>
              <dt className="text-xs uppercase tracking-[0.14em]" style={{ color: "var(--g-gold)" }}>{k}</dt>
              <dd className="mt-1.5 text-[15px] leading-snug" style={{ color: "var(--g-d-text)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ───────────────────────── Quiénes somos ───────────────────────── */
export function HomeAbout() {
  return (
    <section className="py-28 sm:py-40">
      <div className={`${wrap} grid lg:grid-cols-[0.35fr_1fr] gap-10 lg:gap-20`}>
        <p className="gl-eyebrow">Quiénes somos</p>
        <Reveal>
          <p className="gl-serif text-3xl sm:text-[2.75rem] leading-[1.2]">
            Desarrollamos soluciones en inversión, comercio electrónico y tecnología para generar oportunidades sostenibles a inversionistas, clientes y empresas.
          </p>
          <p className="mt-8 text-lg leading-relaxed max-w-2xl" style={muted}>
            {CONTACT_INFO.companyName} es una sociedad constituida y registrada en la Cámara de Comercio de Bogotá, con NIT {CONTACT_INFO.nit}.
          </p>
          <Link to="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>
            Conocer más sobre nosotros <ArrowRight size={14} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Cómo funciona ───────────────────────── */
const STEPS = [
  { n: "01", title: "Regístrate", desc: "Crea tu cuenta en GLOINT y accede al panel de inversionista, sin papeleo." },
  { n: "02", title: "Selecciona tu paquete", desc: "Elige el paquete de inversión que se adapte a tus objetivos y el periodo de tu contrato." },
  { n: "03", title: "Recibe tu rentabilidad", desc: "Recibes tu rentabilidad mensual según el monto de tu inversión, desde tu panel." },
];

export function HomeHow() {
  return (
    <section id="como-funciona" style={{ background: "var(--g-surface)", borderTop: "1px solid var(--g-border)" }}>
      <div className="grid lg:grid-cols-2">
        <div className="relative min-h-[320px] lg:min-h-[640px]">
          <img src="/photos/glass-curve.jpg" alt="Fachada curva de vidrio de un edificio de oficinas" width={1400} height={933} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="px-4 sm:px-12 lg:px-20 py-20 sm:py-28 max-w-[720px]">
          <Reveal>
            <p className="gl-eyebrow mb-5">Cómo funciona</p>
            <h2 className="gl-serif text-4xl sm:text-5xl leading-[1.1]">Un proceso claro, en tres pasos.</h2>
          </Reveal>
          <ol className="mt-12">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.08 * i}>
                <li className="flex gap-6 py-7" style={{ borderTop: "1px solid var(--g-border)" }}>
                  <span className="gl-serif text-3xl w-12 shrink-0" style={{ color: "var(--g-gold-line)" }} aria-hidden>{s.n}</span>
                  <div>
                    <h3 className="text-xl font-semibold">{s.title}</h3>
                    <p className="mt-2 leading-relaxed" style={muted}>{s.desc}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Planes y riesgo ───────────────────────── */
export function HomePlans() {
  const plans = ["6", "12", "18"];
  return (
    <section className="gl-on-ink py-28 sm:py-36" style={{ background: "var(--g-ink)", color: "var(--g-d-text)" }}>
      <div className={wrap}>
        <Reveal className="max-w-2xl">
          <p className="gl-eyebrow mb-5">Planes de inversión</p>
          <h2 className="gl-serif text-4xl sm:text-5xl leading-[1.1]">Contratos a plazo definido.</h2>
          <p className="mt-6 text-lg leading-relaxed" style={dMuted}>
            GLOINT Investment ofrece planes contractuales de 6, 12 y 18 meses. Las condiciones y rentabilidades proyectadas de cada plan se detallan en la página de la unidad.
          </p>
        </Reveal>
        <ul className="mt-16 grid md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p} delay={0.08 * i}>
              <li className="py-10 md:px-10 md:first:pl-0" style={{ borderTop: "1px solid var(--g-gold)", borderLeft: i ? "1px solid rgba(245,243,238,0.16)" : undefined }}>
                <span className="gl-serif text-[7rem] sm:text-[9rem] leading-none block" style={{ color: "var(--g-gold-light)" }}>{p}</span>
                <span className="mt-2 block text-lg font-semibold">meses</span>
                <span className="mt-1 block text-sm" style={{ color: "var(--g-d-muted)" }}>Contrato a plazo fijo</span>
              </li>
            </Reveal>
          ))}
        </ul>
        <div className="mt-6 flex flex-col lg:flex-row gap-8 lg:items-center lg:justify-between">
          <Link to="/investment" className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-light)" }}>
            Ver condiciones de cada plan <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-10 max-w-3xl"><RiskNotice id="riesgos" /></div>
      </div>
    </section>
  );
}

/* ───────────────────────── Cumplimiento ───────────────────────── */
export function HomeCompliance() {
  const items = [
    { title: "Prevención de lavado de activos", desc: "GLOINT adopta políticas y procedimientos conforme al SARLAFT y a las buenas prácticas del SAGRILAFT.", to: "/terminos", cta: "Términos y condiciones" },
    { title: "Protección de datos personales", desc: "Tratamos tu información según nuestra política de privacidad, que describe tus derechos y los canales para ejercerlos.", to: "/privacidad", cta: "Política de privacidad" },
    { title: "Información legal visible", desc: "Razón social, NIT y datos de contacto están publicados en el sitio, junto con el aviso legal.", to: "/legal", cta: "Aviso legal" },
  ];
  return (
    <section className="py-28 sm:py-36">
      <div className={wrap}>
        <Reveal className="max-w-2xl mb-16">
          <p className="gl-eyebrow mb-5">Cumplimiento y transparencia</p>
          <h2 className="gl-serif text-4xl sm:text-5xl leading-[1.1]">Cómo cuidamos tu información y tu dinero.</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-10 md:gap-12">
          {items.map(({ title, desc, to, cta }, i) => (
            <Reveal key={title} delay={0.08 * i}>
              <div className="pt-6 h-full flex flex-col" style={{ borderTop: "2px solid var(--g-gold-line)" }}>
                <h3 className="gl-serif text-2xl leading-snug">{title}</h3>
                <p className="mt-4 leading-relaxed flex-1" style={muted}>{desc}</p>
                <Link to={to} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>
                  {cta} <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Unidades ───────────────────────── */
const UNITS = [
  { name: "GLOINT Investment", tag: "Inversión", desc: "Gestión estratégica de capital en mercados digitales y modelos de comercio electrónico de alto potencial.", to: "/investment", cta: "Conocer Investment" },
  { name: "GLOINT Place", tag: "Comercio electrónico", desc: "Productos innovadores y de tendencia, con compras seguras y envíos a toda Colombia.", to: "/place", cta: "Explorar Place" },
  { name: "GLOINT Tech", tag: "Tecnología", desc: "Herramientas accesibles para que pequeñas y medianas empresas automaticen su operación y su logística.", to: "/tech", cta: "Descubrir Tech" },
];

export function HomeUnits() {
  return (
    <section id="unidades" style={{ background: "var(--g-surface-2)" }}>
      <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative min-h-[300px] lg:min-h-full order-2 lg:order-1">
          <img src="/photos/glass-facade.jpg" alt="Fachada acristalada de un edificio corporativo" width={1400} height={933} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="order-1 lg:order-2 px-4 sm:px-12 lg:px-20 py-20 sm:py-28">
          <Reveal>
            <p className="gl-eyebrow mb-5">El grupo</p>
            <h2 className="gl-serif text-4xl sm:text-5xl leading-[1.1]">Tres unidades de negocio.</h2>
          </Reveal>
          <ul className="mt-12">
            {UNITS.map((u, i) => (
              <Reveal key={u.name} delay={0.05 * i}>
                <li className="py-8" style={{ borderTop: "1px solid var(--g-border)", borderBottom: i === UNITS.length - 1 ? "1px solid var(--g-border)" : undefined }}>
                  <p className="gl-eyebrow">{u.tag}</p>
                  <h3 className="gl-serif text-3xl mt-1">{u.name}</h3>
                  <p className="mt-3 leading-relaxed max-w-lg" style={muted}>{u.desc}</p>
                  <Link to={u.to} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>
                    {u.cta} <ArrowRight size={14} />
                  </Link>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Preguntas frecuentes ───────────────────────── */
export function HomeFAQ() {
  const faqs: { q: string; a: React.ReactNode }[] = [
    { q: "¿Quién está detrás de GLOINT?", a: `GLOINT es la marca de ${CONTACT_INFO.companyName}, NIT ${CONTACT_INFO.nit}, sociedad constituida y registrada en la Cámara de Comercio de Bogotá, con oficina en ${CONTACT_INFO.cityCountry}.` },
    { q: "¿Qué plazos tienen los contratos de inversión?", a: <>Los planes contractuales son de 6, 12 y 18 meses. Las condiciones de cada uno están en <Link to="/investment" className="underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>GLOINT Investment</Link>.</> },
    { q: "¿Cómo empiezo?", a: "Creas tu cuenta, seleccionas el paquete de inversión y el periodo, y recibes tu rentabilidad mensual según el monto de tu inversión desde el panel de inversionista." },
    { q: "¿Qué verificaciones realizan?", a: "Conforme al SARLAFT y al SAGRILAFT, al aceptar los términos y condiciones autorizas consultas en listas restrictivas y centrales de riesgo." },
    { q: "¿Qué riesgos tiene invertir?", a: <RiskNotice /> },
    { q: "¿Cómo y cuándo puedo hablar con alguien?", a: `${CONTACT_INFO.hours}. Escríbenos a ${CONTACT_INFO.email}, por WhatsApp al ${CONTACT_INFO.phone}, o visítanos en ${CONTACT_INFO.fullAddress}.` },
  ];
  return (
    <section className="py-28 sm:py-36" style={{ background: "var(--g-surface)", borderTop: "1px solid var(--g-border)" }}>
      <div className={`${wrap} grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-24`}>
        <div>
          <p className="gl-eyebrow mb-5">Preguntas frecuentes</p>
          <h2 className="gl-serif text-4xl sm:text-5xl leading-[1.1]">Lo que suelen preguntarnos.</h2>
        </div>
        <div className="gl-faq">
          {faqs.map(({ q, a }, i) => (
            <details key={q} style={{ borderTop: "1px solid var(--g-border)", borderBottom: i === faqs.length - 1 ? "1px solid var(--g-border)" : undefined }}>
              <summary className="flex items-center justify-between gap-6 py-6 text-lg font-semibold">
                {q}
                <Plus size={20} className="gl-faq-icon shrink-0 transition-transform" style={{ color: "var(--g-gold-text)" }} aria-hidden />
              </summary>
              <div className="pb-7 leading-relaxed max-w-prose" style={muted}>{a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Contacto ───────────────────────── */
export function HomeContact() {
  const rows = [
    { icon: MapPin, v: CONTACT_INFO.fullAddress },
    { icon: Clock, v: CONTACT_INFO.hours },
    { icon: Mail, v: CONTACT_INFO.email, href: `mailto:${CONTACT_INFO.email}` },
    { icon: Phone, v: CONTACT_INFO.phone, href: CONTACT_INFO.whatsappLink },
  ];
  return (
    <section className="gl-on-ink relative isolate overflow-hidden py-28 sm:py-36 text-white" style={{ background: "#050A14" }}>
      <img src="/photos/glass-facade.jpg" alt="" aria-hidden width={1400} height={933} loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: "linear-gradient(90deg, rgba(5,10,20,0.95), rgba(5,10,20,0.82))" }} />
      <div className={`${wrap} grid lg:grid-cols-2 gap-14 items-center`}>
        <Reveal>
          <p className="gl-eyebrow mb-5">Contacto</p>
          <h2 className="gl-serif text-4xl sm:text-6xl leading-[1.06]">Hable con un asesor antes de decidir.</h2>
          <p className="mt-6 text-lg leading-relaxed max-w-md" style={dMuted}>Resolvemos sus dudas sobre los planes, los contratos y el proceso, sin compromiso.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-primary h-14 px-8 rounded-lg font-semibold text-sm inline-flex items-center justify-center">Hablar con un asesor</a>
            <Link to="/onboarding" className="gl-btn-secondary h-14 px-8 rounded-lg font-semibold text-sm inline-flex items-center justify-center">Crear cuenta</Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="space-y-6" style={{ borderTop: "1px solid rgba(245,243,238,0.22)", paddingTop: 32 }}>
            {rows.map(({ icon: Icon, v, href }) => (
              <li key={v} className="flex gap-4">
                <Icon size={20} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: "var(--g-gold)" }} aria-hidden />
                {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="underline-offset-4 hover:underline break-all">{v}</a> : <span>{v}</span>}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Pie ───────────────────────── */
export function HomeFooter() {
  const linkCls = "text-sm hover:underline underline-offset-4";
  const dm = { color: "var(--g-d-muted)" };
  return (
    <footer className="gl-on-ink pt-16 pb-8" style={{ background: "#050505", color: "var(--g-d-text)", borderTop: "1px solid rgba(245,243,238,0.14)" }}>
      <div className={wrap}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div>
            <img src="/logos/brand/wordmark.png" alt="GLOINT Group" className="gl-logo h-10 w-auto -ml-1" />
            <p className="mt-4 text-sm leading-relaxed" style={dm}>{CONTACT_INFO.companyName}<br />NIT {CONTACT_INFO.nit}</p>
            <div className="mt-5 flex gap-4 text-sm">
              <a href={CONTACT_INFO.socials.facebook} target="_blank" rel="noopener noreferrer" className={linkCls} style={dm}>Facebook</a>
              <a href={CONTACT_INFO.socials.instagram} target="_blank" rel="noopener noreferrer" className={linkCls} style={dm}>Instagram</a>
            </div>
          </div>
          <nav aria-label="Empresa">
            <h3 className="font-semibold text-sm mb-4">Empresa</h3>
            <ul className="space-y-2">
              <li><Link to="/" className={linkCls} style={dm}>Inicio</Link></li>
              <li><Link to="/about" className={linkCls} style={dm}>Nosotros</Link></li>
              <li><Link to="/contact" className={linkCls} style={dm}>Contacto</Link></li>
            </ul>
          </nav>
          <nav aria-label="Unidades">
            <h3 className="font-semibold text-sm mb-4">Unidades</h3>
            <ul className="space-y-2">
              <li><Link to="/investment" className={linkCls} style={dm}>GLOINT Investment</Link></li>
              <li><Link to="/place" className={linkCls} style={dm}>GLOINT Place</Link></li>
              <li><Link to="/tech" className={linkCls} style={dm}>GLOINT Tech</Link></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h3 className="font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/privacidad" className={linkCls} style={dm}>Política de privacidad</Link></li>
              <li><Link to="/terminos" className={linkCls} style={dm}>Términos y condiciones</Link></li>
              <li><Link to="/legal" className={linkCls} style={dm}>Aviso legal</Link></li>
              <li><a href={`mailto:${CONTACT_INFO.pqrsEmail}`} className={linkCls} style={dm}>PQRS: {CONTACT_INFO.pqrsEmail}</a></li>
            </ul>
          </nav>
        </div>
        <p className="pt-6 text-xs leading-relaxed" style={{ ...dm, borderTop: "1px solid rgba(245,243,238,0.14)" }}>
          © GLOINT 2026. Todos los derechos reservados. Toda inversión implica riesgos; las rentabilidades son proyecciones y no una garantía.
        </p>
      </div>
    </footer>
  );
}
