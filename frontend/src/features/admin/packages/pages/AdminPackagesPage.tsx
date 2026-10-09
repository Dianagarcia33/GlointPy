import React, { useState, useEffect } from 'react';
import { packagesService, Package } from '../../../../services/packages';
import { PackageModal } from '../components/PackageModal';
import { 
  Plus, 
  Edit2, 
  Package as PackageIcon, 
  Loader2, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  X, 
  RefreshCw, 
  Layers, 
  TrendingUp, 
  Award, 
  Share2 
} from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminPackagesPage = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const [deletingPackage, setDeletingPackage] = useState<Package | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await packagesService.getPackages();
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0)) 
        : [];
      setPackages(sorted);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los paquetes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingPackage(null);
    setIsModalOpen(true);
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPackage) return;
    try {
      setIsDeleting(true);
      setError(null);
      await packagesService.deletePackage(deletingPackage.id);
      setSuccess(`Paquete de $${Number(deletingPackage.value).toLocaleString('es-CO')} COP eliminado correctamente.`);
      setTimeout(() => setSuccess(null), 5000);
      setDeletingPackage(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el paquete');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const handleSaved = () => {
    setSuccess(editingPackage ? 'Paquete actualizado con éxito.' : 'Nuevo paquete creado con éxito.');
    setTimeout(() => setSuccess(null), 5000);
    fetchData();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(val);
  };

  const totalPackages = packages.length;
  const activePackages = packages.filter(p => p.is_active).length;
  const minPackageValue = packages.length > 0 ? Math.min(...packages.map(p => Number(p.value) || 0)) : 0;
  const maxPackageValue = packages.length > 0 ? Math.max(...packages.map(p => Number(p.value) || 0)) : 0;
  const maxGrantedShares = packages.length > 0 ? Math.max(...packages.map(p => Number(p.granted_shares) || 0)) : 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-pulse font-inter">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 h-28 space-y-3">
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
              <div className="h-6 w-32 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 h-96 space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-4 text-rose-700 shadow-xs">
        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-rose-600" />
        <div>
          <h3 className="font-bold font-montserrat text-base text-rose-900">Error al cargar datos</h3>
          <p className="text-sm mt-1 text-rose-700">{error}</p>
          <button 
            onClick={fetchData} 
            className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-montserrat shadow-xs"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300 font-inter">
      
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 shadow-xs font-medium text-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4 text-emerald-700" />
          </button>
        </div>
      )}

      {/* Header Ejecutivo Estandarizado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-montserrat flex items-center gap-2.5 whitespace-nowrap sm:whitespace-normal">
              <div className="p-2.5 bg-brand-50 border border-brand-200/80 rounded-2xl text-brand-700 shadow-2xs">
                <PackageIcon className="w-6 h-6" />
              </div>
              <span>Gestión de Paquetes</span>
            </h1>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-1 font-normal">
            Administra los montos permitidos para inversión, paquetes de acciones otorgadas y disponibilidad comercial.
          </p>
        </div>
        
        <Can permission="admin.packages.manage">
          <div className="flex items-center gap-2.5 shrink-0">
            <button 
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 rounded-xl transition-all shadow-md shadow-brand-500/20 cursor-pointer font-montserrat"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Paquete</span>
            </button>
          </div>
        </Can>
      </div>

      {/* KPI Cards Summary (4 Métricas Clave Estandarizadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Paquetes */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Total Paquetes
            </span>
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {totalPackages}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            {activePackages} paquetes activos en plataforma
          </span>
        </div>

        {/* Ticket Mínimo */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Ticket Mínimo
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {formatCurrency(minPackageValue)}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Inversión inicial mínima permitida
          </span>
        </div>

        {/* Ticket Máximo */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Ticket Máximo
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-slate-900 block tracking-tight font-mono">
            {formatCurrency(maxPackageValue)}
          </span>
          <span className="text-[11px] text-amber-600 font-medium block truncate">
            Monto de inversión superior
          </span>
        </div>

        {/* Acciones Máximas */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-montserrat">
              Tope Accionario
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xl sm:text-2xl font-black text-purple-700 block tracking-tight font-mono">
            {maxGrantedShares.toLocaleString('es-CO')}
          </span>
          <span className="text-[11px] text-slate-500 font-medium block truncate">
            Acciones máximas por paquete
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-slate-400 font-bold border-b border-slate-200/80 uppercase text-[10px] tracking-wider font-montserrat">
              <tr>
                <th className="px-6 py-4">Valor del Paquete ($ COP)</th>
                <th className="px-6 py-4">Acciones Otorgadas</th>
                <th className="px-6 py-4">Estado</th>
                <Can permission="admin.packages.manage">
                  <th className="px-6 py-4 text-center">Acciones</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageIcon className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">No hay paquetes configurados.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-bold hover:underline text-xs mt-1 cursor-pointer font-montserrat">
                        + Crea tu primer paquete
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100/80 flex items-center justify-center text-brand-600 shrink-0">
                          <PackageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-base font-montserrat">
                            ${Number(pkg.value).toLocaleString('es-CO')} <span className="text-xs text-slate-500 font-normal">COP</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {pkg.granted_shares > 0 ? (
                        <div className="font-bold text-brand-700 text-sm font-montserrat">
                          {pkg.granted_shares.toLocaleString('es-CO')} <span className="text-xs text-slate-500 font-normal">{pkg.granted_shares === 1 ? 'acción' : 'acciones'}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                          <span className="font-bold">0</span> acciones (Membresía / Sin acciones)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        pkg.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${pkg.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                        {pkg.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <Can permission="admin.packages.manage">
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(pkg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:text-brand-800 hover:bg-brand-100/70 bg-brand-50/70 rounded-xl transition-all border border-brand-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button 
                            onClick={() => setDeletingPackage(pkg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-100/70 bg-rose-50/70 rounded-xl transition-all border border-rose-200/80 shadow-2xs cursor-pointer font-montserrat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </Can>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirmación Eliminar con Identificación de Paquete */}
      {deletingPackage && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full space-y-4 border border-slate-200/90">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg font-montserrat">¿Eliminar Paquete?</h3>
                <p className="text-xs text-slate-500">Confirmación de eliminación irreversible</p>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Valor del Paquete:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${Number(deletingPackage.value).toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ID del Registro:</span>
                <span className="font-mono text-slate-700">#{deletingPackage.id}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Acciones Otorgadas:</span>
                <span className="font-bold text-brand-600">{deletingPackage.granted_shares.toLocaleString('es-CO')} {deletingPackage.granted_shares === 1 ? 'acción' : 'acciones'}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer y el paquete ya no estará disponible en la plataforma.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button 
                onClick={() => setDeletingPackage(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer font-montserrat"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 font-montserrat"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PackageModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        pkg={editingPackage}
      />
    </div>
  );
};
