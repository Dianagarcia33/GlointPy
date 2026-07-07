import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './Nav';
import { Footer } from './Footer';
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
          <Outlet />
        </motion.div>
      </AnimatePresence>
      {/* We only render Footer on Home page, because other pages have SharedFooter or NosotrosFooter */}
      {location.pathname === '/' && <Footer />}
    </div>
  );
}
