import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, CheckCircle2, AlertTriangle, DollarSign, Calculator, Lock, UserCheck, Loader2, User } from 'lucide-react';
import { commercialService, CommercialClientCheckResponse, SearchClientResult } from '../../../services/commercial';
import { useAuthStore } from '../../../store/authStore';

interface RegisterCommercialSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAccumulatedDirect?: number;
  isAdmin?: boolean;
  showAsesorSelect?: boolean;
}

export const RegisterCommercialSaleModal: React.FC<RegisterCommercialSaleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAccumulatedDirect = 0,
  isAdmin = false,
  showAsesorSelect = false
}) => {
  const { user } = useAuthStore();
  const isTrueAdmin = user?.is_superuser === true || user?.permissions?.includes('admin.roles.manage') === true;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchClientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingClient, setIsCheckingClient] = useState(false);

  const [targetCommercialId, setTargetCommercialId] = useState<number | null>(null);
  const [commercialUsers, setCommercialUsers] = useState<Array<{ id: number; name: string }>>([]);

  const [clientDocument, setClientDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [saleType, setSaleType] = useState<'contrato_nuevo' | 'reinversion' | 'referido'>('contrato_nuevo');
  const [amount, setAmount] = useState<string>('');
  const [referrerCode, setReferrerCode] = useState('');

  const [clientInfo, setClientInfo] = useState<CommercialClientCheckResponse | null>(null);
  const [isAmountLocked, setIsAmountLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldShowAsesorSelect = isTrueAdmin;

  useEffect(() => {
    if (shouldShowAsesorSelect && isOpen) {
      commercialService.getCommercialUsers()
        .then((res) => {
          setCommercialUsers(res);
          if (res.length > 0 && !targetCommercialId) setTargetCommercialId(res[0].id);
        })
        .catch(() => {});
    }
  }, [shouldShowAsesorSelect, isOpen]);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        commercialService.searchClients(searchTerm.trim())
          .then((res) => setSearchResults(res))
          .catch(() => setSearchResults([]))
          .finally(() => setIsSearching(false));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const selectSearchResult = (item: SearchClientResult) => {
    setClientDocument(item.document_id || searchTerm);
    setClientName(item.name);
    if (item.monto && item.monto > 0) {
      setAmount(item.monto.toString());
      setIsAmountLocked(true);
    }
    setClientInfo({
      client_document: item.document_id || searchTerm,
      client_exists: true,
      is_existing_client: true,
      client_name: item.name,
      monto: item.monto,
      allowed_types: ['referido'],
      forced_type: 'referido'
    });
    setSaleType('referido');
    setSearchTerm(`${item.name} (${item.assigned_code ? 'IG: #' + item.assigned_code : item.document_id || ''})`);
    setSearchResults([]);
  };

  if (!isOpen) return null;

  const handleCheckClient = async () => {
    if (!clientDocument.trim()) return;
    setIsCheckingClient(true);
    setError(null);
    try {
      const res = await commercialService.checkClient(clientDocument.trim());
      setClientInfo(res);
      if (res.forced_type) {
        setSaleType(res.forced_type as any);
      } else if (res.allowed_types && res.allowed_types.length > 0) {
        setSaleType(res.allowed_types[0] as any);
      }
      if (res.client_name) setClientName(res.client_name);
      if (res.monto && res.monto > 0) {
        setAmount(res.monto.toString());
        setIsAmountLocked(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error al validar el documento del cliente');
    } finally {
      setIsCheckingClient(false);
    }
  };

  const numericAmount = Number(amount) || 0;
  const THRESHOLD = 36000000;

  // Cálculo en vivo de la partición marginal o referido
  let estimatedCommission = 0;
  let tramoA = 0;
  let tramoB = 0;
  let effectiveRate = 0.03;

  if (saleType === 'referido') {
    effectiveRate = 0.018;
    estimatedCommission = numericAmount * 0.018;
  } else {
    if (currentAccumulatedDirect >= THRESHOLD) {
      tramoB = numericAmount;
      effectiveRate = 0.035;
      estimatedCommission = numericAmount * 0.035;
    } else if (currentAccumulatedDirect + numericAmount <= THRESHOLD) {
      tramoA = numericAmount;
      effectiveRate = 0.030;
      estimatedCommission = numericAmount * 0.030;
    } else {
      tramoA = THRESHOLD - currentAccumulatedDirect;
      tramoB = numericAmount - tramoA;
      estimatedCommission = (tramoA * 0.030) + (tramoB * 0.035);
      effectiveRate = numericAmount > 0 ? estimatedCommission / numericAmount : 0.030;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientDocument.trim()) {
      setError('Por favor ingresa el documento del cliente');
      return;
    }
    if (numericAmount <= 0) {
      setError('Por favor ingresa un monto mayor a cero');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        client_document: clientDocument.trim(),
        client_name: clientName.trim() || undefined,
        sale_type: saleType,
        amount: numericAmount,
        referrer_code: referrerCode.trim() || undefined
      };

      if (isTrueAdmin && targetCommercialId) {
        await commercialService.createAdminSale(targetCommercialId, payload);
      } else {
        await commercialService.createSale(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al adjudicar la venta comercial');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
              <Calculator className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Registrar Venta Comercial</h3>
              <p className="text-xs text-slate-500">Clasificación Obligatoria • Comisiones Marginales</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleccionar Asesor Comercial / Directivo de Inversión */}
          {shouldShowAsesorSelect && (
            <div className="bg-brand-50/60 p-3.5 border border-brand-200 rounded-xl space-y-1.5">
              <label className="block text-xs font-bold text-brand-900">
                👤 Adjudicar Venta a Asesor / Directivo de Inversión *
              </label>
              <select
                value={targetCommercialId || ''}
                onChange={(e) => setTargetCommercialId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-brand-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              >
                {commercialUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Buscar Cliente por Nombre, Cédula o Código Asignado (IG1974) */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Buscar Cliente (por Nombre, Cédula o Código IG1974) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setClientDocument(e.target.value);
                  setClientInfo(null);
                }}
                onBlur={() => {
                  if (clientDocument && !clientInfo) {
                    handleCheckClient();
                  }
                }}
                placeholder="Escribe Nombre, Cédula o Código (Ej. IG1974, Juan, 1098...)"
                className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
              <div className="absolute right-3 top-2.5 text-slate-400">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </div>
            </div>

            {/* Dropdown de Autocompletado */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((item) => (
                  <button
                    key={`${item.user_id}-${item.assigned_code}`}
                    type="button"
                    onClick={() => selectSearchResult(item)}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block">{item.name}</span>
                      <span className="text-[11px] text-slate-500 block">Doc: {item.document_id || 'N/A'} • Email: {item.email}</span>
                    </div>
                    {item.assigned_code && (
                      <span className="px-2 py-0.5 bg-brand-50 text-brand-700 font-bold rounded text-[10px] uppercase shrink-0">
                        Code: #{item.assigned_code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Banner de Validación del Cliente */}
          {clientInfo && (
            clientInfo.is_existing_client ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cliente Existente en Plataforma</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Por regla de negocio, esta venta se ha clasificado automáticamente como <strong className="font-extrabold text-amber-950">REFERIDO (1.8% Fijo)</strong>. Las opciones de Contrato Nuevo y Reinversión están bloqueadas.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 text-emerald-800 font-medium">
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cliente Nuevo en el Sistema • Opciones unlocked (3.0% / 3.5%)</span>
              </div>
            )
          )}

          {/* Nombre del Cliente */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nombre Completo del Cliente
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Clasificación de la Venta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Clasificación Comercial de la Venta *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSaleType('contrato_nuevo')}
                disabled={clientInfo?.forced_type === 'referido' || (clientInfo?.allowed_types && !clientInfo.allowed_types.includes('contrato_nuevo'))}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  saleType === 'contrato_nuevo'
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                } ${clientInfo?.forced_type === 'referido' || (clientInfo?.allowed_types && !clientInfo.allowed_types.includes('contrato_nuevo')) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                📄 Contrato Nuevo
              </button>

              <button
                type="button"
                onClick={() => setSaleType('reinversion')}
                disabled={clientInfo?.forced_type === 'referido' || (clientInfo?.allowed_types && !clientInfo.allowed_types.includes('reinversion'))}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  saleType === 'reinversion'
                    ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                } ${clientInfo?.forced_type === 'referido' || (clientInfo?.allowed_types && !clientInfo.allowed_types.includes('reinversion')) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                🔄 Reinversión
              </button>

              <button
                type="button"
                onClick={() => setSaleType('referido')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  saleType === 'referido'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                👥 Referido
              </button>
            </div>
          </div>

          {/* Código del Recomendador en caso de Referido */}
          {saleType === 'referido' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Código del Cliente Recomendador (Origen) <span className="text-slate-400 font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                value={referrerCode}
                onChange={(e) => setReferrerCode(e.target.value)}
                placeholder="Ej. IG1974 (opcional)"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 uppercase font-mono"
              />
            </div>
          )}

          {/* Paquete ($ COP) - Bloqueado Automático */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Paquete ($ COP) *
              </label>
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Automático del IG
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
              <input
                type="number"
                value={amount}
                readOnly
                disabled
                placeholder="Selecciona un cliente o IG para cargar el paquete automáticamente..."
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 font-mono cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Previsualización en Vivo del Cálculo Marginal */}
          {numericAmount > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                Previsualización del Cálculo de Comisión:
              </span>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Tasa Efectiva Aplicada:</span>
                <span className="font-extrabold text-brand-600 text-sm">
                  {(effectiveRate * 100).toFixed(2)}%
                </span>
              </div>

              {saleType !== 'referido' && (tramoA > 0 || tramoB > 0) && (
                <div className="space-y-1 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200/70 mt-1">
                  {tramoA > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tramo Base (3.0% hasta $36M):</span>
                      <span className="font-mono font-bold">${tramoA.toLocaleString('es-CO')} COP</span>
                    </div>
                  )}
                  {tramoB > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Tramo Excedente (3.5% superando $36M):</span>
                      <span className="font-mono font-bold">${tramoB.toLocaleString('es-CO')} COP</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-800">Comisión Directa Calculada:</span>
                <span className="text-emerald-700 text-base">
                  +${estimatedCommission.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
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
              disabled={isSubmitting || numericAmount <= 0}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Adjudicar Venta
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
