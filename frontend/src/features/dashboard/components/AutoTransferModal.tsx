import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Loader2, Info } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { fetchApi } from '../../../services/api';

interface AutoTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AutoTransferModal = ({ isOpen, onClose }: AutoTransferModalProps) => {
    const [result, setResult] = useState<any>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            return await fetchApi('/admin/auto-transfer-yields', {
                method: 'POST',
                body: JSON.stringify({ execute: true, force: true }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        },
        onSuccess: (data) => {
            setResult(data);
        },
        onError: (error: any) => {
            alert('Error: ' + error.message);
        }
    });

    const revertMutation = useMutation({
        mutationFn: async () => {
            return await fetchApi('/admin/revert-auto-transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        },
        onSuccess: (data) => {
            setResult(data);
        },
        onError: (error: any) => {
            alert('Error: ' + error.message);
        }
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                    <div>
                        <h2 className="text-2xl font-bold font-montserrat">Auditoría y Transferencia (Ciclo)</h2>
                        <p className="text-slate-400 text-sm mt-1">Calcula y deposita rendimientos en las wallets</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {!result ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex gap-3 items-start">
                                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold mb-1">Información del Proceso Automático</p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
                                        <li>Se auditarán todos los inversores activos en la base de datos.</li>
                                        <li>Se calcula el rendimiento proporcional basado en la fecha de corte (día 30).</li>
                                        <li>Se tienen en cuenta los bonos por aceleración (Networkers).</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 border border-brand-200 bg-brand-50 rounded-xl">
                                    <p className="font-bold text-brand-700">Modo de Ejecución Directo</p>
                                    <p className="text-sm text-brand-600 mt-1">Al dar clic en "Iniciar Proceso", el sistema calculará inmediatamente los rendimientos y los <b>insertará en la base de datos</b> creando los Retiros y las Transacciones de Wallet para todos los inversionistas activos.</p>
                                </div>
                                
                                <div className="p-4 border border-red-200 bg-red-50 rounded-xl mt-4">
                                    <p className="font-bold text-red-700">Modo Reversión de Emergencia</p>
                                    <p className="text-sm text-red-600 mt-1">Si hubo un error, puedes revertir las transferencias hechas <b>en este ciclo</b>. Esto borrará los Retiros y restará el saldo a las Wallets.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Inversores</p>
                                    <p className="text-xl font-bold text-slate-800">{result.total_processed}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Discrepancias</p>
                                    <p className={`text-xl font-bold ${result.discrepancies > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{result.discrepancies}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Modo Ejecución</p>
                                    <p className="text-xl font-bold text-slate-800">{result.execute_mode ? 'SÍ' : 'NO'}</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                <p className="text-xs text-slate-400 font-mono mb-2">=== LOGS DE AUDITORÍA ===</p>
                                <pre className="text-sm text-emerald-400 font-mono whitespace-pre-wrap">
                                    {result.logs?.join('\n') || 'Sin logs.'}
                                </pre>
                            </div>
                            
                            <button 
                                onClick={() => setResult(null)}
                                className="text-brand-500 text-sm font-bold hover:underline"
                            >
                                Volver a configurar
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-semibold transition-colors"
                    >
                        Cerrar
                    </button>
                    {!result && (
                        <>
                            <button 
                                onClick={() => revertMutation.mutate()}
                                disabled={revertMutation.isPending || mutation.isPending}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {revertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Revertir Transferencias
                            </button>
                            <button 
                                onClick={() => mutation.mutate()}
                                disabled={mutation.isPending || revertMutation.isPending}
                                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 shadow-brand-500/20"
                            >
                                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                                Iniciar Proceso
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
