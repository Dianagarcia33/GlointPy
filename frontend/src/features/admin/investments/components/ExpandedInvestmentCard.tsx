import React from 'react';
import { User, CreditCard, ShieldCheck, Banknote, Calendar, Smartphone, MapPin, Percent } from 'lucide-react';
import { AdminInvestment } from '../../../../services/investments';

interface ExpandedInvestmentCardProps {
    inv: AdminInvestment;
}

const formatCOP = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(value);
};

export const ExpandedInvestmentCard: React.FC<ExpandedInvestmentCardProps> = ({ inv }) => {
    const { personal_info, bank_account, legal_rep, financial_info, kyc_info } = inv;

    return (
        <div className="bg-slate-50 p-6 shadow-inner flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COL 1: Información Personal y Bancaria */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <User className="w-5 h-5 text-brand-500" />
                        <h3 className="font-semibold text-slate-800">Información Personal</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">ID de Usuario</span><span className="font-medium text-slate-800">{inv.user_id}</span></div>
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Documento</span><span className="font-medium text-slate-800">{personal_info.tipo_documento} {personal_info.documento}</span></div>
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Referido Por</span><span className="font-medium text-slate-800">{personal_info.referido_por || 'Ninguno'}</span></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{personal_info.numero_celular || 'N/A'}</span></div>
                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{personal_info.ciudad || 'N/A'}</span></div>
                        </div>
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Fecha de Nacimiento</span><span className="font-medium text-slate-800">{personal_info.fecha_nacimiento || 'N/A'}</span></div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="w-4 h-4 text-brand-500" />
                                <h4 className="font-semibold text-slate-700 text-xs uppercase">Cuenta Bancaria</h4>
                            </div>
                            {bank_account.banco ? (
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="font-medium text-brand-700">{bank_account.banco}</div>
                                    <div className="text-slate-600 capitalize">{bank_account.tipo_cuenta}</div>
                                    <div className="font-mono text-slate-800 tracking-wider mt-1">{bank_account.numero_cuenta}</div>
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">No registrada</span>
                            )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-brand-500" />
                                <h4 className="font-semibold text-slate-700 text-xs uppercase">Rep. Legal</h4>
                            </div>
                            {legal_rep.nombre ? (
                                <div className="space-y-1">
                                    <div className="font-medium text-slate-800">{legal_rep.nombre}</div>
                                    <div className="text-slate-600">Doc: {legal_rep.documento}</div>
                                    <div className="text-slate-600">{legal_rep.email}</div>
                                    <div className="text-slate-600">{legal_rep.telefono}</div>
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">No registrado</span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* COL 2: Finanzas */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Banknote className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-slate-800">Finanzas del Contrato</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center bg-emerald-50 p-2 rounded border border-emerald-100">
                            <span className="text-emerald-700 font-medium">Total Contrato</span>
                            <span className="font-bold text-emerald-800">{formatCOP(financial_info.total_contrato)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                            <span className="text-blue-700 font-medium">Rend. Total (Proyectado)</span>
                            <span className="font-bold text-blue-800">{formatCOP(financial_info.rendimiento_total_contrato)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Liq. Diaria Cap.</span><span className="font-medium text-slate-800">{formatCOP(financial_info.liquidacion_diaria_capital)}</span></div>
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Liq. Diaria Rend.</span><span className="font-medium text-slate-800">{formatCOP(financial_info.liquidacion_diaria_rendimiento)}</span></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Rend. Aprob. Mensual</span><span className="font-medium text-slate-800">{formatCOP(financial_info.rendimiento_aprobado_mensual)}</span></div>
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Rentabilidad Contrato</span><span className="font-medium text-slate-800">{formatCOP(financial_info.rentabilidad_contrato)}</span></div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="font-semibold text-slate-700 text-xs uppercase mb-2">Acciones</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-slate-500 text-xs block">Acciones Otorgadas</span><span className="font-medium text-brand-600">{financial_info.acciones_otorgadas || 0}</span></div>
                                <div><span className="text-slate-500 text-xs block">Participación</span><span className="font-medium text-brand-600 flex items-center gap-1"><Percent className="w-3 h-3"/> {financial_info.porcentaje_participacion_accionista || 0}</span></div>
                            </div>
                            <div className="mt-2"><span className="text-slate-500 text-xs block">Valor Total Acciones</span><span className="font-medium text-slate-800">{formatCOP(financial_info.valor_total_acciones)}</span></div>
                        </div>
                    </div>
                </div>
                
                {/* COL 3: Auditoría y Seguridad */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800">Auditoría y Tiempos</h3>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Ingreso</span>
                            <span className="font-medium text-slate-800">{inv.fecha_ingreso || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Fin</span>
                            <span className="font-medium text-slate-800">{inv.fecha_finalizacion || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Días Contrato</span>
                            <span className="font-medium text-slate-800">{financial_info.dias_contrato || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Paquete Adquirido ID</span>
                            <span className="font-medium text-slate-800">{financial_info.paquete_inversion_adquirido || 'N/A'}</span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="font-semibold text-slate-700 text-xs uppercase mb-2">TusDatos (KYC)</h4>
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Status</span>
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${kyc_info.status?.toLowerCase() === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {kyc_info.status || 'Pendiente'}
                                </span>
                            </div>
                            <div className="mt-2"><span className="text-slate-500 text-xs uppercase tracking-wider block">Job ID</span><span className="font-mono text-xs text-slate-600 break-all">{kyc_info.job_id || 'N/A'}</span></div>
                            <div className="mt-2"><span className="text-slate-500 text-xs uppercase tracking-wider block">Report ID</span><span className="font-mono text-xs text-slate-600 break-all">{kyc_info.report_id || 'N/A'}</span></div>
                            {kyc_info.hallazgos && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Hallazgos:</strong> {kyc_info.hallazgos}</div>}
                            {kyc_info.justificacion && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Justificación:</strong> {kyc_info.justificacion}</div>}
                            <div className="mt-2"><span className="text-slate-500 text-xs block">Fecha Último Check: {kyc_info.last_check || 'N/A'}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RAW TIMESTAMPS & OBSERVACIONES */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <span className="text-slate-500 font-medium">Observaciones Adicionales:</span>
                        <p className="mt-1 text-slate-700 italic">{personal_info.observaciones || 'Ninguna'}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400 space-y-1">
                        <div>Creado: {inv.created_at ? new Date(inv.created_at).toLocaleString() : 'N/A'}</div>
                        <div>Actualizado: {inv.updated_at ? new Date(inv.updated_at).toLocaleString() : 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
