import asyncio
from sqlalchemy import text
from src.db.session import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW COLUMNS FROM investor_respaldo"))
        print("investor_respaldo columns:")
        for r in res:
            print(f" - {r[0]}")

asyncio.run(main())
