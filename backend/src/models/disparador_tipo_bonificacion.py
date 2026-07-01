from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class DisparadorTipoBonificacion(Base):
    __tablename__ = 'disparador_tipo_bonificacion'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    disparador_id = Column(BigInteger, nullable=False)
    tipo_bonificacion_id = Column(BigInteger, nullable=False)
    condiciones = Column(Text, nullable=True)
    activo = Column(Integer, nullable=False)
    prioridad = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
