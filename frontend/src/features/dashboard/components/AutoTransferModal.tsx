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
    const [execute, setExecute] = useState(false);
    const [force, setForce] = useState(false);
    const [result, setResult] = useState<any>(null);

    const mutation = useMutation({
        mutationFn: async () => {
            return await fetchApi('/admin/auto-transfer-yields', {
                method: 'POST',
                body: JSON.stringify({ execute, force }),
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Auto Transfer Yields <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold">SUPERADMIN</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {!result ? (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3">
                                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700 leading-relaxed">
                                    Este módulo migra los rendimientos y bonos del ciclo mensual. 
                                    En modo Simulación (Auditoría), sólo se compararán los datos. 
                                    En modo Ejecución, se registrarán en base de datos.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={execute} 
                                        onChange={(e) => setExecute(e.target.checked)}
                                        className="w-5 h-5 accent-brand-500"
                                    />
                                    <div>
                                        <p className="font-bold text-slate-700">Modo Ejecución (--execute)</p>
                                        <p className="text-sm text-slate-500">Guarda los retiros en la base de datos de manera atómica.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={force} 
                                        onChange={(e) => setForce(e.target.checked)}
                                        className="w-5 h-5 accent-red-500"
                                    />
                                    <div>
                                        <p className="font-bold text-slate-700 text-red-600">Forzar Día Diferente (--force)</p>
                                        <p className="text-sm text-slate-500">Permite saltarse la restricción de que sólo corre el día 30 del mes.</p>
                                    </div>
                                </label>
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
                {!result && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                        <button 
                            onClick={() => mutation.mutate()}
                            disabled={mutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {mutation.isPending ? 'Procesando...' : 'Iniciar Proceso'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
