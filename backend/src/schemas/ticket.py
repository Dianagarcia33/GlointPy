from typing import Optional, Any, Dict
from pydantic import BaseModel

class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str

class TicketResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
