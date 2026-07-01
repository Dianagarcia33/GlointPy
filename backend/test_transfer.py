import asyncio
from src.core.database import async_session_maker
import src.main # Pre-loads all models
from src.services.auto_transfer_yields import handle_auto_transfer

async def run():
    async with async_session_maker() as db:
        res = await handle_auto_transfer(db, execute=True, force=True)
        for log in res.get('logs', []):
            print(log)

if __name__ == "__main__":
    asyncio.run(run())
