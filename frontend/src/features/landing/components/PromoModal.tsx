import React, { useState, useEffect } from 'react';

export function PromoModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade-in">
        <button className="modal-close" onClick={() => setIsOpen(false)}>&times;</button>
        <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🎁</span>
        <h3 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>¡Bienvenido a V2!</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Registrate ahora y obtén acceso anticipado a nuestras nuevas herramientas de IA financiera para analizar tu rentabilidad.
        </p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={() => setIsOpen(false)}>
          Reclamar Beneficio
        </button>
      </div>
    </div>
  );
}
