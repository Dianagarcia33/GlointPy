import React, { useState } from 'react';
import { X, DollarSign, Loader2, Info } from 'lucide-react';
import { adjustWalletBalance } from '../../../../services/wallets';

interface WalletAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdjusted: () => void;
  wallet: {
    id: number;
    balance: string | number;
    currency: string;
  } | null;
  userName: string;
}

export const WalletAdjustmentModal: React.FC<WalletAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjusted,
  wallet,
  userName
}) => {
  const [action, setAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !wallet) return null;

  const currentBalance = Number(wallet.balance);
  const inputAmount = Number(amount) || 0;
  
  let newBalancePreview = currentBalance;
  if (action === 'add') newBalancePreview = currentBalance + inputAmount;
  if (action === 'subtract') newBalancePreview = Math.max(0, currentBalance - inputAmount);
  if (action === 'set') newBalancePreview = Math.max(0, inputAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (!description.trim()) {
      setError('Debes especificar un motivo para la auditoría');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await adjustWalletBalance(wallet.id, {
        action,
        amount: Number(amount),
        description: description.trim()
      });
      onAdjusted();
    } catch (err: any) {
      setError(err.message || 'Error al ajustar el saldo de la billetera');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ajustar Saldo de Billetera</h2>
            <p className="text-xs text-slate-500 mt-1">Usuario: <span className="font-medium text-slate-700">{userName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            
            {/* Current Balance */}
            <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Actual</p>
                <p className="text-xl font-bold text-slate-800">
                  {currentBalance.toLocaleString('es-CO', { style: 'currency', currency: wallet.currency || 'COP', minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-200/50 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-slate-500" />
              </div>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Ajuste
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setAction('add')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    action === 'add' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Abonar (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('subtract')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    action === 'subtract' 
                      ? 'border-red-500 bg-red-50 text-red-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Debitar (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('set')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    action === 'set' 
                      ? 'border-brand-500 bg-brand-50 text-brand-700' 
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>Definir (=)</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {action === 'set' ? 'Nuevo Saldo Exacto' : 'Monto del Ajuste'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Preview */}
            {amount && (
              <div className={`p-3 rounded-lg flex items-center justify-between border ${
                newBalancePreview > currentBalance ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
                newBalancePreview < currentBalance ? 'bg-red-50 border-red-100 text-red-800' :
                'bg-slate-50 border-slate-200 text-slate-700'
              }`}>
                <span className="text-sm font-medium">Saldo resultante:</span>
                <span className="font-bold">
                  {newBalancePreview.toLocaleString('es-CO', { style: 'currency', currency: wallet.currency || 'COP', minimumFractionDigits: 0 })}
                </span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo (Auditoría) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none h-20"
                placeholder="Ej. Devolución manual por error de sistema..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="mt-2 flex items-start gap-1.5 text-slate-500 text-xs">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <p>Este ajuste quedará registrado en el historial de transacciones con tu ID de administrador para fines de auditoría.</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || !description.trim()}
              className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Ajuste'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
