import asyncio
from sqlalchemy import select
from src.core.database import SessionLocal
from src.models.wallet_transactions import WalletTransaction

async def check():
    async with SessionLocal() as db:
        stmt = select(WalletTransaction).where(
            WalletTransaction.description == "nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
            WalletTransaction.reference_id.is_(None)
        )
        result = await db.execute(stmt)
        txs = result.scalars().all()
        print(f"Transactions without retiro: {len(txs)}")
        for tx in txs:
            print(f"WT ID: {tx.id}, User/Wallet ID: {tx.wallet_id}, Amount: {tx.amount}")

asyncio.run(check())
