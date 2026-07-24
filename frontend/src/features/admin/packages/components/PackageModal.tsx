import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, PackageCreate, PackageUpdate, packagesService } from '../../../../services/packages';
import { X, Loader2, Package as PackageIcon } from 'lucide-react';

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

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" style={{ margin: 0 }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Estandarizado */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-100 text-brand-700 rounded-xl">
                            <PackageIcon className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 font-montserrat">
                                {pkg ? 'Editar Paquete de Inversión' : 'Nuevo Paquete de Inversión'}
                            </h3>
                            <p className="text-xs text-slate-500">Configura el valor comercial y número de acciones</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form id="package-form" onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Monto / Valor ($ COP) <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="0"
                            step="1000"
                            value={value}
                            onChange={(e) => setValue(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Ej. 1000000"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-bold text-slate-900 font-montserrat"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Acciones Otorgadas <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={grantedShares}
                            onChange={(e) => setGrantedShares(e.target.value ? Number(e.target.value) : '')}
                            placeholder="Ej. 10"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none text-sm font-semibold text-slate-900"
                            required
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between mt-2">
                        <div>
                            <span className="text-xs font-bold text-slate-800 block font-montserrat">Estado del Paquete</span>
                            <span className="text-xs text-slate-500">Si está inactivo, no estará visible en la tienda.</span>
                        </div>
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                        />
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all text-sm cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="package-form"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-md shadow-brand-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Paquete
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
