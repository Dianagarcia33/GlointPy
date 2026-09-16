import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Key, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Globe, 
  Code2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FolderKanban,
  Send,
  ExternalLink,
  Power
} from 'lucide-react';
import { crmService, CRMFormKey, CRMProject } from '../../../services/crmService';

interface CRMFormKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: CRMProject[];
}

export const CRMFormKeysModal: React.FC<CRMFormKeysModalProps> = ({
  isOpen,
  onClose,
  projects
}) => {
  const queryClient = useQueryClient();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedKeyForSnippet, setSelectedKeyForSnippet] = useState<CRMFormKey | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Form Keys
  const { data: formKeys = [], isLoading } = useQuery<CRMFormKey[]>({
    queryKey: ['crm_form_keys'],
    queryFn: () => crmService.getFormKeys(),
    enabled: isOpen
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; project_id: number }) => crmService.createFormKey(data),
    onSuccess: (newKey) => {
      queryClient.invalidateQueries({ queryKey: ['crm_form_keys'] });
      setFormName('');
      setSelectedProjectId('');
      setShowCreateForm(false);
      setSelectedKeyForSnippet(newKey);
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Error al generar la clave de formulario.');
    }
  });

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: (id: number) => crmService.toggleFormKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_form_keys'] });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteFormKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm_form_keys'] });
      if (selectedKeyForSnippet) setSelectedKeyForSnippet(null);
    }
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Por favor ingresa un nombre para el formulario o landing.');
      return;
    }
    if (!selectedProjectId) {
      setFormError('Por favor selecciona el proyecto de destino.');
      return;
    }

    createMutation.mutate({
      name: formName.trim(),
      project_id: Number(selectedProjectId)
    });
  };

  if (!isOpen) return null;

  const activeSnippetKey = selectedKeyForSnippet || formKeys[0] || null;
  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://app.gloint.co';
  const apiEndpointUrl = `${currentHost}/api/v1/crm/public/contact-form`;

  const generateSnippet = (key: string, projName: string) => `// ========================================================
// Conexión Formulario Externo -> CRM Gloint
// Proyecto Destino: ${projName}
// ========================================================
async function enviarFormulario(datos) {
  try {
    const respuesta = await fetch("${apiEndpointUrl}", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "${key}"
      },
      body: JSON.stringify({
        nombre: datos.nombre,       // Nombre completo del interesado
        email: datos.email,         // Correo electrónico
        telefono: datos.telefono,   // Teléfono o WhatsApp
        asunto: datos.asunto,       // Motivo o servicio de interés
        mensaje: datos.mensaje      // Contenido del mensaje
      })
    });

    const data = await respuesta.json();
    if (data.success) {
      console.log("Lead asignado al directivo de inversión:", data.assigned_director);
      alert("¡Gracias por contactarnos! Tu asesor se comunicará pronto.");
    } else {
      alert(data.message || "Error al enviar el formulario.");
    }
  } catch (error) {
    console.error("Error de conexión con Gloint:", error);
  }
}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl text-amber-600 flex items-center justify-center shadow-xs">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold font-montserrat text-slate-900 tracking-tight flex items-center gap-2">
                <span>Claves de Formularios Web Externos</span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold uppercase tracking-wider">
                  CRM Directivos
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Genera API Keys para captar prospectos desde cualquier web externa y distribuirlos equitativamente entre los Directivos de Inversión.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="text-xs font-bold text-slate-900 font-montserrat">
                Formularios Registrados ({formKeys.length})
              </div>
              <div className="text-[11px] text-slate-500">
                Cada clave vincula automáticamente los prospectos al proyecto correspondiente.
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setFormError(null);
              }}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all font-montserrat cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{showCreateForm ? 'Cancelar' : 'Generar Nueva Clave'}</span>
            </button>
          </div>

          {/* Creation Form (Collapsible) */}
          {showCreateForm && (
            <div className="bg-white p-5 rounded-2xl border-2 border-brand-200 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-brand-600 font-bold text-xs font-montserrat uppercase tracking-wider">
                <Globe className="w-4 h-4" />
                <span>Registrar Nuevo Formulario de Proyecto</span>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nombre del Formulario o Landing <span className="text-brand-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Landing Logy Pay Principal"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Proyecto CRM de Destino <span className="text-brand-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="">Selecciona un proyecto...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    <span>Generar Clave API</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Keys List */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
              <span>Cargando claves de formularios...</span>
            </div>
          ) : formKeys.length === 0 ? (
            <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto border border-amber-100">
                <Key className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800 font-montserrat">
                Aún no tienes Claves de Formularios generadas
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Crea una clave para conectar la primera landing page o web externa de tus proyectos.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                + Generar primera clave
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formKeys.map((keyItem) => {
                const isSelectedForSnippet = selectedKeyForSnippet?.id === keyItem.id;

                return (
                  <div
                    key={keyItem.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isSelectedForSnippet ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 font-montserrat">
                          {keyItem.name}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-lg font-mono font-bold">
                          {keyItem.project_name} ({keyItem.project_code})
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                            keyItem.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {keyItem.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>

                      {/* API Key Box */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 font-bold max-w-sm truncate select-all">
                          {keyItem.api_key}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(keyItem.api_key, `key-${keyItem.id}`)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                          title="Copiar API Key"
                        >
                          {copiedKey === `key-${keyItem.id}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => setSelectedKeyForSnippet(keyItem)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelectedForSnippet
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Ver Código</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(keyItem.id)}
                        disabled={toggleMutation.isPending}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          keyItem.is_active
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            : 'text-slate-400 bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                        title={keyItem.is_active ? 'Desactivar clave' : 'Activar clave'}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar la clave para "${keyItem.name}"? Los formularios que la usen ya no podrán registrar leads.`)) {
                            deleteMutation.mutate(keyItem.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Eliminar clave"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Integration Snippet Box */}
          {activeSnippetKey && (
            <div className="bg-slate-900 rounded-2xl p-5 text-slate-200 space-y-3 shadow-lg border border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-xs font-montserrat text-white">
                    Código de Integración para: <strong className="text-amber-400">{activeSnippetKey.name}</strong>
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(generateSnippet(activeSnippetKey.api_key, activeSnippetKey.project_name), 'snippet')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedKey === 'snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Código</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed">
                Entrega este código al programador o responsable de la landing. Envía exactamente los mismos campos que el formulario oficial de Gloint.
              </div>

              <pre className="p-4 bg-slate-950/80 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto border border-slate-800/80 leading-relaxed select-all">
                {generateSnippet(activeSnippetKey.api_key, activeSnippetKey.project_name)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
