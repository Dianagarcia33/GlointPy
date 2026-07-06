import asyncio
from sqlalchemy import select, text
from src.core.database import async_session_maker
from src.models.retiros import Retiro

async def check():
    async with async_session_maker() as db:
        res = await db.execute(text("SELECT id, origen, monto_neto, created_at FROM retiros WHERE origen IN ('auto_yield_transfer', 'auto_bonus_transfer')"))
        rows = res.fetchall()
        for r in rows:
            print(r)

asyncio.run(check())
