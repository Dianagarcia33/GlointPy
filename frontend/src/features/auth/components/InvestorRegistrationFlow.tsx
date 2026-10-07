import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Camera, User, UserCheck, FileText, Mail, LockKeyhole, Eye, EyeOff, MapPin, Phone, ShieldCheck, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { fetchApi } from '../../../services/api';
import { commercialService } from '../../../services/commercial';
import { PasswordStrengthIndicator, isValidPassword } from '../components/PasswordStrengthIndicator';
import { compressImage } from '../../../utils/imageCompression';

export const InvestorRegistrationFlow = () => {
    const [step, setStep] = useState(1);
    

    
    // KYC Images States
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    const [selfieImage, setSelfieImage] = useState<File | null>(null);
    const [biometricError, setBiometricError] = useState<string | null>(null);
    const [biometricSimilarity, setBiometricSimilarity] = useState<number | null>(null);
    const [biometricAttempts, setBiometricAttempts] = useState<number>(0);
    const [requiresManualReview, setRequiresManualReview] = useState<boolean>(false);

    const [kycPaths, setKycPaths] = useState<string[]>([]);

    // Form Data State
    const [formData, setFormData] = useState({
        name: '',
        documento: '',
        tipo_documento: 'CC',
        fecha_expedicion: '',
        fecha_nacimiento: '',
        email: '',
        password: '',
        numero_celular: '',
        ciudad: '',
        custom_ciudad: '',
        referred_by: '',
        commercial_id: ''
    });

    const [commercialUsers, setCommercialUsers] = useState<Array<{ id: number; name: string; email?: string }>>([]);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showCustomCity, setShowCustomCity] = useState(false);

    // Fetch commercial users (Directivos de Inversión)
    React.useEffect(() => {
        commercialService.getPublicAdvisors()
            .then(res => setCommercialUsers(res))
            .catch(() => setCommercialUsers([]));
    }, []);

    // H-70: Referral code validation state
    const [referralError, setReferralError] = useState<string | null>(null);
    const [isReferralValid, setIsReferralValid] = useState<boolean>(false);
    const [isCheckingReferral, setIsCheckingReferral] = useState<boolean>(false);

    const validateReferralCode = async (code: string): Promise<boolean> => {
        const clean = code.trim().toUpperCase();
        if (!clean) {
            setReferralError(null);
            setIsReferralValid(false);
            return true;
        }
        setIsCheckingReferral(true);
        setReferralError(null);
        try {
            await fetchApi(`/auth/validate-referral/${encodeURIComponent(clean)}`);
            setIsReferralValid(true);
            setReferralError(null);
            return true;
        } catch (err: any) {
            setIsReferralValid(false);
            setReferralError(`El código de referido '${clean}' no es válido o no existe en la plataforma.`);
            return false;
        } finally {
            setIsCheckingReferral(false);
        }
    };

    // Read ?ref= or ?referido= from URL on mount
    React.useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const refFromUrl = params.get('ref') || params.get('referido') || params.get('code');
            if (refFromUrl && refFromUrl.trim()) {
                const clean = refFromUrl.trim().toUpperCase();
                setFormData(prev => ({ ...prev, referred_by: clean }));
                validateReferralCode(clean);
            }
        } catch (e) {
            console.error("Error reading referral URL param", e);
        }
    }, []);

    // Departments & Cities dynamic fetch
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [loadingDepartments, setLoadingDepartments] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

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

    // Upload KYC files to backend and perform biometric facial comparison
    const uploadKycDocsMutation = useMutation({
        mutationFn: async () => {
            if (!frontImage || !backImage || !selfieImage) throw new Error("Faltan imágenes por seleccionar.");
            
            setBiometricError(null);
            const currentAttempt = biometricAttempts + 1;
            setBiometricAttempts(currentAttempt);

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

            const compareFaces = async (docFile: File, selfieFile: File) => {
                const compressedDoc = await compressImage(docFile);
                const compressedSelfie = await compressImage(selfieFile);
                const fd = new FormData();
                fd.append('document', compressedDoc);
                fd.append('selfie', compressedSelfie);
                return await fetchApi('/auth/public/compare-faces', {
                    method: 'POST',
                    body: fd
                });
            };

            // Upload all three documents and perform biometric facial comparison
            const [frontPath, backPath, selfiePath, bioResult] = await Promise.all([
                uploadSingleFile(frontImage),
                uploadSingleFile(backImage),
                uploadSingleFile(selfieImage),
                compareFaces(frontImage, selfieImage)
            ]);

            setKycPaths([frontPath, backPath, selfiePath]);

            if (!bioResult || !bioResult.matched) {
                const failMsg = bioResult?.message || "El rostro de la selfie no coincide con el de la foto del documento de identidad.";
                if (currentAttempt >= 3) {
                    setRequiresManualReview(true);
                    setBiometricSimilarity(null);
                    setBiometricError(null);
                    throw new Error("MAX_ATTEMPTS_REACHED");
                } else {
                    throw new Error(failMsg);
                }
            }

            return { paths: [frontPath, backPath, selfiePath], bioResult };
        },
        onSuccess: ({ paths, bioResult }: { paths: string[], bioResult: any }) => {
            setKycPaths(paths);
            setBiometricSimilarity(bioResult?.similarity ?? null);
            setRequiresManualReview(false);
            setBiometricError(null);

            // Transición fluida al paso 3 tras confirmar la coincidencia facial
            setTimeout(() => {
                setStep(3);
            }, 1200);
        },
        onError: (error: any) => {
            if (error.message === "MAX_ATTEMPTS_REACHED") {
                setStep(1);
            } else {
                setBiometricError(error.message || "Error al validar la identidad biométrica. Intenta con una selfie más nítida.");
                setStep(1);
            }
        }
    });

    // Start uploads when we enter Step 2
    React.useEffect(() => {
        if (step === 2) {
            uploadKycDocsMutation.mutate();
        }
    }, [step]);

    const navigate = useNavigate();
    const loginAction = useAuthStore((state: any) => state.login);

    // Final Registration Mutation
    const registerMutation = useMutation({
        mutationFn: async (payload: any) => {
            return await fetchApi('/auth/register-investor', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        },
        onSuccess: (data: any) => {
            const user = data.user;
            if (user) {
                const perms = new Set<string>();
                const rolesList = new Set<string>();
                if (user.roles) {
                    user.roles.forEach((r: any) => {
                        rolesList.add(r.name);
                        if (r.permissions) {
                            r.permissions.forEach((p: any) => perms.add(p.name));
                        }
                    });
                }
                user.permissions = Array.from(perms);
                user.roles_list = Array.from(rolesList);
            }
            loginAction(user, data.access_token);
            navigate('/dashboard');
        },
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'ciudad') {
            setShowCustomCity(value === 'Otra');
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) return;

        const finalCity = formData.ciudad === 'Otra' ? formData.custom_ciudad : formData.ciudad;

        const payload = {
            name: formData.name.trim(),
            documento: formData.documento.trim(),
            tipo_documento: formData.tipo_documento,
            fecha_expedicion: formData.fecha_expedicion || null,
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            numero_celular: formData.numero_celular.trim(),
            fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento : null,
            ciudad: finalCity,
            banco: null,
            tipo_cuenta: null,
            numero_cuenta: null,
            kyc_docs: kycPaths,
            biometric_verified: !requiresManualReview && (biometricSimilarity !== null),
            biometric_similarity: biometricSimilarity,
            biometric_attempts: biometricAttempts,
            requires_manual_review: requiresManualReview,
            referred_by: formData.referred_by ? formData.referred_by.trim() : null,
            commercial_id: formData.commercial_id ? parseInt(formData.commercial_id) : null
        };

        registerMutation.mutate(payload);
    };

    // Age validation helpers
    const calculateAge = (birthDateStr: string) => {
        if (!birthDateStr) return null;
        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getMaxBirthDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 18);
        return today.toISOString().split('T')[0];
    };

    const getMinBirthDate = () => {
        const today = new Date();
        today.setFullYear(today.getFullYear() - 110);
        return today.toISOString().split('T')[0];
    };

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Validation helpers for wizard steps
    const isStep3Valid = () => {
        const cityValid = formData.ciudad === 'Otra' ? !!formData.custom_ciudad : !!formData.ciudad;
        const age = calculateAge(formData.fecha_nacimiento);
        const isAdult = age !== null && age >= 18 && age <= 110;
        
        // Validar fecha de expedición (no puede ser futura)
        const isExpedicionValid = !!formData.fecha_expedicion && formData.fecha_expedicion <= getTodayDate();

        return (
            !!formData.name.trim() &&
            !!formData.tipo_documento &&
            !!formData.documento.trim() &&
            isExpedicionValid &&
            !!formData.fecha_nacimiento &&
            isAdult &&
            !!formData.numero_celular.trim() &&
            !!selectedDepartmentId &&
            cityValid &&
            !referralError &&
            !isCheckingReferral
        );
    };

    const isStep4Valid = () => {
        return (
            !!formData.email.trim() &&
            isValidPassword(formData.password) &&
            formData.password === confirmPassword &&
            acceptedTerms
        );
    };

    const FileUploadZone = ({ label, file, onChange }: { label: string, file: File | null, onChange: (f: File) => void }) => {
        const [preview, setPreview] = useState<string | null>(null);

        React.useEffect(() => {
            if (file && file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                setPreview(url);
                return () => URL.revokeObjectURL(url);
            } else {
                setPreview(null);
            }
        }, [file]);

        return (
            <label className={`relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-2xl cursor-pointer transition-all overflow-hidden group ${
                file ? 'border-brand-400 bg-brand-50/20' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-brand-400'
            }`}>
                {preview ? (
                    <div className="relative w-full h-full flex items-center justify-center p-2">
                        <img src={preview} alt={label} className="max-h-full max-w-full object-contain rounded-xl" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-xs font-semibold">Clic para cambiar foto</span>
                        </div>
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-full shadow-md">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs truncate">
                            {label}: <span className="font-semibold">{file?.name}</span>
                        </div>
                    </div>
                ) : file ? (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                        <p className="text-xs text-brand-600 mt-1">Clic para cambiar</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6 text-slate-400 group-hover:text-brand-500 transition-colors" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Sube o toma una foto clara (JPG, PNG, WEBP)</p>
                    </div>
                )}
                <input 
                    type="file" 
                    className="hidden" 
                    accept="image/jpeg,image/png,image/webp" 
                    onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            onChange(e.target.files[0]);
                        }
                    }} 
                />
            </label>
        );
    };

    const stepsInfo = [
        { num: 1, label: "Documentos" },
        { num: 2, label: "Validación" },
        { num: 3, label: "Datos Personales" },
        { num: 4, label: "Acceso" }
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
                        <div className="text-center mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Carga tu Documento y Selfie</h3>
                            <p className="text-sm text-slate-500">Sube tus fotos para verificar biométricamente que seas el titular de la cédula.</p>
                        </div>

                        {/* 1. Alerta de 3 intentos agotados -> Permite continuar con validación manual */}
                        {requiresManualReview ? (
                            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3.5 text-amber-900 text-sm animate-fadeIn shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="space-y-1.5 flex-1">
                                    <p className="font-bold text-amber-950 text-base">Validación automática no completada (3 intentos)</p>
                                    <p className="text-amber-900 text-xs leading-relaxed">
                                        No fue posible verificar automáticamente que el titular de la cédula y la selfie coincidan tras 3 intentos.
                                    </p>
                                    <p className="text-amber-800 text-xs font-medium bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                                        ℹ️ <strong>Puedes continuar con tu registro.</strong> Tus fotos quedarán registradas y un administrador de Gloint validará tu identidad de forma manual para aprobar tu cuenta.
                                    </p>
                                </div>
                            </div>
                        ) : biometricError ? (
                            /* 2. Alerta de intento fallido (< 3 intentos) */
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-700 text-sm animate-fadeIn">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="font-bold">
                                        Verificación Facial No Coincide (Intento {biometricAttempts} de 3)
                                    </p>
                                    <p>{biometricError}</p>
                                    {biometricAttempts < 3 && (
                                        <p className="text-xs text-rose-600 font-medium">
                                            Te queda{3 - biometricAttempts === 1 ? '' : 'n'} {3 - biometricAttempts} intento{3 - biometricAttempts === 1 ? '' : 's'} restante{3 - biometricAttempts === 1 ? '' : 's'}. Por favor sube una foto frontal más nítida o tómate una nueva selfie con buena iluminación y de frente.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4">
                            <FileUploadZone label="Foto Frontal del Documento" file={frontImage} onChange={setFrontImage} />
                            <FileUploadZone label="Foto Trasera del Documento" file={backImage} onChange={setBackImage} />
                            <FileUploadZone label="Selfie (Foto de tu Rostro)" file={selfieImage} onChange={setSelfieImage} />
                        </div>

                        <div className="flex flex-col gap-2.5 mt-4">
                            {requiresManualReview ? (
                                <>
                                    <button 
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>Continuar con Validación Manual de Administrador</span>
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBiometricAttempts(0);
                                            setRequiresManualReview(false);
                                            setBiometricError(null);
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-700 py-1 text-center font-medium underline"
                                    >
                                        Reiniciar intentos y volver a intentar con otras fotos
                                    </button>
                                </>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setBiometricError(null);
                                        setStep(2);
                                    }}
                                    disabled={!frontImage || !backImage || !selfieImage}
                                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {biometricAttempts > 0 ? `Reintentar Validación Facial (${3 - biometricAttempts} restante${3 - biometricAttempts === 1 ? '' : 's'})` : 'Continuar a Validación'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 2: Processing / Biometric Facial Comparison */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-fadeIn text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full animate-pulse"></div>
                            <Loader2 className="w-16 h-16 text-brand-500 animate-spin relative z-10" />
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                            <h3 className="text-xl font-bold text-slate-900 mb-1">Verificando Identidad Biométrica</h3>
                            <p className="text-sm text-slate-500">
                                Comparando los rasgos faciales de tu documento de identidad con tu selfie mediante reconocimiento facial...
                            </p>
                            {biometricSimilarity !== null && (
                                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-200 mt-2 animate-fadeIn">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ¡Rostros coincidentes! ({biometricSimilarity}% de similitud)
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Personal & Bank Details */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <User className="w-5 h-5 text-brand-600" /> Datos Personales y de Identidad
                            </h3>
                            {requiresManualReview ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2 mb-4 animate-fadeIn">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>Tu registro requerirá <strong>validación manual de identidad</strong> por parte de un administrador antes de la activación.</span>
                                </div>
                            ) : biometricSimilarity !== null ? (
                                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 mb-4 w-fit animate-fadeIn">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    Identidad Verificada Biométricamente ({biometricSimilarity}% coincidencia)
                                </div>
                            ) : null}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: Ana Pérez Gómez" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo Doc. *</label>
                                    <select required name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900">
                                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                                        <option value="CE">Cédula de Extranjería (CE)</option>
                                        <option value="PAS">Pasaporte</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento *</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <FileText className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input required type="text" name="documento" value={formData.documento} onChange={handleChange} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Ej: 1020304050" />
                                    </div>
                                </div>

                                {/* Fecha de Expedición de la Cédula (Requerida para SARLAFT / Tusdatos.co) */}
                                <div>
                                    <label htmlFor="fecha_expedicion" className="block text-sm font-bold text-slate-700 mb-1 font-sans">
                                        Fecha de Expedición del Documento *
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Calendar className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input 
                                            required
                                            type="date" 
                                            id="fecha_expedicion"
                                            name="fecha_expedicion" 
                                            max={getTodayDate()}
                                            value={formData.fecha_expedicion} 
                                            onChange={handleChange} 
                                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900"
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Indispensable para la validación automática de antecedentes en Registraduría.
                                    </p>
                                </div>

                                {/* Fecha de Nacimiento */}
                                <div>
                                    <label htmlFor="fecha_nacimiento" className="block text-sm font-bold text-slate-700 mb-1 font-sans">
                                        Fecha de Nacimiento * <span className="text-xs font-normal text-slate-500">(Mayor de 18 años)</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Calendar className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input 
                                            required
                                            type="date" 
                                            id="fecha_nacimiento"
                                            name="fecha_nacimiento" 
                                            max={getMaxBirthDate()}
                                            min={getMinBirthDate()}
                                            value={formData.fecha_nacimiento} 
                                            onChange={handleChange} 
                                            className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 text-slate-900 transition-all ${
                                                formData.fecha_nacimiento && (calculateAge(formData.fecha_nacimiento) === null || (calculateAge(formData.fecha_nacimiento) || 0) < 18)
                                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                                                    : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500'
                                            }`} 
                                        />
                                    </div>
                                    {formData.fecha_nacimiento && (calculateAge(formData.fecha_nacimiento) === null || (calculateAge(formData.fecha_nacimiento) || 0) < 18) && (
                                        <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                            Debes ser mayor de 18 años para registrarte (edad calculada: {calculateAge(formData.fecha_nacimiento) ?? 0} años).
                                        </p>
                                    )}
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
                                            <option value="">{loadingDepartments ? 'Cargando...' : 'Selecciona departamento...'}</option>
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
                                            <option value="">{loadingCities ? 'Cargando...' : 'Selecciona ciudad...'}</option>
                                            {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {showCustomCity && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1">¿Qué ciudad? *</label>
                                        <input required type="text" name="custom_ciudad" value={formData.custom_ciudad} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-900" placeholder="Nombre de tu municipio o ciudad" />
                                    </div>
                                )}
                            </div>
                        </div>



                        {/* Asesor y Código de Referido */}
                        <div className="pt-4 border-t border-slate-200 space-y-4">
                            {/* Advisor Selection Block */}
                            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-brand-700">
                                        <User className="w-4 h-4 text-brand-600" /> 👤 Directivo de Inversiones / Asesor Comercial
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">(Opcional)</span>
                                </label>
                                
                                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                    <div
                                        onClick={() => setFormData(prev => ({ ...prev, commercial_id: '' }))}
                                        className={`relative cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                                            !formData.commercial_id
                                                ? 'bg-brand-50/90 border-brand-500 font-bold text-brand-900 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-sm">🌐</span>
                                            <div>
                                                <p className="font-bold">Sin Asesor / Ingreso Independiente</p>
                                                <p className="text-[10px] text-slate-500 font-normal">Llegué por cuenta propia a Gloint</p>
                                            </div>
                                        </div>
                                        {!formData.commercial_id && (
                                            <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                                        )}
                                    </div>

                                    {commercialUsers.map((u) => {
                                        const isSelected = formData.commercial_id === u.id.toString();
                                        const initials = u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => setFormData(prev => ({ ...prev, commercial_id: u.id.toString() }))}
                                                className={`relative cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                                                    isSelected
                                                        ? 'bg-brand-50/90 border-brand-500 font-bold text-brand-900 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-brand-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                                        isSelected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-bold truncate">{u.name}</p>
                                                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-extrabold rounded uppercase">
                                                                Directivo
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 font-normal truncate">{u.email}</p>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Referral Code Block (H-70) */}
                            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2">
                                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-brand-700">
                                        <UserCheck className="w-4 h-4 text-brand-600" /> 👥 Código de Referido
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-semibold">(Opcional)</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="referred_by"
                                        value={formData.referred_by}
                                        onChange={(e) => {
                                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 25);
                                            setFormData(prev => ({ ...prev, referred_by: val }));
                                            setReferralError(null);
                                            setIsReferralValid(false);
                                        }}
                                        onBlur={(e) => {
                                            if (e.target.value.trim()) {
                                                validateReferralCode(e.target.value);
                                            } else {
                                                setReferralError(null);
                                                setIsReferralValid(false);
                                            }
                                        }}
                                        placeholder="Ej: IG1974"
                                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-mono uppercase focus:outline-none transition-all ${
                                            referralError 
                                                ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500/20' 
                                                : isReferralValid 
                                                ? 'border-emerald-400 bg-emerald-50/50 text-emerald-900' 
                                                : 'border-slate-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                                        }`}
                                        maxLength={25}
                                    />
                                    {isCheckingReferral && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                                        </div>
                                    )}
                                    {isReferralValid && !isCheckingReferral && (
                                        <div className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                                            <CheckCircle2 className="w-4 h-4" /> Válido
                                        </div>
                                    )}
                                </div>
                                {referralError && (
                                    <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold pt-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{referralError}</span>
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
                                className="px-6 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors cursor-pointer"
                            >
                                Siguiente paso
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Access Credentials, SARLAFT Notice & Submission */}
                {step === 4 && (
                    <form onSubmit={handleFinalSubmit} method="post" className="space-y-6 animate-fadeIn">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-200 pb-2">
                                <LockKeyhole className="w-5 h-5 text-brand-600" /> Datos de Acceso
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Define tu correo electrónico y tu contraseña para iniciar sesión en tu cuenta de inversionista.</p>
                            
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

                        {/* Banner Informativo de Validación SARLAFT (Tusdatos.co) */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
                            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-200">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-slate-900 text-sm">Validación de Cumplimiento SARLAFT</p>
                                <p className="text-slate-600 leading-relaxed">
                                    Al completar tu registro, tu identidad y antecedentes serán consultados automáticamente en tiempo real mediante <strong>Tusdatos.co</strong> en listas restrictivas y de prevención de lavado de activos para habilitar tus operaciones en la plataforma.
                                </p>
                            </div>
                        </div>

                        {registerMutation.isError && (
                            <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm font-medium border border-red-100 flex items-start gap-3">
                                <span className="mt-0.5">⚠️</span>
                                <span>{registerMutation.error instanceof Error ? registerMutation.error.message : 'Error al registrar tu cuenta'}</span>
                            </div>
                        )}

                        <div className="border-t border-slate-200 pt-6">
                            <div className="flex items-start gap-3 mb-6">
                                <div className="flex items-center h-5 mt-0.5">
                                    <input id="terms" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer" required />
                                </div>
                                <label htmlFor="terms" className="text-sm text-slate-600 leading-snug cursor-pointer">
                                    Declaro que la información proporcionada es verdadera y acepto los{' '}
                                    <Link to="/terminos" target="_blank" className="font-bold text-brand-500 hover:text-brand-600">Términos y Condiciones</Link>
                                    {' '}y la Política de Tratamiento de Datos.
                                </label>
                            </div>

                            <div className="flex justify-between pt-4 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                    disabled={registerMutation.isPending}
                                >
                                    Atrás
                                </button>
                                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                    <button
                                        type="submit"
                                        disabled={registerMutation.isPending || !isStep4Valid()}
                                        className="w-full md:w-auto px-8 py-3 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-70 transition-all active:scale-[0.98] cursor-pointer"
                                    >
                                        {registerMutation.isPending ? <Loader2 className="animate-spin mr-2 h-5 w-5 text-white inline" /> : null}
                                        {registerMutation.isPending ? 'Creando Cuenta...' : 'Completar Registro'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
