import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Search, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { verifyTransferRecipient, transferWalletFunds, VerifyRecipientResponse } from '../../../services/wallets';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance
}) => {
  const [identifier, setIdentifier] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const [verifiedRecipient, setVerifiedRecipient] = useState<VerifyRecipientResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const numericAmount = Number(amount) || 0;

  const handleVerify = async () => {
    if (!identifier.trim()) {
      setError('Por favor ingresa la cédula o correo electrónico del destinatario.');
      return;
    }
    setIsVerifying(true);
    setError(null);
    setVerifiedRecipient(null);

    try {
      const res = await verifyTransferRecipient(identifier.trim());
      setVerifiedRecipient(res);
    } catch (err: any) {
      setError(err.message || 'No se encontró ningún usuario activo con los datos ingresados.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecipient) {
      setError('Debes verificar los datos del destinatario antes de transferir.');
      return;
    }
    if (numericAmount <= 0) {
      setError('Ingresa un monto mayor a $0 COP.');
      return;
    }
    if (numericAmount > currentBalance) {
      setError(`Saldo insuficiente en tu billetera. Saldo disponible: $${currentBalance.toLocaleString('es-CO')} COP`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await transferWalletFunds({
        identifier: identifier.trim(),
        monto: numericAmount,
        notes: notes.trim() || undefined
      });

      setSuccessMessage(`¡Transferencia de $${res.amount.toLocaleString('es-CO')} COP a ${res.recipient_name} realizada con éxito!`);
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al procesar la transferencia. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIdentifier('');
    setAmount('');
    setNotes('');
    setVerifiedRecipient(null);
    setError(null);
    setSuccessMessage(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base font-montserrat">Transferir entre Billeteras</h2>
              <p className="text-xs text-slate-300">Envía saldo disponible mediante Cédula o Correo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all relative z-10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Mensajes de Alerta */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-3 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Saldo Disponible del Emisor */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Saldo Disponible en tu Billetera:</span>
            <span className="font-extrabold text-slate-900 text-sm font-mono">
              ${currentBalance.toLocaleString('es-CO')} COP
            </span>
          </div>

          {/* Identificador del Destinatario (Cédula o Email) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Número de Cédula o Correo Electrónico del Destinatario *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setVerifiedRecipient(null);
                  }}
                  placeholder="Ej. 1098765432 o usuario@ejemplo.com"
                  className="w-full pl-9 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium text-slate-800"
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || !identifier.trim()}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Ingresa el dato exacto. Por privacidad no se despliegan listas públicas de usuarios.
            </p>
          </div>

          {/* Tarjeta de Confirmación de Destinatario */}
          {verifiedRecipient && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Destinatario Confirmado en el Sistema</span>
              </div>
              <div className="text-xs space-y-1 border-t border-emerald-200/60 pt-2">
                <p className="text-slate-800 font-extrabold text-sm">{verifiedRecipient.name}</p>
                <p className="text-slate-600 font-mono">
                  Identificación: <strong className="text-slate-800">{verifiedRecipient.masked_document}</strong>
                </p>
                <p className="text-slate-600">Correo: {verifiedRecipient.email}</p>
              </div>
            </div>
          )}

          {/* Monto a Transferir */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Monto a Transferir ($ COP) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                min={1000}
                max={currentBalance > 0 ? currentBalance : 0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Mínimo $1,000"
                className={`w-full pl-8 pr-3.5 py-2.5 border rounded-xl text-sm font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  amount.trim() !== '' && (numericAmount < 1000 || numericAmount > currentBalance)
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/20'
                    : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-500'
                }`}
                required
              />
            </div>
            {amount.trim() !== '' && numericAmount > currentBalance && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                El monto ingresado supera tu saldo disponible (${currentBalance.toLocaleString('es-CO')} COP).
              </p>
            )}
            {amount.trim() !== '' && numericAmount > 0 && numericAmount < 1000 && (
              <p className="text-xs font-semibold text-rose-600 mt-1 flex items-center gap-1 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                El monto mínimo de transferencia es de $1,000 COP.
              </p>
            )}
          </div>

          {/* Notas Opcionales */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Concepto / Notas <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Transferencia personal"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !verifiedRecipient || numericAmount < 1000 || numericAmount > currentBalance}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  Confirmar Transferencia <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};
