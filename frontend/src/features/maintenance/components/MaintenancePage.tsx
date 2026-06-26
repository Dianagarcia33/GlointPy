import React from 'react';
import './maintenance.css';

export function MaintenancePage() {
  return (
    <div className="maintenance-section">
      <div className="maintenance-container">
        <img src="/logo.png" alt="Gloint Logo" className="maintenance-logo" />
        <h1 className="maintenance-title">Sitio en Mantenimiento</h1>
        <p className="maintenance-subtitle">
          Nuestro mantenimiento está tomando más tiempo del calculado. Sin embargo, 
          queremos darte la tranquilidad de que nuestra plataforma volverá a estar 
          disponible antes de la siguiente fecha de retiro programada.
        </p>
        <p className="maintenance-footer">
          Agradecemos tu paciencia. El equipo de Gloint.
        </p>
      </div>
    </div>
  );
}
