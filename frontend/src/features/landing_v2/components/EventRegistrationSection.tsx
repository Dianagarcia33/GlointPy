import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Video, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  FileText,
  Check
} from "lucide-react";
import { getActiveEvent, registerPublicAttendee, EventData } from "../../../services/events";
import { useColombiaCities } from "../../../hooks/useColombiaCities";
import { GoogleAutofillButton, GoogleUserData } from "../../../components/common/GoogleAutofillButton";
import { DARK, DARK2, GOLD, ORANGE } from "../utils/constants";
import { Badge } from "./Badge";
import { triggerRsvpConfetti } from "../../../utils/confetti";

export const AVAILABLE_INTEREST_OPTIONS = [
  "Inversión y Capital (Perfil Inversionista)",
  "Logística, Transporte y Última Milla",
  "Tecnología y Fábrica de Software",
  "Soluciones Fintech y Billeteras Digitales",
];

export function EventRegistrationSection() {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUserData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
  
  // Datos de Empresa
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyNit, setCompanyNit] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  
  // Opciones de Interés
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [attendanceMode, setAttendanceMode] = useState<"in_person" | "virtual">("in_person");
  const [hasCompanion, setHasCompanion] = useState(false);
  const [companionName, setCompanionName] = useState("");
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
    getActiveEvent()
      .then((data) => {
        setEventData(data);
        if (data?.is_full_in_person) {
          setAttendanceMode("virtual");
        }
      })
      .catch((err) => console.warn("Error cargando evento en landing:", err));
  }, []);

  if (!eventData || !eventData.is_active) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Por favor completa tu nombre y correo electrónico.");
      return;
    }

    if (!phone.trim()) {
      setError("El número de WhatsApp / Teléfono es obligatorio.");
      return;
    }

    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    if (!/^(\+?57)?3\d{9}$/.test(cleanPhone)) {
      setError("El teléfono debe ser un número celular colombiano válido de 10 dígitos (ej. 3001234567 o +573001234567).");
      return;
    }

    if (isCompany) {
      if (!companyName.trim()) {
        setError("Por favor ingresa el nombre o razón social de la empresa.");
        return;
      }
      if (!companyNit.trim()) {
        setError("Por favor ingresa el NIT o RUT de la empresa.");
        return;
      }
      if (!jobTitle.trim()) {
        setError("Por favor ingresa tu cargo en la empresa.");
        return;
      }
    }

    if (documentId.trim()) {
      const cleanDoc = documentId.trim();
      if (!/^[a-zA-Z0-9]{5,20}$/.test(cleanDoc)) {
        setError("El número de documento debe contener entre 5 y 20 caracteres alfanuméricos.");
        return;
      }
    }

    if (attendanceMode === "in_person") {
      const seatsNeeded = hasCompanion ? 2 : 1;
      if (eventData.available_in_person < seatsNeeded) {
        setError(`Lo sentimos, solo quedan ${eventData.available_in_person} cupos presenciales disponibles. Te invitamos a participar en modalidad Virtual.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      await registerPublicAttendee({
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
        has_companion: attendanceMode === "in_person" ? hasCompanion : false,
        companion_name: (attendanceMode === "in_person" && hasCompanion) ? companionName.trim() : undefined,
      });

      triggerRsvpConfetti();
      setSuccess(true);
      // Refrescar datos de cupos
      const updated = await getActiveEvent();
      setEventData(updated);
    } catch (err: any) {
      console.error("Error al registrar asistente:", err);
      setError(err.message || "Ocurrió un error al procesar tu registro.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = eventData.event_date 
    ? new Date(eventData.event_date).toLocaleDateString("es-CO", { 
        weekday: "long", 
        year: "numeric", 
        month: "long", 
        day: "numeric" 
      })
    : "Próximamente";

  const formattedTime = eventData.event_date
    ? new Date(eventData.event_date).toLocaleTimeString("es-CO", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })
    : "18:00 COT";

  return (
    <section id="gloint-power-tech" className="py-24 relative overflow-hidden font-inter bg-gradient-to-b from-slate-50 via-white to-slate-50 border-y border-slate-200/80">
      
      {/* Glow ambiental sutil */}
      <div 
        className="absolute top-1/2 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
      />
      <div 
        className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Columna Izquierda: Información del Evento */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold font-montserrat shadow-xs">
              <Sparkles size={14} className="text-amber-500" />
              <span>Gran Lanzamiento Tecnológico</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-montserrat tracking-tight leading-tight">
              {eventData.title}
            </h2>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {eventData.description || "Descubre de primera mano los nuevos productos, ecosistemas digitales y tecnologías de alto impacto que transformarán el modelo de inversión y comercio en Gloint."}
            </p>

            {/* Ficha rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-1 shadow-xs hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold font-montserrat uppercase">
                  <Calendar size={15} />
                  <span>Fecha</span>
                </div>
                <p className="text-slate-900 text-xs font-semibold capitalize">{formattedDate}</p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Clock size={12} /> {formattedTime}
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-1 shadow-xs hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2 text-amber-600 text-xs font-bold font-montserrat uppercase">
                  <MapPin size={15} />
                  <span>Ubicación</span>
                </div>
                <p className="text-slate-900 text-xs font-semibold">{eventData.location?.split('•')[0] || 'Auditorio Principal'}</p>
                <p className="text-slate-500 text-[11px] truncate">{eventData.location?.split('•')[1] || 'Bogotá, Colombia'}</p>
              </div>
            </div>

            {/* Aforo presencial monitor */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${
              eventData.is_full_in_person
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2.5 font-medium">
                <Users size={18} className="shrink-0 text-emerald-600" />
                <span>
                  {eventData.is_full_in_person
                    ? 'Aforo presencial completo. Puedes asegurar tu cupo en transmisión Virtual.'
                    : `Quedan ${eventData.available_in_person} cupos presenciales disponibles (Aforo de ${eventData.capacity_in_person}).`}
                </span>
              </div>
              {!eventData.is_full_in_person && (
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0 font-mono text-[11px]">
                  {eventData.available_in_person} disponibles
                </span>
              )}
            </div>

            {/* Beneficios */}
            <div className="space-y-2.5 pt-2 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Presentación en vivo del nuevo portafolio de productos Gloint.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Espacio de networking y coctel para asistentes presenciales.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Transmisión interactiva en alta definición con sala de preguntas.</span>
              </div>
            </div>

          </div>

          {/* Columna Derecha: Formulario para No Inversionistas */}
          <div className="lg:col-span-6">
            
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-200/60 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              
              <div className="mb-4 relative z-10">
                <span className="text-[10px] font-bold text-amber-600 font-montserrat uppercase tracking-wider block">
                  Registro Abierto al Público
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-montserrat mt-0.5">
                  Confirma tu Asistencia Gratis
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Si no eres inversionista registrado, diligencia tus datos para reservar tu cupo oficial.
                </p>
              </div>

              {success ? (
                <div className="py-10 text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 font-montserrat">
                    ¡Registro Exitoso!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Hemos reservado tu lugar para <strong>Gloint Power Tech</strong> en modalidad{" "}
                    <strong className="text-amber-600 capitalize">{attendanceMode === "in_person" ? "Presencial" : "Virtual"}</strong>.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Recibirás las instrucciones de acceso y confirmación en <strong>{email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccess(false);
                      setFullName("");
                      setEmail("");
                      setPhone("");
                      setDocumentId("");
                      setIsCompany(false);
                      setCompanyName("");
                      setCompanyNit("");
                      setJobTitle("");
                      setSelectedInterests([]);
                      setGoogleUser(null);
                      resetCities();
                    }}
                    className="mt-3 px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Registrar a otra persona
                  </button>
                </div>
              ) : (
                <form id="event-registration-form" onSubmit={handleSubmit} className="space-y-3">
                  
                  {/* Botón de Autocompletar con Google */}
                  <div>
                    <GoogleAutofillButton
                      onAutofill={(user) => {
                        setGoogleUser(user);
                        if (user.name) setFullName(user.name);
                        if (user.email) setEmail(user.email);
                      }}
                      autofilledUser={googleUser}
                      onClear={() => setGoogleUser(null)}
                    />
                  </div>

                  <div className="relative flex items-center justify-center my-1">
                    <div className="w-full border-t border-slate-200" />
                    <span className="bg-white px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider absolute">
                      O diligencia tus datos
                    </span>
                  </div>

                  {error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Fila 1: Nombre Completo y Correo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="event_fullname" className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nombre Completo <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          id="event_fullname"
                          name="name"
                          autoComplete="name"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ej. Juan Gómez"
                          className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="event_email" className="text-[11px] font-bold text-slate-700 block mb-1">
                        Correo Electrónico <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          id="event_email"
                          name="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fila 2: WhatsApp / Teléfono y Documento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="event_phone" className="text-[11px] font-bold text-slate-700 block mb-1">
                        WhatsApp / Teléfono <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          id="event_phone"
                          name="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          required
                          maxLength={15}
                          pattern="^(\+?57)?3[0-9]{9}$"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. 3101234567"
                          className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="event_doc" className="text-[11px] font-bold text-slate-700 block mb-1">
                        N° Documento <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        id="event_doc"
                        maxLength={20}
                        pattern="^[a-zA-Z0-9]{5,20}$"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        placeholder="Cédula o ID"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Departamento y Ciudad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Departamento</span>
                        {loadingDepartments && <span className="text-[9px] text-amber-600 font-normal">Cargando...</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <MapPin size={13} className="text-slate-400" />
                        </div>
                        <select
                          id="event_department"
                          name="address-level1"
                          autoComplete="address-level1"
                          value={selectedDepartmentId}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          disabled={loadingDepartments}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium cursor-pointer disabled:opacity-60"
                        >
                          <option value="">
                            {loadingDepartments ? "Cargando..." : "Selecciona departamento..."}
                          </option>
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
                        {loadingCities && <span className="text-[9px] text-amber-600 font-normal">Cargando...</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <MapPin size={13} className="text-slate-400" />
                        </div>
                        <select
                          id="event_city"
                          name="address-level2"
                          autoComplete="address-level2"
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          disabled={!selectedDepartmentId || loadingCities}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium cursor-pointer disabled:opacity-60"
                        >
                          <option value="">
                            {loadingCities 
                              ? "Cargando..." 
                              : (!selectedDepartmentId ? "Elige departamento..." : "Selecciona ciudad...")}
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

                  {selectedCity === "Otra" && (
                    <div>
                      <input
                        type="text"
                        required
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Escribe el nombre de tu ciudad *"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                      />
                    </div>
                  )}

                  {/* Fila 4: Tipo de Registro - Segmented Pill Control Compacto */}
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
                        <User size={13} className={!isCompany ? "text-amber-500" : ""} />
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
                        <Building2 size={13} className={isCompany ? "text-amber-500" : ""} />
                        <span>Empresa</span>
                      </button>
                    </div>
                  </div>

                  {/* Campos de Empresa compactos (3 columnas en desktop) */}
                  {isCompany && (
                    <div className="p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5 animate-in fade-in zoom-in-95">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label htmlFor="company_name" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                            Razón Social / Empresa <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Building2 size={12} className="text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              id="company_name"
                              required={isCompany}
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Ej. Gloint S.A.S."
                              className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="company_nit" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                            NIT / RUT <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <FileText size={12} className="text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              id="company_nit"
                              required={isCompany}
                              value={companyNit}
                              onChange={(e) => setCompanyNit(e.target.value)}
                              placeholder="Ej. 901.234.567-8"
                              className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="job_title" className="text-[10px] font-bold text-slate-700 block mb-0.5">
                            Cargo <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Briefcase size={12} className="text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              id="job_title"
                              required={isCompany}
                              value={jobTitle}
                              onChange={(e) => setJobTitle(e.target.value)}
                              placeholder="Ej. Gerente"
                              className="w-full pl-6.5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fila 5: Áreas de Interés (Chips compactos) */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Áreas de Interés <span className="text-slate-400 font-normal lowercase">(opcional)</span>
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
                                ? "bg-amber-500 border-amber-500 text-slate-950 font-bold shadow-2xs"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isSelected && <Check size={11} className="stroke-[3]" />}
                            <span>{interest}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fila 6: Modalidad de Asistencia (Compacta) */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Modalidad de Asistencia <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={eventData.is_full_in_person}
                        onClick={() => setAttendanceMode("in_person")}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          attendanceMode === "in_person"
                            ? "bg-amber-50/80 border-amber-500 text-slate-900 shadow-2xs"
                            : eventData.is_full_in_person
                              ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className={attendanceMode === "in_person" ? "text-amber-600" : "text-slate-400"} />
                          <span className="font-montserrat">Presencial</span>
                        </div>
                        {eventData.is_full_in_person ? (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                            Agotado
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                            Libre
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceMode("virtual");
                          setHasCompanion(false);
                        }}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          attendanceMode === "virtual"
                            ? "bg-amber-50/80 border-amber-500 text-slate-900 shadow-2xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Video size={13} className={attendanceMode === "virtual" ? "text-amber-600" : "text-slate-400"} />
                          <span className="font-montserrat">Virtual</span>
                        </div>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Online
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Acompañante */}
                  {attendanceMode === "in_person" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs animate-in fade-in">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasCompanion}
                          onChange={(e) => setHasCompanion(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                        />
                        <span className="font-medium text-slate-800 text-[11px]">
                          Asistiré con un acompañante (Reserva 2 cupos)
                        </span>
                      </label>

                      {hasCompanion && (
                        <input
                          type="text"
                          value={companionName}
                          onChange={(e) => setCompanionName(e.target.value)}
                          placeholder="Nombre del acompañante (Opcional)"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
                        />
                      )}
                    </div>
                  )}

                  {/* Botón de Enviar */}
                  <button
                    type="submit"
                    disabled={submitting || (attendanceMode === "in_person" && eventData.is_full_in_person)}
                    className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin text-white" />
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <>
                        <span>Reservar mi Lugar</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                    <ShieldCheck size={12} className="text-amber-500" />
                    <span>Tu registro es 100% gratuito y seguro.</span>
                  </div>

                </form>
              )}

            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
