import React, { useState, useEffect, useRef } from 'react';
import { X, Search, User, CreditCard, Landmark, Loader2, UploadCloud, CheckCircle2, Calculator, MapPin } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { investmentsService } from '../../../../services/investments';
import { useAuthStore } from '../../../../store/authStore';

interface CreateInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CITIES = [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", 
    "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué", 
    "Villavicencio", "Santa Marta", "Valledupar", "Montería", "Pasto", "Otra"
];

export const CreateInvestmentModal: React.FC<CreateInvestmentModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    
    // Autocomplete State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Form State
    const [userId, setUserId] = useState<number | null>(null);
    const [showCustomCity, setShowCustomCity] = useState(false);
    const [isCustomMonto, setIsCustomMonto] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        tipo_documento: 'CC',
        documento: '',
        numero_celular: '',
        ciudad: '',
        custom_ciudad: '',
        fecha_nacimiento: '',
        banco: '',
        tipo_cuenta: 'Ahorros',
        numero_cuenta: '',
        paquete_id: '',
        monto: '',
        periodo_id: '',
        comprobante_path: ''
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

    const searchMutation = useMutation({
        mutationFn: (query: string) => investmentsService.searchUser(query),
        onSuccess: (data) => {
            setSearchResults(data || []);
            setShowDropdown(true);
        },
        onError: () => {
            setSearchResults([]);
            setShowDropdown(true);
        }
    });

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchQuery.length >= 3) {
                searchMutation.mutate(searchQuery);
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const createMutation = useMutation({
        mutationFn: (data: any) => investmentsService.createInvestmentForClient(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-investments'] });
            queryClient.invalidateQueries({ queryKey: ['admin-investment-requests'] });
            onClose();
            // Reset form
            setUserId(null);
            setSearchQuery('');
            setFormData({
                name: '', email: '', tipo_documento: 'CC', documento: '',
                numero_celular: '', ciudad: '', custom_ciudad: '', fecha_nacimiento: '',
                banco: '', tipo_cuenta: 'Ahorros', numero_cuenta: '',
                paquete_id: '', monto: '', periodo_id: '', comprobante_path: ''
            });
            setShowCustomCity(false);
            setIsCustomMonto(false);
        }
    });

    const handleSelectUser = (user: any) => {
        setUserId(user.id);
        
        let cityToSet = user.ciudad || '';
        let isCustom = false;
        if (cityToSet && !CITIES.includes(cityToSet) && cityToSet !== 'Otra') {
            isCustom = true;
        }

        setFormData(prev => ({
            ...prev,
            name: user.name || '',
            email: user.email || '',
            documento: user.documento || prev.documento,
            numero_celular: user.numero_celular || '',
            ciudad: isCustom ? 'Otra' : cityToSet,
            custom_ciudad: isCustom ? cityToSet : '',
            banco: user.banco || '',
            tipo_cuenta: user.tipo_cuenta || 'Ahorros',
            numero_cuenta: user.numero_cuenta || ''
        }));
        setShowCustomCity(isCustom);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const handleClearUser = () => {
        setUserId(null);
        setFormData({
            ...formData,
            name: '', email: '', documento: '',
            numero_celular: '', ciudad: '', custom_ciudad: '', fecha_nacimiento: '',
            banco: '', tipo_cuenta: 'Ahorros', numero_cuenta: ''
        });
        setShowCustomCity(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;
        
        createMutation.mutate({
            ...formData,
            ciudad: finalCity,
            user_id: userId,
            monto: parseFloat(formData.monto),
            paquete_id: isCustomMonto ? null : parseInt(formData.paquete_id),
            contract_period_id: parseInt(formData.periodo_id)
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'ciudad') {
            setShowCustomCity(value === 'Otra');
        }

        if (name === 'paquete_id') {
            if (value === 'custom') {
                setIsCustomMonto(true);
                setFormData(prev => ({ ...prev, paquete_id: value, monto: '' }));
            } else {
                setIsCustomMonto(false);
                const pkg = paquetes.find((p: any) => p.id.toString() === value);
                const montoVal = pkg ? pkg.nombre.replace(/[^0-9]/g, '') : '';
                setFormData(prev => ({ ...prev, paquete_id: value, monto: montoVal }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Live Calculations
    const getCalculations = () => {
        const monto = parseFloat(formData.monto) || 0;
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-4xl h-full sm:h-auto max-h-[100vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Crear Solicitud de Inversión</h2>
                        <p className="text-sm text-slate-500 mt-1">Registra una inversión a nombre de un cliente (Existente o Nuevo)</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
                    <form id="create-investment-form" onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto pb-8">
                        
                        {/* Buscador Autocompletado */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <Search className="w-5 h-5 text-brand-600" />
                                Buscar Cliente
                            </h3>
                            
                            {userId ? (
                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        <div>
                                            <p className="font-semibold text-emerald-800">Cliente Seleccionado</p>
                                            <p className="text-sm text-emerald-600">{formData.name} ({formData.email})</p>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleClearUser}
                                        className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            ) : (
                                <div className="relative" ref={dropdownRef}>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            onFocus={() => { if (searchQuery.length >= 3) setShowDropdown(true); }}
                                            placeholder="Escribe nombre, correo o cédula para autocompletar..."
                                            className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-shadow"
                                            autoComplete="off"
                                        />
                                        {searchMutation.isPending && (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 animate-spin" />
                                        )}
                                    </div>

                                    {/* Dropdown Results */}
                                    {showDropdown && searchQuery.length >= 3 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
                                            {searchResults.length > 0 ? (
                                                <ul className="divide-y divide-slate-100">
                                                    {searchResults.map((user) => (
                                                        <li key={user.id}>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleSelectUser(user)}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex flex-col transition-colors"
                                                            >
                                                                <span className="font-semibold text-slate-800">{user.name}</span>
                                                                <span className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                                    <span>{user.email}</span>
                                                                    {user.documento && (
                                                                        <>
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                            <span>CC: {user.documento}</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <div className="p-4 text-center text-slate-500 text-sm">
                                                    No se encontraron clientes. Si es nuevo, llena los datos abajo.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Datos Personales */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <User className="w-5 h-5 text-brand-600" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                                    <input required name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" disabled={!!userId} />
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento *</label>
                                    <input required name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Celular *</label>
                                    <input required name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad *</label>
                                    <select required name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="">Selecciona una ciudad...</option>
                                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {showCustomCity && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué otra ciudad? *</label>
                                        <input required name="custom_ciudad" value={formData.custom_ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Escribe la ciudad" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
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
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Banco *</label>
                                    <input required name="banco" value={formData.banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                                    <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="Ahorros">Ahorros</option>
                                        <option value="Corriente">Corriente</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                                    <input required name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Detalles Inversión */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                <CreditCard className="w-5 h-5 text-brand-600" />
                                Detalles de la Inversión
                            </h3>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Selector de Paquetes */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Paquete de Inversión *</label>
                                        <select required name="paquete_id" value={formData.paquete_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                            <option value="">Selecciona un paquete...</option>
                                            {paquetes.map((p: any) => (
                                                <option key={p.id} value={p.id}>Paquete: {p.nombre}</option>
                                            ))}
                                            <option value="custom">Personalizado (Digitar Monto)</option>
                                        </select>
                                    </div>
                                    
                                    {/* Monto Dinámico */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Capital Base (Monto COP) *</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="0" 
                                            step="1000" 
                                            name="monto" 
                                            value={formData.monto} 
                                            onChange={handleChange} 
                                            readOnly={!isCustomMonto}
                                            className={`w-full px-4 py-2.5 border rounded-lg outline-none ${isCustomMonto ? 'bg-white border-slate-300 focus:ring-2 focus:ring-brand-500' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'}`}
                                            placeholder="Ingresa el monto"
                                        />
                                    </div>
                                </div>

                                {/* Selector de Periodo */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Periodo de Inversión (Meses) *</label>
                                    <select required name="periodo_id" value={formData.periodo_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none">
                                        <option value="">Selecciona el periodo...</option>
                                        {periodos.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.months} meses al {p.percentage}%)</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Live Calculations Card */}
                                {calc && (
                                    <div className="bg-slate-800 rounded-xl p-5 text-white shadow-md relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <Calculator className="w-24 h-24" />
                                        </div>
                                        <h4 className="font-bold text-slate-100 mb-4 flex items-center gap-2 relative z-10">
                                            <Calculator className="w-5 h-5 text-brand-400" />
                                            Proyección de la Inversión
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
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Comprobante de Pago (URL)</label>
                                    <div className="relative">
                                        <UploadCloud className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input name="comprobante_path" value={formData.comprobante_path} onChange={handleChange} placeholder="https://ejemplo.com/comprobante.pdf" className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Ingresa la URL del comprobante si ya lo tienes subido a un almacenamiento en la nube.</p>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 flex justify-end bg-white z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button 
                        type="submit"
                        form="create-investment-form"
                        disabled={createMutation.isPending}
                        className="w-full sm:w-auto px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm shadow-brand-500/30"
                    >
                        {createMutation.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                        Crear Solicitud de Inversión
                    </button>
                </div>
            </div>
        </div>
    );
};
