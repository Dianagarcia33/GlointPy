from fastapi import APIRouter
from src.api.v1.endpoints import roles, users, auth, periods, packages, investors, bank_accounts, wallets, investment_requests

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(roles.router, prefix="", tags=["security"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(periods.router, prefix="/periods", tags=["periods"])
api_router.include_router(packages.router, prefix="/packages", tags=["packages"])
api_router.include_router(investors.router, prefix="/investors", tags=["investors"])
api_router.include_router(bank_accounts.router, prefix="/bank-accounts", tags=["bank-accounts"])
api_router.include_router(wallets.router, prefix="/wallets", tags=["wallets"])
api_router.include_router(investment_requests.router, prefix="/investment-requests", tags=["investment-requests"])
