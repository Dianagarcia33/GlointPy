from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.dialects import mysql
from sqlalchemy.sql import func
from src.core.database import Base

# with_variant: SQLite (solo en pruebas) no autoincrementa BIGINT; en MySQL sigue siendo BIGINT
_ID = BigInteger().with_variant(Integer, "sqlite")
# Microsegundos en MySQL: el tiempo de respuesta de la dinámica se mide en milisegundos
_TS = DateTime(timezone=True).with_variant(mysql.DATETIME(fsp=6), "mysql")


class EventGameParticipant(Base):
    """Participante anónimo de la dinámica: sin sesión ni datos personales. Solo un código corto (ej. «Colibrí 47»)."""
    __tablename__ = "event_game_participants"

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    token = Column(String(64), nullable=False, unique=True, index=True)   # lo guarda el navegador de la persona
    alias = Column(String(40), nullable=False, unique=True)              # lo que se muestra en pantalla
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventGameRound(Base):
    """Una pregunta de la dinámica: opción múltiple con una respuesta correcta. Gana la primera respuesta correcta."""
    __tablename__ = "event_game_rounds"

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(300), nullable=False)
    options = Column(JSON, nullable=False)                    # lista de textos (2 a 4)
    correct_index = Column(Integer, nullable=False)
    status = Column(String(10), nullable=False, default="draft")   # draft | open | closed
    opened_at = Column(_TS, nullable=True)
    closed_at = Column(_TS, nullable=True)
    winner_participant_id = Column(BigInteger, ForeignKey("event_game_participants.id", ondelete="SET NULL"), nullable=True)
    winner_alias = Column(String(40), nullable=True)
    winner_ms = Column(Integer, nullable=True)                # milisegundos desde que se abrió la ronda
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EventGameAnswer(Base):
    """Respuesta de un participante a una ronda (una sola por ronda)."""
    __tablename__ = "event_game_answers"
    __table_args__ = (UniqueConstraint("round_id", "participant_id", name="uq_game_round_participant"),)

    id = Column(_ID, primary_key=True, autoincrement=True, index=True)
    round_id = Column(BigInteger, ForeignKey("event_game_rounds.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(BigInteger, ForeignKey("event_game_participants.id", ondelete="CASCADE"), nullable=False, index=True)
    option_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)
    elapsed_ms = Column(Integer, nullable=True)
    created_at = Column(_TS, server_default=func.now())
