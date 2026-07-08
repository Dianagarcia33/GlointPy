import React, { useState, useRef } from 'react';
import { usersService } from '../../../../services/users';
import { Download, UploadCloud, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Generate CSV template locally
    const headers = ["id", "name", "email", "document_id", "phone_number", "date_of_birth", "roles"];
    const example = ["", "Admin Principal", "admin@gloint.com", "123456789", "+573001234567", "1990-01-01", "Admin, Supervisor"];
    const example2 = ["99", "Cajero 1", "cajero@gloint.com", "987654321", "+573009876543", "1995-05-15", "Cajero"];
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(";") + "\n"
      + example.join(";") + "\n"
      + example2.join(";");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_usuarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setResult(null);
    try {
      const uploadResult = await usersService.uploadBulkUsers(file);
      setResult(uploadResult);
      if (uploadResult.success > 0) {
        onUploaded();
      }
    } catch (err: any) {
      setResult({ success: 0, errors: [err.message || "Error al subir el archivo"] });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Carga Masiva de Usuarios</h2>
            <p className="text-sm text-slate-500 mt-1">Sube un archivo CSV para crear múltiples usuarios a la vez.</p>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {!result && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Instrucciones</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Descarga la plantilla y llénala sin cambiar los nombres de las columnas.</li>
                    <li>La contraseña por defecto será <strong>el documento de identidad</strong> del usuario.</li>
                    <li>Para los roles, escribe el nombre del rol. Puedes separarlos por comas (Ej. <em>Admin, Cajero</em>).</li>
                  </ul>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="mt-3 flex items-center gap-2 text-blue-700 hover:text-blue-800 font-semibold text-sm hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Descargar plantilla CSV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Archivo CSV</label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer'}`}
                  onClick={() => !file && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {file ? (
                    <div>
                      <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-3 text-sm text-red-500 hover:text-red-600 font-medium hover:underline"
                      >
                        Cambiar archivo
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Haz clic para seleccionar un archivo CSV</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                  {result.success > 0 ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Carga Finalizada</h3>
                <p className="text-slate-600">
                  Se crearon <strong className="text-emerald-600">{result.success}</strong> usuarios exitosamente.
                </p>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Errores encontrados ({result.errors.length})
                  </h4>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <ul className="text-xs text-red-700 space-y-1 list-disc pl-4">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
          {result ? (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-all"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Subir Usuarios
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
