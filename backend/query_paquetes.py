import asyncio
from src.core.database import SessionLocal
from src.models.paquete_inversion import PaqueteInversion
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        result = await db.execute(select(PaqueteInversion))
        for p in result.scalars().all():
            print(f"ID: {p.id}, Nombre/Valor: {p.paquete_accion_adquirido}, Acciones: {p.acciones_otorgadas}")

asyncio.run(main())
