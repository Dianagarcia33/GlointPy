import React from 'react';

export function HeroBanner() {
  return (
    <section className="hero-section">
      <div className="hero-background"></div>
      <div className="container animate-fade-in">
        <h1 className="hero-title">
          El Futuro de las <span className="text-gradient">Inversiones</span>
        </h1>
        <p className="hero-subtitle">
          Descubre la plataforma inteligente y segura para gestionar tus finanzas. Todo en un solo lugar.
        </p>
        <div className="navbar-actions" style={{ justifyContent: 'center' }}>
          <button className="btn-primary">Empieza Ahora</button>
          <button className="btn-secondary">Saber más</button>
        </div>
      </div>
    </section>
  );
}
