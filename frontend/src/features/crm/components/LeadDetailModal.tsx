import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  DollarSign, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  Trophy, 
  MessageSquare, 
  Send,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { crmService, CRMLead, CRMActivity, CRMLeadStage } from '../../../services/crmService';

interface LeadDetailModalProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Formulario nueva actividad
  const [actType, setActType] = useState<'nota' | 'llamada' | 'reunion' | 'tarea'>('nota');
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [addingAct, setAddingAct] = useState(false);

  // Modificar etapa
  const [currentStage, setCurrentStage] = useState<CRMLeadStage>('lead_entrante');
  const [lossReason, setLossReason] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  // Convertir a Venta
  const [converting, setConverting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (lead && isOpen) {
      setCurrentStage(lead.stage);
      fetchActivities(lead.id);
    }
  }, [lead, isOpen]);

  const fetchActivities = async (leadId: number) => {
    try {
      setLoadingActivities(true);
      const data = await crmService.getLeadActivities(leadId);
      setActivities(data);
    } catch (err: any) {
      console.error('Error al cargar actividades:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  if (!isOpen || !lead) return null;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleStageChange = async (newStage: CRMLeadStage) => {
    try {
      setUpdatingStage(true);
      await crmService.updateLeadStage(lead.id, {
        stage: newStage,
        loss_reason: newStage === 'perdido' ? lossReason : undefined
      });
      setCurrentStage(newStage);
      showToast('Etapa del prospecto actualizada', 'success');
      onUpdate();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar etapa', 'error');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    try {
      setAddingAct(true);
      await crmService.addLeadActivity(lead.id, {
        type: actType,
        title: actTitle.trim(),
        description: actDesc.trim() || undefined
      });
      setActTitle('');
      setActDesc('');
      fetchActivities(lead.id);
      showToast('Actividad registrada correctamente', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al registrar actividad', 'error');
    } finally {
      setAddingAct(false);
    }
  };

  const handleConvertToSale = async () => {
    if (!lead.document_id) {
      alert('Para registrar la venta comercial, por favor ingresa primero el documento de identidad del prospecto.');
      return;
    }

    if (!window.confirm(`¿Confirmas la conversión del prospecto "${lead.name}" a Cierre Ganado y Registro de Venta Comercial por $${lead.estimated_amount.toLocaleString('es-CO')} COP?`)) {
      return;
    }

    try {
      setConverting(true);
      await crmService.convertLeadToSale(lead.id);
      showToast('¡Venta comercial registrada y prospecto marcado como Cierre Ganado!', 'success');
      onUpdate();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error al convertir a venta comercial', 'error');
    } finally {
      setConverting(false);
    }
  };

  const stagesList: { key: CRMLeadStage; label: string; color: string }[] = [
    { key: 'lead_entrante', label: 'Lead Entrante', color: 'bg-slate-100 text-slate-700' },
    { key: 'contactado', label: 'Contactado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'cita_presentacion', label: 'Presentación', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { key: 'negociacion', label: 'Negociación', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'cierre_ganado', label: 'Cierre Ganado 🏆', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'perdido', label: 'Perdido ❌', color: 'bg-rose-50 text-rose-700 border-rose-200' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-amber-400 flex items-center justify-center font-extrabold text-white text-lg shadow-sm font-montserrat">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold font-montserrat">{lead.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5 font-sans">
                <span>Monto Estimado: <strong className="font-mono text-emerald-400">${lead.estimated_amount.toLocaleString('es-CO')} COP</strong></span>
                <span>•</span>
                <span>Origen: {lead.source || 'Directo'}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notificación */}
        {toast && (
          <div className={`p-3 text-xs font-semibold text-center font-montserrat ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {toast.message}
          </div>
        )}

        {/* Body dividido en 2 columnas */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50/30">
          
          {/* Columna Izquierda: Datos & Etapa (1 col) */}
          <div className="p-6 space-y-6 bg-white">
            {/* Botón de Acción Principal: Convertir a Venta */}
            {lead.stage !== 'cierre_ganado' ? (
              <button
                onClick={handleConvertToSale}
                disabled={converting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 font-montserrat cursor-pointer"
              >
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                <span>Convertir a Venta Comercial</span>
              </button>
            ) : (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 font-montserrat">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Cierre Ganado y Convertido!</span>
              </div>
            )}

            {/* Selector de Etapa */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-montserrat">Etapa del Pipeline</label>
              <div className="space-y-1.5">
                {stagesList.map((st) => (
                  <button
                    key={st.key}
                    onClick={() => handleStageChange(st.key)}
                    disabled={updatingStage}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border transition-all font-montserrat cursor-pointer ${
                      currentStage === st.key 
                        ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/50 text-slate-900' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>{st.label}</span>
                    {currentStage === st.key && <CheckCircle2 className="w-4 h-4 text-brand-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Datos de Contacto */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat">Datos de Contacto</h4>
              
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{lead.phone || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">{lead.email || 'Sin correo'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="font-semibold">Cédula: {lead.document_id || 'Sin registrar'}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>Asesor: <strong className="font-montserrat">{lead.commercial_name}</strong></span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Timeline & Actividades (2 cols) */}
          <div className="p-6 md:col-span-2 space-y-4 flex flex-col h-full bg-slate-50/50">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-montserrat">Historial & Actividades</h4>

            {/* Formulario Agregar Nota/Actividad */}
            <form onSubmit={handleAddActivity} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={actType}
                  onChange={(e: any) => setActType(e.target.value)}
                  className="bg-slate-100 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none font-montserrat"
                >
                  <option value="nota">📝 Nota</option>
                  <option value="llamada">📞 Llamada</option>
                  <option value="reunion">🤝 Reunión</option>
                  <option value="tarea">📌 Tarea</option>
                </select>
                <input
                  type="text"
                  placeholder="Título de la nota o tarea..."
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="flex-1 bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Detalles adicionales u observaciones (opcional)..."
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  className="flex-1 bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500 font-sans"
                />
                <button
                  type="submit"
                  disabled={addingAct || !actTitle.trim()}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 disabled:opacity-40 font-montserrat cursor-pointer"
                >
                  {addingAct ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Guardar</span>
                </button>
              </div>
            </form>

            {/* Timeline de Actividades */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loadingActivities ? (
                <div className="p-8 text-center text-xs text-slate-400 font-sans">Cargando actividades...</div>
              ) : activities.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-sans">No hay actividades registradas aún.</div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-brand-50 text-brand-600 font-bold text-xs flex-shrink-0">
                      {a.type === 'llamada' ? '📞' : a.type === 'reunion' ? '🤝' : a.type === 'tarea' ? '📌' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-900 font-montserrat">{a.title}</h5>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {a.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">{a.description}</p>}
                      <span className="text-[10px] text-slate-400 block mt-1 font-semibold">Por: {a.user_name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
