import React from 'react';
import { Check } from 'lucide-react';

export const REGISTRATION_STEPS = [
  { num: 1, label: 'Documentos', desc: 'Foto de tu documento (frente y reverso) y una selfie.' },
  { num: 2, label: 'Validación', desc: 'Verificación biométrica de tu identidad.' },
  { num: 3, label: 'Datos personales', desc: 'Tus datos de identidad y de contacto.' },
  { num: 4, label: 'Acceso', desc: 'El correo y la contraseña de tu cuenta.' },
];

/** Avance del registro para el panel de marca (columna izquierda, fondo azul noche). */
export const RegistrationSideSteps: React.FC<{ step: number }> = ({ step }) => (
  <div className="max-w-lg">
    <h2 className="font-montserrat font-extrabold text-4xl xl:text-[2.75rem] leading-[1.15] tracking-tight">
      Tu registro en <span style={{ color: '#E8A83E' }}>4 pasos</span>.
    </h2>
    <ol className="mt-10 space-y-6" aria-label="Pasos del registro">
      {REGISTRATION_STEPS.map((s) => {
        const done = step > s.num;
        const current = step === s.num;
        return (
          <li key={s.num} className="flex items-start gap-4" aria-current={current ? 'step' : undefined}>
            <span
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
              style={
                current
                  ? { background: 'linear-gradient(135deg, #F6CB62, #E8A83E 55%, #B97A1A)', color: '#140e02' }
                  : done
                  ? { background: 'rgba(232, 168, 62,0.18)', color: '#E8A83E', border: '1px solid rgba(232, 168, 62,0.5)' }
                  : { border: '1px solid rgba(255,255,255,0.22)', color: '#94a3b8' }
              }
            >
              {done ? <Check className="w-4 h-4" aria-hidden="true" /> : s.num}
            </span>
            <div className={current || done ? '' : 'opacity-60'}>
              <p className="font-semibold text-base" style={{ color: current ? '#fff' : '#e2e8f0' }}>
                {s.label}
                {done && <span className="sr-only"> (completado)</span>}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">{s.desc}</p>
            </div>
          </li>
        );
      })}
    </ol>
  </div>
);
