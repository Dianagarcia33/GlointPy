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
  ShieldCheck
} from "lucide-react";
import { getActiveEvent, registerPublicAttendee, EventData } from "../../../services/events";
import { useColombiaCities } from "../../../hooks/useColombiaCities";
import { DARK, DARK2, GOLD, ORANGE } from "../utils/constants";
import { Badge } from "./Badge";

export function EventRegistrationSection() {
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [documentId, setDocumentId] = useState("");
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
        phone: phone.trim() || undefined,
        city: finalCity.trim() || undefined,
        document_id: documentId.trim() || undefined,
        attendance_mode: attendanceMode,
        has_companion: attendanceMode === "in_person" ? hasCompanion : false,
        companion_name: (attendanceMode === "in_person" && hasCompanion) ? companionName.trim() : undefined,
      });

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
            
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 relative overflow-hidden">
              
              <div className="mb-6">
                <span className="text-[11px] font-bold text-amber-600 font-montserrat uppercase tracking-wider block">
                  Registro Abierto al Público
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-montserrat mt-0.5">
                  Confirma tu Asistencia Gratis
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Si no eres inversionista registrado, diligencia tus datos para reservar tu cupo oficial.
                </p>
              </div>

              {success ? (
                <div className="py-12 text-center space-y-4 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 font-montserrat">
                    ¡Registro Exitoso!
                  </h4>
                  <p className="text-sm text-slate-600 max-w-sm mx-auto">
                    Hemos reservado tu lugar para <strong>Gloint Power Tech</strong> en modalidad{" "}
                    <strong className="text-amber-600 capitalize">{attendanceMode === "in_person" ? "Presencial" : "Virtual"}</strong>.
                  </p>
                  <p className="text-xs text-slate-500">
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
                      resetCities();
                    }}
                    className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Registrar a otra persona
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Nombre */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={15} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ej. Juan Gómez"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Correo y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Correo Electrónico <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail size={15} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nombre@correo.com"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        WhatsApp / Teléfono
                      </label>
                      <div className="relative">
                        <Phone size={15} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. 3101234567"
                          className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Departamento y Ciudad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Departamento</span>
                        {loadingDepartments && <span className="text-[10px] text-amber-600 font-normal">Cargando...</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                          value={selectedDepartmentId}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          disabled={loadingDepartments}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium cursor-pointer disabled:opacity-60"
                        >
                          <option value="">
                            {loadingDepartments ? "Cargando..." : "Selecciona..."}
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
                      <label className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Ciudad</span>
                        {loadingCities && <span className="text-[10px] text-amber-600 font-normal">Cargando...</span>}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <select
                          value={selectedCity}
                          onChange={(e) => setSelectedCity(e.target.value)}
                          disabled={!selectedDepartmentId || loadingCities}
                          className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium cursor-pointer disabled:opacity-60"
                        >
                          <option value="">
                            {loadingCities 
                              ? "Cargando..." 
                              : (!selectedDepartmentId ? "Elige departamento..." : "Selecciona...")}
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
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ¿Qué ciudad? *
                      </label>
                      <input
                        type="text"
                        required
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder="Escribe el nombre de tu ciudad"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      N° Documento (Opcional)
                    </label>
                    <input
                      type="text"
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      placeholder="Cédula o ID"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                    />
                  </div>

                  {/* Selector de Modalidad */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Modalidad de Asistencia <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={eventData.is_full_in_person}
                        onClick={() => setAttendanceMode("in_person")}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          attendanceMode === "in_person"
                            ? "bg-amber-50/80 border-2 border-amber-500 text-slate-900 font-bold shadow-xs"
                            : eventData.is_full_in_person
                              ? "bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <MapPin size={16} className={attendanceMode === "in_person" ? "text-amber-600" : "text-slate-400"} />
                          {eventData.is_full_in_person && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                              Agotado
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold font-montserrat">Presencial</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceMode("virtual");
                          setHasCompanion(false);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          attendanceMode === "virtual"
                            ? "bg-amber-50/80 border-2 border-amber-500 text-slate-900 font-bold shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Video size={16} className={attendanceMode === "virtual" ? "text-amber-600" : "text-slate-400"} />
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            Online
                          </span>
                        </div>
                        <span className="text-xs font-bold font-montserrat">Virtual</span>
                      </button>
                    </div>
                  </div>

                  {/* Acompañante */}
                  {attendanceMode === "in_person" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs animate-in fade-in">
                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasCompanion}
                          onChange={(e) => setHasCompanion(e.target.checked)}
                          className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800">
                          Asistiré con un acompañante (Descuenta 2 cupos)
                        </span>
                      </label>

                      {hasCompanion && (
                        <input
                          type="text"
                          value={companionName}
                          onChange={(e) => setCompanionName(e.target.value)}
                          placeholder="Nombre del acompañante (Opcional)"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
                        />
                      )}
                    </div>
                  )}

                  {/* Botón de Enviar */}
                  <button
                    type="submit"
                    disabled={submitting || (attendanceMode === "in_person" && eventData.is_full_in_person)}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs font-montserrat uppercase tracking-wider transition-all shadow-md shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>Confirmando Reserva...</span>
                      </>
                    ) : (
                      <>
                        <span>Reservar mi Lugar</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
                    <ShieldCheck size={13} className="text-amber-500" />
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
