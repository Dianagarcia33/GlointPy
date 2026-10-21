from sqlalchemy import Column, BigInteger, String, Integer, DateTime, Text, JSON
from sqlalchemy.sql import func
from src.core.database import Base

class TechnicalEvaluation(Base):
    __tablename__ = "technical_evaluations"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False, index=True)
    candidate_phone = Column(String(50), nullable=True)
    language = Column(String(50), nullable=False, default="python")
    code = Column(Text, nullable=False)
    passed_tests = Column(Integer, default=0)
    total_tests = Column(Integer, default=3)
    test_results = Column(JSON, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    status = Column(String(50), default="submitted")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
