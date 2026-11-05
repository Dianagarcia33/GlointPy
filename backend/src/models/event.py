import secrets
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    title = Column(String(255), nullable=False, default="Gloint Power Tech")
    slug = Column(String(100), unique=True, index=True, nullable=False, default="gloint-power-tech")
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(255), nullable=True)
    virtual_url = Column(String(500), nullable=True)
    capacity_in_person = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    banner_active = Column(Boolean, nullable=False, default=True)
    # Transmisión en vivo (Mux): id de reproducción y si la sala está abierta a los asistentes virtuales
    live_playback_id = Column(String(100), nullable=True)
    live_open = Column(Boolean, nullable=False, default=False)
    # Preguntas de los asistentes (moderadas): el administrador las abre/cierra durante el evento
    questions_open = Column(Boolean, nullable=False, default=False)
    # Encuesta de satisfacción en vivo: el administrador la abre/cierra durante el evento
    survey_open = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attendees = relationship("EventAttendee", back_populates="event", cascade="all, delete-orphan")
    authorized_domains = relationship("EventAuthorizedDomain", back_populates="event", cascade="all, delete-orphan")


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    attendee_type = Column(String(20), nullable=False, default="investor")  # 'investor' | 'external'
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    document_id = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    is_company = Column(Boolean, nullable=False, default=False)
    company_name = Column(String(255), nullable=True)
    company_nit = Column(String(50), nullable=True)
    job_title = Column(String(100), nullable=True)
    interests = Column(Text, nullable=True)
    attendance_mode = Column(String(20), nullable=False, default="in_person")  # 'in_person' | 'virtual'
    has_companion = Column(Boolean, nullable=False, default=False)
    companion_name = Column(String(255), nullable=True)
    seats_reserved = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="confirmed")  # 'confirmed' | 'cancelled'

    # Código personal e impredecible: identifica al inscrito en el enlace del correo (sin necesidad de cuenta)
    # y es el contenido del QR único que se escaneará en la entrada.
    access_token = Column(String(64), unique=True, index=True, nullable=True, default=lambda: secrets.token_urlsafe(32))
    attendance_confirmed_at = Column(DateTime(timezone=True), nullable=True)   # confirmó asistencia presencial
    attendance_email_sent_at = Column(DateTime(timezone=True), nullable=True)  # último correo de confirmación enviado
    live_invite_sent_at = Column(DateTime(timezone=True), nullable=True)       # última invitación a la sala en vivo enviada
    checked_in_at = Column(DateTime(timezone=True), nullable=True)             # entrada presencial registrada (QR escaneado)
    checked_in_by = Column(BigInteger, nullable=True)                          # usuario del equipo que registró la entrada
    chat_muted = Column(Boolean, nullable=False, default=False)                # silenciado en el chat en vivo por el equipo

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="attendees")
    user = relationship("User", foreign_keys=[user_id])


class EventAuthorizedDomain(Base):
    __tablename__ = "event_authorized_domains"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), nullable=False, index=True)  # e.g. "glointech.com.co"
    name = Column(String(255), nullable=False)  # e.g. "Gloint Tech Oficial"
    allow_banner = Column(Boolean, nullable=False, default=True)
    allow_registration = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    api_key = Column(String(100), unique=True, index=True, nullable=True)
    last_accessed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="authorized_domains")



class EventLiveSession(Base):
    """Conexión de un inscrito virtual a la sala en vivo: quién entró, cuándo y cuánto tiempo estuvo."""
    __tablename__ = "event_live_sessions"
    __table_args__ = (UniqueConstraint("event_id", "attendee_id", name="uq_live_event_attendee"),)

    # with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(64), nullable=False)  # sesión activa: solo un dispositivo a la vez por enlace
    first_joined_at = Column(DateTime(timezone=True), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=False)
    watch_seconds = Column(Integer, nullable=False, default=0)
    join_count = Column(Integer, nullable=False, default=1)


class EventQuestion(Base):
    """Pregunta de un asistente (presencial o virtual). Solo se muestra a los demás cuando el equipo la aprueba."""
    __tablename__ = "event_questions"

    # with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # 'pending' | 'approved' | 'answered' | 'rejected'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    moderated_at = Column(DateTime(timezone=True), nullable=True)


class EventQuestionVote(Base):
    """Voto de un asistente a una pregunta aprobada (uno por asistente y pregunta)."""
    __tablename__ = "event_question_votes"
    __table_args__ = (UniqueConstraint("question_id", "attendee_id", name="uq_question_vote"),)

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    question_id = Column(BigInteger, ForeignKey("event_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)


class EventSurveyResponse(Base):
    """Respuesta a la encuesta de satisfacción (una por inscrito). En pantalla se muestra sin nombre, solo por grupo."""
    __tablename__ = "event_survey_responses"
    __table_args__ = (UniqueConstraint("event_id", "attendee_id", name="uq_survey_event_attendee"),)

    # with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_rating = Column(Integer, nullable=False)       # 1-5 experiencia general
    content_rating = Column(Integer, nullable=False)       # 1-5 contenido
    speakers_rating = Column(Integer, nullable=False)      # 1-5 presentadores
    organization_rating = Column(Integer, nullable=False)  # 1-5 organización / calidad de la transmisión
    nps = Column(Integer, nullable=False)                  # 0-10: ¿recomendaría el evento?
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventChatMessage(Base):
    """Mensaje del chat en vivo de la sala. El borrado por moderación es lógico (deleted_at)."""
    __tablename__ = "event_chat_messages"

    # with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(BigInteger, nullable=True)  # usuario del equipo que lo borró
