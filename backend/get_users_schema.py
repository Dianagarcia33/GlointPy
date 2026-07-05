import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker, engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SHOW CREATE TABLE users"))
        print(res.fetchone()[1])

asyncio.run(main())
