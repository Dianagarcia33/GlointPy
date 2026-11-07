from sqlalchemy import Column, BigInteger, Integer, String, DateTime, JSON, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.dialects import mysql
from sqlalchemy.sql import func
from src.core.database import Base

# with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
_ID = BigInteger().with_variant(Integer, "sqlite")
# Microsegundos en MySQL: el tiempo de cada pregunta se controla con precisión
_TS = DateTime(timezone=True).with_variant(mysql.DATETIME(fsp=6), "mysql")


class EventRaffle(Base):
    """Rifa por eliminación del evento: preguntas por rondas; quien falla o no responde sale hasta quedar el ganador."""
    __tablename__ = "event_raffles"

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)                       # por ejemplo, el premio
    status = Column(String(10), nullable=False, default="draft")      # draft | running | finished
    winner_attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="SET NULL"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventRaffleEntry(Base):
    """Participante de una rifa: se toma una foto de la bolsa al iniciar (presenciales vigentes que ya entraron)."""
    __tablename__ = "event_raffle_entries"
    __table_args__ = (UniqueConstraint("raffle_id", "attendee_id", name="uq_raffle_attendee"),)

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    raffle_id = Column(BigInteger, ForeignKey("event_raffles.id", ondelete="CASCADE"), nullable=False, index=True)
    attendee_id = Column(BigInteger, ForeignKey("event_attendees.id", ondelete="CASCADE"), nullable=False, index=True)
    display_name = Column(String(80), nullable=False)                 # lo que se proyecta: «Diana G.»
    status = Column(String(10), nullable=False, default="active")     # active | eliminated | winner
    eliminated_question_id = Column(BigInteger, nullable=True)        # pregunta en la que salió
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventRaffleQuestion(Base):
    """Una pregunta (ronda) de la rifa: opción múltiple con una respuesta correcta y un tiempo para responder."""
    __tablename__ = "event_raffle_questions"

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    raffle_id = Column(BigInteger, ForeignKey("event_raffles.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(300), nullable=False)
    options = Column(JSON, nullable=False)                    # lista de textos (2 a 4)
    correct_index = Column(Integer, nullable=False)
    duration_seconds = Column(Integer, nullable=False, default=30)
    status = Column(String(10), nullable=False, default="draft")   # draft | open | closed
    opened_at = Column(_TS, nullable=True)
    closed_at = Column(_TS, nullable=True)
    eliminated_count = Column(Integer, nullable=True)         # NULL = aún no se aplicó la eliminación de esta pregunta
    survivors_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventRaffleAnswer(Base):
    """Respuesta de un participante a una pregunta (una sola por pregunta)."""
    __tablename__ = "event_raffle_answers"
    __table_args__ = (UniqueConstraint("question_id", "entry_id", name="uq_raffle_question_entry"),)

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    question_id = Column(BigInteger, ForeignKey("event_raffle_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_id = Column(BigInteger, ForeignKey("event_raffle_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    option_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)
    created_at = Column(_TS, server_default=func.now())
