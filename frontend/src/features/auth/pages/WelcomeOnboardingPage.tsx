import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, TrendingUp, ShieldCheck, ArrowRight, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Nav as Navbar } from '../../landing_v2/components/Nav';

type Role = 'client' | 'investor' | null;

export const WelcomeOnboardingPage = () => {
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [showSarlaftModal, setShowSarlaftModal] = useState(false);
    const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
        setHasAcceptedConsent(false);
        setShowSarlaftModal(true);
    };

    const handleAcceptSarlaft = () => {
        setShowSarlaftModal(false);
        navigate(`/register?role=${selectedRole}&consent=1`);
    };


    return (
        <div className="min-h-screen bg-slate-50 font-inter text-slate-900 flex flex-col selection:bg-brand-500/20">
            <Navbar />

            <main className="flex-1 flex flex-col items-center justify-center p-6 mt-24 md:mt-16 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
                        Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-orange-400">GLOINT</span>
                    </h1>
                    <p className="text-lg text-slate-500">
                        Selecciona el perfil con el que deseas unirte a nuestra plataforma para personalizar tu experiencia.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
                    
                    {/* Tarjeta Cliente */}
                    <button 
                        onClick={() => handleRoleSelect('client')}
                        className="group relative bg-white border-2 border-slate-200 hover:border-brand-500 rounded-3xl p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 active:scale-[0.98] overflow-hidden"
                    >
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700 ease-in-out z-0"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-slate-100 group-hover:bg-brand-50 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <Building2 className="w-8 h-8 text-slate-600 group-hover:text-brand-500 transition-colors duration-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Quiero ser Cliente</h2>
                            <p className="text-slate-500 mb-8 min-h-[4rem]">
                                Busca soluciones tecnológicas a la medida, desarrollo web, aplicaciones corporativas y optimización logística.
                            </p>
                            <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-brand-500 transition-colors duration-300">
                                Continuar como Cliente <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </button>

                    {/* Tarjeta Inversionista */}
                    <button 
                        onClick={() => handleRoleSelect('investor')}
                        className="group relative bg-white border-2 border-slate-200 hover:border-brand-500 rounded-3xl p-8 text-left transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 active:scale-[0.98] overflow-hidden"
                    >
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-700 ease-in-out z-0"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-slate-100 group-hover:bg-brand-50 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300">
                                <TrendingUp className="w-8 h-8 text-slate-600 group-hover:text-brand-500 transition-colors duration-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Quiero Invertir</h2>
                            <p className="text-slate-500 mb-8 min-h-[4rem]">
                                Busca generar rentabilidad participando en oportunidades de inversión del ecosistema Gloint.
                            </p>
                            <div className="flex items-center text-sm font-bold text-slate-400 group-hover:text-brand-500 transition-colors duration-300">
                                Continuar como Inversionista <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                            </div>
                        </div>
                    </button>

                </div>

                <div className="mt-12 text-sm text-slate-400">
                    ¿Ya tienes una cuenta? <Link to="/login" className="font-bold text-brand-500 hover:text-brand-600">Inicia Sesión</Link>
                </div>
            </main>

            {/* Decoración de fondo */}
            <div className="fixed bottom-0 right-0 pointer-events-none z-0 opacity-50 mix-blend-multiply">
                <div className="w-[600px] h-[600px] bg-gradient-to-tl from-brand-200/40 to-transparent rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
            </div>

            {/* Modal SARLAFT */}
            {showSarlaftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setShowSarlaftModal(false)}
                    ></div>
                    
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
                        {/* Cabecera del Modal */}
                        <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="w-6 h-6 text-brand-500" />
                                <h3 className="font-bold text-slate-900">
                                    {selectedRole === 'investor' ? 'Validación de Identidad (SARLAFT)' : 'Tratamiento de Datos Personales'}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setShowSarlaftModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-6 md:p-8">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    {selectedRole === 'investor'
                                        ? 'Por cumplimiento normativo (SARLAFT/SAGRILAFT), la ley colombiana exige verificar la identidad de todos los usuarios inversionistas.'
                                        : 'En cumplimiento de la Ley 1581 de 2012 (Hábeas Data), requerimos tu autorización para la gestión segura de tus datos personales.'
                                    }
                                </p>
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed mb-4">
                                Al continuar con el registro como <strong>{selectedRole === 'investor' ? 'Inversionista' : 'Cliente'}</strong>, autorizas de manera expresa e informada a GLOINT para:
                            </p>

                            <ul className="space-y-3 mb-8">
                                {selectedRole === 'investor' ? (
                                    <>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Realizar consultas en listas restrictivas nacionales e internacionales.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Verificar información en centrales de riesgo financiero.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Consultar bases de datos públicas sobre antecedentes.</span>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Tratamiento y almacenamiento seguro de tus datos de contacto.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Asignación de un Asesor Comercial para atención corporativa personalizada.</span>
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>Garantizar la confidencialidad de la información según nuestras Políticas de Privacidad.</span>
                                        </li>
                                    </>
                                )}
                            </ul>

                            <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={hasAcceptedConsent}
                                        onChange={(e) => setHasAcceptedConsent(e.target.checked)}
                                        className="w-4 h-4 mt-1 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                    />
                                    <span className="text-xs text-slate-600 leading-relaxed">
                                        He leído y acepto expresamente las autorizaciones descritas anteriormente y conozco la{' '}
                                        <Link to="/privacidad" target="_blank" className="font-semibold text-brand-600 underline hover:text-brand-700">
                                            Política de Tratamiento de Datos
                                        </Link>
                                        {' '}y los{' '}
                                        <Link to="/terminos" target="_blank" className="font-semibold text-brand-600 underline hover:text-brand-700">
                                            Términos y Condiciones
                                        </Link>.
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowSarlaftModal(false)}
                                    className="w-1/3 py-3 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all text-sm"
                                >
                                    Rechazar
                                </button>
                                <button 
                                    onClick={handleAcceptSarlaft}
                                    disabled={!hasAcceptedConsent}
                                    className="w-2/3 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-md shadow-brand-500/20 transition-all text-sm active:scale-[0.98]"
                                >
                                    Aceptar y Continuar <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
