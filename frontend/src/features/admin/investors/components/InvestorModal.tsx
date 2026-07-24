import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { Investor, createInvestor, updateInvestor } from '../../../../services/investors';
import { usersService, User } from '../../../../services/users';
import { packagesService, Package } from '../../../../services/packages';
import { periodsService, Period } from '../../../../services/periods';
import { useAuthStore } from '../../../../store/authStore';

interface InvestorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  investor?: Investor | null;
}

export const InvestorModal: React.FC<InvestorModalProps> = ({ isOpen, onClose, onSaved, investor }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.is_superuser === true || 
    user?.permissions?.includes('admin.investors.manage') === true || 
    user?.permissions?.includes('admin.roles.manage') === true;

  const [assignedCode, setAssignedCode] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [userId, setUserId] = useState<number | ''>('');
  const [packageId, setPackageId] = useState<number | ''>('');
  const [periodId, setPeriodId] = useState<number | ''>('');
  const [observations, setObservations] = useState('');
  const [startDate, setStartDate] = useState('');
  
  const [userSearch, setUserSearch] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (investor) {
        setAssignedCode(investor.assigned_code);
        setReferredBy(investor.referred_by || '');
        setUserId(investor.user_id);
        setPackageId(investor.package_id);
        setPeriodId(investor.period_id);
        setObservations(investor.observations || '');
        
        // Format start_date for input type="date"
        if (investor.start_date) {
            const dateObj = new Date(investor.start_date);
            setStartDate(dateObj.toISOString().split('T')[0]);
        } else {
            setStartDate('');
        }
      } else {
        setAssignedCode('');
        setReferredBy('');
        setUserId('');
        setPackageId('');
        setPeriodId('');
        setObservations('');
        setStartDate(new Date().toISOString().split('T')[0]);
      }
      setError(null);
      
      // Load dependencies
      const loadDependencies = async () => {
          try {
              const [usersData, packagesData, periodsData] = await Promise.all([
                  usersService.getUsers({ limit: 100 }), // Max allowed by backend is 100
                  packagesService.getPackages(),
                  periodsService.getPeriods()
              ]);
              setUsers(usersData.data);
              setPackages(packagesData);
              setPeriods(periodsData);
          } catch (err) {
              console.error("Error loading dependencies", err);
          }
      };
      
      loadDependencies();
    }
  }, [isOpen, investor]);

  // Dynamic user search
  useEffect(() => {
    if (!isOpen) return;
    
    const handler = setTimeout(async () => {
        try {
            const res = await usersService.getUsers({ search: userSearch.trim(), limit: 100 });
            setUsers(res.data);
        } catch (err) {
            console.error("Error searching users", err);
        }
    }, 400);

    return () => clearTimeout(handler);
  }, [userSearch, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((investor && !assignedCode) || !userId || !packageId || !periodId) {
      setError('Por favor completa los campos requeridos');
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
        assigned_code: assignedCode || undefined,
        referred_by: referredBy || undefined,
        user_id: Number(userId),
        package_id: Number(packageId),
        period_id: Number(periodId),
        observations: observations || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined
    };

    try {
      if (investor) {
        await updateInvestor(investor.id, payload);
      } else {
        await createInvestor(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el inversionista');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">
            {investor ? 'Editar Inversionista' : 'Nuevo Inversionista'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className={`grid grid-cols-1 ${investor ? 'sm:grid-cols-2' : ''} gap-4`}>
                {investor && (
                  <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Código Asignado *</label>
                  <input
                      type="text"
                      value={assignedCode}
                      readOnly
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                  </div>
                )}

                <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Referido (Código de otra inversión)</label>
                <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                    placeholder="Opcional"
                />
                </div>
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-sm font-medium text-slate-700">Usuario *</label>
              {userId ? (
                  <div className="flex items-center justify-between w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-emerald-800 text-sm font-medium">
                          {users.find(u => u.id === userId)?.name || 'Usuario Seleccionado'}
                      </span>
                      <button type="button" onClick={() => setUserId('')} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold">Cambiar</button>
                  </div>
              ) : (
                  <div className="relative">
                      <input 
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onFocus={() => { if (!userSearch) setUserSearch(' '); setTimeout(() => setUserSearch(''), 10); }}
                          placeholder="Buscar por nombre o correo..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                      />
                      {userSearch.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                              {users.filter(u => 
                                  u.name.toLowerCase().includes(userSearch.toLowerCase().trim()) || 
                                  u.email.toLowerCase().includes(userSearch.toLowerCase().trim())
                              ).map(u => (
                                  <div 
                                      key={u.id} 
                                      onClick={() => { setUserId(u.id); setUserSearch(''); }}
                                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm"
                                  >
                                      <div className="font-medium text-slate-800">{u.name}</div>
                                      <div className="text-xs text-slate-500">{u.email}</div>
                                  </div>
                              ))}
                              {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase().trim()) || u.email.toLowerCase().includes(userSearch.toLowerCase().trim())).length === 0 && (
                                  <div className="px-3 py-2 text-sm text-slate-500 text-center">No hay resultados</div>
                              )}
                          </div>
                      )}
                  </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Paquete *</label>
                <select
                    value={packageId}
                    onChange={(e) => setPackageId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
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
                    onChange={(e) => setPeriodId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                    required
                >
                    <option value="">Seleccione un periodo</option>
                    {periods.map(p => (
                        <option key={p.id} value={p.id}>{p.months} Meses {p.days} Días ({p.percentage}%)</option>
                    ))}
                </select>
                </div>
            </div>

            {investor && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2 flex justify-between items-center">
                  <span>Detalle Completo de la Inversión #{investor.assigned_code}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded-md font-bold uppercase">
                    Contrato Vigente
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block font-medium text-[11px]">Paquete Seleccionado</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {investor.package ? `$${Number(investor.package.value).toLocaleString('es-CO')} COP` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block font-medium text-[11px]">Periodo de Contrato</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {investor.period ? `${investor.period.months} Meses (${investor.period.percentage}%)` : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block font-medium text-[11px]">Rendimiento Estimado</span>
                    <span className="font-bold text-emerald-700 text-sm">
                      {investor.package && investor.period ? (
                        `$${(Number(investor.package.value) * (Number(investor.period.percentage) / 100) * investor.period.months).toLocaleString('es-CO')} COP`
                      ) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                <span>Fecha de Ingreso *</span>
                {investor && (
                  isAdmin ? (
                    <span className="text-xs text-emerald-600 font-bold">✏️ Editable (Admin)</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-bold">🔒 No editable</span>
                  )
                )}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={investor ? !isAdmin : false}
                readOnly={investor ? !isAdmin : false}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  investor && !isAdmin 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-medium' 
                    : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium'
                }`}
                required
              />
              {investor ? (
                isAdmin ? (
                  <p className="text-xs text-emerald-600 font-medium">
                    Como Administrador, tienes permiso para modificar la fecha de inicio del contrato.
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">
                    La fecha de inicio del contrato no se puede modificar.
                  </p>
                )
              ) : (
                <p className="text-xs text-slate-500">La fecha de fin se calculará automáticamente en el sistema basándose en el periodo.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Observaciones</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors min-h-[100px]"
                placeholder="Observaciones o notas sobre la inversión..."
              />
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {investor ? 'Guardar Cambios' : 'Crear Inversionista'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
