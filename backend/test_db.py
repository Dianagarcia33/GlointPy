import asyncio
from sqlalchemy import text
from src.core.database import SessionLocal

async def check_columns():
    async with SessionLocal() as session:
        result = await session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'investment_requests';"))
        columns = [row[0] for row in result.fetchall()]
        print(columns)

asyncio.run(check_columns())
