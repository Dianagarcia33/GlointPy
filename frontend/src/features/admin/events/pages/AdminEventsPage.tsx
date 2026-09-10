import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Download, 
  Settings, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  UserCheck, 
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getAdminEventSummary, 
  updateAdminEventConfig, 
  cancelAttendeeRegistration, 
  AdminEventSummary, 
  AttendeeData, 
  EventConfigPayload 
} from '../../../../services/events';

export const AdminEventsPage: React.FC = () => {
  const [summary, setSummary] = useState<AdminEventSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'investor' | 'external'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'in_person' | 'virtual'>('all');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulario de Configuración
  const [formData, setFormData] = useState<EventConfigPayload>({
    title: '',
    description: '',
    event_date: '',
    location: '',
    virtual_url: '',
    capacity_in_person: 100,
    is_active: true,
    banner_active: true
  });

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await getAdminEventSummary();
      setSummary(data);
      if (data.event) {
        // Formato para datetime-local
        let dateVal = '';
        if (data.event.event_date) {
          const d = new Date(data.event.event_date);
          const offset = d.getTimezoneOffset() * 60000;
          const localISO = new Date(d.getTime() - offset).toISOString().slice(0, 16);
          dateVal = localISO;
        }

        setFormData({
          title: data.event.title || '',
          description: data.event.description || '',
          event_date: dateVal,
          location: data.event.location || '',
          virtual_url: data.event.virtual_url || '',
          capacity_in_person: data.event.capacity_in_person || 100,
          is_active: data.event.is_active,
          banner_active: data.event.banner_active
        });
      }
    } catch (err: any) {
      console.error('Error cargando resumen de evento:', err);
      setFeedbackMsg({ type: 'error', text: 'Error al cargar los datos del evento.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    try {
      setSavingConfig(true);
      await updateAdminEventConfig({
        ...formData,
        capacity_in_person: Number(formData.capacity_in_person)
      });
      setFeedbackMsg({ type: 'success', text: '¡Configuración del evento guardada con éxito!' });
      await loadSummary();
    } catch (err: any) {
      console.error('Error guardando configuración:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al guardar la configuración.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCancelAttendee = async (id: number, name: string) => {
    if (!window.confirm(`¿Seguro que deseas cancelar el registro de asistencia de "${name}"? El cupo reservado será liberado.`)) {
      return;
    }
    try {
      setCancellingId(id);
      await cancelAttendeeRegistration(id);
      setFeedbackMsg({ type: 'success', text: `Registro de "${name}" cancelado y cupo liberado.` });
      await loadSummary();
    } catch (err: any) {
      console.error('Error cancelando asistente:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al cancelar registro.' });
    } finally {
      setCancellingId(null);
    }
  };

  const handleExportCSV = () => {
    if (!summary || !summary.attendees.length) return;

    const headers = ['ID', 'Tipo', 'Nombre Completo', 'Email', 'Telefono', 'Documento', 'Ciudad', 'Modalidad', 'Acompanante', 'Nombre Acompanante', 'Cupos Reservados', 'Estado', 'Fecha Registro'];
    const rows = summary.attendees.map(a => [
      a.id,
      a.attendee_type === 'investor' ? 'Inversionista' : 'Invitado Externo',
      `"${a.full_name}"`,
      a.email,
      a.phone || '',
      a.document_id || '',
      `"${a.city || ''}"`,
      a.attendance_mode === 'in_person' ? 'Presencial' : 'Virtual',
      a.has_companion ? 'SI' : 'NO',
      `"${a.companion_name || ''}"`,
      a.seats_reserved,
      a.status,
      a.created_at || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `asistentes_gloint_power_tech_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredAttendees = (summary?.attendees || []).filter(a => {
    if (typeFilter !== 'all' && a.attendee_type !== typeFilter) return false;
    if (modeFilter !== 'all' && a.attendance_mode !== modeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = a.full_name.toLowerCase().includes(q);
      const matchEmail = a.email.toLowerCase().includes(q);
      const matchPhone = a.phone ? a.phone.toLowerCase().includes(q) : false;
      const matchDoc = a.document_id ? a.document_id.toLowerCase().includes(q) : false;
      return matchName || matchEmail || matchPhone || matchDoc;
    }
    return true;
  });

  const percentOccupied = summary?.event.capacity_in_person 
    ? Math.min(100, Math.round((summary.event.occupied_in_person / summary.event.capacity_in_person) * 100))
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-inter animate-in fade-in duration-300">
      
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-bold mb-1 font-montserrat">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Módulo de Presentaciones y Eventos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-montserrat tracking-tight">
            Gloint Power Tech • Gestión de Asistencia
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervisa en tiempo real los cupos presenciales, configura el evento y administra las confirmaciones.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadSummary}
            disabled={loading}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={!summary?.attendees.length}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium animate-in fade-in ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Cards de Aforo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Aforo Total */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Aforo Total</span>
          <p className="text-2xl font-black text-slate-900 font-montserrat mt-1">
            {summary?.event.capacity_in_person || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Cupos configurados</span>
        </div>

        {/* Cupos Ocupados */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cupos Ocupados</span>
          <p className="text-2xl font-black text-brand-600 font-montserrat mt-1">
            {summary?.event.occupied_in_person || 0}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-brand-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentOccupied}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">{percentOccupied}% del aforo ocupado</span>
        </div>

        {/* Cupos Disponibles */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cupos Disponibles</span>
          <p className={`text-2xl font-black font-montserrat mt-1 ${
            (summary?.event.available_in_person || 0) <= 5 ? 'text-rose-600' : 'text-emerald-600'
          }`}>
            {summary?.event.available_in_person ?? 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {(summary?.event.available_in_person ?? 0) <= 0 ? 'Aforo Agotado' : 'Asientos libres'}
          </span>
        </div>

        {/* Asistentes Virtuales */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Modalidad Virtual</span>
          <p className="text-2xl font-black text-indigo-600 font-montserrat mt-1">
            {summary?.virtual_attendees || 0}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Transmisión online</span>
        </div>

        {/* Total General */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Confirmados</span>
          <p className="text-2xl font-black text-slate-900 font-montserrat mt-1">
            {summary?.total_attendees || 0}
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {summary?.investor_attendees || 0} inv. • {summary?.external_attendees || 0} externos
          </span>
        </div>

      </div>

      {/* Grid: Configuración + Tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Card: Configuración del Evento */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-montserrat">Configuración de Gloint Power Tech</h2>
              <p className="text-[11px] text-slate-500">Parámetros y visibilidad del evento</p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
            
            <div>
              <label className="font-bold text-slate-700 block mb-1">Título del Evento</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Aforo Máximo Presencial (Cupos)</label>
              <input
                type="number"
                min={1}
                required
                value={formData.capacity_in_person}
                onChange={(e) => setFormData({ ...formData, capacity_in_person: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Al agotarse, el sistema solo ofrecerá modalidad virtual automáticamente.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Lugar / Dirección</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Auditorio Principal • Ciudad"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Enlace Transmisión Virtual (Opcional)</label>
              <input
                type="url"
                value={formData.virtual_url}
                onChange={(e) => setFormData({ ...formData, virtual_url: e.target.value })}
                placeholder="https://meet.gloint.com.co/..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Toggles */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              
              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Banner Visible</span>
                  <span className="text-[10px] text-slate-500 block">Mostrar banner en login y dashboard</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.banner_active}
                  onChange={(e) => setFormData({ ...formData, banner_active: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer">
                <div>
                  <span className="font-bold text-slate-800 block">Inscripciones Abiertas</span>
                  <span className="text-[10px] text-slate-500 block">Permitir nuevas confirmaciones</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                />
              </label>

            </div>

            <button
              type="submit"
              disabled={savingConfig}
              className="w-full mt-3 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl text-xs shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 font-montserrat"
            >
              {savingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>

          </form>

        </div>

        {/* Card: Tabla de Asistentes */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-montserrat">
                Listado de Asistentes ({filteredAttendees.length})
              </h2>
              <p className="text-[11px] text-slate-500">Inversionistas e invitados registrados</p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Filtro Tipo */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">Todos los Tipos</option>
                <option value="investor">Inversionistas</option>
                <option value="external">Invitados Externos</option>
              </select>

              {/* Filtro Modalidad */}
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="all">Todas las Modalidades</option>
                <option value="in_person">Presenciales</option>
                <option value="virtual">Virtuales</option>
              </select>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, teléfono o cédula..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Asistente</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Acompañante</th>
                  <th className="px-4 py-3">Cupos</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No se encontraron asistentes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Asistente */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{att.full_name}</div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                          att.attendee_type === 'investor'
                            ? 'bg-brand-50 text-brand-700 border border-brand-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {att.attendee_type === 'investor' ? 'Inversionista' : 'Invitado Externo'}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="px-4 py-3 space-y-0.5">
                        <div className="text-slate-900">{att.email}</div>
                        {att.phone && <div className="text-[11px] text-slate-400">{att.phone}</div>}
                        {att.city && <div className="text-[10px] text-slate-400">{att.city}</div>}
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          att.attendance_mode === 'in_person'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {att.attendance_mode === 'in_person' ? (
                            <>
                              <MapPin className="w-3 h-3 text-amber-600" />
                              <span>Presencial</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-3 h-3 text-indigo-600" />
                              <span>Virtual</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Acompañante */}
                      <td className="px-4 py-3">
                        {att.has_companion ? (
                          <div>
                            <span className="font-bold text-slate-900 text-xs">Sí</span>
                            {att.companion_name && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                {att.companion_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>

                      {/* Cupos Reservados */}
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          {att.seats_reserved}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        {att.status === 'confirmed' ? (
                          <button
                            type="button"
                            disabled={cancellingId === att.id}
                            onClick={() => handleCancelAttendee(att.id, att.full_name)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Cancelar asistencia y liberar cupos"
                          >
                            {cancellingId === att.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                            Cancelado
                          </span>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};
