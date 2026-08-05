import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UploadCloud } from 'lucide-react';
import { useAuthStore } from '../../../../store/authStore';
import { usersService, User } from '../../../../services/users';
import { packagesService, Package } from '../../../../services/packages';
import { periodsService, Period } from '../../../../services/periods';
import { fetchApi } from '../../../../services/api';
import { compressImage } from '../../../../utils/imageCompression';

interface AdminSolicitudInversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminSolicitudInversionModal: React.FC<AdminSolicitudInversionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuthStore();

  const [userId, setUserId] = useState<number | ''>('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  const [packageId, setPackageId] = useState<number | ''>('');
  const [periodId, setPeriodId] = useState<number | ''>('');
  const [referredBy, setReferredBy] = useState('');

  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selected package object to determine read-only amount
  const selectedPackage = packages.find(p => p.id === Number(packageId));

  useEffect(() => {
    if (isOpen) {
      setUserId('');
      setUserSearch('');
      setSelectedUserName('');
      setPackageId('');
      setPeriodId('');
      setReferredBy('');
      setComprobanteFile(null);
      setComprobantePreview(null);
      setError(null);
      setSuccess(false);

      const loadDependencies = async () => {
        try {
          setIsLoading(true);
          const [usersData, packagesData, periodsData] = await Promise.all([
            usersService.getUsers({ limit: 100 }),
            packagesService.getPackages(),
            periodsService.getPeriods()
          ]);
          setUsers(usersData.data || []);
          setPackages(packagesData || []);
          setPeriods(periodsData || []);
        } catch (err) {
          console.error("Error cargando datos para el modal", err);
        } finally {
          setIsLoading(false);
        }
      };

      loadDependencies();
    }
  }, [isOpen]);

  // Dynamic user search
  useEffect(() => {
    if (!isOpen) return;

    const handler = setTimeout(async () => {
      if (userSearch.trim().length > 0) {
        setIsSearching(true);
        try {
          const res = await usersService.getUsers({ search: userSearch.trim(), limit: 100 });
          setUsers(res.data || []);
        } catch (err) {
          console.error("Error en búsqueda de usuarios", err);
        } finally {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [userSearch, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        processedFile = await compressImage(file);
        setComprobantePreview(URL.createObjectURL(processedFile));
      } else {
        setComprobantePreview(null);
      }
      setComprobanteFile(processedFile);
    } catch (e) {
      setComprobanteFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Debes buscar y seleccionar un usuario.");
      return;
    }
    if (!packageId) {
      setError("Debes seleccionar un paquete.");
      return;
    }
    if (!periodId) {
      setError("Debes seleccionar un periodo de contrato.");
      return;
    }
    if (!selectedPackage || !selectedPackage.value || selectedPackage.value <= 0) {
      setError("El paquete seleccionado no tiene un monto válido.");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('paquete_inversion_id', packageId.toString());
      formData.append('periodo_contrato', periodId.toString());
      formData.append('monto', selectedPackage.value.toString());

      if (referredBy.trim()) {
        formData.append('codigo_referido', referredBy.trim());
      }
      if (comprobanteFile) {
        formData.append('comprobantes', comprobanteFile);
      }

      await fetchApi('/investments/requests', {
        method: 'POST',
        body: formData
      });

      setSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Error al registrar la solicitud de inversión.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">
            Solicitud de Inversión
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-100">
                ¡Solicitud de Inversión creada exitosamente!
              </div>
            )}

            {/* Referido (Opcional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Referido (Código de otra inversión)</label>
              <input
                type="text"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-sm"
                placeholder="Opcional"
              />
            </div>

            {/* Usuario Search Autocomplete */}
            <div className="space-y-1.5 relative">
              <label className="text-sm font-medium text-slate-700">Usuario *</label>
              {userId ? (
                <div className="flex items-center justify-between w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-800 text-sm font-medium">
                    {selectedUserName || users.find(u => u.id === userId)?.name || 'Usuario Seleccionado'}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => { setUserId(''); setSelectedUserName(''); setUserSearch(''); }} 
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input 
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onFocus={() => { if (!userSearch) setUserSearch(' '); setTimeout(() => setUserSearch(''), 10); }}
                    placeholder="Buscar por nombre o correo..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-sm"
                  />
                  {userSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="px-3 py-2 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                          <span>Buscando...</span>
                        </div>
                      ) : users.filter(u => 
                        u.name?.toLowerCase().includes(userSearch.toLowerCase().trim()) || 
                        u.email?.toLowerCase().includes(userSearch.toLowerCase().trim())
                      ).length > 0 ? (
                        users.filter(u => 
                          u.name?.toLowerCase().includes(userSearch.toLowerCase().trim()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase().trim())
                        ).map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => { 
                              setUserId(u.id); 
                              setSelectedUserName(`${u.name} (${u.email})`); 
                              setUserSearch(''); 
                            }}
                            className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm"
                          >
                            <div className="font-medium text-slate-800">{u.name}</div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-500 text-center">No hay resultados</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Paquete y Periodo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Paquete *</label>
                <select
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-sm"
                  required
                >
                  <option value="">Seleccione un paquete</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>${p.value.toLocaleString('es-CO')} COP</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Periodo *</label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors text-sm"
                  required
                >
                  <option value="">Seleccione un periodo</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.months || Math.round(p.days / 30)} Meses ({p.percentage}%)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Monto (Calculado automáticamente del Paquete - Readonly) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Monto de la Inversión (COP)</label>
              <input
                type="text"
                value={selectedPackage ? `$${selectedPackage.value.toLocaleString('es-CO')} COP` : 'Selecciona un paquete'}
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed text-sm"
              />
            </div>

            {/* Comprobante de Pago (Opcional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Comprobante de Pago (Opcional)</label>
              <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50 hover:border-brand-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  id="modal-solicitud-comprobante-file"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="modal-solicitud-comprobante-file" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                  <UploadCloud className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700">
                    {comprobanteFile ? comprobanteFile.name : 'Adjuntar archivo (Imagen o PDF)'}
                  </span>
                </label>
              </div>
              {comprobantePreview && (
                <img src={comprobantePreview} alt="Vista previa soporte" className="h-20 mx-auto rounded-lg border border-slate-200 object-cover mt-2" />
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || success}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Crear Solicitud de Inversión</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
