from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import JSON
from sqlalchemy import Numeric
from sqlalchemy import String

class Cliente(Base):
    __tablename__ = 'clientes'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    max_inventory_value = Column(Numeric(15,2), nullable=False)
    user_id = Column(BigInteger, nullable=False)
    codigo_asignado = Column(String(255), nullable=False)
    nombre = Column(String(255), nullable=False)
    apellido = Column(String(255), nullable=False)
    documento = Column(String(255), nullable=False)
    telefono = Column(String(255), nullable=True)
    correo = Column(String(255), nullable=False)
    ciudad = Column(String(255), nullable=False)
    pais = Column(String(255), nullable=False)
    tipo_persona = Column(String(255), nullable=False)
    direccion = Column(String(255), nullable=False)
    actividades = Column(JSON, nullable=False)
    envios_mes = Column(String(255), nullable=True)
    banco = Column(String(255), nullable=True)
    tipo_cuenta = Column(String(255), nullable=True)
    numero_cuenta = Column(String(255), nullable=True)
    codigo_invitacion = Column(String(255), nullable=True)
    rut = Column(String(255), nullable=True)
    document_photo = Column(String(255), nullable=True)
    selfie_photo = Column(String(255), nullable=True)
    rekognition_face_id = Column(String(255), nullable=True)
    face_similarity = Column(Numeric(5,2), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
