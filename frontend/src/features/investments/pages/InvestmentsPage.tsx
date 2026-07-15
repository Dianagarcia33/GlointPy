import React from 'react';

export const InvestmentsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Inversiones</h1>
          <p className="text-slate-500 text-sm mt-1">Aquí podrás ver y gestionar tus inversiones.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Módulo en construcción...</p>
      </div>
    </div>
  );
};
