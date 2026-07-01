from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import JSON
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class UserSale(Base):
    __tablename__ = 'user_sales'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    investor_id = Column(BigInteger, nullable=False)
    monto = Column(Numeric(15,2), nullable=False)
    clasificacion = Column(Enum('nuevo','reinversion','referido'), nullable=False)
    referido_por_investor_id = Column(BigInteger, nullable=True)
    comision_porcentaje = Column(Numeric(5,2), nullable=False)
    comision_monto = Column(Numeric(15,2), nullable=False)
    detalles_particion = Column(JSON, nullable=True)
    observaciones = Column(Text, nullable=True)
    comprobantes = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
