import { useNavigate } from "react-router-dom";
import React from "react";
import { motion } from "motion/react";
import { ShoppingBag, Package, Shield, Truck, Star, ArrowRight, CheckCircle } from "lucide-react";
import { FadeUp } from "../utils/animations";
import { DARK, ORANGE } from "../utils/constants";
import { SharedFooter } from "../components/SharedFooter";

export function PlacePage() {
  const navigate = useNavigate();
  const categories = [
    { emoji: "💻", name: "Tecnología Premium", tag: "Exclusivo", color: "#3b82f6" },
    { emoji: "🎧", name: "Accesorios Lifestyle", tag: "Tendencia", color: ORANGE },
    { emoji: "🌿", name: "Wellness & Salud", tag: "Popular", color: "#10b981" },
    { emoji: "🏠", name: "Hogar Inteligente", tag: "Nuevo", color: "#f59e0b" },
    { emoji: "👟", name: "Moda & Calzado", tag: "Exclusivo", color: "#8b5cf6" },
    { emoji: "🧴", name: "Belleza & Cuidado", tag: "Tendencia", color: "#ec4899" },
    { emoji: "🎮", name: "Gaming & Tech", tag: "Popular", color: "#3b82f6" },
    { emoji: "🍳", name: "Cocina & Hogar", tag: "Nuevo", color: "#f59e0b" },
  ];

  const benefits = [
    { icon: <Package size={18} />, title: "Productos exclusivos", desc: "Catálogo curado de alta demanda" },
    { icon: <Shield size={18} />, title: "Compras seguras", desc: "Pago cifrado y verificado" },
    { icon: <Truck size={18} />, title: "Envíos nacionales", desc: "Cobertura en toda Colombia" },
    { icon: <Star size={18} />, title: "Calidad garantizada", desc: "Proveedores certificados" },
  ];

  const steps = [
    { n: "01", title: "Elige tu producto", desc: "Navega nuestro catálogo curado y encuentra lo que necesitas." },
    { n: "02", title: "Pago seguro", desc: "Paga con tus métodos favoritos: PSE, tarjeta o Wompi." },
    { n: "03", title: "Confirmación", desc: "Recibes la confirmación de pedido y número de seguimiento." },
    { n: "04", title: "Entrega express", desc: "Tu pedido llega a cualquier ciudad de Colombia con trazabilidad." },
  ];

  const goToCatalog = () => window.open("https://glointplace.com.co", "_blank", "noopener,noreferrer");

  return (
    <>
      {/* HERO */}
      <section className="relative pt-28 sm:pt-32 md:pt-36 pb-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #162040 100%)` }}>
        <div className="absolute top-1/2 left-1/4 w-52 h-52 md:w-80 md:h-80 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${ORANGE}18 0%, transparent 70%)` }} />
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice">
            {[...Array(7)].map((_, i) => <line key={i} x1={i * 200} y1="0" x2={i * 200 + 250} y2="500" stroke={ORANGE} strokeWidth="1" />)}
            <circle cx="950" cy="180" r="200" fill="none" stroke={ORANGE} strokeWidth="1" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto px-5 sm:px-6 text-center relative z-10">
          <FadeUp>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-6" style={{ border: `1px solid ${ORANGE}`, color: ORANGE, background: `${ORANGE}10` }}><ShoppingBag size={13} /> GLOINT Place</div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight mb-6">Productos que marcan <span style={{ color: ORANGE }}>diferencia</span></h1>
          </FadeUp>

          <FadeUp delay={0.2}>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-9 leading-relaxed">Plataforma de comercio electrónico enfocada en productos innovadores, diferenciadores y de tendencia, con cobertura de envíos a nivel nacional.</p>
          </FadeUp>

          <FadeUp delay={0.3}>
            <button onClick={goToCatalog} className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 inline-flex items-center justify-center gap-2" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>Ver catálogo <ArrowRight size={18} /></button>
          </FadeUp>
        </div>

        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 50" fill="none" className="w-full"><path d="M0 50L1440 50L1440 15C1200 45 960 0 720 25C480 50 240 5 0 35L0 50Z" fill="#f8fafc" /></svg></div>
      </section>

      {/* POR QUÉ PLACE */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <FadeUp>
              <div>
                <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>¿Por qué elegirnos?</div>
                <h2 className="text-3xl md:text-4xl font-black mb-6 leading-tight" style={{ color: DARK }}>La experiencia de compra que <span style={{ color: ORANGE }}>mereces</span></h2>
                <p className="text-slate-600 leading-relaxed mb-8">Seleccionamos productos innovadores y de alta demanda para ofrecer una experiencia de compra diferenciada a consumidores que valoran calidad, diseño y exclusividad. Trabajamos con proveedores certificados para garantizar autenticidad en cada pedido.</p>

                <div className="grid grid-cols-2 gap-4">
                  {benefits.map((b, i) => (
                    <motion.div key={b.title} className="p-4 rounded-xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} whileHover={{ y: -4, boxShadow: "0 10px 25px rgba(0,0,0,0.06)" }} transition={{ duration: 0.2 }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${ORANGE}12`, color: ORANGE }}>{b.icon}</div>
                      <div className="font-bold text-xs mb-0.5" style={{ color: DARK }}>{b.title}</div>
                      <div className="text-slate-400 text-xs">{b.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* MOCKUP */}
            <FadeUp delay={0.15}>
              <motion.div className="rounded-2xl overflow-hidden" style={{ background: DARK, border: "1px solid rgba(255,255,255,0.08)" }} whileHover={{ y: -5 }} transition={{ duration: 0.3 }}>
                <div className="p-4 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 h-5 rounded-md bg-white/5 flex items-center px-2"><span className="text-xs text-slate-500">glointplace.com.co</span></div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3">
                    {categories.slice(0, 4).map(c => (
                      <motion.div key={c.name} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }} whileHover={{ scale: 1.03, borderColor: `${ORANGE}50` }}>
                        <div className="text-3xl mb-1">{c.emoji}</div>
                        <div className="text-xs font-bold mb-0.5" style={{ color: c.color }}>{c.tag}</div>
                        <div className="text-white text-xs font-semibold leading-tight">{c.name}</div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div className="mt-3 p-3 rounded-xl flex items-center justify-between" style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2.5, repeat: Infinity }}>
                    <span className="text-sm font-bold" style={{ color: ORANGE }}>Envío gratis</span>
                    <span className="text-xs text-slate-400">En pedidos +$50.000</span>
                  </motion.div>
                </div>
              </motion.div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="py-16 md:py-20" style={{ background: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Catálogo</div>
              <h2 className="text-2xl md:text-3xl font-black" style={{ color: DARK }}>Nuestras <span style={{ color: ORANGE }}>categorías</span></h2>
            </div>
          </FadeUp>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map((c, i) => (
              <FadeUp key={c.name} delay={i * 0.05}>
                <motion.div className="rounded-2xl p-5 text-center cursor-pointer h-full" style={{ background: "#fff", border: "1px solid #e2e8f0" }} whileHover={{ y: -6, boxShadow: "0 12px 25px rgba(0,0,0,0.08)", borderColor: `${ORANGE}40` }} transition={{ duration: 0.2 }}>
                  <motion.div className="text-4xl mb-2" whileHover={{ scale: 1.15, rotate: 5 }}>{c.emoji}</motion.div>
                  <div className="text-xs font-bold mb-1" style={{ color: c.color }}>{c.tag}</div>
                  <div className="font-semibold text-sm" style={{ color: DARK }}>{c.name}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO COMPRAR */}
      <section className="py-16 md:py-20" style={{ background: DARK }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <FadeUp>
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: ORANGE }}>Proceso</div>
              <h2 className="text-2xl md:text-3xl font-black text-white">Cómo <span style={{ color: ORANGE }}>comprar</span></h2>
            </div>
          </FadeUp>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <FadeUp key={s.n} delay={i * 0.08}>
                <motion.div className="p-5 rounded-2xl relative overflow-hidden h-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} whileHover={{ y: -5, borderColor: `${ORANGE}40` }}>
                  <div className="absolute top-3 right-3 text-4xl font-black opacity-10 select-none" style={{ color: ORANGE }}>{s.n}</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4" style={{ background: `${ORANGE}18`, color: ORANGE }}><CheckCircle size={18} /></div>
                  <div className="relative z-10 pr-6 font-bold text-white text-sm mb-2">{s.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{s.desc}</div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #1a0d00 100%)` }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 50%, ${ORANGE}18 0%, transparent 60%)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${ORANGE}, transparent)` }} />

        <FadeUp>
          <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Descubre productos que <span style={{ color: ORANGE }}>marcan tendencia</span>.</h2>
            <p className="text-slate-300 mb-9 md:mb-10 leading-relaxed">Únete a miles de compradores que eligen GLOINT Place por su calidad, variedad y servicio.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={goToCatalog} className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90 inline-flex items-center justify-center gap-2" style={{ background: `linear-gradient(90deg, ${ORANGE}, #ea580c)` }}>Explorar catálogo <ArrowRight size={18} /></button>

              <button onClick={() => { navigate("/about"); window.scrollTo({ top: 0 }); }} className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90" style={{ border: "1px solid rgba(255,255,255,0.2)", color: "#fff", background: "rgba(255,255,255,0.06)" }}>Conocer GLOINT</button>
            </div>
          </div>
        </FadeUp>
      </section>

      <SharedFooter />
    </>
  );
}