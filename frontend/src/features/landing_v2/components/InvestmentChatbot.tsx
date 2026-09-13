import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  X, 
  Sparkles, 
  Send, 
  ChevronRight, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Briefcase, 
  Loader2, 
  ArrowLeft,
  Crown
} from 'lucide-react';
import { fetchApi } from '../../../services/api';
import { crmService } from '../../../services/crmService';
import { useColombiaCities } from '../../../hooks/useColombiaCities';

interface PackageItem {
  id: number;
  paquete_accion_adquirido: string;
  value: number;
  granted_shares?: number;
}

export function InvestmentChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Form states
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [isCustomPackage, setIsCustomPackage] = useState(false);
  const [customPackageValue, setCustomPackageValue] = useState('');
  
  // Contact states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState<'Mañana (9:00 AM - 12:00 PM)' | 'Tarde (2:00 PM - 6:00 PM)'>('Mañana (9:00 AM - 12:00 PM)');
  
  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [assignedDirector, setAssignedDirector] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Colombia cities hook
  const {
    departments,
    cities,
    selectedDepartmentId,
    selectedCity,
    customCity,
    loadingDepartments,
    loadingCities,
    handleDepartmentChange,
    setSelectedCity,
    setCustomCity,
    finalCity,
    reset: resetCities
  } = useColombiaCities();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat body
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [step, isOpen]);

  // Cargar paquetes desde /auth/public/config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingPackages(true);
        const data = await fetchApi('/auth/public/config');
        if (data?.paquetes && Array.isArray(data.paquetes)) {
          setPackages(data.paquetes);
        }
      } catch (err) {
        console.error('Error cargando paquetes en chatbot:', err);
      } finally {
        setLoadingPackages(false);
      }
    };
    loadConfig();

    // Mostrar prompt de invitación a los 6 segundos si el usuario no ha abierto el chat
    const timer = setTimeout(() => {
      setHasPrompted(true);
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const investmentGoals = [
    {
      id: 'rendimiento',
      title: 'Rendimiento Periódico',
      desc: 'Flujo de caja y rentabilidad mensual fija',
      icon: TrendingUp
    },
    {
      id: 'patrimonio',
      title: 'Crecimiento Patrimonial',
      desc: 'Valorización del capital a mediano y largo plazo',
      icon: Crown
    },
    {
      id: 'diversificacion',
      title: 'Diversificación Digital',
      desc: 'Participación en ecosistemas y negocios tecnológicos',
      icon: Sparkles
    },
    {
      id: 'empresarial',
      title: 'Inversión Institucional',
      desc: 'Estructuración para empresas y personas jurídicas',
      icon: Briefcase
    }
  ];

  const handleSelectGoal = (goalTitle: string) => {
    setSelectedGoal(goalTitle);
    setStep(2);
  };

  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setIsCustomPackage(false);
    setStep(3);
  };

  const handleCustomPackageNext = () => {
    if (!customPackageValue || isNaN(Number(customPackageValue)) || Number(customPackageValue) <= 0) {
      setError('Por favor ingresa un monto válido.');
      return;
    }
    setError(null);
    setSelectedPackage(null);
    setIsCustomPackage(true);
    setStep(3);
  };

  const handleCityNext = () => {
    if (!finalCity || finalCity.trim() === '') {
      setError('Por favor selecciona o escribe tu ciudad.');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Por favor completa todos tus datos de contacto.');
      return;
    }

    const selectedDept = departments.find(d => d.id.toString() === selectedDepartmentId);
    const resolvedValue = isCustomPackage 
      ? Number(customPackageValue) 
      : (selectedPackage?.value || 0);
    const resolvedPackageName = isCustomPackage
      ? `$${Number(customPackageValue).toLocaleString('es-CO')} COP (Monto Personalizado)`
      : (selectedPackage?.paquete_accion_adquirido || `$${resolvedValue.toLocaleString('es-CO')} COP`);

    try {
      setSubmitting(true);
      const res = await crmService.registerChatbotLead({
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: finalCity.trim(),
        department: selectedDept?.name,
        package_id: selectedPackage?.id,
        package_value: resolvedValue,
        package_name: resolvedPackageName,
        investment_goal: selectedGoal,
        preferred_contact_time: preferredTime,
        notes: `Origen: Chatbot Concierge Landing. Objetivo: ${selectedGoal}. Horario preferido: ${preferredTime}`
      });

      if (res?.assigned_commercial?.name) {
        setAssignedDirector(res.assigned_commercial.name);
      } else {
        setAssignedDirector('Mesa Directiva de Inversiones');
      }

      setStep(5);
    } catch (err: any) {
      console.error('Error registrando lead chatbot:', err);
      setError(err.message || 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetChat = () => {
    setStep(1);
    setSelectedGoal('');
    setSelectedPackage(null);
    setIsCustomPackage(false);
    setCustomPackageValue('');
    setFullName('');
    setEmail('');
    setPhone('');
    resetCities();
    setAssignedDirector(null);
    setError(null);
  };

  return (
    <>
      {/* Botón Flotante y Prompt */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto">
        
        {/* Tooltip / Prompt flotante de invitación */}
        <AnimatePresence>
          {!isOpen && hasPrompted && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className="mb-3 max-w-xs bg-white text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-200/80 relative cursor-pointer group"
              onClick={() => setIsOpen(true)}
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setHasPrompted(false);
                }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
              >
                <X size={10} />
              </button>
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Crown size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 font-montserrat">
                    ¿Te gustaría asesoría VIP?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Califica en 1 minuto para hablar con nuestra dirección de inversiones.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón principal del Chat */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 via-[#0d1526] to-slate-800 text-amber-400 border border-amber-500/40 shadow-2xl cursor-pointer group transition-all"
          aria-label="Abrir Asistente de Inversión"
        >
          {/* Pulso dorado ambiental */}
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
          
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <>
              <MessageSquare size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
            </>
          )}
        </motion.button>
      </div>

      {/* Ventana del Chatbot */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-h-[82vh] h-[640px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden font-inter"
          >
            {/* Header del Concierge */}
            <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                    <Crown size={20} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold font-montserrat text-white">Mesa Directiva Gloint</h3>
                    <Sparkles size={13} className="text-amber-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Concierge de Inversión</span> • <span className="text-emerald-400">En línea</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Barra de Progreso del Filtro */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500 font-medium shrink-0">
              <span>{step < 5 ? `Paso ${step} de 4` : 'Calificación Completada'}</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(s => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all ${
                      step >= s ? 'w-6 bg-amber-500' : 'w-2 bg-slate-200'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {/* Cuerpo de la Conversación */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-white via-slate-50/50 to-slate-50">
              
              {/* Mensaje de bienvenida del bot */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                  G
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[85%] text-xs text-slate-800 leading-relaxed">
                  <p className="font-semibold text-slate-900 mb-1">¡Bienvenido a Gloint Investment!</p>
                  Soy tu asistente ejecutivo. Te ayudaré a calificar tu perfil para asignarte una <strong>reunión privada con uno de nuestros directores de inversión</strong>.
                </div>
              </div>

              {/* PASO 1: Objetivo de Inversión */}
              {step >= 1 && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      G
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[85%] text-xs text-slate-800">
                      Para comenzar, <strong>¿cuál es tu principal objetivo patrimonial?</strong>
                    </div>
                  </div>

                  {step === 1 && (
                    <div className="grid grid-cols-1 gap-2 pl-9">
                      {investmentGoals.map(goal => {
                        const Icon = goal.icon;
                        return (
                          <button
                            key={goal.id}
                            onClick={() => handleSelectGoal(goal.title)}
                            className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50/50 transition-all flex items-center justify-between group cursor-pointer shadow-2xs active:scale-98"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                                <Icon size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{goal.title}</p>
                                <p className="text-[10px] text-slate-500 leading-tight">{goal.desc}</p>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {step > 1 && (
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs font-medium max-w-[80%]">
                        {selectedGoal}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Selección de Paquete (Dinámico) */}
              {step >= 2 && (
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      G
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[85%] text-xs text-slate-800">
                      Excelente. Nuestros paquetes estructuran el rendimiento y la participación accionaria. <strong>¿En qué rango de capital proyectas participar?</strong>
                    </div>
                  </div>

                  {step === 2 && (
                    <div className="space-y-2 pl-9">
                      {loadingPackages ? (
                        <div className="p-4 text-center bg-white rounded-xl border border-slate-200">
                          <Loader2 size={18} className="animate-spin text-amber-500 mx-auto mb-1" />
                          <p className="text-[11px] text-slate-500">Cargando paquetes de inversión...</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                            {packages.map(pkg => (
                              <button
                                key={pkg.id}
                                onClick={() => handleSelectPackage(pkg)}
                                className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50/50 transition-all group cursor-pointer shadow-2xs active:scale-98"
                              >
                                <span className="text-xs font-black text-slate-900 block group-hover:text-amber-700">
                                  {pkg.paquete_accion_adquirido}
                                </span>
                                {pkg.granted_shares && pkg.granted_shares > 0 ? (
                                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                                    + {pkg.granted_shares} acciones
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Inversión Oficial
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>

                          {/* Opción para monto libre / ticket superior */}
                          <div className="pt-1">
                            {!isCustomPackage ? (
                              <button
                                onClick={() => setIsCustomPackage(true)}
                                className="w-full py-2 text-center text-xs text-amber-700 font-bold hover:underline cursor-pointer"
                              >
                                ¿Tienes un monto diferente o superior? Ingresar aquí
                              </button>
                            ) : (
                              <div className="bg-white p-3 rounded-xl border border-amber-300 space-y-2">
                                <label className="text-[11px] font-bold text-slate-700 block">
                                  Ingresa tu monto estimado (COP):
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={customPackageValue}
                                    onChange={(e) => setCustomPackageValue(e.target.value)}
                                    placeholder="Ej. 100000000"
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                  <button
                                    onClick={handleCustomPackageNext}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                                  >
                                    Continuar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {step > 2 && (
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs font-medium max-w-[80%]">
                        {isCustomPackage 
                          ? `$${Number(customPackageValue).toLocaleString('es-CO')} COP` 
                          : selectedPackage?.paquete_accion_adquirido}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: Ubicación (Departamento y Ciudad) */}
              {step >= 3 && (
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      G
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[85%] text-xs text-slate-800">
                      Perfecto. Para asignarte al director correspondiente, <strong>¿en qué departamento y ciudad te encuentras?</strong>
                    </div>
                  </div>

                  {step === 3 && (
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 pl-4 ml-9 shadow-xs">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Departamento
                        </label>
                        <select
                          value={selectedDepartmentId}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          disabled={loadingDepartments}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="">{loadingDepartments ? 'Cargando...' : 'Selecciona Departamento...'}</option>
                          {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Ciudad
                        </label>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          disabled={!selectedDepartmentId || loadingCities}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                        >
                          <option value="">
                            {loadingCities 
                              ? 'Cargando...' 
                              : (!selectedDepartmentId ? 'Elige departamento primero...' : 'Selecciona Ciudad...')}
                          </option>
                          {cities.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedCity === 'Otra' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            ¿Qué ciudad? *
                          </label>
                          <input
                            type="text"
                            value={customCity}
                            onChange={(e) => setCustomCity(e.target.value)}
                            placeholder="Escribe el nombre de tu ciudad"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      )}

                      {error && (
                        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
                      )}

                      <button
                        onClick={handleCityNext}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>Confirmar Ubicación</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}

                  {step > 3 && (
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 text-xs font-medium max-w-[80%]">
                        📍 {finalCity}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 4: Datos de Contacto y Franja de Llamada */}
              {step >= 4 && (
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                      G
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 shadow-xs max-w-[85%] text-xs text-slate-800 leading-relaxed">
                      <p className="font-semibold text-emerald-600 mb-1">¡Tu perfil califica para atención prioritaria!</p>
                      Diligencia tus datos de contacto para remitirte a tu <strong>director asignado</strong>.
                    </div>
                  </div>

                  {step === 4 && (
                    <form onSubmit={handleSubmitLead} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 ml-9 shadow-xs">
                      
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Nombre Completo *
                        </label>
                        <div className="relative">
                          <User size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ej. Carlos Martínez"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          WhatsApp / Teléfono *
                        </label>
                        <div className="relative">
                          <Phone size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ej. 3101234567"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Correo Electrónico *
                        </label>
                        <div className="relative">
                          <Mail size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="carlos@correo.com"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Horario preferido para tu llamada:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPreferredTime('Mañana (9:00 AM - 12:00 PM)')}
                            className={`p-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                              preferredTime.startsWith('Mañana')
                                ? 'bg-amber-50 border-amber-500 text-amber-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            ☀️ Mañana (9am-12pm)
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreferredTime('Tarde (2:00 PM - 6:00 PM)')}
                            className={`p-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                              preferredTime.startsWith('Tarde')
                                ? 'bg-amber-50 border-amber-500 text-amber-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            🌤️ Tarde (2pm-6pm)
                          </button>
                        </div>
                      </div>

                      {error && (
                        <p className="text-[11px] text-rose-500 font-medium">{error}</p>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Asignando a Director...</span>
                          </>
                        ) : (
                          <>
                            <span>Solicitar Asesoría Privada</span>
                            <Send size={14} />
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        <span>Tus datos son tratados bajo estricta confidencialidad.</span>
                      </div>

                    </form>
                  )}
                </div>
              )}

              {/* PASO 5: Confirmación de Éxito */}
              {step === 5 && (
                <div className="py-4 space-y-4 animate-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={30} />
                  </div>

                  <div className="text-center space-y-1">
                    <h4 className="text-base font-bold text-slate-900 font-montserrat">
                      ¡Solicitud Asignada con Éxito!
                    </h4>
                    <p className="text-xs text-slate-600">
                      Hemos asignado tu solicitud de manera prioritaria a:
                    </p>
                    <p className="text-sm font-black text-amber-600 font-montserrat">
                      {assignedDirector}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 shadow-xs">
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-amber-500 shrink-0" />
                      <span>Confirmación enviada a: <strong>{email}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-amber-500 shrink-0" />
                      <span>Te contactaremos al: <strong>{phone}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-500 shrink-0" />
                      <span>Horario de contacto: <strong>{preferredTime}</strong></span>
                    </div>
                  </div>

                  {/* Enlace voluntario de WhatsApp (gratuito, sin costo de API) */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={`https://wa.me/573209573995?text=${encodeURIComponent(
                        `Hola, acabo de solicitar asesoría en Gloint para el paquete de inversión ${
                          isCustomPackage ? `$${Number(customPackageValue).toLocaleString('es-CO')} COP` : selectedPackage?.paquete_accion_adquirido
                        }. Mi nombre es ${fullName}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                    >
                      <MessageSquare size={15} />
                      <span>Iniciar conversación por WhatsApp ahora</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleResetChat}
                      className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Realizar otra consulta
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Footer Footer / Controles de navegación */}
            {step > 1 && step < 5 && (
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Atrás</span>
                </button>

                <span className="text-[11px] text-slate-400">
                  Gloint Private Wealth
                </span>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
