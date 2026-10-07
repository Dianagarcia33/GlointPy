#!/usr/bin/env python3
import asyncio
import sys
import os

# Asegurar backend en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from sqlalchemy import or_
from src.core.database import async_session_maker
from src.models.yoint_dispersion import YointDispersion
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.services.yoint_service import YointService

async def main():
    print("[CLI sync_yoint] Buscando retiros en proceso y dispersiones pendientes con Yoint...")
    async with async_session_maker() as db:
        q = (
            select(YointDispersion)
            .join(Withdrawal, YointDispersion.withdrawal_id == Withdrawal.id)
            .where(
                or_(
                    YointDispersion.status.in_(["PROCESSING", "PENDING", "QUEUED"]),
                    Withdrawal.estado == WithdrawalStatus.PROCESSED
                )
            )
            .order_by(YointDispersion.id.asc())
        )
        res = await db.execute(q)
        dispersions = res.scalars().all()

        if not dispersions:
            print("ℹ️ No hay retiros en estado 'procesado' ni dispersiones pendientes.")
            return

        print(f"🔄 Se encontraron {len(dispersions)} dispersiones por conciliar:")
        for d in dispersions:
            print(f"\n=======================================================")
            print(f"Retiro #{d.withdrawal_id} | Dispersión ID #{d.id}")
            print(f"  order_id en BD : {d.order_id}")
            print(f"  referencia     : {d.payment_reference}")
            print(f"  estado actual  : {d.status}")
            print(f"=======================================================")
            
            result = await YointService.query_order_status(db, d)
            print(f"👉 Resultado consulta Yoint: {result}")
            
            # Recargar estado
            await db.refresh(d)
            print(f"✅ Estado final de la dispersión #{d.id}: {d.status}")

        print("\n🏁 Proceso de conciliación finalizado con éxito.")

if __name__ == "__main__":
    asyncio.run(main())
