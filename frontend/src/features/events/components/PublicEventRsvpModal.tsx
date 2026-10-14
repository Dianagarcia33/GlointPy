import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Video, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar, 
  Clock, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck,
  Building2,
  Briefcase,
  FileText,
  Check
} from 'lucide-react';
import { 
  getActiveEvent, 
  registerPublicAttendee, 
  EventData, 
  AttendeeData 
} from '../../../services/events';
import { useColombiaCities } from '../../../hooks/useColombiaCities';
import { GoogleAutofillButton, GoogleUserData } from '../../../components/common/GoogleAutofillButton';
import { AVAILABLE_INTEREST_OPTIONS } from '../../landing_v2/components/EventRegistrationSection';
import { triggerRsvpConfetti } from '../../../utils/confetti';

interface PublicEventRsvpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (attendee: AttendeeData) => void;
}

export const PublicEventRsvpModal: React.FC<PublicEventRsvpModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUserData | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [documentId, setDocumentId] = useState('');

  // Datos de Empresa
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyNit, setCompanyNit] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Opciones de Interés
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [attendanceMode, setAttendanceMode] = useState<'in_person' | 'virtual'>('in_person');
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionName, setCompanionName] = useState('');
  const [loading, setLoading] = useState(false);
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
    reset: resetCities,
  } = useColombiaCities();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEvent();
    }
  }, [isOpen]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const ev = await getActiveEvent();
      setEventData(ev);
      if (ev?.is_full_in_person) {
        setAttendanceMode('virtual');
      }
    } catch (err: any) {
      console.error('Error cargando evento:', err);
      setError('No se pudo cargar la información del evento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError('Por favor ingresa tu nombre completo y correo electrónico.');
      return;
    }

    if (!phone.trim()) {
      setError('El número de WhatsApp / Teléfono es obligatorio.');
      return;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    if (!/^(\+?57)?3\d{9}$/.test(cleanPhone)) {
      setError('El teléfono debe ser un número celular colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).');
      return;
    }

    if (isCompany) {
      if (!companyName.trim()) {
        setError('Por favor ingresa el nombre o razón social de la empresa.');
        return;
      }
      if (!companyNit.trim()) {
        setError('Por favor ingresa el NIT o RUT de la empresa.');
        return;
      }
      if (!jobTitle.trim()) {
        setError('Por favor ingresa tu cargo en la empresa.');
        return;
      }
    }

    if (documentId.trim()) {
      const cleanDoc = documentId.trim();
      if (!/^[a-zA-Z0-9]{5,20}$/.test(cleanDoc)) {
        setError('El número de documento debe contener entre 5 y 20 caracteres alfanuméricos.');
        return;
      }
    }

    if (attendanceMode === 'in_person' && eventData) {
      const seatsNeeded = hasCompanion ? 2 : 1;
      if (eventData.available_in_person < seatsNeeded) {
        setError(`Lo sentimos, solo quedan ${eventData.available_in_person} cupos presenciales disponibles. Te invitamos a registrarte en modalidad Virtual.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await registerPublicAttendee({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: cleanPhone,
        city: finalCity.trim() || undefined,
        document_id: documentId.trim() || undefined,
        is_company: isCompany,
        company_name: isCompany ? companyName.trim() : undefined,
        company_nit: isCompany ? companyNit.trim() : undefined,
        job_title: isCompany ? jobTitle.trim() : undefined,
        interests: selectedInterests.length > 0 ? selectedInterests : undefined,
        attendance_mode: attendanceMode,
        has_companion: attendanceMode === 'in_person' ? hasCompanion : false,
        companion_name: (attendanceMode === 'in_person' && hasCompanion) ? companionName.trim() : undefined,
      });

      triggerRsvpConfetti();
      setSuccess(true);
      if (onSuccess) onSuccess(res);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 3500);
    } catch (err: any) {
      console.error('Error al registrar asistente:', err);
      setError(err.message || 'Ocurrió un error al procesar tu inscripción.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = eventData?.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('es-CO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : 'Próximamente';

  const formattedTime = eventData?.event_date
    ? new Date(eventData.event_date).toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '18:00 COT';

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto font-inter">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Cargando detalles del evento...</p>
          </div>
        ) : success ? (
          <div className="py-10 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 font-montserrat">
              ¡Inscripción Confirmada!
            </h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Te hemos registrado con éxito para <strong>Gloint Power Tech</strong> en modalidad{' '}
              <strong className="capitalize">{attendanceMode === 'in_person' ? 'Presencial' : 'Virtual'}</strong>.
            </p>
            <p className="text-xs text-slate-400">
              Hemos enviado los detalles a <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Header */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-bold mb-3 font-montserrat">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Registro Abierto • Invitados Especiales</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 font-montserrat tracking-tight">
                {eventData?.title || 'Gloint Power Tech'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Acompáñanos a la presentación oficial de los nuevos productos del ecosistema Gloint.
              </p>
            </div>

            {/* Ficha Evento */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="capitalize">{formattedDate}</span>
                <span className="text-slate-300">•</span>
                <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="truncate">{eventData?.location || 'Auditorio Principal Gloint • Bogotá'}</span>
              </div>
            </div>

            {/* Cupos Badge */}
            {eventData && (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                eventData.is_full_in_person 
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <div className="flex items-center gap-2 font-medium">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {eventData.is_full_in_person 
                      ? 'Cupos presenciales agotados (disponible Online)' 
                      : `Aforo presencial: ${eventData.available_in_person} cupos disponibles`}
                  </span>
                </div>
                {!eventData.is_full_in_person && (
                  <span className="font-bold text-emerald-700 font-mono text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-300">
                    {eventData.available_in_person} libres
                  </span>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}



            {/* Datos Personales Compactos */}
            <div className="space-y-2.5">
              {/* Fila 1: Nombre y Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal_fullname" className="text-[11px] font-bold text-slate-700 block mb-1">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      id="modal_fullname"
                      name="name"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Carlos Mendoza"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal_email" className="text-[11px] font-bold text-slate-700 block mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      id="modal_email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@correo.com"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Fila 2: WhatsApp y Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="modal_phone" className="text-[11px] font-bold text-slate-700 block mb-1">
                    Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      id="modal_phone"
                      name="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ej. 3001234567"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal_doc" className="text-[11px] font-bold text-slate-700 block mb-1">
                    Documento <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    id="modal_doc"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    placeholder="Cédula o Pasaporte"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              </div>

              {/* Fila 3: Departamento y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Departamento</span>
                    {loadingDepartments && <span className="text-[9px] text-brand-600 font-normal">Cargando...</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <select
                      id="modal_department"
                      name="address-level1"
                      autoComplete="address-level1"
                      value={selectedDepartmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={loadingDepartments}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <option value="">{loadingDepartments ? 'Cargando...' : 'Selecciona...'}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Ciudad</span>
                    {loadingCities && <span className="text-[9px] text-brand-600 font-normal">Cargando...</span>}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <select
                      id="modal_city"
                      name="address-level2"
                      autoComplete="address-level2"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      disabled={!selectedDepartmentId || loadingCities}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer disabled:opacity-60"
                    >
                      <option value="">
                        {loadingCities 
                          ? 'Cargando...' 
                          : (!selectedDepartmentId ? 'Elige departamento...' : 'Selecciona...')}
                      </option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedCity === 'Otra' && (
                <div>
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Escribe el nombre de tu ciudad *"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
              )}

              {/* Fila 4: Tipo de Registro - Segmented Pill Control */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Tipo de Registro <span className="text-rose-500">*</span>
                </label>
                <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCompany(false)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      !isCompany
                        ? "bg-white text-slate-900 shadow-2xs font-montserrat"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <User className={`w-3.5 h-3.5 ${!isCompany ? "text-brand-600" : ""}`} />
                    <span>Persona Natural</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCompany(true)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCompany
                        ? "bg-white text-slate-900 shadow-2xs font-montserrat"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isCompany ? "text-brand-600" : ""}`} />
                    <span>Empresa</span>
                  </button>
                </div>
              </div>

              {/* Campos de Empresa compactos (3 columnas) */}
              {isCompany && (
                <div className="p-2.5 bg-brand-50/40 border border-brand-200/80 rounded-xl space-y-1.5 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="modal_company_name" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        Empresa / Razón Social <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="modal_company_name"
                          required={isCompany}
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ej. Gloint S.A.S."
                          className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="modal_company_nit" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        NIT / RUT <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="modal_company_nit"
                          required={isCompany}
                          value={companyNit}
                          onChange={(e) => setCompanyNit(e.target.value)}
                          placeholder="Ej. 901.234.567-8"
                          className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="modal_job_title" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                        Cargo <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="modal_job_title"
                          required={isCompany}
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="Ej. Gerente"
                          className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fila 5: Áreas de Interés (Chips compactos) */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Áreas de Interés <span className="text-slate-400 text-[10px] font-normal lowercase">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_INTEREST_OPTIONS.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedInterests(selectedInterests.filter((i) => i !== interest));
                          } else {
                            setSelectedInterests([...selectedInterests, interest]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-brand-500 border-brand-500 text-white font-bold shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selector de Modalidad Compacto */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Modalidad de Asistencia <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={eventData?.is_full_in_person}
                  onClick={() => setAttendanceMode('in_person')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    attendanceMode === 'in_person'
                      ? 'bg-brand-50/50 border-brand-500 ring-1 ring-brand-500/20 text-slate-900 shadow-2xs'
                      : eventData?.is_full_in_person
                        ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span className="font-montserrat">Presencial</span>
                  </div>
                  {eventData?.is_full_in_person ? (
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full">
                      Agotado
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-mono">
                      Libre
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttendanceMode('virtual');
                    setHasCompanion(false);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    attendanceMode === 'virtual'
                      ? 'bg-brand-50/50 border-brand-500 ring-1 ring-brand-500/20 text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="font-montserrat">Virtual</span>
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    Online
                  </span>
                </button>
              </div>
            </div>

            {/* Acompañante */}
            {attendanceMode === 'in_person' && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 text-xs animate-in fade-in">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCompanion}
                    onChange={(e) => setHasCompanion(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded-md border-slate-300 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="font-bold text-slate-800 font-montserrat">
                    Asistiré con un acompañante (Reserva 2 cupos)
                  </span>
                </label>

                {hasCompanion && (
                  <input
                    type="text"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Nombre completo del acompañante (Opcional)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                )}
              </div>
            )}

            {/* Botones */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || (attendanceMode === 'in_person' && Boolean(eventData?.is_full_in_person))}
                className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 font-montserrat"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inscribiendo...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Inscripción</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>,
    document.body
  );
};
