import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Building2, ShieldCheck, ArrowRight, DollarSign, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Withdrawal } from '../types';
import { DataBank } from '../../../../services/bankAccounts';
import { paymentService } from '../services/paymentService';

interface BulkPayoutPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedWithdrawals: Withdrawal[];
  officialBanks: DataBank[];
}

interface ExportRow {
  id: number;
  DOCUMENT_TYPE: number | string;
  IDENTIFICATION_NUMBER: string;
  FULL_NAME: string;
  BANK_CODE: string;
  ACCOUNT_TYPE: number | string;
  ACCOUNT_NUMBER: string;
  DEBIT_AMOUNT: number;
  REFERENCE: string;
  bankNameOriginal?: string;
}

export const BulkPayoutPreviewModal: React.FC<BulkPayoutPreviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedWithdrawals,
  officialBanks
}) => {
  const [reference, setReference] = useState<string>('Gloint');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDownloaded, setAutoDownloaded] = useState<boolean>(false);
  const downloadedRef = useRef<boolean>(false);

  // Helper de normalización para macheo de banco a código ACH
  const normalize = (text: string = '') =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const getBankCode = (bancoName: string = ''): string => {
    if (!bancoName) return '';
    const cleanInput = bancoName.trim();
    
    // Si ya es un código numérico exacto de 4 dígitos
    const directCode = officialBanks.find(b => b.code_banck === cleanInput);
    if (directCode) return directCode.code_banck;

    const normInput = normalize(cleanInput);

    // Búsqueda exacta normalizada
    const exactMatch = officialBanks.find(b => normalize(b.banck) === normInput);
    if (exactMatch) return exactMatch.code_banck;

    // Búsquedas por inclusión / alias comunes
    for (const b of officialBanks) {
      const normBank = normalize(b.banck);
      if (normBank.includes(normInput) || normInput.includes(normBank)) {
        return b.code_banck;
      }
    }

    // Casos especiales conocidos
    if (normInput.includes('bancolombia')) return '1007';
    if (normInput.includes('nequi')) return '1507';
    if (normInput.includes('daviplata')) return '1551';
    if (normInput.includes('davivienda')) return '1051';
    if (normInput.includes('bogota')) return '1001';
    if (normInput.includes('itau')) return '1006';
    if (normInput.includes('bbva')) return '1013';
    if (normInput.includes('colpatria') || normInput.includes('davibank')) return '1019';
    if (normInput.includes('occidente')) return '1023';
    if (normInput.includes('villas')) return '1052';
    if (normInput.includes('popular')) return '1002';
    if (normInput.includes('lulo')) return '1070';
    if (normInput.includes('nu') || normInput.includes('nubank')) return '1809';
    if (normInput.includes('falabella')) return '1062';
    if (normInput.includes('pichincha')) return '1060';
    if (normInput.includes('agrario')) return '1040';
    if (normInput.includes('coopcentral')) return '1066';
    if (normInput.includes('confiar')) return '1292';
    if (normInput.includes('rappi')) return '1811';
    if (normInput.includes('uala')) return '1804';
    if (normInput.includes('movii')) return '1801';

    return cleanInput; // fallback
  };

  const getAccountTypeCode = (tipoCuenta: string = ''): number => {
    const norm = normalize(tipoCuenta);
    if (norm.includes('corriente')) return 2;
    return 1; // Default 1 = Ahorros
  };

  const getDocumentTypeCode = (docId: string = ''): number => {
    // 1: CC, 2: CE, 3: NIT, 4: Pasaporte
    return 1;
  };

  // Mapear los registros a la estructura exacta de LogyPay
  const rows: ExportRow[] = useMemo(() => {
    return selectedWithdrawals.map(w => {
      const bankCode = getBankCode(w.banco || '');
      const accountType = getAccountTypeCode(w.tipo_cuenta || '');
      const docType = getDocumentTypeCode(w.user?.document_id || '');
      const docNumber = (w.user?.document_id || '').replace(/\D/g, '') || String(w.user_id);
      const fullName = (w.user?.name || '').trim();
      const accountNumber = (w.numero_cuenta || '').trim().replace(/[^0-9a-zA-Z]/g, '');
      const amount = Math.round(parseFloat(String(w.monto_neto || w.monto || 0)));

      return {
        id: w.id,
        DOCUMENT_TYPE: docType,
        IDENTIFICATION_NUMBER: docNumber,
        FULL_NAME: fullName,
        BANK_CODE: bankCode,
        ACCOUNT_TYPE: accountType,
        ACCOUNT_NUMBER: accountNumber,
        DEBIT_AMOUNT: amount,
        REFERENCE: reference || 'Gloint',
        bankNameOriginal: w.banco || 'No registrado'
      };
    });
  }, [selectedWithdrawals, officialBanks, reference]);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.DEBIT_AMOUNT, 0);
  }, [rows]);

  const handleDownloadExcel = () => {
    try {
      // Data para la hoja de cálculo con los encabezados exactos
      const exportData = rows.map(r => ({
        DOCUMENT_TYPE: r.DOCUMENT_TYPE,
        IDENTIFICATION_NUMBER: r.IDENTIFICATION_NUMBER,
        FULL_NAME: r.FULL_NAME,
        BANK_CODE: r.BANK_CODE,
        ACCOUNT_TYPE: r.ACCOUNT_TYPE,
        ACCOUNT_NUMBER: r.ACCOUNT_NUMBER,
        DEBIT_AMOUNT: r.DEBIT_AMOUNT,
        REFERENCE: r.REFERENCE
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-ajustar anchos de columna para lectura clara
      const colWidths = [
        { wch: 16 }, // DOCUMENT_TYPE
        { wch: 24 }, // IDENTIFICATION_NUMBER
        { wch: 30 }, // FULL_NAME
        { wch: 14 }, // BANK_CODE
        { wch: 16 }, // ACCOUNT_TYPE
        { wch: 22 }, // ACCOUNT_NUMBER
        { wch: 16 }, // DEBIT_AMOUNT
        { wch: 18 }  // REFERENCE
      ];
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dispersión Pagos');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `dispersion_pagos_${reference.toLowerCase()}_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, filename);
      setAutoDownloaded(true);
    } catch (err: any) {
      console.error('Error generando archivo Excel:', err);
      setError('Error al generar el archivo Excel de dispersión');
    }
  };

  // Descarga automática inmediata al abrir el modal con registros seleccionados
  useEffect(() => {
    if (isOpen && rows.length > 0 && !downloadedRef.current) {
      downloadedRef.current = true;
      // Pequeño timeout para permitir que el modal se renderice primero
      const timer = setTimeout(() => {
        handleDownloadExcel();
      }, 150);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      downloadedRef.current = false;
      setAutoDownloaded(false);
    }
  }, [isOpen, rows]);

  if (!isOpen) return null;

  const handleProcessAll = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      const ids = selectedWithdrawals.map(w => w.id);
      await paymentService.bulkProcessWithdrawals(ids);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error marcando retiros como procesados:', err);
      setError(err.message || 'Error al cambiar el estado de los pagos a procesados');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 sm:p-7 border-b border-slate-100 bg-slate-900 text-white relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-500/20 text-brand-300 rounded-2xl border border-brand-500/30">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-montserrat flex flex-wrap items-center gap-2">
                Previsualización de Dispersión de Pagos
                <span className="text-xs px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono rounded-full border border-emerald-500/30">
                  {selectedWithdrawals.length} seleccionados
                </span>
                {autoDownloaded && (
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-600/90 text-white font-bold rounded-full flex items-center gap-1 shadow-xs animate-in fade-in">
                    <Download className="w-3 h-3" /> Archivo Excel Descargado
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                La plantilla para dispersión bancaria fue generada. Revisa los datos y confirma para cambiar a procesados.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Controls Bar & Reference Config */}
        <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Referencia / Plataforma:
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Gloint"
              className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Total Dispersión</span>
              <span className="text-lg sm:text-xl font-extrabold text-emerald-600 font-montserrat">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Body / Preview Table */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 text-rose-700 text-sm rounded-2xl border border-rose-200 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3.5 font-bold text-center">#</th>
                    <th className="py-3 px-3.5 font-bold">DOCUMENT_TYPE</th>
                    <th className="py-3 px-3.5 font-bold">IDENTIFICATION_NUMBER</th>
                    <th className="py-3 px-3.5 font-bold">FULL_NAME</th>
                    <th className="py-3 px-3.5 font-bold">
                      BANK_CODE
                      <span className="block text-[9px] text-slate-400 font-normal font-sans">(Entidad)</span>
                    </th>
                    <th className="py-3 px-3.5 font-bold text-center">ACCOUNT_TYPE</th>
                    <th className="py-3 px-3.5 font-bold">ACCOUNT_NUMBER</th>
                    <th className="py-3 px-3.5 font-bold text-right">DEBIT_AMOUNT</th>
                    <th className="py-3 px-3.5 font-bold text-center">REFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-center font-bold text-slate-700">
                        {row.DOCUMENT_TYPE}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                        {row.IDENTIFICATION_NUMBER}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-800 uppercase tracking-tight">
                        {row.FULL_NAME}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 text-brand-700 font-mono font-extrabold rounded-lg border border-brand-200">
                          {row.BANK_CODE || 'N/A'}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={row.bankNameOriginal}>
                          {row.bankNameOriginal}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 font-mono font-bold rounded-md text-[11px] ${
                          row.ACCOUNT_TYPE === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {row.ACCOUNT_TYPE} {row.ACCOUNT_TYPE === 1 ? '(Ahorros)' : '(Corriente)'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 tracking-wider">
                        {row.ACCOUNT_NUMBER || 'Sin Cuenta'}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-extrabold text-emerald-700 text-right">
                        {row.DEBIT_AMOUNT.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-center text-slate-600 font-bold">
                        {row.REFERENCE}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Información Importante de Dispersión:</p>
              <p className="text-amber-800 mt-0.5">
                Al hacer clic en <strong>"Marcar como Procesados"</strong>, el estado de estas solicitudes pasará a <strong>PROCESADO</strong> y se registrará la fecha y tu usuario de tesorería en la auditoría del sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200/80 rounded-2xl transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isProcessing || rows.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-brand-600" />
              Descargar Archivo Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={handleProcessAll}
              disabled={isProcessing || rows.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Actualizando a Procesados...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Marcar como Procesados
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
