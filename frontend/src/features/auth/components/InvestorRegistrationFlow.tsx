import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, ArrowRight, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Eye, EyeOff, LockKeyhole, Mail, User } from 'lucide-react';

const DOCUMENT_TYPES = [
    { id: 'cc_old', name: 'Cédula de Ciudadanía (Amarilla)', icon: '🪪' },
    { id: 'cc_new', name: 'Cédula de Ciudadanía (Digital)', icon: '📱' },
    { id: 'ce', name: 'Cédula de Extranjería', icon: '🌍' },
    { id: 'ppt', name: 'Permiso de Protección Temporal', icon: '📜' },
];

export const InvestorRegistrationFlow = () => {
    const [step, setStep] = useState(1);
    const [documentType, setDocumentType] = useState<string | null>(null);
    const [frontImage, setFrontImage] = useState<File | null>(null);
    const [backImage, setBackImage] = useState<File | null>(null);
    
    // Extracted Data Form State
    const [name, setName] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const navigate = useNavigate();
    const loginAction = useAuthStore((state) => state.login);

    // Mock OCR Mutation
    const processOcrMutation = useMutation({
        mutationFn: async () => {
            // Simulate OCR delay (AWS/Barcode)
            return new Promise((resolve) => setTimeout(() => resolve({
                name: 'DIANA PATRICIA PEREZ',
                documentNumber: '1020304050'
            }), 3000));
        },
        onSuccess: (data: any) => {
            setName(data.name);
            setDocumentNumber(data.documentNumber);
            setStep(4);
        }
    });

    // Mock Final Registration Mutation
    const registerMutation = useMutation({
        mutationFn: async (userData: any) => {
            return new Promise((resolve) => setTimeout(() => resolve({
                access_token: 'mock_token',
                user: { id: 1, name: userData.name, email: userData.email, is_active: true }
            }), 1500));
        },
        onSuccess: (data: any) => {
            loginAction(data.user, data.access_token);
            navigate('/dashboard');
        },
    });

    const handleProcessImages = () => {
        if (!frontImage || !backImage) return;
        setStep(3); // Loading step
        processOcrMutation.mutate();
    };

    const handleFinalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptedTerms) return;
        registerMutation.mutate({ 
            name, 
            email, 
            password, 
            documentNumber,
            documentType,
            role: 'investor' 
        });
    };

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
            {/* Step 1: Document Type Selection */}
            {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">¿Qué documento vas a registrar?</h3>
                        <p className="text-sm text-slate-500">Selecciona el tipo de documento para habilitar la validación inteligente.</p>
                    </div>
                    <div className="grid gap-3">
                        {DOCUMENT_TYPES.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => {
                                    setDocumentType(doc.id);
                                    setStep(2);
                                }}
                                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-brand-500 bg-white hover:shadow-lg transition-all text-left group"
                            >
                                <span className="text-2xl">{doc.icon}</span>
                                <span className="font-semibold text-slate-700 group-hover:text-brand-600">{doc.name}</span>
                                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 ml-auto" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Image Upload */}
            {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Carga tu Documento</h3>
                        <p className="text-sm text-slate-500">Asegúrate de que haya buena luz y no tenga reflejos.</p>
                    </div>
                    
                    <div className="space-y-4">
                        <FileUploadZone label="Foto Frontal" file={frontImage} onChange={setFrontImage} />
                        <FileUploadZone label="Foto Trasera" file={backImage} onChange={setBackImage} />
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Atrás
                        </button>
                        <button 
                            onClick={handleProcessImages}
                            disabled={!frontImage || !backImage}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Procesar Imágenes
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Loading OCR */}
            {step === 3 && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-fadeIn">
                    <div className="relative">
                        <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-brand-500 animate-spin relative z-10" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Validando Documento</h3>
                        <p className="text-sm text-slate-500">Extrayendo datos de forma segura...</p>
                    </div>
                </div>
            )}

            {/* Step 4: Verification & Password */}
            {step === 4 && (
                <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fadeIn">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-green-800">Lectura Exitosa</h4>
                            <p className="text-xs text-green-700 mt-1">Por favor verifica que tus datos sean correctos.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Número de Documento</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <FileText className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={documentNumber}
                                onChange={(e) => setDocumentNumber(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-200 my-6 pt-6"></div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400 focus-within:text-brand-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500"
                                placeholder="tu@correo.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <LockKeyhole className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-brand-500"
                                placeholder="Mínimo 8 caracteres"
                                required minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 mt-4">
                        <div className="flex items-center h-5 mt-0.5">
                            <input
                                id="terms"
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 bg-white"
                                required
                            />
                        </div>
                        <label htmlFor="terms" className="text-sm text-slate-600 leading-snug">
                            Acepto los{' '}
                            <Link to="/terminos" target="_blank" className="font-bold text-brand-500 hover:text-brand-600">
                                Términos y Condiciones
                            </Link>
                            {' '}y Política de Privacidad.
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={registerMutation.isPending || !acceptedTerms}
                        className="group w-full flex items-center justify-center py-4 px-4 rounded-xl shadow-md shadow-brand-500/20 text-base font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-70 transition-all mt-6"
                    >
                        {registerMutation.isPending ? <Loader2 className="animate-spin mr-2 h-5 w-5 text-white" /> : null}
                        Crear Cuenta de Inversionista
                    </button>
                </form>
            )}
        </div>
    );
};
