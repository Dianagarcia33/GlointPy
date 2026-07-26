import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Mail } from 'lucide-react';
import { CONTACT_INFO } from '../../constants/contactInfo';


const logo = "/logo.png";

export const Footer: React.FC = () => {
  return (
    <>
      <footer className="bg-slate-900 text-slate-300 font-inter">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-16 pb-10">

          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

            {/* Col 1: Brand */}
            <div className="lg:col-span-1">
              <Link to="/" className="inline-block mb-6">
                <img src={logo} alt="Gloint Logo" className="h-10 w-auto object-contain" />
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Ecosistema empresarial de inversión, comercio digital y tecnología para escalar tu negocio al siguiente nivel.
              </p>
              {/* Redes Sociales */}
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
              </div>
            </div>

            {/* Col 2: Enlaces rápidos */}
            <div>
              <h4 className="text-white font-bold mb-6 font-montserrat tracking-wide">Plataforma</h4>
              <ul className="space-y-4">
                <li><Link to="/investment" className="text-sm text-slate-400 hover:text-white transition-colors">GLOINT Investment</Link></li>
                <li><Link to="/place" className="text-sm text-slate-400 hover:text-white transition-colors">GLOINT Place</Link></li>
                <li><Link to="/tech" className="text-sm text-slate-400 hover:text-white transition-colors">GLOINT Tech</Link></li>
                <li><Link to="/about" className="text-sm text-slate-400 hover:text-white transition-colors">Nosotros</Link></li>
                <li><Link to="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>

            {/* Col 3: Legal */}
            <div>
              <h4 className="text-white font-bold mb-6 font-montserrat tracking-wide">Legal</h4>
              <ul className="space-y-4">
                <li><Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">Política de Privacidad</Link></li>
                <li><Link to="/" className="text-sm text-slate-400 hover:text-white transition-colors">Aviso Legal</Link></li>
              </ul>
            </div>

            {/* Col 4: Contacto */}
            <div>
              <h4 className="text-white font-bold mb-6 font-montserrat tracking-wide">Contacto</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                  <span className="text-sm text-slate-400">{CONTACT_INFO.fullAddress}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-slate-500" />
                  <a href={`mailto:${CONTACT_INFO.email}`} className="text-sm text-slate-400 hover:text-white transition-colors">
                    {CONTACT_INFO.email}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                  <span className="text-sm text-slate-400">{CONTACT_INFO.hours}</span>
                </li>

              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Gloint. Todos los derechos reservados.
            </p>
            <div className="flex gap-6">
              <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase">
                Ecosistema Empresarial
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
