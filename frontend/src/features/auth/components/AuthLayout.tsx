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
    <div className="min-h-screen bg-surface-bg flex flex-col font-inter relative overflow-hidden">
      {/* Clean Light Background with Subtle Blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <Navbar />

      <main className="flex-grow flex items-center justify-center px-4 pt-10 pb-12 relative z-10">
        {/* Centered Glass Card */}
        <div className="w-full max-w-[26rem] bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-glass hover:shadow-glass-hover transition-shadow duration-500 border border-white/60 p-8 md:p-10 relative z-20 animate-fadeInScale">
          {/* Titles */}
          <div className="text-center mb-8">
            {icon && (
              <div className="w-14 h-14 bg-white/50 border border-slate-100/50 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-sm text-brand-500 backdrop-blur-sm">
                {icon}
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-800 mb-2 font-montserrat tracking-tight">
              {title}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed mx-auto px-2">
              {subtitle}
            </p>
          </div>

          {/* Form Content */}
          <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
