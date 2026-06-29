import React from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter, MoreHorizontal } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

const movements = [
    { id: 1, date: '29 Jun 2026', type: 'deposit', description: 'Depósito de Inversión Inicial', amount: 1000000, status: 'completed' },
    { id: 2, date: '15 Jun 2026', type: 'yield', description: 'Pago de Rendimiento Quincenal', amount: 35000, status: 'completed' },
    { id: 3, date: '01 Jun 2026', type: 'withdrawal', description: 'Retiro a Cuenta Bancaria', amount: 250000, status: 'pending' },
    { id: 4, date: '15 May 2026', type: 'yield', description: 'Pago de Rendimiento Quincenal', amount: 35000, status: 'completed' },
];

export const MovementsTable = () => {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-10">
            <div className="p-6 md:p-8 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight font-montserrat">Últimos Movimientos</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">Historial reciente de tus transacciones</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Buscar movimiento..." 
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all w-full md:w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                        <Filter className="w-4 h-4" /> Filtros
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
                            <th className="px-6 py-4 font-bold">Fecha</th>
                            <th className="px-6 py-4 font-bold">Tipo</th>
                            <th className="px-6 py-4 font-bold">Descripción</th>
                            <th className="px-6 py-4 font-bold text-right">Monto</th>
                            <th className="px-6 py-4 font-bold text-center">Estado</th>
                            <th className="px-6 py-4 font-bold text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {movements.map((mov) => (
                            <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                    {mov.date}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <div className={`p-1.5 rounded-lg ${mov.type === 'deposit' || mov.type === 'yield' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {mov.type === 'withdrawal' ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                        </div>
                                        {mov.type === 'deposit' ? 'Depósito' : mov.type === 'withdrawal' ? 'Retiro' : 'Rendimiento'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                    {mov.description}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <span className={`text-sm font-bold font-montserrat ${mov.type === 'withdrawal' ? 'text-slate-900' : 'text-emerald-600'}`}>
                                        {mov.type === 'withdrawal' ? '-' : '+'}{formatCurrency(mov.amount)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                        mov.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>
                                        {mov.status === 'completed' ? 'Completado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <button className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center">
                <button className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors">
                    Ver todos los movimientos
                </button>
            </div>
        </div>
    );
};
