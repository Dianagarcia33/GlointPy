import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Building2, FileCheck } from 'lucide-react';
import { Nav as Navbar } from '../../landing_v2/components/Nav';
import { Footer } from '../../landing_v2/components/Footer';
import { CONTACT_INFO } from '../../../constants/contactInfo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  maxWidthClass?: string;
  topBanner?: React.ReactNode;
  /** `split`: panel de marca a la izquierda y formulario a la derecha (login). `card`: tarjeta sobre cabecera oscura. */
  variant?: 'split' | 'card';
  /** Contenido propio para el panel de marca del diseño `split` (reemplaza el lema y los puntos de confianza). */
  sidePanel?: React.ReactNode;
}

const NAVY_BG = 'linear-gradient(135deg, #0d1526 0%, #162040 60%, #0d1526 100%)';

/** Líneas diagonales doradas y la G del logo, estáticas, como en el hero del inicio. */
const BrandDecor: React.FC<{ watermarkClass: string }> = ({ watermarkClass }) => (
  <>
    <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.18]" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="auth-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4A537" />
          <stop offset="100%" stopColor="#B8861B" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <line key={i} x1={i * 190} y1="0" x2={i * 190 + 300} y2="800" stroke="url(#auth-lg)" strokeWidth="1.2" />
      ))}
    </svg>
    <img src="/logos/brand/g.png" alt="" aria-hidden="true" className={`absolute pointer-events-none select-none ${watermarkClass}`} />
  </>
);

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'Conexión segura y cifrado de datos SSL' },
  { icon: Building2, text: 'Empresa registrada en la Cámara de Comercio de Bogotá' },
  { icon: FileCheck, text: 'Prevención de lavado de activos conforme al SARLAFT' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  icon,
  maxWidthClass = 'max-w-md',
  topBanner,
  variant = 'card',
  sidePanel,
}) => {
  if (variant === 'split') {
    return (
      <div className="gl-auth min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] font-inter bg-white">
        {/* Panel de marca */}
        <aside className="relative overflow-hidden text-white flex flex-col justify-between px-6 py-6 sm:px-12 lg:py-14 lg:min-h-screen" style={{ background: NAVY_BG }}>
          <BrandDecor watermarkClass="-right-24 -bottom-24 w-[520px] max-w-none opacity-[0.07] hidden lg:block" />

          <Link to="/" aria-label="GLOINT Group, ir al inicio" className="relative z-10 inline-flex self-start">
            <img src="/logos/brand/wordmark.png" alt="GLOINT Group" className="h-11 w-auto lg:hidden" />
            <img src="/logos/brand/full.png" alt="GLOINT Group" className="hidden lg:block h-36 w-auto" />
          </Link>

          <div className="relative z-10 hidden lg:block">
            {sidePanel ?? (
              <div className="max-w-lg">
                <h2 className="font-montserrat font-extrabold text-4xl xl:text-[2.75rem] leading-[1.15] tracking-tight">
                  Ecosistema empresarial de <span style={{ color: '#D4A537' }}>inversión</span>,{' '}
                  <span style={{ color: '#D9DCE1' }}>comercio digital</span> y tecnología.
                </h2>
                <ul className="mt-10 space-y-4">
                  {TRUST_POINTS.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-start gap-3 text-slate-300 text-sm">
                      <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#D4A537' }} strokeWidth={1.75} aria-hidden="true" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="relative z-10 hidden lg:block text-xs text-slate-400">
            {CONTACT_INFO.companyName} · NIT {CONTACT_INFO.nit}
          </p>
        </aside>

        {/* Formulario */}
        <main className="relative flex items-center justify-center px-6 py-12 sm:px-12 lg:py-14">
          <Link to="/" className="absolute top-6 right-6 sm:right-12 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver al inicio
          </Link>

          <div className={`w-full ${maxWidthClass}`}>
            {topBanner && <div className="mb-6">{topBanner}</div>}
            <div className="mb-8">
              <div className="h-1 w-12 rounded-full mb-6" style={{ background: 'linear-gradient(90deg, #F3D27A, #B8861B)' }} aria-hidden="true" />
              <h1 className="text-3xl font-extrabold text-slate-900 mb-2 font-montserrat tracking-tight">{title}</h1>
              <p className="text-slate-600 text-sm leading-relaxed">{subtitle}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="gl-auth min-h-screen bg-slate-50 flex flex-col font-inter relative">
      {/* Cabecera oscura, la misma del hero del inicio */}
      <div className="absolute top-0 left-0 w-full h-[45vh] overflow-hidden z-0" style={{ background: NAVY_BG }}>
        <BrandDecor watermarkClass="-right-20 top-1/2 -translate-y-1/2 w-[420px] max-w-none opacity-[0.07] hidden md:block" />
      </div>

      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-10 pb-12 relative z-10">
        {topBanner && (
          <div className={`w-full ${maxWidthClass} relative z-20 mt-12 mb-2`}>
            {topBanner}
          </div>
        )}

        <div className={`w-full ${maxWidthClass} bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 sm:p-10 relative z-20 overflow-hidden ${topBanner ? 'mt-2' : 'mt-12'} transition-all duration-300`}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #F3D27A, #D4A537, #B8861B)' }} aria-hidden="true" />
          <div className="text-center mb-8">
            {icon && (
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm text-brand-500">
                {icon}
                </div>
            )}
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 font-montserrat tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mx-auto">
              {subtitle}
            </p>
          </div>

          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};
