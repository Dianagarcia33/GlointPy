from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import String
from sqlalchemy import Text

class ReunionAsistencia(Base):
    __tablename__ = 'reunion_asistencias'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=True)
    nombre = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    telefono = Column(String(255), nullable=False)
    tipo_asistencia = Column(Enum('presencial','virtual','no_asistira'), nullable=False)
    comentarios = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
