import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, Package as PackageIcon, Calendar, Loader2, Upload, AlertCircle, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../../services/api';
import { Investor } from '../../../../services/investors';
import { compressImage } from '../../../../utils/imageCompression';

interface AdminCapitalIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investor: Investor | null;
}

export const AdminCapitalIncreaseModal: React.FC<AdminCapitalIncreaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  investor,
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<number | ''>('');
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | ''>('');
  const [referralCode, setReferralCode] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: packages = [] } = useQuery({
    queryKey: ['investment_packages'],
    queryFn: () => fetchApi('/packages'),
    enabled: isOpen,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['contract_periods'],
    queryFn: () => fetchApi('/periods'),
    enabled: isOpen,
  });

  useEffect(() => {
    if (investor) {
      setSelectedPackageId('');
      setSelectedPeriodId(investor.period_id || '');
      setReferralCode('');
      setReceiptFile(null);
      setError(null);
    }
  }, [investor, isOpen]);

  if (!isOpen || !investor) return null;

  const currentPackageValue = investor.package ? Number(investor.package.value) : 0;
  
  // Only show packages of higher value than the current package
  const availablePackages = packages.filter((p: any) => Number(p.value) > currentPackageValue && p.is_active);

  const selectedTargetPackage = packages.find((p: any) => p.id === Number(selectedPackageId));
  const targetPackageValue = selectedTargetPackage ? Number(selectedTargetPackage.value) : 0;
  const differenceAmount = Math.max(0, targetPackageValue - currentPackageValue);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImage(file);
          setReceiptFile(compressed);
        } catch (err) {
          setReceiptFile(file);
        }
      } else {
        setReceiptFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId) {
      setError('Por favor selecciona el nuevo paquete de inversión');
      return;
    }
    if (!selectedPeriodId) {
      setError('Por favor selecciona el periodo del contrato');
      return;
    }
    if (differenceAmount <= 0) {
      setError('El nuevo paquete debe tener un valor superior al paquete actual');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('paquete_inversion_id', selectedPackageId.toString());
      formData.append('monto', differenceAmount.toString());
      formData.append('periodo_contrato', selectedPeriodId.toString());
      formData.append('is_upgrade', 'true');
      formData.append('investor_id', investor.id.toString());
      formData.append('user_id', investor.user_id.toString());
      if (referralCode.trim()) {
        formData.append('codigo_referido', referralCode.trim());
      }
      if (receiptFile) {
        formData.append('comprobantes', receiptFile);
      }

      await fetchApi('/investments/requests', {
        method: 'POST',
        body: formData,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el aumento de capital');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Solicitar Aumento de Capital</h3>
              <p className="text-xs text-slate-500">Inversión #{investor.assigned_code || investor.id} • Usuario: {investor.user?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Comparativo de Contrato Actual */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato Actual</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Paquete Actual:</span>
                <span className="text-sm font-bold text-slate-800">
                  {investor.package ? `$${Number(investor.package.value).toLocaleString('es-CO')} COP` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Periodo Actual:</span>
                <span className="text-sm font-bold text-slate-800">
                  {investor.period ? `${investor.period.months} meses (${investor.period.percentage}%)` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Seleccionar Nuevo Paquete */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nuevo Paquete Objetivo *
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="">-- Selecciona un paquete superior --</option>
              {availablePackages.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${Number(p.value).toLocaleString('es-CO')} COP)
                </option>
              ))}
            </select>
            {availablePackages.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No hay paquetes disponibles con un valor superior al paquete actual (${currentPackageValue.toLocaleString('es-CO')} COP).
              </p>
            )}
          </div>

          {/* Seleccionar Periodo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Periodo de Contrato *
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value ? Number(e.target.value) : '')}
              required
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="">-- Selecciona el periodo --</option>
              {periods.map((per: any) => (
                <option key={per.id} value={per.id}>
                  {per.months} meses ({per.percentage}% mensual - {per.days} días)
                </option>
              ))}
            </select>
          </div>

          {/* Resumen del Diferencial */}
          {selectedTargetPackage && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-amber-900 font-medium">
                <span>Monto Paquete Objetivo:</span>
                <span className="font-bold">${targetPackageValue.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between items-center text-xs text-amber-900 font-medium">
                <span>Valor Contrato Anterior:</span>
                <span className="font-bold">-${currentPackageValue.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">Monto Diferencial a Abonar:</span>
                <span className="text-lg font-bold text-amber-700">
                  ${differenceAmount.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>
          )}

          {/* Código Referido (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código de Referido (opcional)
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Ej. REF-123"
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Comprobante de Pago (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comprobante de Pago (opcional)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-200 transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                {receiptFile ? receiptFile.name : 'Adjuntar Comprobante'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Nota: La solicitud ingresará con estado <span className="font-bold text-amber-600">Pendiente</span> para ser revisada y aprobada en la tabla de Solicitudes de Inversión.
          </p>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPackageId || differenceAmount <= 0}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  Crear Solicitud de Aumento
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
