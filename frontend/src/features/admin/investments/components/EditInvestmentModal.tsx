import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Landmark, Loader2, Calculator } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investmentsService, AdminInvestment } from '../../../../services/investments';

interface EditInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    investment: AdminInvestment | null;
}

const CITIES = [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", 
    "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué", 
    "Villavicencio", "Santa Marta", "Valledupar", "Montería", "Pasto", "Otra"
];

export const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({ isOpen, onClose, investment }) => {
    const queryClient = useQueryClient();
    
    const [showCustomCity, setShowCustomCity] = useState(false);
    const [isCustomMonto, setIsCustomMonto] = useState(false);

    const [formData, setFormData] = useState({
        // Personal
        nombre_completo: '',
        correo_electronico: '',
        tipo_documento: '',
        documento: '',
        numero_celular: '',
        ciudad: '',
        custom_ciudad: '',
        fecha_nacimiento: '',
        referido_por: '',
        observaciones: '',
        
        // Bank
        banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        
        // Financial
        paquete_inversion_adquirido: '',
        total_contrato: '',
        periodo_id: '',
        fecha_ingreso: '',
        fecha_finalizacion: ''
    });

    // Fetch Packages and Periods
    const { data: paquetes = [] } = useQuery({
        queryKey: ['paquetes-inversion'],
        queryFn: () => investmentsService.getPaquetes(),
        enabled: isOpen
    });

    const { data: periodos = [] } = useQuery({
        queryKey: ['contract-periods'],
        queryFn: () => investmentsService.getContractPeriods(),
        enabled: isOpen
    });

    useEffect(() => {
        if (investment) {
            let cityToSet = investment.personal_info.ciudad || '';
            let isCustom = false;
            if (cityToSet && !CITIES.includes(cityToSet) && cityToSet !== 'Otra') {
                isCustom = true;
            }

            // Find matching period from investment.financial_info
            // We assume investment.financial_info.periodo_porcentaje / meses maps to a period.
            // If the backend doesn't send the period ID, we try to match it or leave it blank.
            let matchedPeriodId = '';
            if (investment.financial_info.periodo_meses && periodos.length > 0) {
                const p = periodos.find((p: any) => p.months === investment.financial_info.periodo_meses && p.percentage === investment.financial_info.periodo_porcentaje);
                if (p) matchedPeriodId = p.id.toString();
            }

            setFormData({
                nombre_completo: investment.personal_info.nombre_completo || '',
                correo_electronico: investment.personal_info.correo_electronico || '',
                tipo_documento: investment.personal_info.tipo_documento || 'CC',
                documento: investment.personal_info.documento || '',
                numero_celular: investment.personal_info.numero_celular || '',
                ciudad: isCustom ? 'Otra' : cityToSet,
                custom_ciudad: isCustom ? cityToSet : '',
                fecha_nacimiento: investment.personal_info.fecha_nacimiento ? investment.personal_info.fecha_nacimiento.substring(0, 10) : '',
                referido_por: investment.personal_info.referido_por || '',
                observaciones: investment.personal_info.observaciones || '',
                
                banco: investment.bank_account.banco || '',
                tipo_cuenta: investment.bank_account.tipo_cuenta || 'Ahorros',
                numero_cuenta: investment.bank_account.numero_cuenta || '',
                
                paquete_inversion_adquirido: investment.financial_info.paquete_inversion_adquirido ? investment.financial_info.paquete_inversion_adquirido.toString() : 'custom',
                total_contrato: investment.financial_info.total_contrato ? investment.financial_info.total_contrato.toString() : '',
                periodo_id: matchedPeriodId,
                fecha_ingreso: investment.fecha_ingreso ? investment.fecha_ingreso.substring(0, 10) : '',
                fecha_finalizacion: investment.fecha_finalizacion ? investment.fecha_finalizacion.substring(0, 10) : ''
            });

            setShowCustomCity(isCustom);
            setIsCustomMonto(!investment.financial_info.paquete_inversion_adquirido);
        }
    }, [investment, periodos]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => investmentsService.updateInvestment(investment!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
            onClose();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;
        
        const payload = { 
            ...formData,
            ciudad: finalCity,
            total_contrato: parseFloat(formData.total_contrato) || 0,
            paquete_inversion_adquirido: isCustomMonto || !formData.paquete_inversion_adquirido || formData.paquete_inversion_adquirido === 'custom' ? null : parseInt(formData.paquete_inversion_adquirido),
            contract_period_id: formData.periodo_id ? parseInt(formData.periodo_id) : undefined
        };
        
        updateMutation.mutate(payload);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        if (name === 'ciudad') {
            setShowCustomCity(value === 'Otra');
        }

        if (name === 'paquete_inversion_adquirido') {
            if (value === 'custom' || value === '') {
                setIsCustomMonto(true);
                setFormData(prev => ({ ...prev, paquete_inversion_adquirido: value, total_contrato: '' }));
            } else {
                setIsCustomMonto(false);
                const pkg = paquetes.find((p: any) => p.id.toString() === value);
                const montoVal = pkg ? pkg.nombre.replace(/[^0-9]/g, '') : '';
                setFormData(prev => ({ ...prev, paquete_inversion_adquirido: value, total_contrato: montoVal }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Live Calculations
    const getCalculations = () => {
        const monto = parseFloat(formData.total_contrato) || 0;
        const periodo = periodos.find((p: any) => p.id.toString() === formData.periodo_id);
        
        if (!monto || !periodo) return null;

        const { percentage, months, days } = periodo;
        const rendimientoMensual = monto * (percentage / 100);
        const rendimientoTotal = rendimientoMensual * months;
        const rendimientoDiario = days > 0 ? rendimientoTotal / days : 0;
        const totalContrato = monto + rendimientoTotal;

        return {
            porcentaje: percentage,
            meses: months,
            rendimientoMensual,
            rendimientoTotal,
            rendimientoDiario,
            totalContrato
        };
    };

    const formatCOP = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    };

    const calc = getCalculations();

    if (!isOpen || !investment) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
                <div className="flex-none flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Editar Inversión</h2>
                        <p className="text-sm text-slate-500 mt-1">ID de Contrato: {investment.codigo_asignado || investment.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-6 bg-slate-50/50">
                    <form id="edit-investment-form" onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
                        
                        {/* Datos Personales */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <User className="w-5 h-5 text-brand-600" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                                    <input name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                                    <input type="email" name="correo_electronico" value={formData.correo_electronico} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Documento</label>
                                    <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="CC">Cédula de Ciudadanía</option>
                                        <option value="CE">Cédula de Extranjería</option>
                                        <option value="NIT">NIT</option>
                                        <option value="PAS">Pasaporte</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento</label>
                                    <input name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Celular</label>
                                    <input name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad</label>
                                    <select name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="">Selecciona una ciudad...</option>
                                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {showCustomCity && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué otra ciudad?</label>
                                        <input name="custom_ciudad" value={formData.custom_ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Escribe la ciudad" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Referido por</label>
                                    <input name="referido_por" value={formData.referido_por} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Observaciones</label>
                                    <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Cuenta Bancaria */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <Landmark className="w-5 h-5 text-brand-600" />
                                Cuenta Bancaria
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Banco</label>
                                    <input name="banco" value={formData.banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                                    <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="Ahorros">Ahorros</option>
                                        <option value="Corriente">Corriente</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta</label>
                                    <input name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Detalles Financieros */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <CreditCard className="w-5 h-5 text-brand-600" />
                                Datos Financieros
                            </h3>
                            
                            <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-start gap-3 mb-6">
                                <span>⚠️</span>
                                <div>
                                    <p className="font-bold text-sm">Modificación de Datos Financieros</p>
                                    <p className="text-xs mt-1">Modificar estos valores afectará el cálculo de los rendimientos diarios. Por favor, haz cambios aquí solo si es estrictamente necesario o hay un error en la migración.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {/* Selector de Paquetes */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Paquete de Inversión</label>
                                    <select name="paquete_inversion_adquirido" value={formData.paquete_inversion_adquirido} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="">Ninguno / Custom Anterior</option>
                                        {paquetes.map((p: any) => (
                                            <option key={p.id} value={p.id}>Paquete: {p.nombre}</option>
                                        ))}
                                        <option value="custom">Personalizado (Digitar Monto)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Capital Base (Total Contrato)</label>
                                    <input 
                                        type="number" 
                                        step="1000" 
                                        name="total_contrato" 
                                        value={formData.total_contrato} 
                                        onChange={handleChange} 
                                        readOnly={!isCustomMonto}
                                        className={`w-full px-4 py-2.5 border rounded-lg outline-none ${isCustomMonto ? 'bg-white border-slate-300 focus:ring-2 focus:ring-brand-500' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'}`}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Periodo de Inversión (Proyección)</label>
                                    <select name="periodo_id" value={formData.periodo_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="">Conservar periodo actual</option>
                                        {periodos.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.months} meses al {p.percentage}%)</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Inicio (Ingreso)</label>
                                    <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Finalización</label>
                                    <input type="date" name="fecha_finalizacion" value={formData.fecha_finalizacion} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>

                            {/* Live Calculations Card */}
                            {calc && (
                                <div className="bg-slate-800 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Calculator className="w-24 h-24" />
                                    </div>
                                    <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 relative z-10">
                                        <Calculator className="w-5 h-5 text-brand-400" />
                                        Simulador de Rendimientos
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tasa Mensual</p>
                                            <p className="font-mono text-lg font-bold text-brand-400">{calc.porcentaje}%</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Plazo</p>
                                            <p className="font-mono text-lg font-bold">{calc.meses} Meses</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Rend. Diario</p>
                                            <p className="font-mono text-lg font-bold text-emerald-400">{formatCOP(calc.rendimientoDiario)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Rend. Mensual</p>
                                            <p className="font-mono text-lg font-bold text-emerald-400">{formatCOP(calc.rendimientoMensual)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Rend. Total (Final)</p>
                                            <p className="font-mono text-lg font-bold text-emerald-400">{formatCOP(calc.rendimientoTotal)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center relative z-10">
                                        <span className="font-bold text-slate-300">Total del Contrato (Capital + Rendimiento):</span>
                                        <span className="font-black text-2xl text-white">{formatCOP(calc.totalContrato)}</span>
                                    </div>
                                </div>
                            )}

                        </div>

                    </form>
                </div>

                <div className="flex-none p-6 border-t border-slate-100 flex justify-end gap-3 bg-white">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="edit-investment-form"
                        disabled={updateMutation.isPending}
                        className="w-full sm:w-auto px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/30"
                    >
                        {updateMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
