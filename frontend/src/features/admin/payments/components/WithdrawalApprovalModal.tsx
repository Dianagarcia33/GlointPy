import React, { useState } from 'react';
import { X, CheckCircle, XCircle, Building2, User, FileText, Loader2, DollarSign } from 'lucide-react';
import { Withdrawal } from '../types';
import { paymentService } from '../services/paymentService';

interface WithdrawalApprovalModalProps {
  withdrawal: Withdrawal;
  onClose: () => void;
  onUpdate: () => void;
}

export const WithdrawalApprovalModal: React.FC<WithdrawalApprovalModalProps> = ({ withdrawal, onClose, onUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatAccountNumber = (accountNum: string | undefined | null) => {
    if (!accountNum) return 'N/A';
    if (accountNum.toLowerCase().includes('e')) {
      const standardFormat = accountNum.replace(',', '.');
      const num = Number(standardFormat);
      if (!isNaN(num)) {
        // useGrouping: false prevents commas, fullwide prevents scientific notation string output
        return num.toLocaleString('fullwide', { useGrouping: false });
      }
    }
    return accountNum;
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const updatedWithdrawal = await paymentService.approveWithdrawal(withdrawal.id, receiptFile || undefined);
      
      // Si el backend devolvió una ruta de comprobante (generada o manual), la abrimos en una nueva pestaña
      if (updatedWithdrawal.receipt_path) {
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
        const fullUrl = `${baseUrl}/${updatedWithdrawal.receipt_path}`.replace(/([^:]\/)\/+/g, "$1"); // remove double slashes
        window.open(fullUrl, '_blank');
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al aprobar el retiro');
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Por favor, ingresa el motivo del rechazo.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      await paymentService.rejectWithdrawal(withdrawal.id, rejectionReason);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al rechazar el retiro');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            Revisar Solicitud de Retiro #{withdrawal.id}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* User Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Datos del Usuario</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Nombre:</span>
                <span className="font-medium text-gray-900">{withdrawal.user?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Documento:</span>
                <span className="font-medium text-gray-900">{withdrawal.user?.document_id || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">Correo Electrónico:</span>
                <span className="font-medium text-gray-900">{withdrawal.user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">Detalle Financiero</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-indigo-600/80 block">Monto Bruto:</span>
                <span className="font-medium text-indigo-900">{formatCurrency(withdrawal.monto)}</span>
              </div>
              <div>
                <span className="text-indigo-600/80 block">Impuestos / Deducciones:</span>
                <span className="font-medium text-indigo-900 text-red-600">-{formatCurrency(withdrawal.impuesto)}</span>
              </div>
              <div className="col-span-2 pt-2 border-t border-indigo-200 flex justify-between items-center">
                <span className="font-semibold text-indigo-900">Monto Neto a Pagar:</span>
                <span className="text-xl font-bold text-indigo-700">{formatCurrency(withdrawal.monto_neto)}</span>
              </div>
            </div>
          </div>

          {/* Bank Account Info */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Cuenta Bancaria Registrada</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Método:</span>
                <span className="font-medium text-gray-900">{withdrawal.metodo_pago || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Banco:</span>
                <span className="font-medium text-gray-900">{withdrawal.banco || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Tipo de Cuenta:</span>
                <span className="font-medium text-gray-900">{withdrawal.tipo_cuenta || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Número de Cuenta:</span>
                <span className="font-medium text-gray-900 tracking-wider">{formatAccountNumber(withdrawal.numero_cuenta)}</span>
              </div>
            </div>
          </div>

          {/* Receipt Upload (Optional) */}
          {!isRejecting && (
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
              <h3 className="font-semibold text-emerald-900 mb-2">Comprobante de Pago (Opcional)</h3>
              <p className="text-xs text-emerald-700 mb-3">Sube el comprobante de la transferencia si ya la realizaste.</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-emerald-700
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-emerald-100 file:text-emerald-700
                  hover:file:bg-emerald-200 transition-colors"
              />
            </div>
          )}

          {/* Rejection Form */}
          {isRejecting && (
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-semibold text-red-900 mb-2">Motivo de Rechazo</h3>
              <p className="text-xs text-red-700 mb-3">El dinero será devuelto a la billetera del usuario automáticamente.</p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica detalladamente por qué se rechaza este retiro..."
                className="w-full p-3 border border-red-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm h-24 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
          {!isRejecting ? (
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isProcessing}
              className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Rechazar Retiro
            </button>
          ) : (
            <button
              onClick={() => {
                setIsRejecting(false);
                setRejectionReason('');
                setError(null);
              }}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar Rechazo
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-200 font-medium hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>
            
            {isRejecting ? (
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-600/20"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Confirmar Rechazo
              </button>
            ) : (
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Aprobar Retiro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
