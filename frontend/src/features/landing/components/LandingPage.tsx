import React from 'react';
import { HeroBanner } from './HeroBanner';
import { ServicesList } from './ServicesList';
import { WhyChooseUs } from './WhyChooseUs';
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
        <ServicesList />
        <WhyChooseUs />
      </main>
      <Footer />
      <PromoModal />
    </>
  );
}
