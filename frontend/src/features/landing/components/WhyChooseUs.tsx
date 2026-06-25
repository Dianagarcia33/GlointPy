import React from 'react';

export function WhyChooseUs() {
  return (
    <section id="why" className="section why-section">
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px' }}>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
            ¿Por qué elegir Gloint V2?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '1.1rem' }}>
            Hemos reescrito toda nuestra arquitectura para brindarte una experiencia ultrarrápida, 
            una seguridad impenetrable y un diseño que te encantará usar todos los días.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '2rem' }}>
            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>✔</span> Arquitectura Limpia Estricta
            </li>
            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>✔</span> Validaciones con Zod y Pydantic
            </li>
            <li style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--accent-color)' }}>✔</span> Interfaz Premium Ultrarrápida
            </li>
          </ul>
        </div>
        <div style={{ flex: '1 1 400px' }} className="glass-panel">
          <div style={{ padding: '4rem', textAlign: 'center' }}>
             <span style={{ fontSize: '6rem' }}>🚀</span>
          </div>
        </div>
      </div>
    </section>
  );
}
