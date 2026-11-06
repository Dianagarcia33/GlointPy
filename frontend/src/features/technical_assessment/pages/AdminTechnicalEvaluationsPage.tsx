import React, { useState, useEffect } from 'react';
import {
  Code2,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  FileCode,
  Copy,
  Check,
  Search,
  RefreshCw,
  ExternalLink,
  Terminal,
  X,
  Power,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Edit3
} from 'lucide-react';
import {
  technicalTestService,
  TechnicalSubmission,
  TestConfig
} from '../../../services/technicalTestService';

export const AdminTechnicalEvaluationsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<TechnicalSubmission[]>([]);
  const [config, setConfig] = useState<TestConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<TechnicalSubmission | null>(null);
  const [copied, setCopied] = useState(false);

  // Edición de PIN
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [submissionsData, configData] = await Promise.all([
        technicalTestService.getSubmissions(),
        technicalTestService.getConfig().catch(() => null)
      ]);

      setSubmissions(submissionsData || []);
      if (configData) {
        setConfig(configData);
        setNewPinInput(configData.access_pin);
      }
    } catch (err: any) {
      console.error('Error cargando evaluaciones técnicas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async () => {
    if (!config) return;
    const nextState = !config.is_active;
    const confirmMsg = nextState
      ? '¿Deseas reactivar la prueba técnica para permitir el acceso a candidatos?'
      : '¿Deseas cerrar inmediatamente la prueba técnica? Nadie podrá ingresar ni enviar soluciones.';

    if (!confirm(confirmMsg)) return;

    setIsUpdatingConfig(true);
    try {
      const res = await technicalTestService.updateConfig({ is_active: nextState });
      if (res && res.config) {
        setConfig(res.config);
      } else {
        setConfig((prev) => (prev ? { ...prev, is_active: nextState } : null));
      }
    } catch (err: any) {
      alert(`Error actualizando estado: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput.trim()) return;

    setIsUpdatingConfig(true);
    try {
      const cleanPin = newPinInput.trim().toUpperCase();
      const res = await technicalTestService.updateConfig({ access_pin: cleanPin });
      if (res && res.config) {
        setConfig(res.config);
      } else {
        setConfig((prev) => (prev ? { ...prev, access_pin: cleanPin } : null));
      }
      setIsEditingPin(false);
      alert(`¡PIN actualizado con éxito a: ${cleanPin}!`);
    } catch (err: any) {
      alert(`Error actualizando PIN: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = submissions.filter((s) => {
    const q = searchTerm.toLowerCase();
    return (
      s.candidate_name?.toLowerCase().includes(q) ||
      s.candidate_email?.toLowerCase().includes(q) ||
      s.language?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Code2 className="w-3.5 h-3.5" />
            Reclutamiento Técnico
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Evaluaciones Técnicas Jr
          </h1>
          <p className="text-sm text-slate-500">
            Panel administrativo exclusivo de Gloint para controlar la prueba y evaluar candidatos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/evaluacion-tecnica"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Abrir Enlace de Candidatos</span>
          </a>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* 🛡️ Panel de Blindaje y Seguridad */}
      {config && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Estado del interruptor */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${
                    config.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span className="text-sm font-bold tracking-tight">
                  Recepción de Pruebas:{' '}
                  <span className={config.is_active ? 'text-emerald-400' : 'text-red-400'}>
                    {config.is_active ? 'ABIERTA / ACTIVA' : 'CERRADA / BLOQUEADA'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {config.is_active
                  ? 'Los candidatos con el PIN pueden acceder y realizar la prueba.'
                  : 'Cualquier intento de ingreso o guardado a la base de datos es rechazado automáticamente.'}
              </p>
            </div>

            {/* Controles de PIN y Kill Switch */}
            <div className="flex flex-wrap items-center gap-3">
              {/* PIN Badge & Editor */}
              {!isEditingPin ? (
                <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-700 px-3.5 py-2 rounded-xl text-xs">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-400">PIN Candidatos:</span>
                  <span className="font-mono font-bold text-emerald-300 tracking-wider">
                    {config.access_pin}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingPin(true)}
                    className="p-1 hover:text-emerald-400 text-slate-500 transition-colors ml-1 cursor-pointer"
                    title="Editar PIN"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveNewPin} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.toUpperCase())}
                    className="bg-slate-950 border border-emerald-500 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold uppercase w-36"
                    placeholder="NUEVO PIN"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingConfig}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPin(false);
                      setNewPinInput(config.access_pin);
                    }}
                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                </form>
              )}

              {/* Botón Kill Switch */}
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={isUpdatingConfig}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all shadow-xs cursor-pointer ${
                  config.is_active
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{config.is_active ? 'Cerrar Convocatoria' : 'Abrir Convocatoria'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o lenguaje..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs text-slate-800 bg-slate-50 border-0 rounded-xl focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-400"
          />
        </div>
        <span className="text-xs text-slate-400 pr-2">
          Entregas: <strong>{filtered.length}</strong> / {config?.max_submissions || 20} cupo
        </span>
      </div>

      {/* Tabla de Evaluaciones */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Candidato</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4 text-center">Lenguaje</th>
                <th className="py-3 px-4 text-center">Puntaje Pruebas</th>
                <th className="py-3 px-4 text-center">Integridad / IA</th>
                <th className="py-3 px-4 text-center">Tiempo</th>
                <th className="py-3 px-4">Fecha de Entrega</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {isLoading
                      ? 'Cargando entregas...'
                      : 'No hay entregas registradas aún. Comparte el enlace /evaluacion-tecnica con el PIN con tus candidatos.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const allPassed = s.passed_tests === s.total_tests;
                  const integrity = s.integrity_data;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{s.candidate_name}</div>
                        <div className="text-slate-400 text-2xs">ID #{s.id}</div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{s.candidate_email}</span>
                        </div>
                        {s.candidate_phone && (
                          <div className="text-slate-500 flex items-center gap-1.5 text-2xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{s.candidate_phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-md text-2xs font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {s.language}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold ${
                            allPassed
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {allPassed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-amber-600" />
                          )}
                          <span>
                            {s.passed_tests} / {s.total_tests} superadas
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {integrity ? (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold ${
                              integrity.ai_risk_level === 'high'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : integrity.ai_risk_level === 'medium'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                            title={integrity.ai_risk_reasons?.join(' • ') || ''}
                          >
                            {integrity.ai_risk_level === 'high' ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                <span>Alta Sospecha IA</span>
                              </>
                            ) : integrity.ai_risk_level === 'medium' ? (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                <span>Riesgo Medio</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bajo Riesgo</span>
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-2xs">Sin telemetría</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono text-2xs">
                        {Math.floor((s.time_spent_seconds || 0) / 60)}m {(s.time_spent_seconds || 0) % 60}s
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-2xs">
                        {s.created_at ? new Date(s.created_at).toLocaleString('es-CO') : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(s)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-2xs border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Ver Código
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para ver el código del candidato */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Solución de {selectedSubmission.candidate_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSubmission.candidate_email} • Lenguaje: {selectedSubmission.language.toUpperCase()} • Tiempo:{' '}
                  {Math.floor(selectedSubmission.time_spent_seconds / 60)}m{' '}
                  {selectedSubmission.time_spent_seconds % 60}s
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Desglose de pruebas unitarias */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Pruebas Unitarias ({selectedSubmission.passed_tests}/{selectedSubmission.total_tests})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(selectedSubmission.test_results || []).map((t: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-2xs ${
                        t.passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 mb-1">
                        {t.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                        )}
                        <span>Test #{t.test_id || i + 1}</span>
                      </div>
                      <p className="truncate">{t.name || 'Prueba'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🛡️ Auditoría de Integridad y Detección de IA */}
              {selectedSubmission.integrity_data ? (
                <div
                  className={`p-4 rounded-2xl border ${
                    selectedSubmission.integrity_data.ai_risk_level === 'high'
                      ? 'bg-rose-50/70 border-rose-200'
                      : selectedSubmission.integrity_data.ai_risk_level === 'medium'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-emerald-50/60 border-emerald-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {selectedSubmission.integrity_data.ai_risk_level === 'high' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : selectedSubmission.integrity_data.ai_risk_level === 'medium' ? (
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Auditoría de Integridad y Detección de IA
                      </h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold uppercase tracking-wide self-start sm:self-auto ${
                        selectedSubmission.integrity_data.ai_risk_level === 'high'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : selectedSubmission.integrity_data.ai_risk_level === 'medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {selectedSubmission.integrity_data.ai_risk_level === 'high'
                        ? 'Alta Sospecha de Copiado IA'
                        : selectedSubmission.integrity_data.ai_risk_level === 'medium'
                        ? 'Riesgo Moderado'
                        : 'Bajo Riesgo (Tipeo Humano)'}
                    </span>
                  </div>

                  {/* 4 KPIs de Telemetría */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs mb-3">
                    <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-3xs font-medium">⌨️ Teclas manuales</span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {selectedSubmission.integrity_data.keystrokes_count}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-3xs font-medium">📋 Pegados (Paste)</span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {selectedSubmission.integrity_data.paste_events} veces
                      </span>
                      <span className="text-slate-400 block text-4xs">
                        Máx: {selectedSubmission.integrity_data.max_pasted_length} chars
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-3xs font-medium">🔄 Cambios de pestaña</span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {selectedSubmission.integrity_data.tab_switches} veces
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/90 border border-slate-200 shadow-2xs">
                      <span className="text-slate-400 block text-3xs font-medium">⏱️ Fuera de pantalla</span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        {selectedSubmission.integrity_data.away_seconds}s
                      </span>
                    </div>
                  </div>

                  {/* Razones y Diagnóstico */}
                  {selectedSubmission.integrity_data.ai_risk_reasons && selectedSubmission.integrity_data.ai_risk_reasons.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-200/80">
                      <span className="text-3xs font-bold text-slate-600 uppercase tracking-wider block">
                        Diagnóstico Detallado:
                      </span>
                      <ul className="text-2xs text-slate-700 space-y-1">
                        {selectedSubmission.integrity_data.ai_risk_reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-slate-400 shrink-0">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-2xs text-slate-500 italic">
                  Esta entrega no cuenta con telemetría de integridad registrada (realizada antes de activar el módulo).
                </div>
              )}

              {/* Bloque de código */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Código Entregado
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedSubmission.code)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '¡Copiado!' : 'Copiar código'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto leading-5 max-h-96 border border-slate-800">
                  {selectedSubmission.code}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
