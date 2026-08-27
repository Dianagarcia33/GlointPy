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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" style={{ margin: 0 }}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header Estandarizado */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Previsualización de Dispersión de Pagos
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-brand-100 text-brand-800 border border-brand-200 font-mono">
                  {selectedWithdrawals.length} seleccionados
                </span>
                {autoDownloaded && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Download className="w-3 h-3 text-emerald-700" /> Excel Descargado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Verificación de estructura bancaria ACH, montos netos y confirmación de dispersión
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs font-bold border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial Summary Card */}
          <div className="bg-brand-50/60 rounded-2xl p-5 border border-brand-200/80 space-y-3">
            <div className="flex items-center gap-2 border-b border-brand-200/60 pb-2">
              <DollarSign className="w-4 h-4 text-brand-600" />
              <h3 className="font-bold text-xs text-brand-900 uppercase tracking-wide">Resumen Financiero de Dispersión</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Total Solicitudes:</span>
                <span className="font-bold text-slate-800">{rows.length} retiros seleccionados</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block text-[11px]">Referencia de Plataforma:</span>
                <span className="font-bold text-slate-800 font-mono">Gloint</span>
              </div>
              <div className="col-span-2 sm:col-span-1 sm:text-right">
                <span className="text-slate-500 font-medium block text-[11px]">Monto Neto Total a Dispersar:</span>
                <span className="text-xl font-black text-brand-700 font-montserrat">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Bank & ACH Records Detail */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Estructura Formateada con Códigos ACH</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono font-medium">8 Columnas Oficiales</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="py-2.5 px-3 font-bold text-center">#</th>
                      <th className="py-2.5 px-3 font-bold">DOCUMENT_TYPE</th>
                      <th className="py-2.5 px-3 font-bold">IDENTIFICATION_NUMBER</th>
                      <th className="py-2.5 px-3 font-bold">FULL_NAME</th>
                      <th className="py-2.5 px-3 font-bold">BANK_CODE (ACH)</th>
                      <th className="py-2.5 px-3 font-bold text-center">ACCOUNT_TYPE</th>
                      <th className="py-2.5 px-3 font-bold">ACCOUNT_NUMBER</th>
                      <th className="py-2.5 px-3 font-bold text-right">DEBIT_AMOUNT</th>
                      <th className="py-2.5 px-3 font-bold text-center">REFERENCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center font-bold text-slate-700">
                          {row.DOCUMENT_TYPE}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {row.IDENTIFICATION_NUMBER}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 uppercase tracking-tight">
                          {row.FULL_NAME}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-50 text-brand-700 font-mono font-extrabold rounded-md border border-brand-200 text-[11px]">
                            {row.BANK_CODE || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[120px] ml-2 inline-block align-middle" title={row.bankNameOriginal}>
                            {row.bankNameOriginal}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 font-mono font-bold rounded-md text-[10px] ${
                            row.ACCOUNT_TYPE === 1 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {row.ACCOUNT_TYPE} {row.ACCOUNT_TYPE === 1 ? '(Ahorros)' : '(Corriente)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 tracking-wider">
                          {row.ACCOUNT_NUMBER || 'Sin Cuenta'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900 text-right">
                          {formatCurrency(row.DEBIT_AMOUNT)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center text-slate-600 font-bold">
                          {row.REFERENCE}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Trazabilidad y Auditoría:</span>
              <span className="text-amber-800 text-[11px]">
                Al hacer clic en <strong>"Marcar como Procesados"</strong>, el estado de estas solicitudes cambiará a <strong>PROCESADO</strong> y se registrará la fecha y tu usuario de tesorería.
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={isProcessing || rows.length === 0}
            className="px-4 py-2.5 text-slate-700 font-bold text-xs hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2 border border-slate-200 bg-white cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-brand-600" />
            Descargar Excel (.xlsx)
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 text-slate-700 bg-white border border-slate-200 font-bold text-xs hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cerrar
            </button>
            
            <button
              type="button"
              onClick={handleProcessAll}
              disabled={isProcessing || rows.length === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Marcar como Procesados
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
