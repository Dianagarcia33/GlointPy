import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { formatCurrency } from '../../../utils/format';
import { ArrowLeft, Clock, DollarSign, Activity, FileText, ArrowDownToLine, Zap, PlusCircle } from 'lucide-react';

export const InvestmentDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inv, setInv] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                const data = await fetchApi(`/investments/${id}`);
                setInv(data);
            } catch (err) {
                console.error("Error loading investment:", err);
                alert("Error al cargar los detalles de la inversión");
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [id, navigate]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando detalles...</div>;
    }

    if (!inv) return null;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'Pendiente';
        return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const statusConfig = inv.status === 'approved' 
        ? { label: 'Activo', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
        : { label: 'Finalizado', classes: 'bg-slate-100 text-slate-600 border-slate-200' };

    const handleWithdrawCapital = async () => {
        if (!window.confirm(`¿Estás seguro que deseas solicitar el retiro de ${formatCurrency(inv.capital_disponible)} de tu capital liberado?`)) return;
        
        try {
            const res = await fetchApi(`/investments/${inv.id}/withdraw-capital`, { method: 'POST' });
            alert(res.message);
            // Refresh
            const data = await fetchApi(`/investments/${id}`);
            setInv(data);
        } catch (err: any) {
            alert(err.message || "Error al solicitar el retiro");
        }
    };

    const progressPct = inv.dias_contrato > 0 ? Math.min(100, Math.max(0, (inv.dias_transcurridos / inv.dias_contrato) * 100)) : 0;
    const daysLeft = Math.max(0, inv.dias_contrato - inv.dias_transcurridos);

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header / Back */}
            <div className="flex items-center gap-4 cursor-pointer text-slate-500 hover:text-slate-800 transition-colors" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold">Volver al Dashboard</span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white border border-slate-200 shadow-sm rounded-2xl text-brand-500">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contrato de Inversión</p>
                                <h1 className="text-3xl font-bold text-slate-900 font-montserrat">
                                    {formatCurrency(inv.monto)}
                                </h1>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-lg font-bold border ${statusConfig.classes}`}>
                                {statusConfig.label}
                            </span>
                            <p className="text-sm font-semibold text-slate-500">ID: #{inv.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    {daysLeft} días restantes
                                </div>
                                <span className="text-sm font-bold text-slate-900">{progressPct.toFixed(0)}% Completado</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden">
                                <div 
                                    className="bg-brand-500 h-3 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${progressPct}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between mt-3 text-xs font-bold text-slate-400 uppercase">
                                <span>Inicio: {formatDate(inv.fecha_ingreso)}</span>
                                <span>Fin: {formatDate(inv.fecha_finalizacion)}</span>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Resumen Financiero</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 font-medium">Rendimiento Total Proyectado</span>
                                    <span className="font-bold text-emerald-600">+{formatCurrency(inv.rendimiento_total_contrato)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 font-medium">Rendimiento Diario</span>
                                    <span className="font-bold text-emerald-600">+{formatCurrency(inv.liquidacion_diaria_rendimiento)}</span>
                                </div>
                                <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                                    <span className="text-slate-900 font-bold">Total Retorno Estimado</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(inv.total_contrato)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Capital Management */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-500" />
                                Gestión de Capital
                            </h3>
                            
                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Capital Liberado a la fecha</p>
                                    <p className="text-lg font-bold text-slate-900">{formatCurrency(inv.capital_liberado)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Capital ya Retirado</p>
                                    <p className="text-sm font-bold text-red-500">-{formatCurrency(inv.capital_retirado)}</p>
                                </div>
                                <div className="pt-3 border-t border-slate-200">
                                    <p className="text-xs font-bold text-slate-900 uppercase">Capital Disponible</p>
                                    <p className="text-2xl font-bold text-brand-600">{formatCurrency(inv.capital_disponible)}</p>
                                </div>
                            </div>

                            <button 
                                onClick={handleWithdrawCapital}
                                disabled={inv.capital_disponible <= 0}
                                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                    inv.capital_disponible > 0 
                                    ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20 hover:shadow-lg hover:-translate-y-0.5'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <ArrowDownToLine className="w-4 h-4" />
                                Retirar Capital
                            </button>

                            {inv.can_upgrade && (
                                <button className="w-full mt-3 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                                    <PlusCircle className="w-4 h-4" />
                                    Aumento de Capital
                                </button>
                            )}
                            
                            {!inv.can_upgrade && (
                                <p className="text-xs text-center text-slate-500 mt-4">
                                    El aumento de capital solo está disponible durante los primeros 3 meses del contrato.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right column: Movements and History */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Contract History */}
                        {inv.history && inv.history.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Actualizaciones de Contrato</h3>
                                <div className="space-y-3">
                                    {inv.history.map((h: any) => (
                                        <div key={h.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{h.cambio_tipo}</p>
                                                    <p className="text-xs text-slate-500">{h.observacion}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-400">{formatDate(h.fecha)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Projection Table */}
                {inv.projection && inv.projection.length > 0 && (
                    <div className="p-8 border-t border-slate-100 bg-white">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Proyección de Rendimientos</h3>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Ciclo</th>
                                        <th className="px-4 py-3 text-center">Días</th>
                                        <th className="px-4 py-3 text-right">Capital de Cálculo</th>
                                        <th className="px-4 py-3 text-right">Rendimiento (Est.)</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {inv.projection.map((proj: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                                                {formatDate(proj.fecha_inicio)} - {formatDate(proj.fecha_fin)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-slate-600">
                                                {proj.dias}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                                {formatCurrency(proj.capital_base)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                +{formatCurrency(proj.rendimiento)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md ${
                                                    proj.estado === 'Procesado' ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-100 text-brand-700'
                                                }`}>
                                                    {proj.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
