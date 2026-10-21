import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Code2,
  Play,
  Send,
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  Mail,
  Phone,
  ShieldCheck,
  ChevronRight,
  Terminal,
  FileCode2,
  HelpCircle,
  Clock,
  Layers,
  KeyRound
} from 'lucide-react';
import { technicalTestService, TestCaseResult, RunCodeResponse } from '../../../services/technicalTestService';

const PYTHON_STARTER_CODE = `def calcular_balance(movimientos):
    """
    Procesa la lista de movimientos y retorna el consolidado.
    
    Reglas:
    1. 'ingreso' y 'egreso' con monto > 0 son válidos.
    2. Montos <= 0 o tipos diferentes son movimientos inválidos.
    3. Si movimientos es None o vacío [], retornar ceros.
    """
    # Escribe tu solución aquí
    
    return {
        "total_ingresos": 0,
        "total_egresos": 0,
        "balance_neto": 0,
        "movimientos_invalidos": 0
    }
`;

const JS_STARTER_CODE = `function calcularBalance(movimientos) {
  /**
   * Procesa la lista de movimientos y retorna el consolidado.
   * 
   * Reglas:
   * 1. 'ingreso' y 'egreso' con monto > 0 son válidos.
   * 2. Montos <= 0 o tipos diferentes son movimientos inválidos.
   * 3. Si movimientos es null o vacío [], retornar ceros.
   */
  // Escribe tu solución aquí

  return {
    total_ingresos: 0,
    total_egresos: 0,
    balance_neto: 0,
    movimientos_invalidos: 0
  };
}
`;

const JS_TEST_CASES = [
  {
    id: 1,
    name: 'Caso estándar con ingresos y egresos',
    input: [
      { id: 1, tipo: 'ingreso', monto: 1000 },
      { id: 2, tipo: 'egreso', monto: 300 },
      { id: 3, tipo: 'ingreso', monto: 500 },
      { id: 4, tipo: 'egreso', monto: -50 },
      { id: 5, tipo: 'desconocido', monto: 200 }
    ],
    expected: {
      total_ingresos: 1500,
      total_egresos: 300,
      balance_neto: 1200,
      movimientos_invalidos: 2
    }
  },
  {
    id: 2,
    name: 'Caso lista vacía o nula',
    input: [],
    expected: {
      total_ingresos: 0,
      total_egresos: 0,
      balance_neto: 0,
      movimientos_invalidos: 0
    }
  },
  {
    id: 3,
    name: 'Caso solo egresos y montos cero',
    input: [
      { id: 1, tipo: 'egreso', monto: 150 },
      { id: 2, tipo: 'egreso', monto: 0 },
      { id: 3, tipo: 'ingreso', monto: -10 }
    ],
    expected: {
      total_ingresos: 0,
      total_egresos: 150,
      balance_neto: -150,
      movimientos_invalidos: 2
    }
  }
];

export const TechnicalAssessmentPage: React.FC = () => {
  // Estado del flujo: 'welcome' | 'testing' | 'submitted'
  const [stage, setStage] = useState<'welcome' | 'testing' | 'submitted'>('welcome');

  // Datos del candidato
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'python' | 'javascript'>('python');

  // Editor y código
  const [code, setCode] = useState(PYTHON_STARTER_CODE);
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Timer: 30 minutos (1800 segundos)
  const [secondsRemaining, setSecondsRemaining] = useState(30 * 60);
  const [timerActive, setTimerActive] = useState(false);

  // Ejecución de pruebas
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [allPassed, setAllPassed] = useState(false);

  // Envío final
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState<any>(null);

  // Sincronizar número de líneas
  useEffect(() => {
    const lines = code.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [code]);

  // Manejar cambio de lenguaje
  const handleLanguageChange = (newLang: 'python' | 'javascript') => {
    setLanguage(newLang);
    setCode(newLang === 'python' ? PYTHON_STARTER_CODE : JS_STARTER_CODE);
    setTestResults([]);
    setSyntaxError(null);
    setAllPassed(false);
  };

  // Contador regresivo
  useEffect(() => {
    let interval: any = null;
    if (timerActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && timerActive) {
      setTimerActive(false);
      alert('¡El tiempo límite de 30 minutos ha concluido! Puedes enviar tu solución ahora.');
    }
    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  // Formato MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Iniciar la prueba
  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    if (!candidateName.trim() || !candidateEmail.trim()) {
      alert('Por favor ingresa tu nombre y correo para comenzar.');
      return;
    }
    if (!accessPin.trim()) {
      setPinError('Debes ingresar el código PIN de acceso proporcionado por Gloint.');
      return;
    }
    setStage('testing');
    setTimerActive(true);
  };

  // Permitir indentar con tecla TAB en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = '    '; // 4 espacios

      const newCode = code.substring(0, start) + indent + code.substring(end);
      setCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
      }, 0);
    }
  };

  // Sincronizar scroll entre el textarea y la columna de números de línea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Ejecutar pruebas
  const handleRunTests = async () => {
    setIsRunningTests(true);
    setSyntaxError(null);

    try {
      if (language === 'javascript') {
        // Ejecución segura en el navegador para JS
        let fn: any;
        try {
          // Extraer o evaluar la función
          const fnFactory = new Function(`
            ${code}
            if (typeof calcularBalance === 'function') return calcularBalance;
            if (typeof calcular_balance === 'function') return calcular_balance;
            return null;
          `);
          fn = fnFactory();
        } catch (compErr: any) {
          setSyntaxError(`Error de sintaxis: ${compErr.message}`);
          setIsRunningTests(false);
          return;
        }

        if (!fn || typeof fn !== 'function') {
          setSyntaxError("No se encontró la función 'calcularBalance(movimientos)' definida en tu código.");
          setIsRunningTests(false);
          return;
        }

        const results: TestCaseResult[] = [];
        let passed = 0;

        for (const tc of JS_TEST_CASES) {
          try {
            const rawCopy = JSON.parse(JSON.stringify(tc.input));
            const actual = fn(rawCopy);

            const isMatch = actual && typeof actual === 'object' &&
              Number(actual.total_ingresos || 0) === tc.expected.total_ingresos &&
              Number(actual.total_egresos || 0) === tc.expected.total_egresos &&
              Number(actual.balance_neto || 0) === tc.expected.balance_neto &&
              Number(actual.movimientos_invalidos || 0) === tc.expected.movimientos_invalidos;

            if (isMatch) {
              passed++;
              results.push({
                test_id: tc.id,
                name: tc.name,
                passed: true,
                expected: tc.expected,
                actual
              });
            } else {
              results.push({
                test_id: tc.id,
                name: tc.name,
                passed: false,
                expected: tc.expected,
                actual: actual || 'undefined',
                error: 'El resultado retornado no coincide con los valores esperados.'
              });
            }
          } catch (tErr: any) {
            results.push({
              test_id: tc.id,
              name: tc.name,
              passed: false,
              expected: tc.expected,
              error: `Error al ejecutar: ${tErr.message}`
            });
          }
        }

        setTestResults(results);
        setAllPassed(passed === JS_TEST_CASES.length);
      } else {
        // Ejecutar en backend para Python validando PIN
        const res: RunCodeResponse = await technicalTestService.runCode(code, 'python', accessPin);
        if (res.syntax_error) {
          setSyntaxError(res.syntax_error);
          setTestResults([]);
          setAllPassed(false);
        } else {
          setTestResults(res.details || []);
          setAllPassed(res.all_passed);
        }
      }
    } catch (err: any) {
      setSyntaxError(`Error comunicando con el evaluador: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Entregar solución definitiva
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const timeSpent = (30 * 60) - secondsRemaining;
      const res = await technicalTestService.submitTest({
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone,
        language,
        code,
        access_pin: accessPin,
        time_spent_seconds: Math.max(timeSpent, 10),
        test_results: testResults
      });

      setSubmissionSummary({
        timeSpent,
        passed_tests: res.passed_tests,
        total_tests: res.total_tests
      });

      setTimerActive(false);
      setStage('submitted');

      // Lanzar confeti si pasó todas las pruebas
      if (res.passed_tests === res.total_tests) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      alert(`Error al entregar la prueba: ${err.message || 'Por favor intenta de nuevo'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // PANTALLA 1: REGISTRO / BIENVENIDA
  // -------------------------------------------------------------
  if (stage === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        {/* Glow decorativo de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
        
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Gloint Tech Recruitment
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Evaluación Técnica: Desarrollador Jr
            </h1>
            <p className="text-sm text-slate-400 mt-2">
              Un reto de lógica práctica y estructuras de datos para evaluar tu forma de programar.
            </p>
          </div>

          {/* Tarjeta de instrucciones rápidas */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 mb-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span><strong>Duración recomendada:</strong> 25 a 30 minutos.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <Code2 className="w-4 h-4" />
              </div>
              <span><strong>Lenguaje:</strong> Elige libremente entre Python o JavaScript.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span><strong>Entorno en vivo:</strong> Podrás ejecutar y probar tu solución en tiempo real.</span>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleStartTest} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nombre y Apellidos *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Morales"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Correo Electrónico *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="tu.correo@ejemplo.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Teléfono de Contacto (opcional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+57 300 123 4567"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Código PIN de Acceso a la Prueba *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej: GLOINT-JR-2026"
                  value={accessPin}
                  onChange={(e) => {
                    setAccessPin(e.target.value.toUpperCase());
                    setPinError(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-emerald-400 font-mono font-bold tracking-wider placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors uppercase"
                />
              </div>
              {pinError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  {pinError}
                </p>
              )}
              <p className="text-2xs text-slate-500 mt-1">
                Ingresa el código PIN proporcionado por el equipo de reclutamiento de Gloint.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Lenguaje de programación
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('python')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    language === 'python'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode2 className="w-4 h-4" />
                  Python 3
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('javascript')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    language === 'javascript'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-xs'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-4 h-4" />
                  JavaScript
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Comenzar Evaluación
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PANTALLA 3: COMPLETADA Y ENTREGADA
  // -------------------------------------------------------------
  if (stage === 'submitted') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            ¡Prueba Entregada Exitosamente!
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Muchas gracias por tu tiempo, <strong>{candidateName}</strong>. Tu solución ha sido guardada y certificada en nuestros servidores.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 mb-8 text-left space-y-2.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Candidato:</span>
              <span className="font-semibold text-slate-200">{candidateName}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Correo:</span>
              <span className="font-semibold text-slate-200">{candidateEmail}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Lenguaje utilizado:</span>
              <span className="font-semibold text-emerald-400 uppercase">{language}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Tiempo utilizado:</span>
              <span className="font-semibold text-slate-200">
                {submissionSummary ? `${Math.floor(submissionSummary.timeSpent / 60)}m ${submissionSummary.timeSpent % 60}s` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Casos de prueba superados:</span>
              <span className={`font-bold ${submissionSummary?.passed_tests === submissionSummary?.total_tests ? 'text-emerald-400' : 'text-amber-400'}`}>
                {submissionSummary?.passed_tests} / {submissionSummary?.total_tests} tests
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            El equipo técnico y de reclutamiento de Gloint revisará tu código. Nos pondremos en contacto contigo vía correo electrónico para los siguientes pasos del proceso.
          </p>

          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
          >
            Finalizar y Salir
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PANTALLA 2: ENTORNO DE EVALUACIÓN (SPLIT SCREEN)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barra superior / Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
            G
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Reto Técnico: Balance de Transacciones</h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              {candidateName} ({candidateEmail})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cronómetro */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold tracking-wider ${
              secondsRemaining < 300
                ? 'bg-amber-500/10 border-amber-500 text-amber-400 animate-pulse'
                : 'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}
            title="Tiempo restante"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>

          {/* Botón Entregar Solución */}
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Entregar Solución</span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal (Grid Split: Enunciado vs Editor) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Panel Izquierdo: Enunciado y Reglas (Col 5) */}
        <div className="lg:col-span-5 border-r border-slate-800 bg-slate-900/50 p-6 overflow-y-auto max-h-[calc(100vh-4rem)] space-y-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
              <FileCode2 className="w-3.5 h-3.5" />
              Problema a Resolver
            </div>
            <h3 className="text-xl font-bold text-white">Consolidación de Balance</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Recibes un listado de movimientos de una cuenta bancaria. Tu objetivo es procesar cada movimiento, acumular los totales y filtrar los registros inválidos.
            </p>
          </div>

          {/* Reglas de Negocio */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Reglas de Negocio
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">1</span>
                <span>Solo se suman como válidos los movimientos cuyo tipo sea <code>"ingreso"</code> o <code>"egreso"</code>.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">2</span>
                <span>Un movimiento es <strong>inválido</strong> si su monto es menor o igual a 0, o si su tipo no es soportado. Se deben contar en <code>movimientos_invalidos</code>.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">3</span>
                <span>El balance neto debe calcularse como: <code>total_ingresos - total_egresos</code>.</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold">4</span>
                <span>Si la lista llega vacía <code>[]</code> o nula, debe retornar todos los valores en 0 sin lanzar excepción.</span>
              </li>
            </ul>
          </div>

          {/* Ejemplo de Entrada y Salida */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Ejemplo de Entrada (movimientos):
            </h4>
            <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto">
{`[
  { "id": 1, "tipo": "ingreso", "monto": 1000 },
  { "id": 2, "tipo": "egreso", "monto": 300 },
  { "id": 3, "tipo": "ingreso", "monto": 500 },
  { "id": 4, "tipo": "egreso", "monto": -50 },     // Inválido (monto <= 0)
  { "id": 5, "tipo": "desconocido", "monto": 200 } // Inválido (tipo)
]`}
            </pre>

            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Salida Esperada:
            </h4>
            <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono text-sky-300 overflow-x-auto">
{`{
  "total_ingresos": 1500,
  "total_egresos": 300,
  "balance_neto": 1200,
  "movimientos_invalidos": 2
}`}
            </pre>
          </div>
        </div>

        {/* Panel Derecho: Editor de Código + Consola de Pruebas (Col 7) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 max-h-[calc(100vh-4rem)] overflow-hidden">
          {/* Barra del editor (Selector de Lenguaje + Reset) */}
          <div className="h-11 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Lenguaje:</span>
              <button
                type="button"
                onClick={() => handleLanguageChange('python')}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  language === 'python'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python 3
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('javascript')}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
                  language === 'javascript'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JavaScript
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('¿Deseas reiniciar el código a su estado inicial? Se borrarán tus cambios actuales.')) {
                  setCode(language === 'python' ? PYTHON_STARTER_CODE : JS_STARTER_CODE);
                  setTestResults([]);
                  setSyntaxError(null);
                }
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              title="Restablecer código base"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer</span>
            </button>
          </div>

          {/* Área del Editor de Código */}
          <div className="flex-1 flex overflow-hidden relative bg-slate-950">
            {/* Números de línea */}
            <div
              ref={lineNumbersRef}
              className="w-12 py-4 pl-3 pr-2 bg-slate-950 text-right select-none font-mono text-xs text-slate-600 border-r border-slate-800/80 overflow-hidden shrink-0 leading-6"
            >
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Textarea del editor */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              spellCheck={false}
              className="flex-1 bg-transparent text-slate-100 font-mono text-xs sm:text-sm p-4 leading-6 resize-none focus:outline-hidden overflow-auto whitespace-pre selection:bg-emerald-500/30"
              placeholder="Escribe tu código aquí..."
            />
          </div>

          {/* Consola y Resultados de Pruebas */}
          <div className="border-t border-slate-800 bg-slate-900/80 p-4 shrink-0 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Consola de Pruebas Unitarias
                </span>
                {testResults.length > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-2xs font-bold ${
                      allPassed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {testResults.filter((t) => t.passed).length} / {testResults.length} superadas
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${isRunningTests ? 'animate-spin' : ''}`} />
                <span>{isRunningTests ? 'Ejecutando...' : 'Ejecutar Pruebas'}</span>
              </button>
            </div>

            {/* Error de sintaxis */}
            {syntaxError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono mb-3">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <XCircle className="w-4 h-4" />
                  <span>Error al compilar / ejecutar:</span>
                </div>
                <p className="whitespace-pre-wrap">{syntaxError}</p>
              </div>
            )}

            {/* Sin pruebas ejecutadas aún */}
            {testResults.length === 0 && !syntaxError && (
              <div className="text-center py-4 text-xs text-slate-500">
                Haz clic en <strong>"Ejecutar Pruebas"</strong> para validar tu función contra los 3 casos de prueba del sistema.
              </div>
            )}

            {/* Resultados de los tests */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                      t.passed
                        ? 'bg-emerald-950/20 border-emerald-800/50 text-slate-300'
                        : 'bg-red-950/20 border-red-800/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span>{t.name}</span>
                      </div>
                      <span className={`text-2xs font-bold uppercase ${t.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.passed ? 'Aprobado' : 'Falló'}
                      </span>
                    </div>

                    {!t.passed && (
                      <div className="mt-1 pt-1.5 border-t border-red-900/40 text-2xs font-mono space-y-1">
                        {t.error && <p className="text-red-300">{t.error}</p>}
                        {t.expected && (
                          <p className="text-slate-400">
                            Esperado: <span className="text-emerald-300">{JSON.stringify(t.expected)}</span>
                          </p>
                        )}
                        {t.actual !== undefined && (
                          <p className="text-slate-400">
                            Obtenido: <span className="text-red-300">{JSON.stringify(t.actual)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Entrega */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Entregar solución definitiva?</h3>
                <p className="text-xs text-slate-400">Una vez entregada no podrás realizar más modificaciones.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
              <p><strong>Candidato:</strong> {candidateName}</p>
              <p><strong>Lenguaje:</strong> {language.toUpperCase()}</p>
              <p>
                <strong>Estado de pruebas:</strong>{' '}
                {testResults.length > 0 ? (
                  <span className={allPassed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {testResults.filter((t) => t.passed).length} de {testResults.length} aprobadas
                  </span>
                ) : (
                  <span className="text-slate-500">No ejecutadas</span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Seguir Editando
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar y Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
