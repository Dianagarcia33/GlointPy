import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, PackageCreate, PackageUpdate, packagesService } from '../../../../services/packages';
import { X, Loader2, Save } from 'lucide-react';

interface PackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    pkg?: Package | null;
}

export const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, onSaved, pkg }) => {
    if (!isOpen) return null;
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-20 bg-slate-900/50 backdrop-blur-sm" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">
                        {pkg ? 'Editar Paquete' : 'Nuevo Paquete'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Monto / Valor ($ COP) *</label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={value}
                            onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Ej. 1000000"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Acciones Otorgadas *</label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={grantedShares}
                            onChange={(e) => setGrantedShares(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Ej. 10"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                            Paquete Activo (visible para selección)
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                            disabled={isSaving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm shadow-brand-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
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
        </div>,
        document.body
    );
};
