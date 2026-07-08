from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class Task(Base):
    __tablename__ = 'tasks'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    taskable_type = Column(String(255), nullable=False)
    taskable_id = Column(BigInteger, nullable=False)
    assigned_to = Column(BigInteger, nullable=False)
    created_by = Column(BigInteger, nullable=False)
    estado = Column(Enum('pendiente','en_proceso','completada','cancelada'), nullable=False)
    prioridad = Column(Enum('baja','media','alta','urgente'), nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=True)
    fecha_completada = Column(DateTime, nullable=True)
    fecha_recordatorio = Column(DateTime, nullable=True)
    recordatorio_enviado = Column(Integer, nullable=False)
    resultado = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
