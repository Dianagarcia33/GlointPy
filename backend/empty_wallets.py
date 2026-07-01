import asyncio
from src.core.database import async_session_maker
from src.models.wallet import Wallet
from sqlalchemy import update

async def main():
    async with async_session_maker() as db:
        # Poner todas las wallets a 0
        await db.execute(update(Wallet).values(balance=0.00))
        await db.commit()
        print("✅ Todas las wallets han sido vaciadas (balance = 0.00)")

if __name__ == "__main__":
    asyncio.run(main())
