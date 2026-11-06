#!/usr/bin/env python3
import asyncio
import sys
import os

# Asegurar backend en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.core.database import async_session_maker
from src.services.daily_yield_service import check_and_run_daily_yield

async def main():
    print("[CLI run_daily_yield] Verificando liquidación diaria automática...")
    async with async_session_maker() as db:
        res = await check_and_run_daily_yield(db)
        if res:
            print(f"[CLI run_daily_yield] ✅ Éxito: {res.get('message')}")
        else:
            print("[CLI run_daily_yield] ℹ️ El ciclo del día de hoy ya estaba liquidado previamente.")

if __name__ == "__main__":
    asyncio.run(main())
