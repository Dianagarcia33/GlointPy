import React from 'react';
import { EventRegistrationSection } from '../components/EventRegistrationSection';
import { HomeHero, HomeAbout, HomeHow, HomePlans, HomeCompliance, HomeUnits, HomeFAQ, HomeContact } from '../components/home/HomeSections';

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
      <HomeHero />
      <HomeAbout />
      <HomeHow />
      <HomePlans />
      <HomeCompliance />
      <HomeUnits />
      <EventRegistrationSection />
      <HomeFAQ />
      <HomeContact />
    </>
  );
}
