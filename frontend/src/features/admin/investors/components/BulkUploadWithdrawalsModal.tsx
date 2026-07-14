import React, { useState, useRef } from 'react';
import { X, UploadCloud, Loader2, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { bulkUploadWithdrawalsJSON } from '../../../../services/withdrawals';

interface BulkUploadWithdrawalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const BulkUploadWithdrawalsModal: React.FC<BulkUploadWithdrawalsModalProps> = ({
  isOpen,
  onClose,
  onUploaded
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setResult({ success: 0, errors: ['El archivo debe ser un CSV.'] });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setResult({ success: 0, errors: ['El archivo debe ser un CSV.'] });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);
    setProgress(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length <= 1) {
        throw new Error("El archivo está vacío o no tiene registros.");
      }
      
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(delimiter).map(h => h.trim());
      
      const parsedData = lines.slice(1).map((line, index) => {
        const values = line.split(delimiter);
        const obj: any = {};
        headers.forEach((header, i) => {
          let val = values[i] ? values[i].trim() : null;
          // Clean quotes if any
          if (val && val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          }
          if (val === 'NULL' || val === '') val = null;
          obj[header] = val;
        });
        return obj;
      });
      
      setProgress({ current: 0, total: parsedData.length });

      // Clean the parsed data to match Pydantic schema
      const jsonPayload = parsedData
        .filter(item => item.user_id && !isNaN(parseInt(item.user_id)))
        .map(item => ({
        id: item.id ? parseInt(item.id) : undefined,
        user_id: parseInt(item.user_id),
        investor_id: item.investor_id ? parseInt(item.investor_id) : null,
        origen: item.origen || 'inversion',
        tipo: item.tipo,
        monto: parseFloat(item.monto),
        impuesto: item.impuesto ? parseFloat(item.impuesto) : 0.00,
        monto_neto: parseFloat(item.monto_neto),
        fecha_solicitud: item.fecha_solicitud,
        fecha_retiro: item.fecha_retiro,
        estado: item.estado || 'pendiente',
        metodo_pago: item.metodo_pago,
        banco: item.banco,
        tipo_cuenta: item.tipo_cuenta,
        numero_cuenta: item.numero_cuenta,
        observaciones: item.observaciones,
        motivo_rechazo: item.motivo_rechazo,
        aprobado_por: item.aprobado_por ? parseInt(item.aprobado_por) : null,
        fecha_aprobacion: item.fecha_aprobacion,
        procesado_por: item.procesado_por ? parseInt(item.procesado_por) : null,
        fecha_procesamiento: item.fecha_procesamiento,
        comprobante_pago: item.comprobante_pago,
        receipt_path: item.receipt_path,
      }));

      const CHUNK_SIZE = 50;
      let totalSuccess = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < jsonPayload.length; i += CHUNK_SIZE) {
        const chunk = jsonPayload.slice(i, i + CHUNK_SIZE);
        try {
          const response = await bulkUploadWithdrawalsJSON(chunk);
          totalSuccess += response.count || 0;
        } catch (err: any) {
          let errorMsg = `Error en filas ${i + 1} a ${Math.min(i + CHUNK_SIZE, jsonPayload.length)}: `;
          errorMsg += err.message || 'Error desconocido';
          allErrors.push(errorMsg);
        }
        setProgress({ current: Math.min(i + CHUNK_SIZE, jsonPayload.length), total: jsonPayload.length });
      }

      setResult({ success: totalSuccess, errors: allErrors });
      
      if (allErrors.length === 0) {
        setTimeout(() => {
          onUploaded();
          setFile(null);
          setResult(null);
        }, 2000);
      }

    } catch (err: any) {
      setResult({
        success: 0,
        errors: ['Error crítico al procesar el archivo CSV.'],
      });
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const downloadTemplate = () => {
    const header = "id;user_id;investor_id;origen;tipo;monto;impuesto;monto_neto;fecha_solicitud;fecha_retiro;estado;metodo_pago;banco;tipo_cuenta;numero_cuenta;observaciones;motivo_rechazo;aprobado_por;fecha_aprobacion;procesado_por;fecha_procesamiento;comprobante_pago;receipt_path";
    const sampleRow = "1;1;2;inversion;rendimiento;100000;0.00;100000;2024-01-01;;procesado;transferencia;NEQUI;ahorros;3001234567;;;1;2024-01-01 10:00:00;1;2024-01-01 10:00:00;;";
    const csvContent = "\uFEFF" + header + "\n" + sampleRow;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_retiros.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-brand-600" />
            Carga Masiva de Retiros
          </h3>
          <button
            onClick={() => {
              setFile(null);
              setResult(null);
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {!result?.success && !result?.errors.length && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 w-full">
                <p className="font-semibold mb-1">Instrucciones</p>
                <p className="mb-2">Sube tu archivo CSV exportado. Se procesará en el navegador y se enviará al backend.</p>
                <button 
                  onClick={downloadTemplate}
                  className="text-brand-600 font-medium hover:underline text-xs"
                >
                  Descargar plantilla CSV
                </button>
              </div>
            </div>
          )}

          {!file && !result ? (
            <div 
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-10 h-10 text-slate-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">Haz clic para subir o arrastra y suelta</p>
                <p className="text-xs text-slate-500 mt-1">Solo archivos .CSV</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
          ) : result ? (
            <div className="space-y-4">
              {result.success > 0 && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 items-center text-emerald-700">
                  <CheckCircle2 className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="font-semibold">¡Carga completada exitosamente!</p>
                    <p className="text-sm">{result.success} retiros creados correctamente.</p>
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                  <div className="flex gap-2 items-center text-red-700 font-semibold">
                    <AlertCircle className="w-5 h-5" />
                    <p>Se encontraron errores ({result.errors.length}):</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-white rounded-lg p-3 border border-red-100 text-sm text-red-600 space-y-1">
                    {result.errors.map((err, idx) => (
                      <p key={idx}>{err}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate pr-4">
                  <p className="text-sm font-medium text-slate-700 truncate">{file?.name}</p>
                  <p className="text-xs text-slate-500">{(file?.size! / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button 
                onClick={() => setFile(null)}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          {result && (result.errors.length > 0 || result.success === 0) ? (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Intentar nuevamente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setResult(null);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              disabled={isUploading}
            >
              {result?.success ? 'Cerrar' : 'Cancelar'}
            </button>
          )}

          {!result && file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {progress ? `Procesando ${progress.current} de ${progress.total}...` : 'Procesando...'}
                </>
              ) : (
                'Subir e Importar'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
