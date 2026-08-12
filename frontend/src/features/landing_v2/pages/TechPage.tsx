import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ShoppingBag, Cpu, Shield, Globe, Zap, Activity
} from "lucide-react";
import { FadeUp } from "../utils/animations";
import { DARK, DARK2, GOLD, ORANGE } from "../utils/constants";
import { SharedFooter } from "../components/SharedFooter";

export function TechPage() {
  const navigate = useNavigate();
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

  const handleGoToGlointech = () => window.open("https://glointech.com.co", "_blank", "noopener,noreferrer");

  const handleScrollToProcess = () => document.getElementById("proceso")?.scrollIntoView({ behavior: "smooth" });

  return (
    <>
      {/* HERO */}
      <section className="relative pt-36 pb-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0d1e3a 100%)` }}>
        <motion.div
          className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${BLUE}15 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/4 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${BLUE}`, color: BLUE, background: `${BLUE}10` }}>
              <Cpu size={13} /> GLOINT Tech
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
              Desarrollos digitales <span style={{ color: BLUE }}>a la medida</span>
            </h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Construimos soluciones tecnológicas personalizadas: desde aplicaciones web y e-commerce hasta sistemas empresariales complejos, siempre adaptados exactamente a lo que tu negocio necesita.
            </p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={handleScrollToProcess}
                className="px-8 py-4 rounded-xl font-bold text-white"
                style={{ background: `linear-gradient(90deg, ${BLUE}, #3b82f6)` }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Ver nuestro proceso
              </motion.button>

              <motion.button
                onClick={handleGoToGlointech}
                className="px-8 py-4 rounded-xl font-bold"
                style={{ border: `1px solid ${BLUE}`, color: BLUE, background: `${BLUE}10` }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                glointech
              </motion.button>
            </div>
          </FadeUp>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 50" fill="none" className="w-full">
            <path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="py-24" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp>
            <div className="text-center mb-14">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Servicios</div>
              <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
                ¿Qué <span style={{ color: BLUE }}>desarrollamos</span>?
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
                Cada proyecto es único. Trabajamos contigo para entender tu visión y traducirla en una solución digital que realmente funcione.
              </p>
            </div>
          </FadeUp>

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

      {/* NUESTRA DIFERENCIA */}
      <section className="py-24" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeUp>
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
                    <motion.div
                      key={label}
                      className="p-4 rounded-xl"
                      style={{ background: `${BLUE}0A`, border: `1px solid ${BLUE}20` }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <div className="w-2 h-2 rounded-full mb-2" style={{ background: BLUE }} />
                      <div className="text-white font-bold text-sm">{label}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* CODE MOCKUP */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7 }}
            >
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-slate-500">gloint-tech / proyecto-cliente.ts</span>
              </div>

              <div className="p-5 font-mono text-xs leading-relaxed">
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                  <div><span style={{ color: "#ff79c6" }}>const</span> <span style={{ color: "#50fa7b" }}>proyecto</span> <span style={{ color: "#f8f8f2" }}>= {"{"}</span></div>
                  <div className="ml-4"><span style={{ color: "#8be9fd" }}>cliente</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Tu empresa"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                  <div className="ml-4"><span style={{ color: "#8be9fd" }}>tipo</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Desarrollo a la medida"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                  <div className="ml-4"><span style={{ color: "#8be9fd" }}>stack</span><span style={{ color: "#f8f8f2" }}>: [</span><span style={{ color: "#f1fa8c" }}>"React"</span><span style={{ color: "#f8f8f2" }}>, </span><span style={{ color: "#f1fa8c" }}>"Node.js"</span><span style={{ color: "#f8f8f2" }}>, </span><span style={{ color: "#f1fa8c" }}>"PostgreSQL"</span><span style={{ color: "#f8f8f2" }}>],</span></div>
                  <div className="ml-4"><span style={{ color: "#8be9fd" }}>entrega</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#f1fa8c" }}>"Iterativa"</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                  <div className="ml-4"><span style={{ color: "#8be9fd" }}>soporte</span><span style={{ color: "#f8f8f2" }}>:</span> <span style={{ color: "#50fa7b" }}>true</span><span style={{ color: "#f8f8f2" }}>,</span></div>
                  <div><span style={{ color: "#f8f8f2" }}>{"}"}</span></div>
                  <div className="mt-3"><span style={{ color: "#6272a4" }}>// Listo para escalar 🚀</span></div>
                  <div className="mt-1"><span style={{ color: "#ff79c6" }}>export default</span> <span style={{ color: "#50fa7b" }}>proyecto</span></div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp>
            <div className="text-center mb-14">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Metodología</div>
              <h2 className="text-3xl md:text-4xl font-black mb-4" style={{ color: DARK }}>
                Nuestro <span style={{ color: BLUE }}>proceso</span> de trabajo
              </h2>
              <p className="text-slate-500 max-w-lg mx-auto text-sm">
                Un flujo claro y colaborativo para que tu proyecto llegue a buen puerto, siempre.
              </p>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, idx) => (
              <motion.div
                key={s.n}
                className="relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
              >
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px z-0" style={{ background: `linear-gradient(90deg, ${BLUE}50, transparent)` }} />
                )}

                <motion.div
                  className="p-6 rounded-2xl relative z-10"
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg mb-4"
                    style={{ background: `linear-gradient(135deg, ${BLUE}, #3b82f6)`, color: "#fff" }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    {s.n}
                  </motion.div>

                  <h3 className="font-bold text-sm mb-2" style={{ color: DARK }}>{s.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TECNOLOGÍAS */}
      <section className="py-16" style={{ background: DARK2 }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <FadeUp>
            <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: BLUE }}>Tecnologías</div>
            <h2 className="text-xl font-black text-white mb-8">
              Trabajamos con el <span style={{ color: BLUE }}>mejor stack</span> del mercado
            </h2>
          </FadeUp>

          <div className="flex flex-wrap justify-center gap-3">
            {techs.map((t, i) => (
              <motion.span
                key={t}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: `${BLUE}0F`, border: `1px solid ${BLUE}25`, color: "#94a3b8" }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                whileHover={{ scale: 1.08, y: -2 }}
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section className="py-16" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { n: "+50", label: "Proyectos entregados" },
              { n: "100%", label: "Código a la medida" },
              { n: "0", label: "Plantillas genéricas" },
              { n: "24/7", label: "Soporte post-lanzamiento" },
            ].map(({ n, label }, i) => (
              <FadeUp key={label} delay={i * 0.1}>
                <motion.div whileHover={{ y: -5 }}>
                  <div
                    className="text-3xl md:text-4xl font-black mb-2"
                    style={{ background: `linear-gradient(90deg, ${BLUE}, ${GOLD})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {n}
                  </div>
                  <div className="text-slate-400 text-xs">{label}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #0a1628 100%)` }}>
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 50%, ${BLUE}15 0%, transparent 60%)` }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

        <FadeUp>
          <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
              ¿Tienes un proyecto en <span style={{ color: BLUE }}>mente</span>?
            </h2>

            <p className="text-slate-300 mb-10 leading-relaxed">
              Cuéntanos qué necesitas construir. Te respondemos con una propuesta técnica sin compromisos, pensada exclusivamente para tu negocio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={handleGoToGlointech}
                className="px-8 py-4 rounded-xl font-bold text-white"
                style={{ background: `linear-gradient(90deg, ${BLUE}, #3b82f6)` }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                glointech
              </motion.button>

              <motion.button
                onClick={() => { navigate("/about"); window.scrollTo({ top: 0 }); }}
                className="px-8 py-4 rounded-xl font-bold"
                style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Conocer más sobre GLOINT
              </motion.button>
            </div>
          </div>
        </FadeUp>
      </section>

      <SharedFooter />
    </>
  );
}