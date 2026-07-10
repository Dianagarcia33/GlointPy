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
import { SharedFooter } from "../components/SharedFooter";

export function ContactoPage() {
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", asunto: "", mensaje: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      alert("Debes aceptar el tratamiento de datos personales de acuerdo con las políticas de privacidad.");
      return;
    }
    setSent(true);
  };

  const whatsappLink = "https://wa.me/573209573995";
  const whatsappDisplay = "+57 320 957 3995";
  const emailDisplay = "atencionalcliente@gloint.com.co";
  const addressDisplay = "Calle 31 # 14 - 31 oficina 201";
  const hoursDisplay = "Lunes a viernes de 8:00 am - 5:30 pm";

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
                    <div className="text-xs text-slate-400 mt-1 font-medium">NIT: 901702380-5</div>
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
                  <div className="text-slate-500 text-sm">{addressDisplay}</div>
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
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#16a34a">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-bold text-sm mb-1" style={{ color: DARK }}>WhatsApp</div>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold transition-colors hover:opacity-80"
                    style={{ color: "#16a34a" }}
                  >
                    {whatsappDisplay}
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
                  <a href={`mailto:${emailDisplay}`} className="text-sm font-semibold" style={{ color: GOLD }}>
                    {emailDisplay}
                  </a>
                </div>
              </div>

              {/* Redes */}
              <div className="flex gap-3 pt-1">
                {/* Social icons removed */}
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
                          placeholder={whatsappDisplay}
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

                    <div className="flex items-start gap-2.5 py-1">
                      <input
                        id="accept-treatment"
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                      />
                      <label htmlFor="accept-treatment" className="text-xs text-slate-500 leading-normal select-none">
                        Acepto el tratamiento de mis datos personales de acuerdo con las{" "}
                        <Link to="/terminos" className="underline font-semibold" style={{ color: ORANGE }}>
                          políticas de privacidad
                        </Link>{" "}
                        y condiciones de GLOINT.
                      </label>
                    </div>

                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      disabled={!acceptedTerms}
                      className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: `linear-gradient(90deg, ${GOLD}, ${ORANGE})` }}
                    >
                      Enviar mensaje <ArrowRight size={16} />
                    </motion.button>
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
              { icon: <Clock size={20} />, title: "Horario de atención", lines: [hoursDisplay, "Atención telefónica"], color: GOLD },
              { icon: <Phone size={20} />, title: "Llámanos", lines: ["601-5283660", "Atención inmediata"], color: ORANGE, link: "tel:6015283660" },
              { icon: <Mail size={20} />, title: "Escríbenos", lines: [emailDisplay, "Respuesta en 24 h"], color: "#60a5fa", link: `mailto:${emailDisplay}` },
            ].map(({ icon, title, lines, color, link }) => (
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
                  {link ? (
                    <a href={link} target={link.startsWith("mailto") ? undefined : "_blank"} rel="noopener noreferrer" className="hover:underline">
                      {lines.map((l) => <div key={l} className="text-slate-500 text-xs font-semibold">{l}</div>)}
                    </a>
                  ) : (
                    lines.map((l) => <div key={l} className="text-slate-500 text-xs">{l}</div>)
                  )}
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
            href={whatsappLink}
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

      <SharedFooter  />
    </>
  );
}
