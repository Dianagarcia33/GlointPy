import asyncio
from sqlalchemy import text
from src.db.session import engine

async def main():
    async with engine.connect() as conn:
        res1 = await conn.execute(text("SHOW COLUMNS FROM investors"))
        res2 = await conn.execute(text("SHOW COLUMNS FROM investor_respaldo"))
        print("investors columns:")
        for r in res1:
            print(f" - {r[0]}")
        print("\ninvestor_respaldo columns:")
        for r in res2:
            print(f" - {r[0]}")

asyncio.run(main())
