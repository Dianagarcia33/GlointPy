import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../../components/layout/Navbar';
import { Footer } from '../../../components/layout/Footer';
import { ShieldCheck, FileText, ChevronRight, AlertCircle, RefreshCw, XCircle, CreditCard, Banknote, Mail, CheckCircle2, Calendar } from 'lucide-react';

const sections = [
    {
        id: 1,
        title: "Objeto de la Política",
        icon: <FileText className="w-6 h-6 text-brand-500" />,
        content: "La presente política regula el inicio inmediato del servicio, la no aplicación del derecho de retracto y las condiciones de devolución de dinero por terminación anticipada del Programa GLOINT Investment, conforme a la legislación colombiana vigente."
    },
    {
        id: 2,
        title: "Marco Legal",
        icon: <ShieldCheck className="w-6 h-6 text-brand-500" />,
        content: "Esta política se fundamenta en el artículo 47 de la Ley 1480 de 2011 – Estatuto del Consumidor, que establece que el derecho de retracto no aplica cuando la prestación del servicio ya ha comenzado con autorización expresa del consumidor."
    },
    {
        id: 3,
        title: "Naturaleza del Servicio",
        icon: <RefreshCw className="w-6 h-6 text-brand-500" />,
        content: "El Programa GLOINT Investment es un servicio de ejecución inmediata que implica la formalización contractual, activación operativa y estructuración financiera desde el momento del pago."
    },
    {
        id: 4,
        title: "Inicio del Servicio",
        icon: <CheckCircle2 className="w-6 h-6 text-brand-500" />,
        content: "El servicio se entenderá iniciado cuando se realice cualquiera de los siguientes actos:",
        list: [
            "Recepción del pago",
            "Creación de la cuenta del inversionista",
            "Aceptación del contrato",
            "Emisión y activación del pagaré"
        ]
    },
    {
        id: 5,
        title: "No Aplicación del Derecho de Retracto",
        icon: <XCircle className="w-6 h-6 text-brand-500" />,
        content: "Una vez iniciado el servicio, el usuario renuncia expresamente al derecho de retracto conforme a la ley, aceptando que cualquier solicitud posterior será una terminación anticipada.",
        isWarning: true
    },
    {
        id: 6,
        title: "Terminación Anticipada",
        icon: <AlertCircle className="w-6 h-6 text-brand-500" />,
        content: "El usuario podrá solicitar la terminación anticipada del contrato, lo cual no constituye retracto legal."
    },
    {
        id: 7,
        title: "Costo de Retiro",
        icon: <CreditCard className="w-6 h-6 text-brand-500" />,
        content: "La terminación anticipada tendrá un costo del 3.2% sobre el monto a devolver, correspondiente a gastos operativos, administrativos y financieros.",
        isHighlight: true
    },
    {
        id: 8,
        title: "Devolución de Dinero",
        icon: <Banknote className="w-6 h-6 text-brand-500" />,
        content: "El reembolso se realizará por el monto neto, descontando el 3.2%, dentro de los 30 días calendario siguientes a la aceptación de la solicitud."
    },
    {
        id: 9,
        title: "Procedimiento",
        icon: <Mail className="w-6 h-6 text-brand-500" />,
        content: "Las solicitudes deberán enviarse al correo electrónico:",
        action: {
            label: "pqrs@gloint.com.co",
            href: "mailto:pqrs@gloint.com.co"
        }
    },
    {
        id: 10,
        title: "Aceptación",
        icon: <CheckCircle2 className="w-6 h-6 text-brand-500" />,
        content: "El usuario declara conocer y aceptar esta política al momento de contratar el servicio."
    },
    {
        id: 11,
        title: "Vigencia",
        icon: <Calendar className="w-6 h-6 text-brand-500" />,
        content: "La presente política entra en vigencia a partir de su publicación."
    }
];

export const TermsAndConditionsPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 font-inter text-slate-900 selection:bg-brand-500/20">
            <Navbar />
            
            {/* Hero Section */}
            <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-500/5 to-transparent rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold tracking-wide mb-6">
                        <ShieldCheck className="w-4 h-4" />
                        Programa GLOINT Investment
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
                        Términos y Condiciones
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-3xl mx-auto">
                        Política de Inicio Inmediato del Servicio, No Aplicación del Derecho de Retracto y Terminación Anticipada.
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
                <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
                    <div className="p-8 md:p-12 lg:p-16 space-y-12">

                        {sections.map((section, index) => (
                            <div key={section.id} className="relative group">
                                {index !== 0 && <div className="absolute -top-6 left-0 right-0 h-px bg-slate-100"></div>}
                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="flex-shrink-0 w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                                        {section.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                                            <span className="text-slate-300 font-mono text-sm">{section.id.toString().padStart(2, '0')}</span>
                                            {section.title}
                                        </h2>
                                        
                                        {section.isWarning ? (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 leading-relaxed">
                                                {section.content}
                                            </div>
                                        ) : section.isHighlight ? (
                                            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-slate-700 leading-relaxed">
                                                <span className="font-semibold text-brand-700 block mb-1">Costo Operativo: 3.2%</span>
                                                {section.content}
                                            </div>
                                        ) : (
                                            <p className="text-slate-600 leading-relaxed">
                                                {section.content}
                                            </p>
                                        )}

                                        {section.list && (
                                            <ul className="mt-4 space-y-3">
                                                {section.list.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-slate-600">
                                                        <ChevronRight className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {section.action && (
                                            <div className="mt-4">
                                                <a
                                                    href={section.action.href}
                                                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                    {section.action.label}
                                                </a>
                                                <p className="text-slate-400 text-sm mt-3 flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Las solicitudes deben incluir los datos completos del inversionista.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* SARLAFT Section */}
                        <div className="relative group pt-6">
                            <div className="absolute -top-6 left-0 right-0 h-px bg-slate-100"></div>
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
                                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-brand-500" />
                                    Cláusula SARLAFT / SAGRILAFT
                                </h2>
                                <div className="space-y-6 text-slate-600 leading-relaxed">
                                    <p>
                                        <strong className="text-slate-900 block mb-1">1. Cumplimiento normativo y prevención de riesgos</strong>
                                        GLOINT INTERNATIONAL PARTNERS S.A.S., en cumplimiento de los lineamientos establecidos en el sistema de administración del riesgo de lavado de activos y financiación del terrorismo (SARLAFT), así como en las buenas prácticas del sistema de autocontrol y gestión del riesgo integral LA/FT/FPADM (SAGRILAFT), adopta políticas, procedimientos y mecanismos orientados a la prevención, detección y control de actividades ilícitas.
                                    </p>
                                    <p>
                                        <strong className="text-slate-900 block mb-1">2. Autorización expresa de verificación</strong>
                                        Con la aceptación de los presentes Términos y Condiciones, el usuario autoriza de manera previa, expresa e informada a GLOINT para realizar consultas en listas restrictivas y centrales de riesgo.
                                    </p>
                                    <p>
                                        <strong className="text-slate-900 block mb-1">3. Tratamiento de datos personales para fines de cumplimiento</strong>
                                        El titular autoriza que su información personal, financiera y comercial sea recolectada, almacenada y procesada con fines de validación de identidad y prevención de fraude.
                                    </p>
                                    <div className="bg-white border border-slate-200 p-4 rounded-xl mt-6">
                                        <p className="text-sm font-semibold text-slate-900 mb-2">Declaraciones del usuario:</p>
                                        <ul className="space-y-2 text-sm text-slate-600">
                                            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0" /> Los recursos que maneja provienen de actividades lícitas.</li>
                                            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0" /> No se encuentra incluido en listas restrictivas o de control.</li>
                                            <li className="flex gap-2"><ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0" /> La información suministrada es veraz, completa y verificable.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    {/* Page Footer */}
                    <div className="bg-slate-50 border-t border-slate-100 p-8 text-center">
                        <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold transition-colors bg-white px-6 py-2.5 rounded-full border border-brand-100 shadow-sm hover:shadow">
                            Volver al inicio
                        </Link>
                        <div className="mt-6 text-sm text-slate-400">
                            <p>Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="mt-1">© {new Date().getFullYear()} GLOINT. Todos los derechos reservados.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
};
