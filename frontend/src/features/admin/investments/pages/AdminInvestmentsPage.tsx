import React from 'react';
import { Briefcase } from 'lucide-react';

export const AdminInvestmentsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600" />
            Auditoría
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Módulo en reconstrucción para cruce avanzado de información.
          </p>
        </div>
      </div>
      <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Construyendo el nuevo módulo</h3>
        <p className="text-gray-500">
          Estamos preparando las nuevas herramientas de revisión manual y cruce de datos.
        </p>
      </div>
    </div>
  );
};

