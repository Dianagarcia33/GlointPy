import React from 'react';
import './layout.css';

export function Footer() {
  return (
    <footer className="footer section">
      <div className="container footer-container">
        <div className="footer-brand">
          <h2 className="text-gradient">Gloint</h2>
          <p>La plataforma inteligente para tus finanzas.</p>
        </div>
        <div className="footer-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Gloint. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
