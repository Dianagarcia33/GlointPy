import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, CheckCircle2, Loader2, Camera, User, FileText, Mail, LockKeyhole, Eye, EyeOff, Landmark, CreditCard, Calculator, MapPin, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { fetchApi } from '../../../services/api';
import { PasswordStrengthIndicator, isValidPassword } from '../components/PasswordStrengthIndicator';
import { compressImage } from '../../../utils/imageCompression';

const COLOMBIAN_BANKS = [
    "Bancolombia",
    "Nequi",
    "Davivienda",
    "Daviplata",
    "Banco de Bogotá",
    "BBVA Colombia",
    "Banco Popular",
    "Banco de Occidente",
    "Banco AV Villas",
    "Scotiabank Colpatria",
    "Itaú Colombia",
    "GNB Sudameris",
    "Banco Caja Social",
    "Banco Agrario de Colombia",
    "Lulo Bank",
    "Nubank (Nu Colombia)",
    "Ualá",
    "RappiPay (RappiCuenta)",
    "Banco W",
    "Banco Coomeva",
    "Banco Falabella",
    "Banco Pichincha",
    "Otro / Cooperativa"
];

export const InvestorRegistrationFlow = () => {
    const [step, setStep] = useState(1);
    
    // KYC Images States
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    const [selfieImage, setSelfieImage] = useState<File | null>(null);

    const [kycPaths, setKycPaths] = useState<string[]>([]);

    // Form Data State
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
        custom_banco: '',
        tipo_cuenta: '',
        numero_cuenta: '',
        paquete_id: '',
        monto: '',
        periodo_id: '',
        comprobante_path: ''
    });

    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showCustomCity, setShowCustomCity] = useState(false);
    const [showCustomBank, setShowCustomBank] = useState(false);
    const [uploadingComprobante, setUploadingComprobante] = useState(false);

    // Departments & Cities dynamic fetch
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    // Fetch Public Config (Paquetes and Periodos)
    const { data: config } = useQuery({
        queryKey: ['public-investments-config'],
        queryFn: () => fetchApi('/auth/public/config')
    });

    const paquetes = config?.paquetes || [];
    const periodos = config?.periodos || [];

    // Fetch Departments on Mount
    React.useEffect(() => {
        const fetchDepartments = async () => {
            try {
                setLoadingDepartments(true);
                const response = await fetch('https://api-colombia.com/api/v1/Department');
                if (!response.ok) throw new Error("API error");
                const data = await response.json();
                const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
                setDepartments(sorted);
            } catch (err) {
                console.error("Error fetching departments", err);
                // Fallback list of departments in case public API is down
                setDepartments([
                    { id: 1, name: "Antioquia" },
                    { id: 2, name: "Bogotá D.C." },
                    { id: 3, name: "Valle del Cauca" },
                    { id: 4, name: "Atlántico" },
                    { id: 5, name: "Bolívar" },
                    { id: 6, name: "Santander" },
                    { id: 7, name: "Caldas" },
                    { id: 8, name: "Risaralda" },
                    { id: 9, name: "Norte de Santander" },
                    { id: 10, name: "Tolima" },
                    { id: 11, name: "Meta" },
                    { id: 12, name: "Magdalena" },
                    { id: 13, name: "Cesar" },
                    { id: 14, name: "Córdoba" },
                    { id: 15, name: "Nariño" }
                ]);
            } finally {
                setLoadingDepartments(false);
            }
        };
        fetchDepartments();
    }, []);

    // Handle Department Selection & Fetch Cities
    const handleDepartmentChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const deptId = e.target.value;
        setSelectedDepartmentId(deptId);
        setFormData(prev => ({ ...prev, ciudad: '' }));
        setShowCustomCity(false);
        setCities([]);
        
        if (!deptId) return;

        try {
            setLoadingCities(true);
            const response = await fetch(`https://api-colombia.com/api/v1/Department/${deptId}/cities`);
            if (!response.ok) throw new Error("API error");
            const data = await response.json();
            const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
            setCities([...sorted, { id: 9999, name: "Otra" }]);
        } catch (err) {
            console.error("Error fetching cities", err);
            // Fallback cities for major departments
            const fallbackCities: Record<string, { id: number; name: string }[]> = {
                "1": [{ id: 101, name: "Medellín" }, { id: 102, name: "Bello" }, { id: 103, name: "Envigado" }, { id: 104, name: "Itagüí" }, { id: 105, name: "Rionegro" }],
                "2": [{ id: 201, name: "Bogotá" }],
                "3": [{ id: 301, name: "Cali" }, { id: 302, name: "Palmira" }, { id: 303, name: "Tuluá" }, { id: 304, name: "Buenaventura" }, { id: 305, name: "Yumbo" }],
                "4": [{ id: 401, name: "Barranquilla" }, { id: 402, name: "Soledad" }],
                "5": [{ id: 501, name: "Cartagena" }],
                "6": [{ id: 601, name: "Bucaramanga" }, { id: 602, name: "Floridablanca" }, { id: 603, name: "Girón" }],
                "7": [{ id: 701, name: "Manizales" }],
                "8": [{ id: 801, name: "Pereira" }],
                "9": [{ id: 901, name: "Cúcuta" }],
                "10": [{ id: 1001, name: "Ibagué" }],
                "11": [{ id: 1101, name: "Villavicencio" }],
                "12": [{ id: 1201, name: "Santa Marta" }],
                "13": [{ id: 1301, name: "Valledupar" }],
                "14": [{ id: 1401, name: "Montería" }],
                "15": [{ id: 1501, name: "Pasto" }]
            };
            const list = fallbackCities[deptId] || [];
            setCities([...list, { id: 9999, name: "Otra" }]);
        } finally {
            setLoadingCities(false);
        }
    };

    // Upload KYC single file to backend in background
    const uploadKycDocsMutation = useMutation({
        mutationFn: async () => {
            if (!frontImage || !backImage || !selfieImage) throw new Error("Faltan imágenes");
            
            const uploadSingleFile = async (file: File) => {
                const compressedFile = await compressImage(file);
                const fd = new FormData();
                fd.append('file', compressedFile);
                const res = await fetchApi('/auth/public/upload-file', {
                    method: 'POST',
                    body: fd
                });
                return res.path;
            };

            const extractOcr = async (file: File) => {
                const compressedFile = await compressImage(file);
                const fd = new FormData();
                fd.append('file', compressedFile);
                try {
                    const res = await fetchApi('/auth/public/ocr-extract', {
                        method: 'POST',
                        body: fd
                    });
                    return res;
                } catch (e) {
                    console.error("OCR failed", e);
                    return { full_name: "", document_number: "" };
                }
            };

            // Upload all three documents and extract OCR in parallel
            const [frontPath, backPath, selfiePath, ocrData] = await Promise.all([
                uploadSingleFile(frontImage),
                uploadSingleFile(backImage),
                uploadSingleFile(selfieImage),
                extractOcr(frontImage)
            ]);

            return { paths: [frontPath, backPath, selfiePath], ocrData };
        },
        onSuccess: ({ paths, ocrData }: { paths: string[], ocrData: any }) => {
            setKycPaths(paths);
            
            if (ocrData?.full_name || ocrData?.document_number) {
                setFormData(prev => ({
                    ...prev,
                    name: prev.name || ocrData.full_name || '',
                    documento: prev.documento || ocrData.document_number || ''
                }));
            }

            setTimeout(() => {
                setStep(3); // Advance to Step 3 after simulation delay
            }, 1500);
        },
        onError: (error: any) => {
            alert(error.message || "Error al subir tus documentos. Por favor intenta de nuevo.");
            setStep(1);
        }
    });

    // Start uploads when we enter Step 2
    React.useEffect(() => {
        if (step === 2) {
            uploadKycDocsMutation.mutate();
        }
    }, [step]);

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

    const handleComprobanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            setUploadingComprobante(true);
            const compressedFile = await compressImage(file);
            const fd = new FormData();
            fd.append('file', compressedFile);
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

        if (name === 'banco') {
            setShowCustomBank(value === 'Otro / Cooperativa');
        }

        if (name === 'paquete_id') {
            const pkg = paquetes.find((p: any) => p.id.toString() === value);
            const montoVal = pkg ? pkg.value.toString() : '';
            setFormData(prev => ({ ...prev, paquete_id: value, monto: montoVal }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isStep6Valid()) {
            if (!formData.email) return alert("Por favor ingresa tu correo electrónico.");
            if (!isValidPassword(formData.password)) return alert("La contraseña no cumple con todos los requisitos.");
            if (formData.password !== confirmPassword) return alert("Las contraseñas no coinciden.");
            if (!acceptedTerms) return alert("Debes aceptar los Términos y Condiciones.");
            return alert("Por favor completa todos los campos correctamente.");
        }

        const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;
        const finalBank = formData.banco === 'Otro / Cooperativa' ? formData.custom_banco : formData.banco;

        const payload = {
            ...formData,
            ciudad: finalCity,
            banco: finalBank,
            monto: parseFloat(formData.monto),
            paquete_id: parseInt(formData.paquete_id),
            contract_period_id: parseInt(formData.periodo_id),
            kyc_docs: kycPaths,
            fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento : null
        };

        registerMutation.mutate(payload);
    };

    // Validation helpers for wizard steps
    const isStep3Valid = () => {
        const cityValid = formData.ciudad === 'Otra' ? !!formData.custom_ciudad : !!formData.ciudad;
        return (
            !!formData.name &&
            !!formData.tipo_documento &&
            !!formData.documento &&
            !!formData.numero_celular &&
            !!selectedDepartmentId &&
            cityValid
        );
    };

    const isStep4Valid = () => {
        const bankValid = formData.banco === 'Otro / Cooperativa' ? !!formData.custom_banco : !!formData.banco;
        return bankValid && !!formData.tipo_cuenta && !!formData.numero_cuenta;
    };

    const isStep5Valid = () => {
        return !!formData.paquete_id && !!formData.monto && !!formData.periodo_id && !!formData.comprobante_path;
    };

    const isStep6Valid = () => {
        return (
            !!formData.email &&
            isValidPassword(formData.password) &&
            formData.password === confirmPassword &&
            acceptedTerms
        );
    };

    // Calculations
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

    const stepsInfo = [
        { num: 1, label: "Documentos" },
        { num: 2, label: "Validación" },
        { num: 3, label: "Datos" },
        { num: 4, label: "Banco" },
        { num: 5, label: "Inversión" },
        { num: 6, label: "Acceso" }
    ];

    const passwordsMatch = formData.password && confirmPassword ? formData.password === confirmPassword : false;

    return (
        <div className="w-full">
            
            {/* Steps Progress Indicator */}
            <div className="mb-8 max-w-xl mx-auto">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
                    {stepsInfo.map((s) => (
                        <div key={s.num} className="flex flex-col items-center z-10 relative bg-white px-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                                step === s.num
                                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                                    : step > s.num
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-200 text-slate-500'
                            }`}>
                                {step > s.num ? '✓' : s.num}
                            </div>
                            <span className={`text-[10px] font-semibold mt-1 transition-all duration-300 ${
                                step === s.num ? 'text-brand-600' : 'text-slate-500'
                            }`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="max-w-xl mx-auto text-left">
                {/* Step 1: Upload Documents */}
                {step === 1 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Carga tu Documento y Selfie</h3>
                            <p className="text-sm text-slate-500">Sube tus fotos para verificar tu identidad.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <FileUploadZone label="Foto Frontal del Documento" file={frontImage} onChange={setFrontImage} />
                            <FileUploadZone label="Foto Trasera del Documento" file={backImage} onChange={setBackImage} />
                            <FileUploadZone label="Selfie (Foto de tu Rostro)" file={selfieImage} onChange={setSelfieImage} />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setStep(2)}
                                disabled={!frontImage || !backImage || !selfieImage}
                                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                            >
                                Continuar a Validación
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Processing / Validation */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-fadeIn text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full animate-pulse"></div>
                            <Loader2 className="w-16 h-16 text-brand-500 animate-spin relative z-10" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Procesando Documentos</h3>
                            <p className="text-sm text-slate-500">Guardando imágenes and preparando validación de identidad...</p>
                        </div>
                    </div>
                )}

                {/* Step 3: Personal Details */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <User className="w-5 h-5 text-brand-600" /> Datos Personales
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: Ana Pérez" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Doc. *</label>
                                    <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900">
                                        <option value="">Selecciona...</option>
                                        <option value="CC">Cédula</option>
                                        <option value="CE">Cédula Extranjería</option>
                                        <option value="PAS">Pasaporte</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Documento *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FileText className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="text" name="documento" value={formData.documento} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: 12345678" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 font-sans">Fecha de Nacimiento</label>
                                    <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Celular *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Phone className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="text" name="numero_celular" value={formData.numero_celular} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: 3001234567" />
                                    </div>
                                </div>
                                
                                {/* Departamento Select */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Departamento *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <select 
                                            required 
                                            value={selectedDepartmentId} 
                                            onChange={handleDepartmentChange} 
                                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                                            disabled={loadingDepartments}
                                        >
                                            <option value="">{loadingDepartments ? 'Cargando...' : 'Selecciona...'}</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Ciudad Select */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Ciudad *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <MapPin className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <select 
                                            required 
                                            name="ciudad" 
                                            value={formData.ciudad} 
                                            onChange={handleChange} 
                                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                                            disabled={!selectedDepartmentId || loadingCities}
                                        >
                                            <option value="">{loadingCities ? 'Cargando...' : 'Selecciona...'}</option>
                                            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {showCustomCity && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué ciudad? *</label>
                                        <input required type="text" name="custom_ciudad" value={formData.custom_ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(4)}
                                disabled={!isStep3Valid()}
                                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
                            >
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Bank Details */}
                {step === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <Landmark className="w-5 h-5 text-brand-600" /> Datos Bancarios para Desembolsos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Banco *</label>
                                    <select 
                                        required 
                                        name="banco" 
                                        value={formData.banco} 
                                        onChange={handleChange} 
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                                    >
                                        <option value="">Selecciona tu banco...</option>
                                        {COLOMBIAN_BANKS.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                {showCustomBank && (
                                    <div className="md:col-span-2 animate-fadeIn">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué banco o cooperativa? *</label>
                                        <input required type="text" name="custom_banco" value={formData.custom_banco} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: Cooperativa Confiar" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Cuenta *</label>
                                    <select required name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900">
                                        <option value="">Selecciona...</option>
                                        <option value="Ahorros">Ahorros</option>
                                        <option value="Corriente">Corriente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                                    <input required type="text" name="numero_cuenta" value={formData.numero_cuenta} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: 123456789" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setStep(3)}
                                className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(5)}
                                disabled={!isStep4Valid()}
                                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
                            >
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Investment Details */}
                {step === 5 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <CreditCard className="w-5 h-5 text-brand-600" /> Detalles de tu Inversión
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Paquete de Inversión *</label>
                                    <select required name="paquete_id" value={formData.paquete_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900">
                                        <option value="">Selecciona un paquete...</option>
                                        {paquetes.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.paquete_accion_adquirido}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Monto a Invertir (COP) *</label>
                                    <input required type="number" min="0" step="1000" name="monto" value={formData.monto} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg outline-none cursor-not-allowed" placeholder="El monto se asignará automáticamente" />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Plazo del Contrato *</label>
                                    <select required name="periodo_id" value={formData.periodo_id} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900">
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

                        <div className="flex justify-between pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setStep(4)}
                                className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(6)}
                                disabled={!isStep5Valid() || uploadingComprobante}
                                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors"
                            >
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 6: Credentials and Submission */}
                {step === 6 && (
                    <form onSubmit={handleFinalSubmit} method="post" className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <LockKeyhole className="w-5 h-5 text-brand-600" /> Datos de Acceso
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Define tu correo electrónico y tu contraseña para iniciar sesión en tu cuenta.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="email" id="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="tu@correo.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LockKeyhole className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type={showPassword ? "text" : "password"} id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} className="w-full pl-11 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Mínimo 8 caracteres" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                                            {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                                        </button>
                                    </div>

                                    {formData.password.length > 0 && (
                                        <PasswordStrengthIndicator password={formData.password} confirmPassword={confirmPassword} />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar Contraseña *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <LockKeyhole className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type={showPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Repite tu contraseña" />
                                    </div>
                                    {confirmPassword && (
                                        <p className={`text-xs mt-1.5 font-semibold ${
                                            passwordsMatch ? 'text-emerald-600' : 'text-red-500'
                                        }`}>
                                            {passwordsMatch ? '✓ Las contraseñas coinciden.' : '✗ Las contraseñas no coinciden.'}
                                        </p>
                                    )}
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

                            <div className="flex justify-between pt-4 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(5)}
                                    className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                    disabled={registerMutation.isPending}
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={registerMutation.isPending}
                                    className="w-full md:w-auto px-8 py-3 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-70 transition-all active:scale-[0.98]"
                                >
                                    {registerMutation.isPending ? <Loader2 className="animate-spin mr-2 h-5 w-5 text-white" /> : null}
                                    {registerMutation.isPending ? 'Enviando Solicitud...' : 'Confirmar y Enviar Solicitud'}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
