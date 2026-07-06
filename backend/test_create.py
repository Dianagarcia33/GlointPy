import asyncio
# Import all models to prevent relationship errors
from src.models import (
    user, wallet, security, roles, permissions, user_roles, 
    account_types, banks, password_security_codes,
    user_bank_account, paqueteria, platform, 
    investment, investment_request, investor,
    paquete_inversion, rendimientos, contract_period,
    system_events
)
from src.core.database import async_session_maker
from src.api.v1.endpoints.admin_investments import create_investment_for_client
from src.schemas.admin_investments import AgentInvestmentCreate

async def main():
    async with async_session_maker() as db:
        from sqlalchemy import select
        res = await db.execute(select(user.User).where(user.User.email == "superadmin@gloint.com"))
        current_user = res.scalar_one_or_none()
        if not current_user:
            print("No admin user found")
            return

        data = AgentInvestmentCreate(
            user_id=None,
            name="Test User",
            email="test9999@example.com",
            tipo_documento="CC",
            documento="999999999",
            numero_celular="3000000000",
            ciudad="Bogota",
            banco="Bancolombia",
            tipo_cuenta="Ahorros",
            numero_cuenta="123456789",
            monto=1000,
            contract_period_id=1,
            paquete_id=None,
            kyc_docs=None,
            comprobante_path=None
        )
        try:
            res = await create_investment_for_client(data=data, db=db, current_user=current_user)
            print("Success:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

asyncio.run(main())
