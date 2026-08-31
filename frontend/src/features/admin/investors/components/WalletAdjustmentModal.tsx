import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Loader2, Info, Sparkles, CheckCircle2, Wallet } from 'lucide-react';
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
  assignedCode?: string;
}

export const WalletAdjustmentModal: React.FC<WalletAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onAdjusted,
  wallet,
  userName,
  assignedCode
}) => {
  if (!isOpen || !wallet) return null;
  const [action, setAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentBalance = Number(wallet.balance);
  const inputAmount = Number(amount) || 0;
  
  let newBalancePreview = currentBalance;
  if (action === 'add') newBalancePreview = currentBalance + inputAmount;
  if (action === 'subtract') newBalancePreview = Math.max(0, currentBalance - inputAmount);
  if (action === 'set') newBalancePreview = Math.max(0, inputAmount);

  const codeTag = assignedCode ? `${assignedCode}` : '';

  const quickReasons = [
    {
      label: '💰 Liquidación Rendimiento',
      text: codeTag ? `Liquidación manual de rendimientos - Contrato ${codeTag}` : 'Liquidación manual de rendimientos',
      defaultAction: 'add' as const
    },
    {
      label: '⚖️ Nivelación de Saldo',
      text: codeTag ? `Ajuste por nivelación de saldo de billetera - Inversión ${codeTag}` : 'Ajuste por nivelación de saldo de billetera',
      defaultAction: 'set' as const
    },
    {
      label: '🎁 Bono de Referido',
      text: codeTag ? `Abono de bono por referido vinculado a ${codeTag}` : 'Abono de bono por referido',
      defaultAction: 'add' as const
    },
    {
      label: '🏦 Devolución de Capital',
      text: codeTag ? `Devolución manual de capital del contrato ${codeTag}` : 'Devolución manual de capital',
      defaultAction: 'add' as const
    },
    {
      label: '🔄 Reverso de Transacción',
      text: codeTag ? `Reverso de transacción errónea en contrato ${codeTag}` : 'Reverso de transacción errónea',
      defaultAction: 'subtract' as const
    },
    {
      label: '📋 Auditoría Interna',
      text: codeTag ? `Ajuste contable solicitado por auditoría para cuenta ${codeTag}` : 'Ajuste contable solicitado por auditoría',
      defaultAction: 'add' as const
    }
  ];

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

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-2xl">
              <Wallet className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Ajustar Saldo de Billetera</h2>
                {assignedCode && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-extrabold bg-brand-100 text-brand-800 border border-brand-200">
                    {assignedCode}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Inversionista: <strong className="text-slate-700 font-semibold">{userName}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Current Balance Card */}
          <div className="bg-brand-50/60 rounded-2xl p-4 flex justify-between items-center border border-brand-200/80">
            <div>
              <p className="text-[11px] font-bold text-brand-800 uppercase tracking-wider">Saldo Actual en Billetera</p>
              <p className="text-2xl font-black text-brand-900 font-montserrat mt-0.5">
                {currentBalance.toLocaleString('es-CO', { style: 'currency', currency: wallet.currency || 'COP', minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-700 shadow-2xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Ajuste
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setAction('add')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === 'add' 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Abonar (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('subtract')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === 'subtract' 
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-2xs' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Debitar (-)</span>
              </button>
              <button
                type="button"
                onClick={() => setAction('set')}
                className={`px-3 py-2.5 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  action === 'set' 
                    ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-2xs' 
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Definir (=)</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {action === 'set' ? 'Nuevo Saldo Exacto' : 'Monto del Ajuste'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-slate-400 font-bold text-sm">$</span>
              </div>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono font-bold text-slate-900 text-sm"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {amount && (
            <div className={`p-3.5 rounded-2xl flex items-center justify-between border ${
              newBalancePreview > currentBalance ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
              newBalancePreview < currentBalance ? 'bg-rose-50 border-rose-200 text-rose-900' :
              'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider">Saldo Resultante:</span>
              <span className="font-extrabold font-montserrat text-base">
                {newBalancePreview.toLocaleString('es-CO', { style: 'currency', currency: wallet.currency || 'COP', minimumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {/* Quick Responses */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                Respuestas Rápidas (Motivo):
              </span>
              {assignedCode && (
                <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                  Cód: {assignedCode}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {quickReasons.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDescription(item.text);
                    if (item.defaultAction) setAction(item.defaultAction);
                  }}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer text-left truncate ${
                    description === item.text
                      ? 'bg-brand-600 text-white border-brand-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 hover:border-slate-300'
                  }`}
                  title={item.text}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Motivo (Auditoría) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none h-20 text-xs text-slate-800"
              placeholder="Ej. Devolución manual por error de sistema..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="mt-2 flex items-start gap-1.5 text-slate-500 text-[11px]">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-600" />
              <p>Este ajuste quedará registrado en el historial contable y trazabilidad con tu ID administrativo.</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold text-xs disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !amount || !description.trim()}
              className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all font-bold text-xs disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-brand-600/20 cursor-pointer"
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
    </div>,
    document.body
  );
};
