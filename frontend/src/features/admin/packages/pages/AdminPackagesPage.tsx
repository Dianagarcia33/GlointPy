import React, { useState, useEffect } from 'react';
import { packagesService, Package } from '../../../../services/packages';
import { PackageModal } from '../components/PackageModal';
import { BulkUploadPackagesModal } from '../components/BulkUploadPackagesModal';
import { Plus, Edit2, Package as PackageIcon, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { Can } from '../../../../components/security/Can';

export const AdminPackagesPage = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await packagesService.getPackages();
      setPackages(data);
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

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este paquete?')) {
      try {
        await packagesService.deletePackage(id);
        fetchData();
      } catch (err: any) {
        alert(err.message || 'Error al eliminar el paquete');
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPackage(null);
  };

  const handleSaved = () => {
    fetchData();
  };

  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  <p className="text-sm font-medium">Cargando paquetes...</p>
              </div>
          </div>
      );
  }

  if (error) {
      return (
          <div className="p-6 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
              <div className="text-red-600 font-medium">
                  <p>Error al cargar los datos</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button onClick={fetchData} className="mt-2 text-sm font-semibold hover:underline">Reintentar</button>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Paquetes</h1>
          <p className="text-slate-500 text-sm mt-1">Administra los montos permitidos para inversión</p>
        </div>
        
        <Can permission="admin.packages.manage">
          <div className="flex gap-2">
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm text-sm font-medium"
            >
              <UploadCloud className="w-4 h-4" />
              Carga Masiva
            </button>
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear Paquete
            </button>
          </div>
        </Can>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Valor del Paquete</th>
                <th className="px-6 py-4">Acciones Otorgadas</th>
                <th className="px-6 py-4">Estado</th>
                <Can permission="admin.packages.manage">
                  <th className="px-6 py-4 text-right">Acciones (Botones)</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <PackageIcon className="w-8 h-8 text-slate-300" />
                      <p>No hay paquetes configurados.</p>
                      <button onClick={handleCreate} className="text-brand-600 font-medium hover:underline text-sm mt-1">
                        Crea tu primer paquete
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
                          <PackageIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-base">
                            ${pkg.value.toLocaleString()} USD
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-brand-600">
                        {pkg.granted_shares} acciones
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        pkg.is_active 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${pkg.is_active ? 'bg-blue-600' : 'bg-slate-400'}`}></span>
                        {pkg.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <Can permission="admin.packages.manage">
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(pkg)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(pkg.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
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

      <PackageModal 
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSaved={handleSaved}
        pkg={editingPackage}
      />
      
      <BulkUploadPackagesModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onUploaded={() => {
          setIsBulkModalOpen(false);
          fetchData();
        }}
      />
    </div>
  );
};
