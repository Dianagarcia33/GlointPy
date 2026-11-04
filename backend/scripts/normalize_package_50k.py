"""H-192: pone en 0 las acciones de los paquetes de $50.000 (la regla ahora vive en PackageService).

NO se ejecuta automáticamente. DRY-RUN por defecto; --apply para escribir. No toca contratos ni el libro.
Ejecutar una vez (con aprobación) ANTES de desplegar el retiro de los UPDATE de arranque/sincronización.
"""
import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


async def main(apply):
    from sqlalchemy import select
    from src.core.database import async_session_maker
    from src.models.package import Package

    async with async_session_maker() as db:
        pkgs = (await db.execute(select(Package).where(Package.value == 50000, Package.granted_shares != 0))).scalars().all()
        for p in pkgs:
            print(f"paquete #{p.id} valor={p.value} acciones={p.granted_shares} -> 0")
        print(f"paquetes_a_normalizar={len(pkgs)} modo={'APPLY' if apply else 'DRY-RUN'}")
        if apply:
            for p in pkgs:
                p.granted_shares = 0
            await db.commit()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    asyncio.run(main(ap.parse_args().apply))
