import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';
import { InvestmentChatbot } from './InvestmentChatbot';
import { EventCountdownModal } from './EventCountdownModal';
import { AnimatePresence, motion } from 'motion/react';

export function LandingLayout() {
  const location = useLocation();

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <Nav />
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <React.Suspense fallback={null}>
            <Outlet />
          </React.Suspense>
        </motion.div>
      </AnimatePresence>
      {/* We only render Footer on Home page, because other pages have SharedFooter or NosotrosFooter */}
      {location.pathname === '/' && <Footer />}
      
      {/* Global Floating WhatsApp Button */}
      <WhatsAppButton />

      {/* Global Concierge Investment Chatbot */}
      <InvestmentChatbot />

      {/* Modal Popup con Contador Regresivo para el Evento */}
      <EventCountdownModal />
    </div>
  );
}
