import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Plus, ShieldCheck, FileText, Lock, Building2, MapPin, Mail, Phone, Clock, AlertTriangle } from "lucide-react";
import { CONTACT_INFO } from "../../../../constants/contactInfo";

const wrap = "max-w-[1120px] mx-auto px-4 sm:px-6";
const muted = { color: "var(--g-text-muted)" };

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function Heading({ eyebrow, title, children, className = "" }: { eyebrow: string; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <p className="gl-eyebrow mb-4">{eyebrow}</p>
      <h2 className="gl-serif text-3xl sm:text-[2.75rem] leading-[1.12]">{title}</h2>
      {children && <p className="mt-5 text-lg leading-relaxed" style={muted}>{children}</p>}
    </div>
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
    { icon: Building2, k: "Razón social", v: CONTACT_INFO.companyName },
    { icon: FileText, k: "NIT", v: CONTACT_INFO.nit },
    { icon: ShieldCheck, k: "Registro", v: "Constituida y registrada en la Cámara de Comercio de Bogotá" },
    { icon: MapPin, k: "Domicilio", v: CONTACT_INFO.cityCountry },
  ];
  return (
    <section className="pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className={`${wrap} grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center`}>
        <div>
          <p className="gl-eyebrow mb-6">Grupo empresarial · Bogotá, Colombia</p>
          <h1 className="gl-serif text-[2.5rem] sm:text-6xl leading-[1.06]">
            Inversión con contratos claros y gestión profesional del capital.
          </h1>
          <p className="mt-7 text-lg leading-relaxed max-w-xl" style={muted}>
            GLOINT es un grupo empresarial con tres unidades: inversión, comercio electrónico y tecnología.
            GLOINT Investment gestiona capital en mercados digitales y modelos de comercio electrónico.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#como-funciona" className="gl-btn-primary h-12 px-7 rounded-lg font-semibold text-sm inline-flex items-center justify-center gap-2">
              Ver cómo funciona <ArrowRight size={16} />
            </a>
            <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-secondary h-12 px-7 rounded-lg font-semibold text-sm inline-flex items-center justify-center">
              Hablar con un asesor
            </a>
          </div>
          <p className="mt-6 text-sm" style={muted}>
            Toda inversión implica riesgos. <a href="#riesgos" className="underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>Leer el aviso de riesgo</a>.
          </p>
        </div>

        <div className="gl-on-ink rounded-xl overflow-hidden" style={{ background: "var(--g-ink)", border: "1px solid var(--g-gold-line)" }}>
          <div className="px-8 pt-8 pb-6 flex justify-center" style={{ background: "#050505" }}>
            <img src="/logos/brand/full.jpg" alt="GLOINT Group" className="gl-logo w-[200px] sm:w-[240px] h-auto" />
          </div>
          <div className="gl-hairline" />
          <dl className="p-6 sm:p-8 space-y-5">
            <p className="gl-eyebrow">Datos de la empresa</p>
            {data.map(({ icon: Icon, k, v }) => (
              <div key={k} className="flex gap-4">
                <Icon size={18} strokeWidth={1.5} className="shrink-0 mt-1" style={{ color: "var(--g-gold)" }} aria-hidden />
                <div>
                  <dt className="text-xs uppercase tracking-wider" style={{ color: "var(--g-d-muted)" }}>{k}</dt>
                  <dd className="mt-0.5 text-[15px]" style={{ color: "var(--g-d-text)" }}>{v}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Cómo funciona ───────────────────────── */
const STEPS = [
  { n: "1", title: "Regístrate", desc: "Crea tu cuenta en GLOINT y accede al panel de inversionista, sin papeleo." },
  { n: "2", title: "Selecciona tu paquete", desc: "Elige el paquete de inversión que se adapte a tus objetivos y el periodo de tu contrato." },
  { n: "3", title: "Recibe tu rentabilidad", desc: "Recibes tu rentabilidad mensual según el monto de tu inversión, desde tu panel." },
];

export function HomeHow() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28" style={{ background: "var(--g-surface)", borderTop: "1px solid var(--g-border)" }}>
      <div className={wrap}>
        <Reveal><Heading eyebrow="Cómo funciona" title="Un proceso claro, en tres pasos." className="mb-14" /></Reveal>
        <ol className="grid md:grid-cols-3 gap-10 md:gap-0">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.08 * i}>
              <li className="md:px-8 md:first:pl-0 md:last:pr-0" style={{ borderLeft: i ? "1px solid var(--g-border)" : undefined }}>
                <span className="gl-serif text-6xl leading-none" style={{ color: "var(--g-gold-line)" }} aria-hidden>{s.n}</span>
                <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed" style={muted}>{s.desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── Planes y riesgo ───────────────────────── */
export function HomePlans() {
  const plans = ["6 meses", "12 meses", "18 meses"];
  return (
    <section className="py-20 sm:py-28">
      <div className={`${wrap} grid lg:grid-cols-2 gap-12 lg:gap-20 items-start`}>
        <Reveal>
          <Heading eyebrow="Planes de inversión" title="Contratos a plazo definido.">
            GLOINT Investment ofrece planes contractuales de 6, 12 y 18 meses. Las condiciones y rentabilidades proyectadas de cada plan se detallan en la página de la unidad.
          </Heading>
          <Link to="/investment" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-text)" }}>
            Ver condiciones de cada plan <ArrowRight size={14} />
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="rounded-xl overflow-hidden" style={{ background: "var(--g-surface)", border: "1px solid var(--g-border)" }}>
            {plans.map((p, i) => (
              <li key={p} className="flex items-center justify-between px-6 py-5" style={{ borderTop: i ? "1px solid var(--g-border)" : undefined }}>
                <span className="gl-serif text-2xl">Plan a {p}</span>
                <span className="text-sm" style={muted}>Contrato a plazo fijo</span>
              </li>
            ))}
          </ul>
          <div className="mt-6"><RiskNotice id="riesgos" /></div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── Cumplimiento ───────────────────────── */
export function HomeCompliance() {
  const items = [
    { icon: ShieldCheck, title: "Prevención de lavado de activos", desc: "GLOINT adopta políticas y procedimientos conforme al SARLAFT y a las buenas prácticas del SAGRILAFT.", to: "/terminos", cta: "Términos y condiciones" },
    { icon: Lock, title: "Protección de datos personales", desc: "Tratamos tu información según nuestra política de privacidad, que describe tus derechos y los canales para ejercerlos.", to: "/privacidad", cta: "Política de privacidad" },
    { icon: FileText, title: "Información legal visible", desc: "Razón social, NIT y datos de contacto están publicados en el sitio, junto con el aviso legal.", to: "/legal", cta: "Aviso legal" },
  ];
  return (
    <section className="gl-on-ink py-20 sm:py-28" style={{ background: "var(--g-ink)", color: "var(--g-d-text)" }}>
      <div className={wrap}>
        <Reveal>
          <div className="max-w-2xl mb-14">
            <p className="gl-eyebrow mb-4">Cumplimiento y transparencia</p>
            <h2 className="gl-serif text-3xl sm:text-[2.75rem] leading-[1.12]">Cómo cuidamos tu información y tu dinero.</h2>
          </div>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ background: "rgba(245,243,238,0.14)" }}>
          {items.map(({ icon: Icon, title, desc, to, cta }, i) => (
            <Reveal key={title} delay={0.08 * i}>
              <div className="h-full p-8 flex flex-col" style={{ background: "var(--g-ink-2)" }}>
                <Icon size={26} strokeWidth={1.5} style={{ color: "var(--g-gold)" }} aria-hidden />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed flex-1" style={{ color: "var(--g-d-muted)" }}>{desc}</p>
                <Link to={to} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" style={{ color: "var(--g-gold-light)" }}>
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
    <section id="unidades" className="py-20 sm:py-28">
      <div className={wrap}>
        <Reveal><Heading eyebrow="El grupo" title="Tres unidades de negocio." className="mb-12" /></Reveal>
        <ul>
          {UNITS.map((u, i) => (
            <Reveal key={u.name} delay={0.05 * i}>
              <li className="grid md:grid-cols-[0.9fr_1.4fr_200px] gap-4 md:gap-10 items-center py-8" style={{ borderTop: "1px solid var(--g-border)", borderBottom: i === UNITS.length - 1 ? "1px solid var(--g-border)" : undefined }}>
                <div>
                  <p className="gl-eyebrow">{u.tag}</p>
                  <h3 className="gl-serif text-2xl mt-1">{u.name}</h3>
                </div>
                <p className="leading-relaxed" style={muted}>{u.desc}</p>
                <Link to={u.to} className="gl-btn-secondary h-11 px-5 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 justify-self-start md:justify-self-end md:w-full">
                  {u.cta} <ArrowRight size={14} />
                </Link>
              </li>
            </Reveal>
          ))}
        </ul>
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
    <section className="py-20 sm:py-28" style={{ background: "var(--g-surface)", borderTop: "1px solid var(--g-border)" }}>
      <div className={`${wrap} grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20`}>
        <Heading eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarnos." />
        <div className="gl-faq">
          {faqs.map(({ q, a }, i) => (
            <details key={q} className="group" style={{ borderTop: "1px solid var(--g-border)", borderBottom: i === faqs.length - 1 ? "1px solid var(--g-border)" : undefined }}>
              <summary className="flex items-center justify-between gap-6 py-5 text-lg font-semibold">
                {q}
                <Plus size={20} className="gl-faq-icon shrink-0 transition-transform" style={{ color: "var(--g-gold-text)" }} aria-hidden />
              </summary>
              <div className="pb-6 leading-relaxed max-w-prose" style={muted}>{a}</div>
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
    <section className="gl-on-ink py-20 sm:py-28" style={{ background: "var(--g-ink)", color: "var(--g-d-text)" }}>
      <div className={`${wrap} grid lg:grid-cols-2 gap-12 items-center`}>
        <Reveal>
          <p className="gl-eyebrow mb-4">Contacto</p>
          <h2 className="gl-serif text-3xl sm:text-5xl leading-[1.1]">Hable con un asesor antes de decidir.</h2>
          <p className="mt-5 text-lg leading-relaxed max-w-md" style={{ color: "var(--g-d-muted)" }}>Resolvemos sus dudas sobre los planes, los contratos y el proceso, sin compromiso.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <a href={CONTACT_INFO.whatsappLink} target="_blank" rel="noopener noreferrer" className="gl-btn-primary h-12 px-7 rounded-lg font-semibold text-sm inline-flex items-center justify-center">Hablar con un asesor</a>
            <Link to="/onboarding" className="gl-btn-secondary h-12 px-7 rounded-lg font-semibold text-sm inline-flex items-center justify-center">Crear cuenta</Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="rounded-xl p-7 sm:p-9 space-y-5" style={{ background: "var(--g-ink-2)", border: "1px solid rgba(245,243,238,0.14)" }}>
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
            <img src="/logos/brand/wordmark.jpg" alt="GLOINT Group" className="gl-logo h-10 w-auto -ml-1" />
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
