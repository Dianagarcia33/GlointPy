import React from 'react';
import { Hero } from '../components/Hero';
import { QuienesSomos } from '../components/QuienesSomos';
import { Unidades } from '../components/Unidades';
import { InvestmentSection } from '../components/InvestmentSection';
import { PlaceSection } from '../components/PlaceSection';
import { TechSection } from '../components/TechSection';
import { EventRegistrationSection } from '../components/EventRegistrationSection';
import { WhyGloint } from '../components/WhyGloint';
import { Stats } from '../components/Stats';
import { Aliados } from '../components/Aliados';
import { CTAFinal } from '../components/CTAFinal';

export function LandingHome() {
  React.useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#gloint-power-tech' || hash === '#power-tech' || hash === '#evento' || hash === '#registro-evento') {
      const timer = setTimeout(() => {
        const target = document.getElementById('gloint-power-tech');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Hero />
      <QuienesSomos />
      <Unidades />
      <InvestmentSection />
      <PlaceSection />
      <TechSection />
      <EventRegistrationSection />
      <WhyGloint />
      <Stats />
      <Aliados />
      <CTAFinal />
    </>
  );
}
