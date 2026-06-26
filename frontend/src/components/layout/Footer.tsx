import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Mail } from 'lucide-react';

// Se lee desde la carpeta public/
const logo = "/logo.png";

export const Footer: React.FC = () => {
  return (
    <>
      <footer className="relative bg-slate-900 overflow-hidden">
        {/* Top golden accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-400/4 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-10">

          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

            {/* Col 1: Brand */}
            <div className="lg:col-span-1">
              <Link to="/" className="inline-block mb-5">
                <img src={logo} alt="Gloint Logo" className="h-10 w-auto object-contain" />
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Soluciones financieras y empresariales diseñadas para impulsar el crecimiento de tu negocio con rapidez y seguridad.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/profile.php?id=100090908195698"
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/10 transition-all duration-200"
                  aria-label="Facebook"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/gloint.oficial/"
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/10 transition-all duration-200"
                  aria-label="Instagram"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
                <a
                  href="https://www.tiktok.com/@gloint.oficial"
                  target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/10 transition-all duration-200"
                  aria-label="TikTok"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/10 transition-all duration-200"
                  aria-label="LinkedIn"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Navegación</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Inicio', to: '/' },
                  { label: 'Nosotros', to: '/about' },
                  { label: 'Servicios', to: '/servicios/cashback-logistico' },
                  { label: 'Contacto', to: '/contact' },
                ].map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-slate-400 hover:text-brand-400 text-sm transition-colors duration-200 flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-brand-500 transition-colors duration-200" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Contacto</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Calle 31 No 14-31, oficina 201</p>
                    <p className="text-amber-400 text-xs font-bold mt-0.5">Bogotá, Colombia</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <p className="text-slate-300 text-sm font-medium">Lunes a Viernes</p>
                    <p className="text-amber-400 text-xs font-bold mt-0.5">8:00 AM – 5:00 PM</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Mail className="w-4 h-4 text-brand-400" />
                  </div>
                  <a href="mailto:dpto.general@gloint.com.co" className="text-slate-400 hover:text-brand-400 text-sm transition-colors duration-200 break-all">
                    dpto.general@gloint.com.co
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: CTA */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">¿Listo para empezar?</h4>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                Habla con uno de nuestros asesores y descubre cómo GLOINT puede impulsar tu negocio.
              </p>
              <a
                href="https://wa.me/+573228933389"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-brand-500 to-amber-400 text-slate-900 font-bold text-sm rounded-xl shadow-sm hover:shadow-md hover:shadow-brand-500/20 transition-all duration-300 active:scale-[0.98] w-full justify-center"
              >
                {/* SVG del logo de Whatsapp */}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                </svg>
                Escríbenos por WhatsApp
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} GLOINT. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-5 text-xs">
              <a href="#" className="text-slate-500 hover:text-brand-400 transition-colors duration-200">Política de Privacidad</a>
              <Link to="/terminos-y-condiciones" className="text-slate-500 hover:text-brand-400 transition-colors duration-200">Términos de Servicio</Link>
              <Link to="/cookie-policy" className="text-slate-500 hover:text-brand-400 transition-colors duration-200">Política de Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/+573228933389"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed z-50 right-6 bottom-6 md:right-8 md:bottom-8 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-xl flex items-center justify-center w-14 h-14 transition-all duration-300 hover:scale-110 hover:shadow-green-500/40 hover:shadow-2xl group"
        aria-label="WhatsApp"
      >
        <div className="absolute inset-0 rounded-2xl bg-green-400 animate-ping opacity-20" />
        <svg viewBox="0 0 32 32" fill="currentColor" className="relative z-10 w-7 h-7 transition-transform duration-300 group-hover:scale-110">
          <path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.668 4.617 1.934 6.59L4 29l7.59-1.934A12.96 12.96 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.98 0-3.91-.58-5.56-1.67l-.39-.25-4.51 1.15 1.15-4.51-.25-.39A9.97 9.97 0 0 1 6 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.13-7.47c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.36-.26.29-1 1-.97 2.43.03 1.43 1.04 2.81 1.19 3 .15.19 2.05 3.14 5.01 4.28.7.3 1.25.48 1.68.61.71.23 1.36.2 1.87.12.57-.09 1.65-.67 1.88-1.32.23-.65.23-1.21.16-1.32-.07-.11-.25-.18-.53-.32z" />
        </svg>
      </a>
    </>
  );
};
