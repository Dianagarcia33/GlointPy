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
  Phone, 
  Mail, 
  User, 
  Loader2, 
  Crown, 
  Calculator, 
  RefreshCw,
  Coins
} from 'lucide-react';
import { fetchApi } from '../../../services/api';
import { crmService } from '../../../services/crmService';
import { useColombiaCities } from '../../../hooks/useColombiaCities';

export interface PackageItem {
  id: number;
  paquete_accion_adquirido: string;
  value: number;
  granted_shares?: number;
}

export interface PeriodItem {
  id: number;
  name: string;
  months: number;
  days: number;
  percentage: number;
}

export interface RealCalculation {
  monto: number;
  periodo: PeriodItem;
  rendimientoMensual: number;
  rendimientoTotal: number;
  totalContrato: number;
  granted_shares: number;
  packageName: string;
  packageId?: number;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  timestamp: string;
  type?: 'text' | 'options_packages' | 'options_periods' | 'simulation_card' | 'location_card' | 'contact_form' | 'success_card';
  data?: any;
}

export function InvestmentChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  
  // Paquetes y Periodos PREDEFINIDOS desde la base de datos (/auth/public/config)
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [periods, setPeriods] = useState<PeriodItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  
  // Estado del flujo conversacional
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  // Paquete y periodo seleccionados
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodItem | null>(null);
  const [activeCalculation, setActiveCalculation] = useState<RealCalculation | null>(null);

  // Formulario de contacto
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState<'Mañana (9:00 AM - 12:00 PM)' | 'Tarde (2:00 PM - 6:00 PM)'>('Mañana (9:00 AM - 12:00 PM)');

  // Envío y asignación
  const [submitting, setSubmitting] = useState(false);
  const [assignedDirector, setAssignedDirector] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hook de departamentos y municipios de Colombia
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
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Cargar paquetes y periodos predefinidos desde /auth/public/config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const data = await fetchApi('/auth/public/config');
        
        let loadedPackages: PackageItem[] = [];
        let loadedPeriods: PeriodItem[] = [];

        if (data?.paquetes && Array.isArray(data.paquetes)) {
          loadedPackages = [...data.paquetes].sort((a, b) => Number(a.value) - Number(b.value));
          setPackages(loadedPackages);
        }

        if (data?.periodos && Array.isArray(data.periodos)) {
          loadedPeriods = [...data.periodos].sort((a, b) => Number(a.months) - Number(b.months));
          setPeriods(loadedPeriods);
          if (loadedPeriods.length > 0) {
            setSelectedPeriod(loadedPeriods[0]);
          }
        }
      } catch (err) {
        console.error('Error cargando paquetes y periodos en chatbot:', err);
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfig();

    const timer = setTimeout(() => {
      setHasPrompted(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Iniciar la conversación al abrir el chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startInitialConversation();
    }
  }, [isOpen, packages]);

  const getTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Cálculo real con la fórmula oficial de Gloint
  const calculateRealProjection = (monto: number, periodo: PeriodItem, pkg: PackageItem): RealCalculation => {
    const percentage = Number(periodo.percentage) || 0;
    const months = Number(periodo.months) || 0;

    const rendimientoMensual = monto * (percentage / 100);
    const rendimientoTotal = rendimientoMensual * months;
    const totalContrato = monto + rendimientoTotal;
    const granted_shares = pkg.granted_shares || 0;

    const packageName = pkg.paquete_accion_adquirido;

    return {
      monto,
      periodo,
      rendimientoMensual,
      rendimientoTotal,
      totalContrato,
      granted_shares,
      packageName,
      packageId: pkg.id
    };
  };

  // Inicio de la conversación
  const startInitialConversation = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages([
        {
          id: 'welcome-1',
          sender: 'bot',
          text: '¡Hola! Te doy la bienvenida al Concierge de Inversión de GLOINT. 👋',
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: 'welcome-2',
          sender: 'bot',
          text: 'Soy tu asistente de inversión. Te ayudaré a proyectar los rendimientos de nuestros paquetes predefinidos y a coordinar una reunión privada con uno de nuestros directivos de inversión.',
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: 'welcome-3',
          sender: 'bot',
          text: 'Por favor selecciona a continuación el paquete de inversión que deseas consultar:',
          timestamp: getTimeString(),
          type: 'options_packages'
        }
      ]);
    }, 500);
  };

  // Usuario selecciona un paquete oficial
  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(pkg);

    const defaultPeriod = selectedPeriod || (periods.length > 0 ? periods[0] : null);

    const userMsg: ChatMessage = {
      id: `user-pkg-${Date.now()}`,
      sender: 'user',
      text: `Deseo consultar el paquete: ${pkg.paquete_accion_adquirido}`,
      timestamp: getTimeString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      if (!defaultPeriod) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-no-period-${Date.now()}`,
            sender: 'bot',
            text: `Has seleccionado el paquete de ${pkg.paquete_accion_adquirido}. Para coordinar la reunión con tu directivo asignado, continuemos con tu información:`,
            timestamp: getTimeString(),
            type: 'text'
          }
        ]);
        handleProceedToLocation();
        return;
      }

      // Si hay más de un periodo en la base de datos, le permitimos elegir el plazo
      if (periods.length > 1) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-choose-period-${Date.now()}`,
            sender: 'bot',
            text: `Excelente elección. Para el paquete de **${pkg.paquete_accion_adquirido}**, ¿a qué plazo de contrato deseas proyectar tu rentabilidad?`,
            timestamp: getTimeString(),
            type: 'options_periods',
            data: { pkg }
          }
        ]);
      } else {
        const calc = calculateRealProjection(pkg.value, defaultPeriod, pkg);
        setActiveCalculation(calc);
        setMessages(prev => [
          ...prev,
          {
            id: `bot-sim-card-${Date.now()}`,
            sender: 'bot',
            timestamp: getTimeString(),
            type: 'simulation_card',
            data: calc
          }
        ]);
      }
    }, 500);
  };

  // Usuario selecciona un plazo/periodo real de la base de datos
  const handleSelectPeriod = (period: PeriodItem, pkg?: PackageItem | null) => {
    setSelectedPeriod(period);
    const targetPkg = pkg || selectedPackage;
    if (!targetPkg) return;

    const calc = calculateRealProjection(targetPkg.value, period, targetPkg);
    setActiveCalculation(calc);

    const userMsg: ChatMessage = {
      id: `user-period-${Date.now()}`,
      sender: 'user',
      text: `Plazo elegido: ${period.name} (${period.months} meses al ${period.percentage}% mensual)`,
      timestamp: getTimeString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-sim-card-${Date.now()}`,
          sender: 'bot',
          timestamp: getTimeString(),
          type: 'simulation_card',
          data: calc
        }
      ]);
    }, 500);
  };

  // Pasar a selección de ubicación
  const handleProceedToLocation = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-location-intro-${Date.now()}`,
          sender: 'bot',
          text: 'Para asignarte de manera equitativa al **directivo de inversión** correspondiente a tu zona, indícanos tu departamento y ciudad:',
          timestamp: getTimeString(),
          type: 'location_card'
        }
      ]);
    }, 400);
  };

  // Confirmar ubicación
  const handleConfirmLocation = () => {
    if (!finalCity) return;

    const selectedDept = departments.find(d => d.id.toString() === selectedDepartmentId);
    const deptName = selectedDept?.name || 'Colombia';

    const userMsg: ChatMessage = {
      id: `user-loc-${Date.now()}`,
      sender: 'user',
      text: `Ubicación: ${finalCity}, ${deptName}`,
      timestamp: getTimeString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-contact-intro-${Date.now()}`,
          sender: 'bot',
          text: `Diligencia tus datos de contacto para remitirte a tu **directivo asignado**:`,
          timestamp: getTimeString(),
          type: 'contact_form'
        }
      ]);
    }, 500);
  };

  // Envío al CRM con distribución Round-Robin equitativa a los directivos
  const handleSubmitLead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Por favor diligencia nombre, correo y teléfono.');
      return;
    }

    const selectedDept = departments.find(d => d.id.toString() === selectedDepartmentId);
    const resolvedValue = selectedPackage?.value || activeCalculation?.monto || 0;
    const resolvedPackageName = selectedPackage?.paquete_accion_adquirido || activeCalculation?.packageName || '';

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
        investment_goal: 'Asesoría Directiva',
        preferred_contact_time: preferredTime,
        notes: `Origen: Chatbot Concierge. Paquete: ${resolvedPackageName}. Plazo: ${selectedPeriod?.months || 'N/A'} meses (${selectedPeriod?.percentage || 'N/A'}% mensual). Rendimiento Mensual Est: $${activeCalculation?.rendimientoMensual?.toLocaleString('es-CO') || 'N/A'}. Total Contrato: $${activeCalculation?.totalContrato?.toLocaleString('es-CO') || 'N/A'}. Horario: ${preferredTime}`
      });

      const directorName = res?.assigned_commercial?.name || 'Mesa Directiva de Inversiones';
      setAssignedDirector(directorName);

      setMessages(prev => [
        ...prev,
        {
          id: `user-contact-summary-${Date.now()}`,
          sender: 'user',
          text: `Solicito asesoría a nombre de ${fullName.trim()} (${phone.trim()})`,
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: `bot-success-${Date.now()}`,
          sender: 'bot',
          timestamp: getTimeString(),
          type: 'success_card',
          data: {
            directorName,
            pkgName: resolvedPackageName,
            email: email.trim(),
            phone: phone.trim(),
            preferredTime
          }
        }
      ]);
    } catch (err: any) {
      console.error('Error registrando lead en CRM:', err);
      setError(err?.message || 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Motor de respuesta libre estricto y sin datos inventados
  const processFreeTextInput = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    const userMsg: ChatMessage = {
      id: `user-free-${Date.now()}`,
      sender: 'user',
      text: raw,
      timestamp: getTimeString(),
      type: 'text'
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const lower = raw.toLowerCase();

      // 1. Si el usuario escribe una cifra o monto
      const cleanDigits = lower.replace(/[^\d]/g, '');
      const hasNumberWord = lower.includes('millon') || lower.includes('palo') || lower.includes('monto') || cleanDigits.length >= 6;
      
      if (hasNumberWord) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-pkgs-only-${Date.now()}`,
            sender: 'bot',
            text: 'En GLOINT operamos exclusivamente con **paquetes de inversión predefinidos**. Por favor selecciona a continuación el paquete oficial que más se adapte a tu capital:',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 2. Consulta de tasas y periodos reales
      if (
        lower.includes('rentabilidad') || 
        lower.includes('rendimiento') || 
        lower.includes('tasa') || 
        lower.includes('porcentaje') ||
        lower.includes('plazo') ||
        lower.includes('tiempo')
      ) {
        if (periods.length > 0) {
          const periodList = periods.map(p => `• **${p.name}**: ${p.percentage}% mensual (${p.months} meses)`).join('\n');
          setMessages(prev => [
            ...prev,
            {
              id: `bot-real-rates-${Date.now()}`,
              sender: 'bot',
              text: `Actualmente en el sistema contamos con los siguientes plazos y porcentajes de rentabilidad mensual:\n\n${periodList}\n\nPuedes seleccionar un paquete para ver el cálculo exacto de rendimiento mensual:`,
              timestamp: getTimeString(),
              type: 'options_packages'
            }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            {
              id: `bot-rates-general-${Date.now()}`,
              sender: 'bot',
              text: 'Nuestras tasas de rentabilidad mensual dependen del paquete y plazo de contrato que elijas. Puedes consultar nuestros paquetes disponibles a continuación:',
              timestamp: getTimeString(),
              type: 'options_packages'
            }
          ]);
        }
        return;
      }

      // 3. Consulta de paquetes predefinidos
      if (lower.includes('paquete') || lower.includes('cuanto') || lower.includes('cuánto')) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-pkgs-${Date.now()}`,
            sender: 'bot',
            text: 'Aquí tienes los paquetes de inversión predefinidos en la plataforma:',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 4. Contacto directo con directivo
      if (lower.includes('directivo') || lower.includes('asesor') || lower.includes('hablar') || lower.includes('contacto') || lower.includes('reunion') || lower.includes('cita')) {
        handleProceedToLocation();
        return;
      }

      // 5. Consulta sobre garantías / contratos
      if (lower.includes('garantia') || lower.includes('garantía') || lower.includes('contrato') || lower.includes('legal') || lower.includes('seguridad')) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-legal-${Date.now()}`,
            sender: 'bot',
            text: 'Todas las inversiones en GLOINT se formalizan a través de un contrato formal con términos y rendimientos estipulados. Tu directivo de inversión asignado te presentará la documentación completa y resolverá tus preguntas puntuales.',
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-legal-action-${Date.now()}`,
            sender: 'bot',
            text: '¿Deseas elegir un paquete o agendar directamente con un directivo?',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // Respuesta por defecto orientando hacia la selección de paquete o directivo
      setMessages(prev => [
        ...prev,
        {
          id: `bot-default-${Date.now()}`,
          sender: 'bot',
          text: 'Para darte la información exacta y personalizada de tu caso, te contactaremos en privado con un directivo de inversión. Puedes seleccionar tu paquete de interés a continuación:',
          timestamp: getTimeString(),
          type: 'options_packages'
        }
      ]);
    }, 500);
  };

  const handleResetChat = () => {
    setMessages([]);
    setSelectedPackage(null);
    setSelectedPeriod(periods.length > 0 ? periods[0] : null);
    setActiveCalculation(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setAssignedDirector(null);
    setError(null);
    resetCities();
    startInitialConversation();
  };

  return (
    <>
      {/* Botón flotante del Chatbot */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Notificación de invitación */}
        <AnimatePresence>
          {!isOpen && hasPrompted && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-xl border border-amber-500/30 flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                setIsOpen(true);
                setHasPrompted(false);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold text-xs shadow-xs">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-bold group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                  <span>Asesor Directivo de Inversión</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </p>
                <p className="text-[11px] text-slate-300">
                  Simula tu rentabilidad y agenda en privado
                </p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setHasPrompted(false);
                }}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Cerrar notificación"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botón Circular Flotante */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsOpen(!isOpen);
            setHasPrompted(false);
          }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 text-amber-400 flex items-center justify-center shadow-2xl border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer group"
          aria-label="Abrir Concierge de Inversión"
        >
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
          {isOpen ? (
            <X size={24} className="text-white" />
          ) : (
            <MessageSquare size={24} className="group-hover:scale-110 transition-transform text-amber-400" />
          )}
        </motion.button>
      </div>

      {/* Ventana Modal del Chatbot */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[94vw] sm:w-[420px] h-[640px] max-h-[84vh] bg-slate-50 rounded-3xl shadow-2xl border border-slate-200/80 z-50 flex flex-col overflow-hidden font-sans"
          >
            {/* Header del Concierge */}
            <div className="bg-slate-950 text-white p-4 border-b border-slate-800 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md">
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400 font-bold font-montserrat text-sm">
                      G
                    </div>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold font-montserrat text-white tracking-wide">Mesa Directiva Gloint</h3>
                    <Crown size={12} className="text-amber-400" />
                  </div>
                  <p className="text-[11px] text-amber-400/90 font-medium">
                    Concierge & Asesor Patrimonial
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={handleResetChat}
                  title="Reiniciar conversación"
                  className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chips de Preguntas Frecuentes Rápidas */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
              <button
                onClick={() => processFreeTextInput('¿Cuáles son las rentabilidades y plazos?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <TrendingUp size={12} className="text-amber-400" />
                <span>Rentabilidades</span>
              </button>

              <button
                onClick={() => processFreeTextInput('¿Qué paquetes de inversión hay?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Coins size={12} className="text-emerald-400" />
                <span>Paquetes</span>
              </button>

              <button
                onClick={() => processFreeTextInput('¿Cómo es el contrato de inversión?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck size={12} className="text-sky-400" />
                <span>Contratos</span>
              </button>

              <button
                onClick={() => handleProceedToLocation()}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors border border-amber-500/40 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <User size={12} />
                <span>Hablar con Directivo</span>
              </button>
            </div>

            {/* Cuerpo del Chat */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2 animate-in fade-in">
                  
                  {/* Mensaje de Usuario */}
                  {msg.sender === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs max-w-[82%] shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {/* Mensaje del Bot */}
                  {msg.sender === 'bot' && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-0.5">
                        G
                      </div>

                      <div className="flex-1 max-w-[88%] space-y-2">
                        {/* Texto regular */}
                        {msg.text && (
                          <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-slate-800 leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </div>
                        )}

                        {/* Opciones de Paquetes Predefinidos de la BD */}
                        {msg.type === 'options_packages' && (
                          <div className="space-y-2 pt-1">
                            {loadingConfig ? (
                              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-xs">
                                <Loader2 size={16} className="animate-spin text-amber-500" />
                                <span>Cargando paquetes del sistema...</span>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                                {packages.map((pkg) => (
                                  <button
                                    key={pkg.id}
                                    type="button"
                                    onClick={() => handleSelectPackage(pkg)}
                                    className="w-full p-2.5 bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-400 rounded-xl transition-all text-left shadow-xs flex items-center justify-between group cursor-pointer"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900 text-xs group-hover:text-amber-700">
                                        {pkg.paquete_accion_adquirido}
                                      </p>
                                      {pkg.granted_shares ? (
                                        <p className="text-[10px] text-slate-500 font-medium">
                                          {pkg.granted_shares} acciones otorgadas
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                                      <Calculator size={12} />
                                      <span>Seleccionar</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Opciones de Plazos / Periodos Reales de la BD */}
                        {msg.type === 'options_periods' && (
                          <div className="space-y-2 pt-1">
                            {periods.map((period) => (
                              <button
                                key={period.id}
                                type="button"
                                onClick={() => handleSelectPeriod(period, msg.data?.pkg)}
                                className="w-full p-2.5 bg-white hover:bg-amber-50/80 border border-slate-200 hover:border-amber-400 rounded-xl transition-all text-left shadow-xs flex items-center justify-between group cursor-pointer"
                              >
                                <div>
                                  <p className="font-bold text-slate-900 text-xs group-hover:text-amber-700">
                                    {period.name}
                                  </p>
                                  <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                                    {period.percentage}% de rentabilidad mensual
                                  </p>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Tarjeta de Proyección Oficial */}
                        {msg.type === 'simulation_card' && msg.data && (
                          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-amber-500/30 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div>
                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                  Paquete Seleccionado
                                </span>
                                <h4 className="text-base font-black text-white font-montserrat">
                                  {msg.data.packageName}
                                </h4>
                              </div>
                              <div className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <span>{msg.data.periodo.name} ({msg.data.periodo.percentage}%)</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-slate-300">
                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <p className="text-[10px] text-slate-400">Rendimiento Mensual</p>
                                <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                                  ${Math.round(msg.data.rendimientoMensual).toLocaleString('es-CO')} COP
                                </p>
                                <span className="text-[9px] text-slate-500">Al {msg.data.periodo.percentage}% mensual</span>
                              </div>

                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <p className="text-[10px] text-slate-400">Rendimiento Total ({msg.data.periodo.months}m)</p>
                                <p className="text-xs font-extrabold text-amber-400 mt-0.5">
                                  ${Math.round(msg.data.rendimientoTotal).toLocaleString('es-CO')} COP
                                </p>
                                <span className="text-[9px] text-slate-500">Total en el periodo</span>
                              </div>
                            </div>

                            <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40 flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium">Capital + Rendimiento:</span>
                              <span className="font-extrabold text-amber-400 text-sm">
                                ${Math.round(msg.data.totalContrato).toLocaleString('es-CO')} COP
                              </span>
                            </div>

                            {msg.data.granted_shares > 0 && (
                              <div className="text-[11px] text-slate-300 flex items-center gap-1.5">
                                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                <span>Incluye <strong>{msg.data.granted_shares} acciones</strong> en el fondo.</span>
                              </div>
                            )}

                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleProceedToLocation}
                                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <span>Agendar reunión con Directivo</span>
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tarjeta de Ubicación */}
                        {msg.type === 'location_card' && (
                          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Departamento *
                              </label>
                              <select
                                value={selectedDepartmentId}
                                onChange={(e) => handleDepartmentChange(e.target.value)}
                                disabled={loadingDepartments}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                              >
                                <option value="">Selecciona tu departamento...</option>
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                              </select>
                            </div>

                            {selectedDepartmentId && (
                              <div>
                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                  Ciudad / Municipio *
                                </label>
                                <select
                                  value={selectedCity}
                                  onChange={(e) => setSelectedCity(e.target.value)}
                                  disabled={loadingCities}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                                >
                                  <option value="">Selecciona tu ciudad...</option>
                                  {cities.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                  ))}
                                  <option value="OTRA">Otra ciudad / No aparece</option>
                                </select>
                              </div>
                            )}

                            {selectedCity === 'OTRA' && (
                              <div>
                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                  Escribe el nombre de tu ciudad
                                </label>
                                <input
                                  type="text"
                                  placeholder="Ej: Chía, Rionegro, Palmira..."
                                  value={customCity}
                                  onChange={(e) => setCustomCity(e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={!finalCity}
                              onClick={handleConfirmLocation}
                              className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-400 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Confirmar Ubicación</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        )}

                        {/* Formulario de Contacto */}
                        {msg.type === 'contact_form' && (
                          <form onSubmit={handleSubmitLead} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Nombre Completo *
                              </label>
                              <div className="relative">
                                <User size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej: Carlos Rodríguez"
                                  value={fullName}
                                  onChange={(e) => setFullName(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Correo Electrónico *
                              </label>
                              <div className="relative">
                                <Mail size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                  type="email"
                                  required
                                  placeholder="carlos@ejemplo.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Teléfono / WhatsApp *
                              </label>
                              <div className="relative">
                                <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                <input
                                  type="tel"
                                  required
                                  placeholder="320 123 4567"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                Horario Preferido de Contacto
                              </label>
                              <select
                                value={preferredTime}
                                onChange={(e) => setPreferredTime(e.target.value as any)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                              >
                                <option value="Mañana (9:00 AM - 12:00 PM)">Mañana (9:00 AM - 12:00 PM)</option>
                                <option value="Tarde (2:00 PM - 6:00 PM)">Tarde (2:00 PM - 6:00 PM)</option>
                              </select>
                            </div>

                            {error && (
                              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg font-medium">
                                {error}
                              </p>
                            )}

                            <button
                              type="submit"
                              disabled={submitting}
                              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              {submitting ? (
                                <>
                                  <Loader2 size={15} className="animate-spin" />
                                  <span>Asignando a Directivo...</span>
                                </>
                              ) : (
                                <>
                                  <span>Solicitar Asesoría Privada</span>
                                  <Send size={13} />
                                </>
                              )}
                            </button>
                          </form>
                        )}

                        {/* Tarjeta de Éxito */}
                        {msg.type === 'success_card' && msg.data && (
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                              <CheckCircle2 size={26} />
                            </div>

                            <div className="text-center space-y-1">
                              <h4 className="text-sm font-bold text-slate-900 font-montserrat">
                                ¡Solicitud Asignada con Éxito!
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Tu directivo de inversión asignado es:
                              </p>
                              <p className="text-xs font-black text-amber-600 font-montserrat uppercase">
                                {msg.data.directorName}
                              </p>
                            </div>

                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Mail size={13} className="text-amber-500 shrink-0" />
                                <span>Confirmación a: <strong>{msg.data.email}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone size={13} className="text-amber-500 shrink-0" />
                                <span>Contacto al: <strong>{msg.data.phone}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={13} className="text-amber-500 shrink-0" />
                                <span>Horario: <strong>{msg.data.preferredTime}</strong></span>
                              </div>
                            </div>

                            {/* Enlace voluntario de WhatsApp */}
                            <a
                              href={`https://wa.me/573209573995?text=${encodeURIComponent(
                                `Hola, acabo de solicitar asesoría en Gloint para el paquete ${msg.data.pkgName}. Mi nombre es ${fullName}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                            >
                              <MessageSquare size={14} />
                              <span>Escribir por WhatsApp ahora</span>
                            </a>

                            <button
                              type="button"
                              onClick={handleResetChat}
                              className="w-full py-1 text-slate-400 hover:text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Realizar otra consulta
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              ))}

              {/* Indicador de escritura */}
              {isTyping && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    G
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input de Chat */}
            <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processFreeTextInput(inputText);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Pregunta sobre paquetes o escribe tu duda..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-amber-400 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
                  aria-label="Enviar mensaje"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
