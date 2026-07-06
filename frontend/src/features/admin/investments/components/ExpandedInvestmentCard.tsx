import React from 'react';
import { User, CreditCard, ShieldCheck, Banknote, Calendar, Smartphone, MapPin, Percent, History, ArrowDownToLine, Zap, CheckCircle2, Edit } from 'lucide-react';
import { AdminInvestment } from '../../../../services/investments';
import { Can } from '../../../../components/security/Can';

interface ExpandedInvestmentCardProps {
    inv: AdminInvestment;
}

const formatCOP = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
};

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const safeDate = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    return new Date(safeDate).toLocaleDateString('es-CO');
};

export const ExpandedInvestmentCard: React.FC<ExpandedInvestmentCardProps> = ({ inv }) => {
    const { 
        personal_info, 
        bank_account, 
        legal_rep, 
        financial_info, 
        kyc_info,
        tramos_desglose = [],
        detalles_bonos = [],
        detalles_retiros_rendimiento = [],
        total_bonos,
        total_retiros_rendimiento
    } = inv;

    return (
        <div className="bg-slate-50 p-6 shadow-inner flex flex-col gap-8 border-t border-slate-200 relative">


            {/* SECCIÓN 1: RESUMEN FINANCIERO DE MIGRACIÓN */}
            <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4">
                    <Banknote className="w-6 h-6 text-brand-600" />
                    Resumen Financiero (Migración)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Capital Actual</div>
                        <div className="text-lg font-bold text-slate-800 mt-1">{formatCOP(financial_info.capital_actual)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Producido</div>
                        <div className="text-lg font-bold text-blue-600 mt-1">{formatCOP(financial_info.rendimiento_producido_hasta_ayer)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Total Bonos</div>
                        <div className="text-lg font-bold text-emerald-600 mt-1">+ {formatCOP(total_bonos)}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-semibold">Total Retirado</div>
                        <div className="text-lg font-bold text-rose-600 mt-1">- {formatCOP(total_retiros_rendimiento)}</div>
                    </div>
                    <div className="bg-brand-50 p-4 rounded-xl border border-brand-200 shadow-sm">
                        <div className="text-xs text-brand-600 uppercase font-bold">Saldo Migración</div>
                        <div className="text-xl font-black text-brand-700 mt-1">{formatCOP(financial_info.saldo_a_migrar)}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl shadow-sm">
                        <div className="text-xs text-slate-400 uppercase font-bold">Saldo Wallet</div>
                        <div className="text-xl font-black text-white mt-1">{formatCOP(financial_info.wallet_balance_actual || 0)}</div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: HISTORIAL Y TRAMOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Tramos de Rendimiento */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <History className="w-5 h-5 text-indigo-500" />
                        Desglose de Rendimiento (Tramos)
                    </h3>
                    {tramos_desglose.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-2">Período</th>
                                        <th className="px-3 py-2">Días</th>
                                        <th className="px-3 py-2 text-right">Capital Base</th>
                                        <th className="px-3 py-2 text-right">Producido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tramos_desglose.map((tramo, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 text-slate-600 text-xs">
                                                {formatDate(tramo.fecha_inicio)} - {formatDate(tramo.fecha_fin)}
                                            </td>
                                            <td className="px-3 py-2 font-medium">{tramo.dias}</td>
                                            <td className="px-3 py-2 text-right text-slate-600">{formatCOP(tramo.capital_base)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-blue-600">{formatCOP(tramo.producido)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">No hay tramos registrados.</p>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Retiros */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <ArrowDownToLine className="w-5 h-5 text-rose-500" />
                            Retiros de Rendimiento
                        </h3>
                        {detalles_retiros_rendimiento.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">Fecha</th>
                                            <th className="px-3 py-2">Monto</th>
                                            <th className="px-3 py-2 text-center">Origen</th>
                                            <th className="px-3 py-2 text-center">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detalles_retiros_rendimiento.map((retiro, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-600">{formatDate(retiro.fecha)}</td>
                                                <td className="px-3 py-2 font-medium text-rose-600">-{formatCOP(retiro.monto)}</td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                    <span className={`inline-flex px-2 py-0.5 rounded capitalize ${retiro.origen?.toLowerCase() === 'billetera' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                        {retiro.origen || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center text-xs">
                                                    {retiro.observaciones ? 
                                                        <span className="text-slate-600">{retiro.observaciones}</span> : 
                                                        <span className="text-slate-400 italic">Sin observaciones</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay retiros registrados o aprobados.</p>
                        )}
                    </div>

                    {/* Bonos */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Bonos / Aceleraciones
                        </h3>
                        {detalles_bonos.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-3 py-2">Fecha</th>
                                            <th className="px-3 py-2">Monto</th>
                                            <th className="px-3 py-2 text-right">Días Reducidos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detalles_bonos.map((bono, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 text-slate-600">{formatDate(bono.fecha)}</td>
                                                <td className="px-3 py-2 font-medium text-emerald-600">+{formatCOP(bono.monto)}</td>
                                                <td className="px-3 py-2 text-right text-slate-500">{bono.dias_reducidos}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No hay bonos registrados.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: INFORMACIÓN DEL INVERSOR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COL 1: Información Personal y Bancaria */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <User className="w-5 h-5 text-brand-500" />
                        <h3 className="font-semibold text-slate-800">Perfil del Inversor</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">ID de Usuario</span><span className="font-medium text-slate-800">{inv.user_id}</span></div>
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Documento</span><span className="font-medium text-slate-800">{personal_info.tipo_documento} {personal_info.documento}</span></div>
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Referido Por</span><span className="font-medium text-slate-800">{personal_info.referido_por || 'Ninguno'}</span></div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{personal_info.numero_celular || 'N/A'}</span></div>
                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /><span className="font-medium text-slate-800">{personal_info.ciudad || 'N/A'}</span></div>
                        </div>
                        
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
                        
                        {legal_rep.nombre && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-brand-500" />
                                    <h4 className="font-semibold text-slate-700 text-xs uppercase">Rep. Legal</h4>
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium text-slate-800">{legal_rep.nombre}</div>
                                    <div className="text-slate-600">Doc: {legal_rep.documento}</div>
                                    <div className="text-slate-600">{legal_rep.email}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* COL 2: Contrato y Acciones */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-semibold text-slate-800">Detalles del Contrato</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Ingreso</span>
                            <span className="font-medium text-slate-800">{formatDate(inv.fecha_ingreso)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium flex items-center gap-1"><Calendar className="w-4 h-4"/> Fecha Fin</span>
                            <span className="font-medium text-slate-800">{formatDate(inv.fecha_finalizacion)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Días Contrato</span>
                            <span className="font-medium text-slate-800">{financial_info.dias_contrato || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Paquete / Inversión</span>
                            <span className="font-medium text-slate-800">{financial_info.paquete_inversion_adquirido || 'N/A'}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Total Contrato</span><span className="font-medium text-slate-800">{formatCOP(financial_info.total_contrato)}</span></div>
                            <div><span className="text-slate-500 text-xs uppercase tracking-wider block">Rend. Aprobado</span><span className="font-medium text-slate-800">{formatCOP(financial_info.rendimiento_aprobado_mensual)}</span></div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="font-semibold text-slate-700 text-xs uppercase mb-2">Acciones Otorgadas</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-slate-500 text-xs block">Cantidad</span><span className="font-medium text-brand-600">{financial_info.acciones_otorgadas || 0}</span></div>
                                <div><span className="text-slate-500 text-xs block">Participación</span><span className="font-medium text-brand-600 flex items-center gap-1"><Percent className="w-3 h-3"/> {financial_info.porcentaje_participacion_accionista || 0}</span></div>
                            </div>
                            <div className="mt-2"><span className="text-slate-500 text-xs block">Valor Total Acciones</span><span className="font-medium text-slate-800">{formatCOP(financial_info.valor_total_acciones)}</span></div>
                        </div>
                    </div>
                </div>
                
                {/* COL 3: Auditoría y KYC */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-semibold text-slate-800">Auditoría (TusDatos)</h3>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                        <div><span className="text-slate-500 text-xs uppercase tracking-wider block mb-1">Status</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${kyc_info.status?.toLowerCase() === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {kyc_info.status || 'Pendiente'}
                            </span>
                        </div>
                        <div className="mt-2"><span className="text-slate-500 text-xs uppercase tracking-wider block">Job ID</span><span className="font-mono text-xs text-slate-600 break-all">{kyc_info.job_id || 'N/A'}</span></div>
                        
                        {kyc_info.hallazgos && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Hallazgos:</strong> {kyc_info.hallazgos}</div>}
                        {kyc_info.justificacion && <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 border border-slate-200"><strong>Justificación:</strong> {kyc_info.justificacion}</div>}
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                            <div>Creado: {inv.created_at ? new Date(inv.created_at).toLocaleString('es-CO') : 'N/A'}</div>
                            <div>Observaciones: {personal_info.observaciones || 'Ninguna'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
