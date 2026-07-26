import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Nav as Navbar } from '../../landing_v2/components/Nav';
import { Footer } from '../../landing_v2/components/Footer';
import { ShieldCheck, FileText, Lock, Eye, Mail, Server, ChevronRight } from 'lucide-react';
import { CONTACT_INFO } from '../../../constants/contactInfo';

export const PrivacyPolicyPage = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const sections = [
        {
            title: "1. Identificación del Responsable del Tratamiento",
            icon: <FileText className="w-5 h-5 text-brand-500" />,
            content: `${CONTACT_INFO.companyName} (en adelante, "${CONTACT_INFO.brandName}"), sociedad identificada con domicilio en ${CONTACT_INFO.fullAddress}, correo electrónico de contacto ${CONTACT_INFO.email}, es responsable del tratamiento de los datos personales recolectados a través de la plataforma web.`
        },
        {
            title: "2. Marco Legal Aplicable",
            icon: <ShieldCheck className="w-5 h-5 text-brand-500" />,
            content: "La presente Política de Tratamiento de Datos Personales se elabora en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto Reglamentario 1377 de 2013 y demás normas concordantes del ordenamiento jurídico colombiano (Hábeas Data)."
        },
        {
            title: "3. Finalidad de la Recolección de Datos",
            icon: <Server className="w-5 h-5 text-brand-500" />,
            content: "Los datos personales suministrados por nuestros usuarios y titulares son tratados con las siguientes finalidades:",
            list: [
                "Gestionar el registro, creación de cuenta y verificación de identidad.",
                "Estructurar, ejecutar y dar cumplimiento a la prestación de servicios contratados.",
                "Asignación de un Asesor Comercial para atención corporativa y soporte personalizado.",
                "Envío de notificaciones de cuenta, reportes operativos y actualizaciones del servicio.",
                "Cumplimiento de obligaciones legales, contables, tributarias y de prevención del fraude."
            ]
        },
        {
            title: "4. Derechos de los Titulares (ARCO)",
            icon: <Eye className="w-5 h-5 text-brand-500" />,
            content: "Conforme a la ley, como titular de los datos personales tienes derecho a:",
            list: [
                "Conocer, actualizar y rectificar tus datos personales frente a GLOINT.",
                "Solicitar prueba de la autorización otorgada para el tratamiento de tus datos.",
                "Ser informado del uso que se le ha dado a tus datos personales.",
                "Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.",
                "Revocar la autorización o solicitar la supresión del dato cuando no exista un deber legal o contractual de permanecer en la base de datos."
            ]
        },
        {
            title: "5. Seguridad y Confidencialidad",
            icon: <Lock className="w-5 h-5 text-brand-500" />,
            content: `GLOINT adopta medidas técnicas, humanas y administrativas de seguridad necesarias para otorgar protección a las bases de datos, evitando su alteración, pérdida, consulta, uso o acceso no autorizado. Los servidores utilizan protocolos de cifrado de transporte HTTPS/SSL.`
        },
        {
            title: "6. Canales para la Atención de Consultas y Reclamos",
            icon: <Mail className="w-5 h-5 text-brand-500" />,
            content: `Para ejercer tus derechos de Hábeas Data, puedes enviar tu solicitud por escrito al correo electrónico ${CONTACT_INFO.pqrsEmail} o a la dirección física ${CONTACT_INFO.fullAddress}. Las peticiones se resolverán dentro de los términos legalmente establecidos (10 días hábiles para consultas, 15 días hábiles para reclamos).`
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 font-inter text-slate-900 selection:bg-brand-500/20">
            <Navbar />
            
            {/* Hero Section */}
            <div className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-brand-500/5 to-transparent rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-600 text-sm font-semibold tracking-wide mb-6">
                        <ShieldCheck className="w-4 h-4" />
                        Hábeas Data & Ley 1581/2012
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
                        Política de Privacidad
                    </h1>
                    <p className="text-base md:text-lg text-slate-500 leading-relaxed max-w-3xl mx-auto">
                        Conoce cómo recolectamos, almacenamos y protegemos tus datos personales en el ecosistema empresarial {CONTACT_INFO.brandName}.
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
                <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden p-8 md:p-12 space-y-10">
                    {sections.map((sec, idx) => (
                        <div key={idx} className="space-y-3 border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                {sec.icon}
                                {sec.title}
                            </h2>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {sec.content}
                            </p>
                            {sec.list && (
                                <ul className="space-y-2 mt-3 pl-2">
                                    {sec.list.map((item, iIdx) => (
                                        <li key={iIdx} className="flex items-start gap-2.5 text-slate-600 text-sm">
                                            <ChevronRight className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}

                    <div className="pt-4 text-xs text-slate-400 text-center border-t border-slate-100">
                        Última actualización: {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} | {CONTACT_INFO.companyName}
                    </div>
                </div>
                
                {/* Page Footer */}
                <div className="p-8 text-center mt-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold transition-colors bg-white px-6 py-2.5 rounded-full border border-brand-100 shadow-sm hover:shadow">
                        Volver al inicio
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default PrivacyPolicyPage;
