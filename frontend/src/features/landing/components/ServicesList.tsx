import React from 'react';

export function ServicesList() {
  const services = [
    { id: 1, title: 'Análisis Inteligente', desc: 'Evalúa la rentabilidad con IA de manera predictiva.', icon: '🧠' },
    { id: 2, title: 'Seguridad AWS', desc: 'Validación biométrica avanzada con Rekognition.', icon: '🛡️' },
    { id: 3, title: 'Dashboard en Tiempo Real', desc: 'Controla tus movimientos e inversiones al instante.', icon: '📊' }
  ];

  return (
    <section id="services" className="section container">
      <div style={{ textAlign: 'center' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>Nuestros Servicios</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Tecnología de punta a tu disposición</p>
      </div>
      <div className="services-grid">
        {services.map(s => (
          <div key={s.id} className="service-card glass-panel">
            <div className="service-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
