import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
    let newTab: Window | null = null;
    try {
      setIsProcessing(true);
      setError(null);
      
      // Abrimos la pestaña ANTES del await para evitar que el navegador la bloquee por popup blocker
      newTab = window.open('about:blank', '_blank');

      const updatedWithdrawal = await paymentService.approveWithdrawal(withdrawal.id, receiptFile || undefined);
      
      if (newTab) {
        const path = updatedWithdrawal.receipt_path || updatedWithdrawal.comprobante_pago;
        if (path) {
          const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';
          newTab.location.href = `${baseUrl}/${path}`.replace(/([^:]\/)\/+/g, "$1");
        } else {
          const baseUrl = import.meta.env.VITE_API_URL || '';
          newTab.location.href = `${baseUrl}/withdrawals/${updatedWithdrawal.id}/receipt`;
        }
      }

      onUpdate();
      onClose();
    } catch (err: any) {
      if (newTab) newTab.close();
      setError(err.message || 'Error al aprobar el retiro');
      setIsProcessing(false);
    }
  };

  const REJECTION_PRESETS = [
    'Datos bancarios erróneos o cuenta no coincide con el titular.',
    'Fondos en proceso de verificación o auditoría de seguridad.',
    'Documentación o validación de identidad KYC pendiente.',
    'Solicitud duplicada o cancelada a petición del usuario.',
    'Inconsistencia en el monto solicitado o comprobante bancario.'
  ];

  const handleReject = async () => {
    const cleanReason = rejectionReason.trim();
    if (cleanReason.length < 10) {
      setError('Por favor, ingresa un motivo de rechazo claro de al menos 10 caracteres explicativos.');
      return;
    }
    
    try {
      setIsProcessing(true);
      setError(null);
      await paymentService.rejectWithdrawal(withdrawal.id, cleanReason);
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al rechazar el retiro');
      setIsProcessing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-2xl">
              <DollarSign className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Revisar Solicitud de Retiro #{withdrawal.id}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Verificación de fondos, datos bancarios y autorización de pago</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Info */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <User className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Datos del Titular</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Nombre Completo:</span>
                <span className="font-bold text-slate-800">{withdrawal.user?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Documento Identidad:</span>
                <span className="font-bold text-slate-800 font-mono">{withdrawal.user?.document_id || 'N/A'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium block text-[11px]">Correo Electrónico:</span>
                <span className="font-bold text-slate-800">{withdrawal.user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="bg-brand-50/60 rounded-2xl p-5 border border-brand-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-brand-200/60 pb-2">
              <DollarSign className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-xs text-brand-900 uppercase tracking-wide">Detalle Financiero & Liquidación</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Monto Bruto Solicitado:</span>
                <span className="font-bold text-slate-800">{formatCurrency(withdrawal.monto)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Costo Operativo & Retiro (3.2%):</span>
                <span className="font-bold text-rose-600">-{formatCurrency(withdrawal.impuesto)}</span>
              </div>
              <div className="col-span-2 pt-3 border-t border-brand-200/80 flex justify-between items-center">
                <span className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Monto Neto a Desembolsar:</span>
                <span className="text-2xl font-black text-brand-700 font-montserrat">{formatCurrency(withdrawal.monto_neto)}</span>
              </div>
            </div>
          </div>

          {/* Bank Account Info */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
              <Building2 className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Cuenta Bancaria Registrada en la Bóveda</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Método de Pago:</span>
                <span className="font-bold text-slate-800">{withdrawal.metodo_pago || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Entidad Bancaria:</span>
                <span className="font-bold text-slate-800">{withdrawal.banco || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Tipo de Cuenta:</span>
                <span className="font-bold text-slate-800">{withdrawal.tipo_cuenta || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-[11px]">Número de Cuenta:</span>
                <span className="font-extrabold text-slate-900 font-mono tracking-wider">{formatAccountNumber(withdrawal.numero_cuenta)}</span>
              </div>
            </div>
          </div>

          {/* Receipt Upload (Optional) */}
          {!isRejecting && (
            <div className="bg-emerald-50/60 rounded-2xl p-5 border border-emerald-200/80 space-y-2">
              <h3 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">Adjuntar Comprobante de Pago (Opcional)</h3>
              <p className="text-xs text-emerald-700 font-medium">Sube el archivo PDF o imagen de la transferencia realizada.</p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-emerald-800
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-xl file:border-0
                  file:text-xs file:font-bold
                  file:bg-emerald-100 file:text-emerald-800
                  hover:file:bg-emerald-200 transition-colors cursor-pointer"
              />
            </div>
          )}

          {/* Rejection Form */}
          {isRejecting && (
            <div className="bg-rose-50/70 rounded-2xl p-5 border border-rose-200 space-y-3 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-rose-900 uppercase tracking-wide">Motivo del Rechazo de Retiro</h3>
                <span className={`text-[11px] font-mono font-bold ${rejectionReason.trim().length >= 10 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {rejectionReason.trim().length} / mín. 10 caracteres
                </span>
              </div>
              <p className="text-xs text-rose-700 font-medium">El saldo del retiro será reintegrado de inmediato a la billetera del usuario.</p>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">Motivos Predefinidos:</label>
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-white border border-rose-200 hover:border-rose-400 text-rose-800 font-medium text-left transition-colors cursor-pointer hover:bg-rose-100/50"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explica detalladamente la causa del rechazo (mínimo 10 caracteres)..."
                className="w-full p-3 border border-rose-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs h-24 resize-none font-medium"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {!isRejecting ? (
            <button
              onClick={() => setIsRejecting(true)}
              disabled={isProcessing}
              className="px-4 py-2.5 text-rose-600 font-bold text-xs hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer border border-rose-200/60 bg-white"
            >
              <XCircle className="w-4 h-4" />
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
              className="px-4 py-2.5 text-slate-600 font-bold text-xs hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar Rechazo
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 text-slate-700 bg-white border border-slate-200 font-bold text-xs hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cerrar
            </button>
            
            {isRejecting ? (
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirmar Rechazo
              </button>
            ) : (
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Aprobar & Transferir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
