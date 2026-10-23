import React from 'react';
import { Loader2 } from 'lucide-react';

export const PageLoader: React.FC = () => {
  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-6 space-y-3">
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
        <Loader2 className="w-5 h-5 text-orange-500 absolute animate-pulse" />
      </div>
      <span className="text-xs font-medium text-slate-400 tracking-wider uppercase">Cargando...</span>
    </div>
  );
};
