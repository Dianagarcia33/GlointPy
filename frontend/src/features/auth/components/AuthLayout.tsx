import React from 'react';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, icon }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-inter relative">
      
      {/* Top Header - Dark Video Background (Matches Home Page Hero) */}
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-slate-950 overflow-hidden z-0">
        <video
          src="/banner.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover block opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 to-slate-950/100" />
      </div>

      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 pt-10 pb-12 relative z-10">
        {/* Centered Overlapping Card */}
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 md:p-10 relative z-20 mt-16">
          {/* Titles */}
          <div className="text-center mb-8">
            {icon && (
              <div className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm text-brand-500">
                {icon}
              </div>
            )}
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 font-montserrat tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
};
