import React, { useState, useEffect } from 'react';
import { Package, PackageCreate, PackageUpdate, packagesService } from '../../../../services/packages';
import { X, Loader2, Save } from 'lucide-react';

interface PackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    pkg?: Package | null;
}

export const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, onSaved, pkg }) => {
    const [value, setValue] = useState<number | ''>('');
    const [grantedShares, setGrantedShares] = useState<number | ''>('');
    const [isActive, setIsActive] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (pkg) {
            setValue(pkg.value);
            setGrantedShares(pkg.granted_shares);
            setIsActive(pkg.is_active);
        } else {
            setValue('');
            setGrantedShares('');
            setIsActive(true);
        }
        setError(null);
    }, [pkg, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (value === '' || Number(value) <= 0) {
            setError('El valor del paquete debe ser mayor a 0');
            return;
        }
        
        if (grantedShares === '' || Number(grantedShares) < 0) {
            setError('Las acciones otorgadas deben ser un número válido');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            if (pkg) {
                const updateData: PackageUpdate = { 
                    value: Number(value), 
                    granted_shares: Number(grantedShares),
                    is_active: isActive 
                };
                await packagesService.updatePackage(pkg.id, updateData);
            } else {
                const createData: PackageCreate = { 
                    value: Number(value), 
                    granted_shares: Number(grantedShares),
                    is_active: isActive 
                };
                await packagesService.createPackage(createData);
            }
            onSaved();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Error al guardar el paquete');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {pkg ? 'Editar Paquete' : 'Nuevo Paquete'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Valor del Paquete (COP)
                            </label>
                            <input
                                type="number"
                                value={value}
                                onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                placeholder="Ej: 1000"
                                min="1"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Acciones Otorgadas
                            </label>
                            <input
                                type="number"
                                value={grantedShares}
                                onChange={(e) => setGrantedShares(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                                placeholder="Ej: 5"
                                min="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                                />
                                <span className="text-sm font-medium text-slate-700">
                                    Paquete Activo
                                </span>
                            </label>
                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                Si está inactivo, no se mostrará como opción para invertir.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
