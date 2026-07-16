import React, { useEffect, useState } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { auditService, WalletTransaction } from '../../../../services/audit';

export const UserWalletHistoryBox: React.FC<{ userId: number }> = ({ userId }) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await (auditService as any).getWalletTransactions(userId);
        setTransactions(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el historial de la billetera');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userId]);

  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-brand-600" />
          Historial de Transacciones de Billetera
        </h4>
      </div>
      <div className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500 text-sm">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm italic">
            El usuario no tiene movimientos registrados en su billetera.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Descripción</th>
                  <th className="px-4 py-3 font-semibold text-right">Monto</th>
                  <th className="px-4 py-3 font-semibold text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {new Date(tx.created_at).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        tx.type === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {tx.type === 'ingreso' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {tx.description || tx.reference_type}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      tx.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'ingreso' ? '+' : '-'}
                      {Number(tx.amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-800 font-mono font-medium">
                      {Number(tx.balance_after).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
