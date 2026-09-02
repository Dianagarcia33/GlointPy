import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Zap, DollarSign, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { commercialService, CommercialBonusSummaryItem } from '../../../services/commercial';

interface AdminCommercialBonusesTableProps {
  onSettleAdvisor: (commercialId: number) => void;
  canSettle: boolean;
  month?: number;
  year?: number;
}

export const AdminCommercialBonusesTable: React.FC<AdminCommercialBonusesTableProps> = ({
  onSettleAdvisor,
  canSettle,
  month,
  year
}) => {
  const { data: bonusesSummary, isLoading } = useQuery<CommercialBonusSummaryItem[]>({
    queryKey: ['commercial_bonuses_summary', month, year],
    queryFn: () => commercialService.getBonusesSummary({ month, year })
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-100 rounded-md w-1/3"></div>
        <div className="h-32 bg-slate-50 rounded-2xl"></div>
      </div>
    );
  }

  if (!bonusesSummary || bonusesSummary.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base font-montserrat">
              Auditoría y Liquidación de Bonos Comerciales
            </h3>
            <p className="text-xs text-slate-400">
              Seguimiento acumulado de metas diarias, pisos de venta y bonos por asesor
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
            <tr>
              <th className="py-3 px-4">Asesor / Directivo</th>
              <th className="py-3 px-4 text-center">Cierres (Hoy)</th>
              <th className="py-3 px-4 text-right">Facturación Mes ($)</th>
              <th className="py-3 px-4 text-right">Bonos Pendientes ($)</th>
              <th className="py-3 px-4 text-center">Estado</th>
              {canSettle && <th className="py-3 px-4 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {bonusesSummary.map((item) => {
              const hasPending = item.pending_bonuses_total > 0;
              return (
                <tr key={item.commercial_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{item.commercial_name}</div>
                    <div className="text-[10px] font-normal text-slate-400">{item.email}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      item.today_closures >= 5 ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.today_closures} / 5
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                    ${item.monthly_volume.toLocaleString('es-CO')}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-bold">
                    {hasPending ? (
                      <span className="text-amber-600">
                        +${item.pending_bonuses_total.toLocaleString('es-CO')}
                      </span>
                    ) : (
                      <span className="text-slate-400">$0</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {hasPending ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                        {item.pending_bonuses_count} Pendientes
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                        Al Día
                      </span>
                    )}
                  </td>

                  {canSettle && (
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onSettleAdvisor(item.commercial_id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all text-xs font-bold shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Liquidar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
