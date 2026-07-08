from fastapi import APIRouter
from src.api.v1.endpoints import roles, users, auth, periods

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(roles.router, prefix="", tags=["security"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(periods.router, prefix="/periods", tags=["periods"])
