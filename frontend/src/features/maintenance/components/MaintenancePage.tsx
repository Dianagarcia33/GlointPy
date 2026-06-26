import React from 'react';
import './maintenance.css';

export function MaintenancePage() {
  return (
    <div className="maintenance-section">
      <div className="maintenance-container">
        <img src="/logo.png" alt="Gloint Logo" className="maintenance-logo" />
        <h1 className="maintenance-title">Sitio en Mantenimiento</h1>
        <p className="maintenance-subtitle">
          Estamos realizando actualizaciones críticas en nuestra infraestructura. 
          Volveremos a estar en línea muy pronto con un sistema mucho más rápido y seguro.
        </p>
        <p className="maintenance-footer">
          Agradecemos tu paciencia. El equipo de Gloint.
        </p>
      </div>
    </div>
  );
}
