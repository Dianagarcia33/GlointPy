import React, { useEffect } from 'react';
import { EventRegistrationSection } from '../components/EventRegistrationSection';

export function EventRegistrationPage() {
  useEffect(() => {
    // Al entrar a la ruta directa, situar la pantalla en la cabecera del formulario
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Enfocar el primer campo del formulario para agilizar el diligenciamiento
    const timer = setTimeout(() => {
      const input = document.getElementById('event_fullname');
      if (input) {
        input.focus();
      }
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="pt-16 sm:pt-20 min-h-screen bg-slate-50">
      <EventRegistrationSection />
    </div>
  );
}
