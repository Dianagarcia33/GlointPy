import { useNavigate } from "react-router-dom";
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

import { CONTACT_INFO } from "../../../constants/contactInfo";

export function SharedFooter() {
  const navigate = useNavigate();

  const go = (p: string) => { navigate(p === 'home' ? '/' : `/${p}`); window.scrollTo({ top: 0 }); };
  const whatsappLink = CONTACT_INFO.whatsappLink;
  const whatsappDisplay = CONTACT_INFO.phone;
  const emailDisplay = CONTACT_INFO.email;
  const addressDisplay = CONTACT_INFO.fullAddress;


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
              <a
                href="https://web.facebook.com/people/Gloint-SAS/100090908195698/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:bg-[#1877f2] hover:text-white transition-all border border-slate-700/30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a
                href="https://www.instagram.com/gloint.oficial/?hl=es"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:bg-[#c13584] hover:text-white transition-all border border-slate-700/30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Empresa</h4>
            <ul className="space-y-2">
              {([["Inicio", "home"], ["Nosotros", "about"]] as [string, string][]).map(([l, p]) => (
                <li key={l}><button onClick={() => go(p)} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
                <li><button onClick={() => go("contact")} className="text-slate-500 text-sm hover:text-white transition-colors text-left font-medium">Contacto</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Servicios</h4>
            <ul className="space-y-2">
              {([["GLOINT Investment", "investment"], ["GLOINT Place", "place"], ["GLOINT Tech", "tech"]] as [string, string][]).map(([l, p]) => (
                <li key={l}><button onClick={() => go(p)} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2">
              {([["Política de privacidad", "privacidad"], ["Términos y condiciones", "terminos"], ["Aviso legal", "legal"]] as [string, string][]).map(([l, p]) => (
                <li key={l}><button onClick={() => { navigate(p === 'home' ? '/' : `/${p}`); window.scrollTo({ top: 0 }); }} className="text-slate-500 text-sm hover:text-white transition-colors text-left">{l}</button></li>
              ))}
            </ul>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Mail size={13} style={{ color: GOLD }} /> 
                <a href={`mailto:${emailDisplay}`} className="hover:underline">{emailDisplay}</a>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Phone size={13} style={{ color: GOLD }} /> 
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{whatsappDisplay}</a>
              </div>
              <div className="flex items-start gap-2 text-slate-500 text-xs">
                <MapPin size={13} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} /> 
                <span>{addressDisplay}</span>
              </div>
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
