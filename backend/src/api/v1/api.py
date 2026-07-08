from fastapi import APIRouter
from src.api.v1.endpoints import roles, users

api_router = APIRouter()

api_router.include_router(roles.router, prefix="", tags=["security"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
