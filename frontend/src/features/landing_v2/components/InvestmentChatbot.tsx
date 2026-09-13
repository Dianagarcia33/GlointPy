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
  Crown,
  HelpCircle,
  Calculator,
  Award,
  RefreshCw,
  ExternalLink
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

export interface SimulationResult {
  amount: number;
  monthlyMin: number;
  monthlyMax: number;
  annualMin: number;
  annualMax: number;
  tier: 'Estándar' | 'Preferencial' | 'VIP Directivo';
  packageName: string;
  packageId?: number;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text?: string;
  timestamp: string;
  type?: 'text' | 'options_goal' | 'options_packages' | 'simulation_card' | 'location_card' | 'contact_form' | 'success_card';
  data?: any;
}

export function InvestmentChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  
  // Chat stream state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');

  // Current lead progression state
  const [selectedGoal, setSelectedGoal] = useState<string>('Rentabilidad Mensual');
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [isCustomPackage, setIsCustomPackage] = useState(false);
  const [customPackageValue, setCustomPackageValue] = useState('');

  // Contact form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState<'Mañana (9:00 AM - 12:00 PM)' | 'Tarde (2:00 PM - 6:00 PM)'>('Mañana (9:00 AM - 12:00 PM)');

  // Submission state
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
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  // Cargar paquetes dinámicos desde la base de datos
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoadingPackages(true);
        const data = await fetchApi('/auth/public/config');
        if (data?.paquetes && Array.isArray(data.paquetes)) {
          // Ordenar por valor ascendente
          const sorted = [...data.paquetes].sort((a, b) => Number(a.value) - Number(b.value));
          setPackages(sorted);
        }
      } catch (err) {
        console.error('Error cargando paquetes en chatbot:', err);
      } finally {
        setLoadingPackages(false);
      }
    };
    loadConfig();

    const timer = setTimeout(() => {
      setHasPrompted(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Inicializar conversación cuando se abre el chat por primera vez
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      startInitialConversation();
    }
  }, [isOpen]);

  const getTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper para simular cálculos de rentabilidad (~1.5% a 1.9% mensual estimado)
  const calculateSimulation = (val: number, name?: string, pkgId?: number): SimulationResult => {
    const amount = Number(val) || 0;
    const monthlyMin = Math.round(amount * 0.015);
    const monthlyMax = Math.round(amount * 0.019);
    const annualMin = monthlyMin * 12;
    const annualMax = monthlyMax * 12;

    let tier: 'Estándar' | 'Preferencial' | 'VIP Directivo' = 'Estándar';
    if (amount >= 50000000) {
      tier = 'VIP Directivo';
    } else if (amount >= 20000000) {
      tier = 'Preferencial';
    }

    return {
      amount,
      monthlyMin,
      monthlyMax,
      annualMin,
      annualMax,
      tier,
      packageName: name || (amount > 0 ? `$${amount.toLocaleString('es-CO')} COP (Monto Personalizado)` : 'Plan de Inversión'),
      packageId: pkgId
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
          text: 'Soy tu asesor patrimonial virtual. Analizaré tus objetivos para brindarte proyecciones de rentabilidad y coordinar una sesión privada con uno de nuestros directivos de inversión.',
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: 'welcome-3',
          sender: 'bot',
          text: 'Para empezar con una asesoría a tu medida, ¿cuál es tu objetivo principal de inversión?',
          timestamp: getTimeString(),
          type: 'options_goal'
        }
      ]);
    }, 600);
  };

  // Manejador cuando el usuario selecciona un objetivo (Cada botón hace un análisis diferenciado)
  const handleSelectGoal = (goal: string) => {
    setSelectedGoal(goal);
    
    // Agrega mensaje del usuario
    const userMsg: ChatMessage = {
      id: `user-goal-${Date.now()}`,
      sender: 'user',
      text: goal,
      timestamp: getTimeString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let consultativeResponse = '';
      
      if (goal === 'Rentabilidad Mensual y Flujo de Caja') {
        consultativeResponse = 'Excelente elección. Nuestro modelo de rentabilidad mensual está diseñado para brindarte flujo de caja constante. Los rendimientos se liquidan periódicamente de forma directa a tu cuenta bancaria registrada, permitiéndote disponer de ingresos pasivos mes a mes.';
      } else if (goal === 'Crecimiento de Capital a Largo Plazo') {
        consultativeResponse = 'Una visión financiera de alto impacto. Este horizonte prioriza la valorización patrimonial y el interés compuesto en proyectos estratégicos del ecosistema GLOINT, optimizando el retorno acumulado.';
      } else {
        consultativeResponse = 'Una decisión muy acertada ante la coyuntura económica. Tu inversión se respalda en contratos y modelos de negocio estructurados, blindando tu patrimonio y superando con creces la inflación.';
      }

      setMessages(prev => [
        ...prev,
        {
          id: `bot-analysis-${Date.now()}`,
          sender: 'bot',
          text: consultativeResponse,
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: `bot-pkg-prompt-${Date.now()}`,
          sender: 'bot',
          text: 'Para este perfil, tenemos los siguientes paquetes disponibles. Puedes seleccionar uno para ver su simulación de rendimientos o ingresar un monto personalizado:',
          timestamp: getTimeString(),
          type: 'options_packages'
        }
      ]);
    }, 700);
  };

  // Manejador cuando el usuario elige un paquete o ingresa un monto personalizado
  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setIsCustomPackage(false);
    const sim = calculateSimulation(pkg.value, pkg.paquete_accion_adquirido, pkg.id);
    setActiveSimulation(sim);

    const userMsg: ChatMessage = {
      id: `user-pkg-${Date.now()}`,
      sender: 'user',
      text: `Quiero consultar el paquete: ${pkg.paquete_accion_adquirido} ($${pkg.value.toLocaleString('es-CO')} COP)`,
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
          id: `bot-sim-intro-${Date.now()}`,
          sender: 'bot',
          text: `He preparado la proyección financiera en tiempo real para el ${pkg.paquete_accion_adquirido}:`,
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: `bot-sim-card-${Date.now()}`,
          sender: 'bot',
          timestamp: getTimeString(),
          type: 'simulation_card',
          data: sim
        }
      ]);
    }, 600);
  };

  // Manejador para monto personalizado
  const handleCustomPackageSubmit = (amountNum: number) => {
    if (amountNum < 1000000) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: 'El monto mínimo de inversión estructurada en GLOINT es de $1,000,000 COP. Por favor ingresa un monto igual o superior.',
          timestamp: getTimeString(),
          type: 'text'
        }
      ]);
      return;
    }

    setIsCustomPackage(true);
    setSelectedPackage(null);
    setCustomPackageValue(amountNum.toString());
    const sim = calculateSimulation(amountNum);
    setActiveSimulation(sim);

    const userMsg: ChatMessage = {
      id: `user-custom-${Date.now()}`,
      sender: 'user',
      text: `Deseo simular una inversión de $${amountNum.toLocaleString('es-CO')} COP`,
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
          id: `bot-custom-intro-${Date.now()}`,
          sender: 'bot',
          text: `Excelente. Hemos personalizado la simulación para un capital de $${amountNum.toLocaleString('es-CO')} COP:`,
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: `bot-sim-card-${Date.now()}`,
          sender: 'bot',
          timestamp: getTimeString(),
          type: 'simulation_card',
          data: sim
        }
      ]);
    }, 600);
  };

  // Confirmar simulación y solicitar ubicación para asignar directivo
  const handleProceedToLocation = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `bot-location-intro-${Date.now()}`,
          sender: 'bot',
          text: '¡Magnífico! Para verificar cobertura territorial y asignarte de manera equitativa al **directivo de inversión** correspondiente a tu zona, ¿en qué departamento y ciudad te encuentras?',
          timestamp: getTimeString(),
          type: 'location_card'
        }
      ]);
    }, 500);
  };

  // Confirmar ciudad seleccionada
  const handleConfirmLocation = () => {
    if (!finalCity) {
      return;
    }

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
          text: `Perfecto. Tenemos directivos con disponibilidad en **${finalCity}**. Como tu perfil califica a nuestro esquema prioritario, déjanos tus datos de contacto para remitirte a la mesa directiva:`,
          timestamp: getTimeString(),
          type: 'contact_form'
        }
      ]);
    }, 600);
  };

  // Envío final del lead al CRM con distribución Round-Robin equitativa a los directivos
  const handleSubmitLead = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Por favor diligencia nombre, correo y teléfono.');
      return;
    }

    const selectedDept = departments.find(d => d.id.toString() === selectedDepartmentId);
    const resolvedValue = activeSimulation?.amount || (selectedPackage?.value || 0);
    const resolvedPackageName = activeSimulation?.packageName || selectedPackage?.paquete_accion_adquirido || `$${resolvedValue.toLocaleString('es-CO')} COP`;

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
        notes: `Origen: Chatbot Concierge. Perfil: ${activeSimulation?.tier || 'Estándar'}. Proy. Mensual: $${activeSimulation?.monthlyMin.toLocaleString('es-CO')} - $${activeSimulation?.monthlyMax.toLocaleString('es-CO')}. Horario: ${preferredTime}`
      });

      const directorName = res?.assigned_commercial?.name || 'Mesa Directiva de Inversiones';
      setAssignedDirector(directorName);

      setMessages(prev => [
        ...prev,
        {
          id: `user-contact-summary-${Date.now()}`,
          sender: 'user',
          text: `Solicito contacto a nombre de ${fullName.trim()} (${phone.trim()})`,
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

  // Motor Inteligente Local de Procesamiento de Lenguaje Natural (NLP Local sin IA)
  const processFreeTextInput = (text: string) => {
    const raw = text.trim();
    if (!raw) return;

    // Agregar mensaje del usuario
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

      // 1. DETECCIÓN INTELIGENTE DE MONTOS NUMÉRICOS (ej. "40 millones", "50m", "30 palos", "100.000.000")
      let detectedAmount: number | null = null;
      
      // Caso millones en texto o sufijo m/palos: ej "40 millones", "40m", "40 palos"
      const millionMatch = lower.match(/(\d+(?:[\.,]\d+)?)\s*(?:millones?|mill?|palos?|m\b)/i);
      if (millionMatch) {
        const numPart = parseFloat(millionMatch[1].replace(',', '.'));
        if (!isNaN(numPart)) {
          detectedAmount = Math.round(numPart * 1000000);
        }
      } else {
        // Caso número plano con puntos o comas: ej "30.000.000", "50000000"
        const cleanNumber = lower.replace(/[^\d]/g, '');
        if (cleanNumber.length >= 7) { // Al menos 1 millón
          const parsed = parseInt(cleanNumber, 10);
          if (!isNaN(parsed) && parsed >= 1000000 && parsed <= 5000000000) {
            detectedAmount = parsed;
          }
        }
      }

      if (detectedAmount && detectedAmount >= 1000000) {
        const sim = calculateSimulation(detectedAmount);
        setActiveSimulation(sim);
        setIsCustomPackage(true);
        setSelectedPackage(null);
        setCustomPackageValue(detectedAmount.toString());

        setMessages(prev => [
          ...prev,
          {
            id: `bot-detected-${Date.now()}`,
            sender: 'bot',
            text: `He detectado tu interés en invertir **$${detectedAmount?.toLocaleString('es-CO')} COP**. Hemos generado tu corrida financiera en vivo:`,
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-sim-${Date.now()}`,
            sender: 'bot',
            timestamp: getTimeString(),
            type: 'simulation_card',
            data: sim
          }
        ]);
        return;
      }

      // 2. DETECCIÓN DE PREGUNTAS SOBRE GARANTÍAS Y RESPALDO LEGAL
      if (
        lower.includes('garantia') || 
        lower.includes('garantía') || 
        lower.includes('seguridad') || 
        lower.includes('respaldo') || 
        lower.includes('riesgo') || 
        lower.includes('legal') ||
        lower.includes('contrato')
      ) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-faq-garantias-${Date.now()}`,
            sender: 'bot',
            text: 'En **GLOINT** la preservación del capital es prioritaria. Cada inversión está formalizada mediante contratos de vinculación con términos y rendimientos expresos, respaldados por la solidez y los activos productivos del ecosistema GLOINT. Además, cuentas con el acompañamiento directo de un directivo de inversión durante todo el plazo.',
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-faq-cta-${Date.now()}`,
            sender: 'bot',
            text: '¿Deseas ver los paquetes disponibles o prefieres agendar una llamada con un directivo para revisar las garantías contractuales?',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 3. DETECCIÓN DE PREGUNTAS SOBRE RENTABILIDAD Y TASAS
      if (
        lower.includes('rentabilidad') || 
        lower.includes('rendimiento') || 
        lower.includes('tasa') || 
        lower.includes('cuanto pagan') || 
        lower.includes('cuánto pagan') || 
        lower.includes('ganancia') || 
        lower.includes('interes') ||
        lower.includes('interés')
      ) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-faq-rentabilidad-${Date.now()}`,
            sender: 'bot',
            text: 'El programa de inversión de GLOINT ofrece rentabilidades proyectadas competitivas en el mercado privado (estimadas entre el **1.5% y el 1.9% mensual** según el paquete y plazo), liquidadas mensualmente directo a tu cuenta bancaria.',
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-faq-rent-sim-${Date.now()}`,
            sender: 'bot',
            text: 'Puedes elegir un paquete oficial a continuación o escribir el monto exacto que te gustaría simular:',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 4. DETECCIÓN DE PREGUNTAS SOBRE PLAZOS, TIEMPO Y RETIROS
      if (
        lower.includes('plazo') || 
        lower.includes('tiempo') || 
        lower.includes('retiro') || 
        lower.includes('retirar') || 
        lower.includes('permanencia') || 
        lower.includes('duracion') ||
        lower.includes('duración')
      ) {
        setMessages(prev => [
          ...prev,
          {
            id: `bot-faq-plazos-${Date.now()}`,
            sender: 'bot',
            text: 'Nuestros esquemas de inversión contemplan horizontes a mediano y largo plazo (típicamente de **12 a 24 meses**) para permitir la adecuada maduración y valorización de los proyectos. Los **rendimientos se pagan de forma mensual**, y al terminar el plazo el inversionista puede retirar su capital o renovar con opción de capitalización.',
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-faq-plazos-cta-${Date.now()}`,
            sender: 'bot',
            text: 'Selecciona una opción para continuar con tu simulación:',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 5. DETECCIÓN DE PREGUNTAS SOBRE MONTO MÍNIMO
      if (
        lower.includes('minimo') || 
        lower.includes('mínimo') || 
        lower.includes('desde cuanto') || 
        lower.includes('desde cuánto')
      ) {
        const minPkg = packages.length > 0 ? packages[0] : null;
        const minText = minPkg ? `$${Number(minPkg.value).toLocaleString('es-CO')} COP` : '$1,000,000 COP';
        setMessages(prev => [
          ...prev,
          {
            id: `bot-faq-minimo-${Date.now()}`,
            sender: 'bot',
            text: `El monto mínimo de ingreso a nuestro fondo estructurado parte desde **${minText}**. A partir de este valor puedes acceder a contratos formales y liquidación de rendimientos mensuales.`,
            timestamp: getTimeString(),
            type: 'text'
          },
          {
            id: `bot-faq-minimo-opt-${Date.now()}`,
            sender: 'bot',
            text: 'Aquí puedes consultar nuestros paquetes o simular un monto libre:',
            timestamp: getTimeString(),
            type: 'options_packages'
          }
        ]);
        return;
      }

      // 6. DETECCIÓN DE SOLICITUD DE ASESOR O DIRECTIVO HUMANO
      if (
        lower.includes('directivo') || 
        lower.includes('asesor') || 
        lower.includes('humano') || 
        lower.includes('hablar') || 
        lower.includes('llamada') || 
        lower.includes('cita') || 
        lower.includes('reunion') ||
        lower.includes('reunión')
      ) {
        handleProceedToLocation();
        return;
      }

      // 7. RESPUESTA CONSULTIVA GENERAL (Wealth Advisor)
      setMessages(prev => [
        ...prev,
        {
          id: `bot-general-${Date.now()}`,
          sender: 'bot',
          text: 'Comprendo tu inquietud. En GLOINT cada propuesta se personaliza según el perfil de riesgo y patrimonio de la persona. Tu directivo de inversión asignado te explicará todos los pormenores técnicos en una sesión privada.',
          timestamp: getTimeString(),
          type: 'text'
        },
        {
          id: `bot-general-cta-${Date.now()}`,
          sender: 'bot',
          text: 'Para avanzar, ¿te gustaría revisar un paquete en particular o agendar directamente con un directivo?',
          timestamp: getTimeString(),
          type: 'options_packages'
        }
      ]);
    }, 600);
  };

  const handleResetChat = () => {
    setMessages([]);
    setSelectedPackage(null);
    setActiveSimulation(null);
    setIsCustomPackage(false);
    setCustomPackageValue('');
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
        {/* Prompt burbuja de invitación inicial */}
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

        {/* Botón Circular Principal */}
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

            {/* Chips de Preguntas Frecuentes Rápidas (Atajos de asesoría) */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 text-[11px]">
              <button
                onClick={() => processFreeTextInput('¿Qué garantías respaldan mi inversión?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Garantías</span>
              </button>

              <button
                onClick={() => processFreeTextInput('¿Cómo pagan las rentabilidades mensuales?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <TrendingUp size={12} className="text-amber-400" />
                <span>Rentabilidades</span>
              </button>

              <button
                onClick={() => processFreeTextInput('¿Cuáles son los plazos y retiros?')}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Clock size={12} className="text-sky-400" />
                <span>Plazos</span>
              </button>

              <button
                onClick={() => handleProceedToLocation()}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors border border-amber-500/40 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <User size={12} />
                <span>Hablar con Directivo</span>
              </button>
            </div>

            {/* Cuerpo del Chat - Hilo Conversacional Fluido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2 animate-in fade-in">
                  
                  {/* Burbuja de Usuario */}
                  {msg.sender === 'user' && (
                    <div className="flex justify-end">
                      <div className="bg-slate-900 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs max-w-[82%] shadow-sm leading-relaxed">
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {/* Burbuja del Bot */}
                  {msg.sender === 'bot' && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs mt-0.5">
                        G
                      </div>

                      <div className="flex-1 max-w-[88%] space-y-2">
                        {/* Texto normal */}
                        {msg.text && (
                          <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3.5 shadow-xs text-slate-800 leading-relaxed">
                            {msg.text}
                          </div>
                        )}

                        {/* Paso 1: Opciones de Objetivos (Diferenciados) */}
                        {msg.type === 'options_goal' && (
                          <div className="space-y-2 pt-1">
                            {[
                              {
                                title: 'Rentabilidad Mensual y Flujo de Caja',
                                desc: 'Recibir rendimientos mensuales directo a tu cuenta',
                                icon: <TrendingUp size={15} className="text-amber-500" />
                              },
                              {
                                title: 'Crecimiento de Capital a Largo Plazo',
                                desc: 'Maximizar el patrimonio con interés compuesto',
                                icon: <Sparkles size={15} className="text-indigo-500" />
                              },
                              {
                                title: 'Diversificación y Protección Patrimonial',
                                desc: 'Respaldo en activos reales y cobertura ante inflación',
                                icon: <ShieldCheck size={15} className="text-emerald-500" />
                              }
                            ].map((opt) => (
                              <button
                                key={opt.title}
                                type="button"
                                onClick={() => handleSelectGoal(opt.title)}
                                className="w-full text-left p-3 rounded-xl bg-white hover:bg-amber-50/70 border border-slate-200 hover:border-amber-400/60 transition-all shadow-xs cursor-pointer group"
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs group-hover:text-amber-700">
                                    {opt.icon}
                                    <span>{opt.title}</span>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <p className="text-[11px] text-slate-500 pl-6">
                                  {opt.desc}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Paso 2: Opciones de Paquetes Dinámicos */}
                        {msg.type === 'options_packages' && (
                          <div className="space-y-2 pt-1">
                            {loadingPackages ? (
                              <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-xs">
                                <Loader2 size={16} className="animate-spin text-amber-500" />
                                <span>Consultando paquetes vigentes...</span>
                              </div>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
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
                                        <p className="text-[11px] font-semibold text-amber-600 mt-0.5">
                                          ${Number(pkg.value).toLocaleString('es-CO')} COP
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                                        <Calculator size={12} />
                                        <span>Simular</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                {/* Entrada para monto libre */}
                                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                    <Calculator size={13} className="text-amber-500" />
                                    <span>¿Deseas simular otro monto específico?</span>
                                  </label>
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold">$</span>
                                      <input
                                        type="number"
                                        placeholder="Ej: 35000000"
                                        value={customPackageValue}
                                        onChange={(e) => setCustomPackageValue(e.target.value)}
                                        className="w-full pl-6 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-amber-500"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCustomPackageSubmit(Number(customPackageValue))}
                                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-lg cursor-pointer"
                                    >
                                      Proyectar
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Tarjeta de Simulación Financiera en Vivo */}
                        {msg.type === 'simulation_card' && msg.data && (
                          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-amber-500/30 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <div>
                                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                  {msg.data.packageName}
                                </span>
                                <h4 className="text-base font-black text-white font-montserrat">
                                  ${msg.data.amount.toLocaleString('es-CO')} COP
                                </h4>
                              </div>
                              <div className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                <Award size={12} />
                                <span>{msg.data.tier}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-slate-300">
                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <p className="text-[10px] text-slate-400">Rendimiento Mensual Est.</p>
                                <p className="text-xs font-extrabold text-emerald-400 mt-0.5">
                                  ${msg.data.monthlyMin.toLocaleString('es-CO')} - ${msg.data.monthlyMax.toLocaleString('es-CO')}
                                </p>
                                <span className="text-[9px] text-slate-500">Liquidación mensual</span>
                              </div>

                              <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                                <p className="text-[10px] text-slate-400">Proyección 12 Meses</p>
                                <p className="text-xs font-extrabold text-amber-400 mt-0.5">
                                  ${msg.data.annualMin.toLocaleString('es-CO')} - ${msg.data.annualMax.toLocaleString('es-CO')}
                                </p>
                                <span className="text-[9px] text-slate-500">Retorno estimado</span>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-400 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                <span>Contrato formal de vinculación y acompañamiento legal.</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                <span>Asignación prioritaria con un directivo de inversión.</span>
                              </div>
                            </div>

                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={handleProceedToLocation}
                                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <span>Me interesa este paquete (Agendar)</span>
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Tarjeta de Selección de Ubicación */}
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

                        {/* Formulario de Contacto y Cierre con Directivo */}
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
                                Horario Preferido para la Llamada
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
                                  <span>Confirmar Asesoría Privada</span>
                                  <Send size={13} />
                                </>
                              )}
                            </button>
                          </form>
                        )}

                        {/* Tarjeta de Éxito y Asignación Directiva */}
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
                                Hemos asignado tu caso al directivo de inversión:
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
                                <span>Llamada al: <strong>{msg.data.phone}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={13} className="text-amber-500 shrink-0" />
                                <span>Horario: <strong>{msg.data.preferredTime}</strong></span>
                              </div>
                            </div>

                            {/* Enlace opcional y voluntario de WhatsApp (sin costo de API) */}
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
                              Realizar otra simulación
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              ))}

              {/* Indicador de escritura del Bot (...) */}
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

            {/* Input de Chat Libre Inteligente siempre accesible */}
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
                  placeholder="Pregunta algo o escribe un monto (ej: 40 millones)..."
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
