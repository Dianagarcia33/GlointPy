import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, UploadCloud, Wallet as WalletIcon, CheckCircle2 } from 'lucide-react';
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

  // Wallet State
  const [useWallet, setUseWallet] = useState(false);
  const [userWalletBalance, setUserWalletBalance] = useState<number>(0);
  const [walletAmount, setWalletAmount] = useState<number>(0);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [comprobantePreview, setComprobantePreview] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selected package object to determine amount
  const selectedPackage = packages.find(p => p.id === Number(packageId));
  const packageValue = selectedPackage ? selectedPackage.value : 0;

  useEffect(() => {
    if (isOpen) {
      setUserId('');
      setUserSearch('');
      setSelectedUserName('');
      setPackageId('');
      setPeriodId('');
      setReferredBy('');
      setUseWallet(false);
      setUserWalletBalance(0);
      setWalletAmount(0);
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

  // Fetch selected user's wallet balance
  useEffect(() => {
    if (!userId) {
      setUserWalletBalance(0);
      setWalletAmount(0);
      return;
    }

    const fetchUserWallet = async () => {
      try {
        setIsLoadingWallet(true);
        const res = await fetchApi('/wallets/admin/all');
        const userWallet = (res || []).find((item: any) => item.user_id === Number(userId));
        const balance = userWallet ? (userWallet.balance || 0) : 0;
        setUserWalletBalance(balance);
      } catch (err) {
        console.error("Error obteniendo billetera del usuario", err);
        setUserWalletBalance(0);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchUserWallet();
  }, [userId]);

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

  const handleToggleWallet = (checked: boolean) => {
    setUseWallet(checked);
    if (checked) {
      const maxAllowed = Math.min(userWalletBalance, packageValue);
      setWalletAmount(maxAllowed);
    } else {
      setWalletAmount(0);
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
    if (!packageValue || packageValue <= 0) {
      setError("El paquete seleccionado no tiene un monto válido.");
      return;
    }

    if (useWallet && walletAmount > userWalletBalance) {
      setError("El monto ingresado de billetera supera el saldo disponible del usuario.");
      return;
    }

    if (useWallet && walletAmount > packageValue) {
      setError("El monto de billetera no puede superar el valor total del paquete.");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('user_id', userId.toString());
      formData.append('paquete_inversion_id', packageId.toString());
      formData.append('periodo_contrato', periodId.toString());
      formData.append('monto', packageValue.toString());

      if (useWallet && walletAmount > 0) {
        formData.append('monto_billetera_usado', walletAmount.toString());
      }
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

  const remainingToPay = Math.max(0, packageValue - (useWallet ? walletAmount : 0));

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
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-800 text-sm font-medium">
                      {selectedUserName || users.find(u => u.id === userId)?.name || 'Usuario Seleccionado'}
                    </span>
                    {isLoadingWallet ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Saldo: ${userWalletBalance.toLocaleString('es-CO')} COP
                      </span>
                    )}
                  </div>
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

            {/* Monto de la Inversión (Readonly) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Monto de la Inversión (COP)</label>
              <input
                type="text"
                value={packageValue ? `$${packageValue.toLocaleString('es-CO')} COP` : 'Selecciona un paquete'}
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed text-sm"
              />
            </div>

            {/* OPCIÓN: Usar Saldo de Billetera */}
            {userId && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="toggle-use-wallet" className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                    <WalletIcon className="w-4 h-4 text-emerald-600" />
                    <span>Usar Saldo de Billetera del Usuario</span>
                  </label>
                  <input
                    type="checkbox"
                    id="toggle-use-wallet"
                    checked={useWallet}
                    onChange={(e) => handleToggleWallet(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {useWallet && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Saldo disponible en billetera:</span>
                      <span className="font-bold text-emerald-700">${userWalletBalance.toLocaleString('es-CO')} COP</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700">Monto a descontar de billetera (COP)</label>
                        <button
                          type="button"
                          onClick={() => setWalletAmount(Math.min(userWalletBalance, packageValue))}
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          Usar máximo disponible
                        </button>
                      </div>
                      <input
                        type="number"
                        value={walletAmount || ''}
                        onChange={(e) => setWalletAmount(Math.min(Number(e.target.value), userWalletBalance))}
                        placeholder="Ej: 500000"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Valor total paquete:</span>
                        <span>${packageValue.toLocaleString('es-CO')} COP</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Pago con Billetera:</span>
                        <span>- ${walletAmount.toLocaleString('es-CO')} COP</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-1">
                        <span>Restante a consignar:</span>
                        <span>${remainingToPay.toLocaleString('es-CO')} COP</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comprobante de Pago (Opcional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                {useWallet && remainingToPay === 0 ? 'Comprobante de Pago (Opcional - Pago 100% con Billetera)' : 'Comprobante de Pago (Opcional)'}
              </label>
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
