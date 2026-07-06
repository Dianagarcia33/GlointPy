import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, CheckCircle2, Loader2, Camera, User, FileText, Mail, LockKeyhole, Eye, EyeOff, Landmark, CreditCard, Calculator, MapPin, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { fetchApi, API_URL } from '../../../services/api';

const CITIES = [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", 
    "Bucaramanga", "Manizales", "Pereira", "Cúcuta", "Ibagué", 
    "Villavicencio", "Santa Marta", "Valledupar", "Montería", "Pasto", "Otra"
];

export const InvestorRegistrationFlow = () => {
    const [step, setStep] = useState(1);
    
    // Step 1: KYC Images
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    const [selfieImage, setSelfieImage] = useState<File | null>(null);
    
    // Extracted / Form Data State
    const [formData, setFormData] = useState({
        name: '',
        documento: '',
        tipo_documento: '',
        email: '',
        password: '',
        numero_celular: '',
        ciudad: '',
        custom_ciudad: '',
        fecha_nacimiento: '',
        banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        paquete_id: '',
        monto: '',
        periodo_id: '',
        comprobante_path: ''
    });

    const [kycPaths, setKycPaths] = useState<string[]>([]);
    const [biometricsWarning, setBiometricsWarning] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isCustomMonto, setIsCustomMonto] = useState(false);
    const [showCustomCity, setShowCustomCity] = useState(false);
    const [uploadingComprobante, setUploadingComprobante] = useState(false);

    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    // Fetch Public Config (Paquetes and Periodos)
    const { data: config } = useQuery({
        queryKey: ['public-investments-config'],
        queryFn: () => fetchApi('/auth/public/config')
    });

    const paquetes = config?.paquetes || [];
    const periodos = config?.periodos || [];

    // KYC Validation and OCR Mutation
    const processOcrMutation = useMutation({
        mutationFn: async () => {
            if (!frontImage || !backImage || !selfieImage) throw new Error("Faltan imágenes");
            
            const fd = new FormData();
            fd.append('front', frontImage);
            fd.append('back', backImage);
            fd.append('selfie', selfieImage);
            
            const res = await fetchApi('/auth/public/kyc-validate', { 
                method: 'POST', 
                body: fd 
            });
            return res;
        },
        onSuccess: (data: any) => {
            console.log("OCR Response:", data.extracted_data);
            setKycPaths(data.paths || []);
            setFormData(prev => ({ 
                ...prev, 
                name: data.extracted_data?.name || prev.name, 
                documento: data.extracted_data?.documento || prev.documento,
                fecha_nacimiento: data.extracted_data?.fecha_nacimiento || prev.fecha_nacimiento,
                tipo_documento: data.extracted_data?.tipo_documento || prev.tipo_documento
            }));
            
            if (data.extracted_data && data.extracted_data.biometrics_passed === false) {
                setBiometricsWarning(data.extracted_data.biometrics_message || "Validación manual requerida.");
            } else {
                setBiometricsWarning(null);
            }
            
            setStep(3); // Pasar a Formulario de Datos Personales
        },
        onError: (error: any) => {
            alert(error.message || "Error al validar tu identidad. Por favor intenta de nuevo con fotos más claras.");
            setStep(1); // Volver al paso 1
        }
    });

    // Final Registration Mutation
    const registerMutation = useMutation({
        mutationFn: async (payload: any) => {
            return await fetchApi('/auth/register-investor', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        onSuccess: (data: any) => {
            loginAction(data.user, data.access_token);
            navigate('/dashboard');
        },
    });

    const handleProcessImages = () => {
        if (!frontImage || !backImage || !selfieImage) return;
        setStep(2); // Loading step
        processOcrMutation.mutate();
    };

    const handleComprobanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setUploadingComprobante(true);
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetchApi('/auth/public/upload-file', {
                method: 'POST',
                body: fd
            });
            setFormData(prev => ({ ...prev, comprobante_path: res.path }));
        } catch (error) {
            console.error("Error al subir archivo", error);
            alert("Error al subir comprobante");
        } finally {
            setUploadingComprobante(false);
        }
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
                const montoVal = pkg ? pkg.paquete_accion_adquirido.replace(/[^0-9]/g, '') : '';
                setFormData(prev => ({ ...prev, paquete_id: value, monto: montoVal }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) return;

        const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;

        const payload = {
            ...formData,
            ciudad: finalCity,
            monto: parseFloat(formData.monto),
            paquete_id: isCustomMonto ? null : parseInt(formData.paquete_id),
            contract_period_id: parseInt(formData.periodo_id),
            kyc_docs: kycPaths,
            fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento : null
        };

        registerMutation.mutate(payload);
    };

    // Cálculos
    const getCalculations = () => {
        const monto = parseFloat(formData.monto) || 0;
        const periodo = periodos.find((p: any) => p.id.toString() === formData.periodo_id);
        
        if (!monto || !periodo) return null;

        const percentage = periodo.percentage;
        const months = periodo.months;
        const days = periodo.days;
        
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
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP', 
            minimumFractionDigits: 0
        }).format(value);
    };

    const calc = getCalculations();

    const FileUploadZone = ({ label, file, onChange }: { label: string, file: File | null, onChange: (f: File) => void }) => (
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                    <>
                        <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                        <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                    </>
                ) : (
                    <>
                        <Camera className="w-10 h-10 text-slate-400 mb-3 group-hover:text-brand-500 transition-colors" />
                        <p className="text-sm font-semibold text-slate-700">{label}</p>
                        <p className="text-xs text-slate-500 mt-1">Sube o toma una foto (JPG, PNG)</p>
                    </>
                )}
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                if (e.target.files && e.target.files[0]) onChange(e.target.files[0]);
            }} />
        </label>
    );

    return (
        <div className="w-full">
            
            {/* Step 1: Image Upload */}
            {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Carga tu Documento y Selfie</h3>
                        <p className="text-sm text-slate-500">Para cumplir con la regulación y validar tu identidad.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <FileUploadZone label="Foto Frontal del Documento" file={frontImage} onChange={setFrontImage} />
                        <FileUploadZone label="Foto Trasera del Documento" file={backImage} onChange={setBackImage} />
                        <FileUploadZone label="Selfie (Foto de tu Rostro)" file={selfieImage} onChange={setSelfieImage} />
                    </div>

                    {processOcrMutation.isError && (
                        <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                            <span className="mt-0.5">⚠️</span>
                            <span>{processOcrMutation.error instanceof Error ? processOcrMutation.error.message : 'Error de validación facial o lectura del documento.'}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button 
                            onClick={handleProcessImages}
                            disabled={!frontImage || !backImage || !selfieImage}
                            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                        >
                            Validar Identidad y Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Loading OCR */}
            {step === 2 && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-fadeIn">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-brand-500 animate-spin relative z-10" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Procesando Documentos</h3>
                        <p className="text-sm text-slate-500">Asegurando la calidad de las imágenes...</p>
                    </div>
                </div>
            )}

            {/* Steps 3-5: Mega Form */}
            {step === 3 && (
                <form onSubmit={handleFinalSubmit} className="space-y-8 animate-fadeIn max-w-xl mx-auto text-left">
                    
                    {/* Section: Personal Info */}
                    {biometricsWarning && (
                        <div className="p-4 bg-orange-50 rounded-xl text-orange-700 text-sm font-medium border border-orange-200 flex items-start gap-3 mb-6">
                            <span className="mt-0.5">⚠️</span>
                            <span>{biometricsWarning} Puedes continuar con el registro, pero tu cuenta requerirá validación manual por parte de un administrador antes de ser activada.</span>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <User className="w-5 h-5 text-brand-600" /> Datos Personales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Doc.</label>
                                <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                                    <option value="">Selecciona...</option>
                                    <option value="CC">Cédula</option>
                                    <option value="CE">Cédula Extranjería</option>
                                    <option value="PAS">Pasaporte</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Documento *</label>
                                <input required type="text" name="documento" value={formData.documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Celular *</label>
                                <input required type="text" name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad *</label>
                                <select required name="ciudad" value={formData.ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                                    <option value="">Selecciona...</option>
                                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            {showCustomCity && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué ciudad? *</label>
                                    <input required type="text" name="custom_ciudad" value={formData.custom_ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                                </div>
                            )}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
                                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" placeholder="tu@correo.com" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña *</label>
                                <div className="relative">
                                    <input required minLength={8} type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 pr-10" placeholder="Mínimo 8 caracteres" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                        {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Bank Info */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Landmark className="w-5 h-5 text-brand-600" /> Datos Bancarios para Desembolsos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Banco *</label>
                                <input required type="text" name="banco" value={formData.banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                                <select required name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                                    <option value="">Selecciona...</option>
                                    <option value="Ahorros">Ahorros</option>
                                    <option value="Corriente">Corriente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                                <input required type="text" name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500" />
                            </div>
                        </div>
                    </div>

                    {/* Section: Investment Info */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <CreditCard className="w-5 h-5 text-brand-600" /> Detalles de tu Inversión
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Paquete de Inversión *</label>
                                <select required name="paquete_id" value={formData.paquete_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                                    <option value="">Selecciona un paquete...</option>
                                    {paquetes.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.paquete_accion_adquirido}</option>
                                    ))}
                                    <option value="custom">Personalizado (Ingresar Monto)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Monto a Invertir (COP) *</label>
                                <input required type="number" min="0" step="1000" name="monto" value={formData.monto} onChange={handleChange} readOnly={!isCustomMonto} className={`w-full px-4 py-2.5 border rounded-lg outline-none ${isCustomMonto ? 'bg-white border-slate-300 focus:ring-2 focus:ring-brand-500' : 'bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed'}`} placeholder="Ej: 5000000" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Plazo del Contrato *</label>
                                <select required name="periodo_id" value={formData.periodo_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500">
                                    <option value="">Selecciona el plazo...</option>
                                    {periodos.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.months} meses al {p.percentage}%)</option>
                                    ))}
                                </select>
                            </div>

                            {calc && (
                                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-brand-900 mt-4 shadow-sm">
                                    <h4 className="font-bold mb-3 flex items-center gap-2 text-sm">
                                        <Calculator className="w-4 h-4" /> Proyección de Rendimiento
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-brand-600/80 text-xs font-semibold uppercase">Rendimiento Mensual</p>
                                            <p className="font-bold">{formatCOP(calc.rendimientoMensual)}</p>
                                        </div>
                                        <div>
                                            <p className="text-brand-600/80 text-xs font-semibold uppercase">Rendimiento Total ({calc.meses}m)</p>
                                            <p className="font-bold">{formatCOP(calc.rendimientoTotal)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-brand-200/50 flex justify-between items-center">
                                        <span className="font-bold text-sm">Capital + Rendimiento:</span>
                                        <span className="font-black text-lg text-brand-700">{formatCOP(calc.totalContrato)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="block text-sm font-bold text-slate-700 mb-1">Comprobante de Pago *</label>
                                <p className="text-xs text-slate-500 mb-2">Por favor sube la foto o el PDF de tu consignación.</p>
                                <input required={!formData.comprobante_path} type="file" accept="image/*,.pdf" onChange={handleComprobanteUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-100 file:text-brand-700 hover:file:bg-brand-200 cursor-pointer" />
                                {formData.comprobante_path && <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Comprobante adjunto correctamente.</p>}
                                {uploadingComprobante && <p className="text-xs text-brand-500 mt-2 flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin"/> Subiendo...</p>}
                            </div>
                        </div>
                    </div>

                    {registerMutation.isError && (
                        <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                            <span className="mt-0.5">⚠️</span>
                            <span>{registerMutation.error instanceof Error ? registerMutation.error.message : 'Error al registrar tu inversión'}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-200 pt-6">
                        <div className="flex items-start gap-3 mb-6">
                            <div className="flex items-center h-5 mt-0.5">
                                <input id="terms" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500" required />
                            </div>
                            <label htmlFor="terms" className="text-sm text-slate-600 leading-snug">
                                Declaro que la información proporcionada es verdadera y acepto los{' '}
                                <Link to="/terminos" target="_blank" className="font-bold text-brand-500 hover:text-brand-600">Términos y Condiciones</Link>
                                {' '}de inversión.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={registerMutation.isPending || !acceptedTerms || uploadingComprobante || !formData.comprobante_path}
                            className="w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-70 transition-all active:scale-[0.98]"
                        >
                            {registerMutation.isPending ? <Loader2 className="animate-spin mr-2 h-5 w-5 text-white" /> : null}
                            {registerMutation.isPending ? 'Enviando Solicitud...' : 'Confirmar y Enviar Solicitud'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
