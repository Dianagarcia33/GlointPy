import React from 'react';
import { HeroBanner } from './HeroBanner';
import { MainServices } from './MainServices';
import { WhyGloint } from './WhyGloint';
import { PromoModal } from './PromoModal';
import './landing.css';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

export function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroBanner />
        <MainServices />
        <WhyGloint />
      </main>
      <Footer />
      <PromoModal />
    </>
  );
}
