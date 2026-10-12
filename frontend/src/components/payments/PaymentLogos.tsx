import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Logo Oficial de Nequi Colombia (Vector SVG)
 */
export const NequiLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", size }) => (
  <div 
    className={`inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-xs border border-purple-950/20 select-none ${className}`}
    style={{ 
      backgroundColor: '#20002B',
      width: size || undefined,
      height: size || undefined
    }}
    title="Nequi"
  >
    <svg 
      viewBox="0 0 40 40" 
      className="w-full h-full p-1" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Barra vertical izquierda blanca */}
      <rect x="9" y="9" width="4.5" height="22" rx="1.5" fill="#FFFFFF" />
      {/* Barra vertical derecha blanca */}
      <rect x="26.5" y="9" width="4.5" height="22" rx="1.5" fill="#FFFFFF" />
      {/* Diagonal magenta característica */}
      <path 
        d="M12.5 10L27.5 30" 
        stroke="#DA0081" 
        strokeWidth="4.8" 
        strokeLinecap="round" 
      />
      {/* Punto superior magenta distintivo */}
      <circle cx="28.5" cy="11.5" r="2.8" fill="#DA0081" />
    </svg>
  </div>
);

/**
 * Logo Oficial de Bancolombia (Vector SVG con cinta y acento amarillo)
 */
export const BancolombiaLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", size }) => (
  <div 
    className={`inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-xs border border-black/10 select-none ${className}`}
    style={{ 
      backgroundColor: '#000000',
      width: size || undefined,
      height: size || undefined
    }}
    title="Bancolombia"
  >
    <svg 
      viewBox="0 0 40 40" 
      className="w-full h-full p-1.5" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cinta superior amarilla de Bancolombia */}
      <path 
        d="M9 16C9.5 12 13.5 9.5 19 9.5C26 9.5 31 13 31 18C31 21.5 28.5 24 24.5 25.5L15 29C11.5 30.2 9.5 32.5 9.5 35" 
        stroke="#FDDA24" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Cinta inferior blanca */}
      <path 
        d="M31 23.5C30.5 27 27 29.5 22 29.5C15.5 29.5 10 26 10 21" 
        stroke="#FFFFFF" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Acentos tricolor corporativos */}
      <circle cx="28" cy="8.5" r="1.6" fill="#FDDA24" />
      <circle cx="31" cy="10.5" r="1.6" fill="#0033A0" />
      <circle cx="33" cy="13.5" r="1.6" fill="#CE1126" />
    </svg>
  </div>
);

/**
 * Logo Oficial de PSE (Pagos Seguros en Línea)
 */
export const PseLogo: React.FC<LogoProps> = ({ className = "w-8 h-8", size }) => (
  <div 
    className={`inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-xs border border-blue-950/20 select-none ${className}`}
    style={{ 
      backgroundColor: '#002D62',
      width: size || undefined,
      height: size || undefined
    }}
    title="PSE Pagos Seguros en Línea"
  >
    <svg 
      viewBox="0 0 40 40" 
      className="w-full h-full p-1" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="16.5" fill="#002D62" />
      {/* Segmentos de arco tricolor */}
      <path d="M8 20C8 13.37 13.37 8 20 8" stroke="#FFD100" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 8C26.63 8 32 13.37 32 20" stroke="#0072CE" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32 20C32 26.63 26.63 32 20 32" stroke="#E01E26" strokeWidth="2.2" strokeLinecap="round" />
      {/* Tipografía PSE */}
      <text 
        x="20" 
        y="24.5" 
        textAnchor="middle" 
        fill="#FFFFFF" 
        fontSize="11.5" 
        fontWeight="900" 
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.5px"
      >
        PSE
      </text>
    </svg>
  </div>
);

/**
 * Fila de iconos compactos para vistas previas en modales
 */
export const PaymentLogosRow: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = "" }) => (
  <div className={`inline-flex items-center gap-1.5 ${className}`}>
    <NequiLogo className="w-5 h-5 rounded-md" size={size} />
    <BancolombiaLogo className="w-5 h-5 rounded-md" size={size} />
    <PseLogo className="w-5 h-5 rounded-md" size={size} />
  </div>
);
