from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text

class Template(Base):
    __tablename__ = 'templates'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(String(255), nullable=False)
    role_id = Column(BigInteger, nullable=True)
    file_path = Column(String(255), nullable=True)
    html_content = Column(Text, nullable=True)
    background_image = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
