import React, { useState, useRef } from 'react';
import { X, UploadCloud, Loader2, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { bulkUploadWallets } from '../../../../services/wallets';

interface BulkUploadWalletsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const BulkUploadWalletsModal: React.FC<BulkUploadWalletsModalProps> = ({
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
        throw new Error("El archivo está vacío o no contiene billeteras.");
      }
      
      const header = lines[0];
      const dataLines = lines.slice(1);
      const chunkSize = 20;
      
      let totalSuccess = 0;
      let totalErrors: string[] = [];
      
      setProgress({ current: 0, total: dataLines.length });

      for (let i = 0; i < dataLines.length; i += chunkSize) {
        const chunkLines = dataLines.slice(i, i + chunkSize);
        const chunkCsv = [header, ...chunkLines].join('\n');
        
        const chunkBlob = new Blob([chunkCsv], { type: 'text/csv' });
        const chunkFile = new File([chunkBlob], file.name, { type: 'text/csv' });
        
        const response = await bulkUploadWallets(chunkFile);
        totalSuccess += response.success_count;
        
        const chunkErrors = response.errors.map((err: string) => {
          return err.replace(/Fila (\d+):/, (match, p1) => `Fila ${parseInt(p1) + i}:`);
        });
        
        totalErrors = [...totalErrors, ...chunkErrors];
        
        setProgress({ current: Math.min(i + chunkSize, dataLines.length), total: dataLines.length });
      }
      
      setResult({ success: totalSuccess, errors: totalErrors });
      
      if (totalSuccess > 0 && totalErrors.length === 0) {
        setTimeout(() => {
          onUploaded();
          setFile(null);
          setResult(null);
        }, 2000);
      } else if (totalSuccess > 0) {
        onUploaded();
      }
    } catch (err: any) {
      setResult({
        success: 0,
        errors: [err.message || 'Error desconocido al subir el archivo.'],
      });
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "\uFEFFid;usuario_id;balance;currency;status\n1;179;637146.98;COP;active\n2;1;0.00;COP;active";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_billeteras.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-brand-600" />
            Carga Masiva de Billeteras (Wallets)
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
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Instrucciones</p>
                <p className="mb-2">Sube un archivo CSV con las siguientes columnas exactas:</p>
                <ul className="list-disc pl-4 space-y-1 text-blue-700/80 mb-3">
                  <li><strong>id (opcional):</strong> ID numérico de la billetera (útil para restaurar respaldos).</li>
                  <li><strong>usuario_id:</strong> ID numérico del usuario.</li>
                  <li><strong>balance:</strong> Saldo/Monto de la billetera (ej: 500000).</li>
                  <li><strong>currency:</strong> COP (por defecto si se deja vacío).</li>
                  <li><strong>status:</strong> active o frozen (active por defecto).</li>
                </ul>
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
                    <p className="font-semibold">¡Carga completada!</p>
                    <p className="text-sm">{result.success} billeteras cargadas/actualizadas correctamente.</p>
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
                  {progress ? `Procesando ${progress.current}/${progress.total}...` : 'Procesando...'}
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
