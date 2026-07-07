import React from 'react';
import { Hero } from '../components/Hero';
import { QuienesSomos } from '../components/QuienesSomos';
import { Unidades } from '../components/Unidades';
import { InvestmentSection } from '../components/InvestmentSection';
import { PlaceSection } from '../components/PlaceSection';
import { TechSection } from '../components/TechSection';
import { WhyGloint } from '../components/WhyGloint';
import { Stats } from '../components/Stats';
import { Aliados } from '../components/Aliados';
import { CTAFinal } from '../components/CTAFinal';

export function LandingHome() {
  return (
    <>
      <Hero />
      <QuienesSomos />
      <Unidades />
      <InvestmentSection />
      <PlaceSection />
      <TechSection />
      <WhyGloint />
      <Stats />
      <Aliados />
      <CTAFinal />
    </>
  );
}
