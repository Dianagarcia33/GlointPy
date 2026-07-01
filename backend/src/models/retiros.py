from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class Retiro(Base):
    __tablename__ = 'retiros'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    investor_id = Column(BigInteger, nullable=True)
    user_id = Column(BigInteger, nullable=False)
    origen = Column(String(255), nullable=False)
    tipo = Column(Enum('rendimiento','capital','bono'), nullable=False)
    monto = Column(Numeric(15,2), nullable=False)
    impuesto = Column(Numeric(15,2), nullable=False)
    monto_neto = Column(Numeric(15,2), nullable=False)
    fecha_solicitud = Column(Date, nullable=False)
    fecha_retiro = Column(Date, nullable=True)
    estado = Column(Enum('pendiente','aprobado','procesado','rechazado','cancelado'), nullable=False)
    metodo_pago = Column(String(255), nullable=True)
    banco = Column(String(255), nullable=True)
    tipo_cuenta = Column(String(255), nullable=True)
    numero_cuenta = Column(String(255), nullable=True)
    observaciones = Column(Text, nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    aprobado_por = Column(BigInteger, nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    procesado_por = Column(BigInteger, nullable=True)
    fecha_procesamiento = Column(DateTime, nullable=True)
    comprobante_pago = Column(String(255), nullable=True)
    receipt_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
