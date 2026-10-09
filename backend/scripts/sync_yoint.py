#!/usr/bin/env python3
import asyncio
import sys
import os
import httpx

# Asegurar backend en el PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from sqlalchemy import or_
from src.core.database import async_session_maker
from src.core.config import settings
from src.models.yoint_dispersion import YointDispersion
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.services.yoint_service import YointService

async def test_call(client, method, url, headers, json_body, desc):
    try:
        if method == "GET":
            res = await client.get(url, headers=headers)
        else:
            res = await client.post(url, headers=headers, json=json_body)
        
        snippet = res.text[:250].replace('\n', ' ')
        print(f"   [{desc}] HTTP {res.status_code} -> {snippet}")
        if res.status_code in [200, 201]:
            return res.json()
    except Exception as e:
        print(f"   [{desc}] Error: {e}")
    return None

async def main():
    print("[CLI sync_yoint] Buscando retiros en proceso y dispersiones pendientes con Yoint...")
    async with async_session_maker() as db:
        q = (
            select(YointDispersion)
            .outerjoin(Withdrawal, YointDispersion.withdrawal_id == Withdrawal.id)
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

        print(f"🔄 Se encontraron {len(dispersions)} dispersiones por conciliar:\n")

        for d in dispersions:
            w_estado = "N/A"
            tipo_disp = "Crédito" if d.credit_id else "Retiro"
            target_num = d.credit_id if d.credit_id else d.withdrawal_id
            if d.withdrawal_id:
                w_res = await db.execute(select(Withdrawal).where(Withdrawal.id == d.withdrawal_id))
                withdrawal = w_res.scalars().first()
                w_estado = withdrawal.estado.value if withdrawal else "N/A"
            else:
                withdrawal = None

            print("=" * 60)
            print(f"{tipo_disp} #{target_num} | Dispersión ID #{d.id}")
            print(f"  order_id en BD    : {d.order_id}")
            print(f"  idempotency_key   : {d.idempotency_key}")
            print(f"  referencia        : {d.payment_reference}")
            print(f"  estado en Gloint  : {d.status} (Retiro: {w_estado})")
            print("=" * 60)

            # Consultar en Yoint vía endpoints oficiales
            res = await YointService.query_order_status(db, d)
            print(f"👉 Resultado consulta Yoint: {res}")

            # Refrescar estado en BD
            await db.refresh(d)
            if withdrawal:
                await db.refresh(withdrawal)
                w_estado_despues = withdrawal.estado.value
            else:
                w_estado_despues = "N/A"

            print(f"✅ Estado final en Gloint: Dispersión={d.status} | Retiro={w_estado_despues}\n")

if __name__ == "__main__":
    asyncio.run(main())
