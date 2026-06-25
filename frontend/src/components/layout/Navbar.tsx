import React, { useState, useEffect } from 'react';
import './layout.css';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled glass-panel' : ''}`}>
      <div className="container navbar-container">
        <div className="navbar-logo">
          {/* Si guardas el logo en frontend/public/logo.png, se mostrará aquí */}
          <img src="/logo.png" alt="Gloint Logo" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        <div className="navbar-links">
          <a href="#services">Servicios</a>
          <a href="#why">Por qué Gloint</a>
        </div>
        <div className="navbar-actions">
          <button className="btn-secondary">Iniciar Sesión</button>
          <button className="btn-primary">Comenzar</button>
        </div>
      </div>
    </nav>
  );
}
