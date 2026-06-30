from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String

class Etiqueta(Base):
    __tablename__ = 'etiquetas'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    color = Column(String(7), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
