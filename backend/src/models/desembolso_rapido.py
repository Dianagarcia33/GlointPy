from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class DesembolsoRapido(Base):
    __tablename__ = 'desembolso_rapido'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cliente_id = Column(BigInteger, nullable=False)
    plataforma = Column(String(255), nullable=False)
    valor_procesar = Column(Numeric(15,2), nullable=False)
    comision = Column(Numeric(15,2), nullable=False)
    porcentaje_comision = Column(Numeric(5,4), nullable=False)
    valor_desembolsar = Column(Numeric(15,2), nullable=False)
    imagen_soporte = Column(String(255), nullable=True)
    codigo_seguimiento = Column(String(255), nullable=False)
    estado = Column(String(255), nullable=False)
    observaciones = Column(Text, nullable=True)
    visto_admin = Column(Integer, nullable=True)
    visto_cliente = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
