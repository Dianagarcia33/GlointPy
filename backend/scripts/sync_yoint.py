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

async def probe_endpoint(client, url, headers, desc):
    try:
        res = await client.get(url, headers=headers)
        snippet = res.text[:200].replace('\n', ' ')
        print(f"   [{desc}] HTTP {res.status_code} -> {snippet}")
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"   [{desc}] Excepción: {e}")
    return None

async def main():
    print("[CLI sync_yoint] Buscando retiros en proceso y dispersiones pendientes con Yoint...")
    print(f"[CLI sync_yoint] Configuración detectada:")
    print(f"  - YOINT_API_URL: {settings.YOINT_API_URL}")
    print(f"  - YOINT_AUTH_URL: {settings.YOINT_AUTH_URL}")
    print(f"  - YOINT_CLIENT_ID: {'***' + settings.YOINT_CLIENT_ID[-4:] if settings.YOINT_CLIENT_ID else 'None'}")
    print(f"  - YOINT_API_KEY: {'Configurada' if settings.YOINT_API_KEY else 'None'}")

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

        print(f"\n🔄 Se encontraron {len(dispersions)} dispersiones por conciliar:")
        for d in dispersions:
            print(f"\n=======================================================")
            print(f"Retiro #{d.withdrawal_id} | Dispersión ID #{d.id}")
            print(f"  order_id en BD : {d.order_id}")
            print(f"  referencia     : {d.payment_reference}")
            print(f"  estado actual  : {d.status}")
            print(f"=======================================================")

            # 1. Intentar con query_order_status estándar
            result = await YointService.query_order_status(db, d)
            print(f"👉 Resultado consulta Yoint estándar: {result}")

            # 2. Si no dio 200, ejecutar diagnósticos adicionales
            if not isinstance(result, dict) or result.get("http_code") or result.get("error"):
                print("⚠️ Consulta estándar no exitosa. Ejecutando sondeo de variantes...")
                base_url = settings.YOINT_API_URL.rstrip('/')
                idemp = d.idempotency_key or "diag-probe"
                
                # Probar con headers OAuth
                headers_oauth = await YointService._get_headers(idemp)
                
                # Probar con headers solo x-api-key (sin Authorization)
                headers_apikey_only = {
                    "Content-Type": "application/json",
                    "X-Idempotency-Key": idemp
                }
                if settings.YOINT_API_KEY:
                    headers_apikey_only["x-api-key"] = settings.YOINT_API_KEY.strip()

                async with httpx.AsyncClient(timeout=15.0) as client:
                    data = None
                    # Variante A: path /order_id con OAuth
                    if d.order_id:
                        data = await probe_endpoint(client, f"{base_url}/api/payments/v2/dispersions/{d.order_id}", headers_oauth, "A: path /{id} con OAuth")
                    
                    # Variante B: path /order_id con x-api-key
                    if not data and d.order_id and settings.YOINT_API_KEY:
                        data = await probe_endpoint(client, f"{base_url}/api/payments/v2/dispersions/{d.order_id}", headers_apikey_only, "B: path /{id} con x-api-key")

                    # Variante C: query ?paymentReference=
                    if not data and d.payment_reference:
                        data = await probe_endpoint(client, f"{base_url}/api/payments/v2/dispersions?paymentReference={d.payment_reference}", headers_oauth, "C: ?paymentReference= con OAuth")

                    # Variante D: query ?orderId=
                    if not data and d.order_id:
                        data = await probe_endpoint(client, f"{base_url}/api/payments/v2/dispersions?orderId={d.order_id}", headers_oauth, "D: ?orderId= con OAuth")

                    # Variante E: listado general
                    if not data:
                        data = await probe_endpoint(client, f"{base_url}/api/payments/v2/dispersions", headers_oauth, "E: GET /dispersions general")

                    if data:
                        print("🎉 ¡Variante exitosa! Procesando transición...")
                        # Extraer estado de la respuesta
                        new_st = None
                        if isinstance(data, dict):
                            data_inner = data.get("data") if isinstance(data.get("data"), dict) else {}
                            new_st = data.get("status") or data.get("state") or data.get("estado") or data_inner.get("status") or data_inner.get("state") or data_inner.get("estado")
                            if not new_st and isinstance(data.get("dispersions"), list) and data["dispersions"]:
                                for item in data["dispersions"]:
                                    if str(item.get("id")) == str(d.order_id) or str(item.get("paymentReference")) == str(d.payment_reference):
                                        new_st = item.get("status") or item.get("state") or item.get("estado")
                                        break
                        if new_st:
                            await YointService.process_status_transition(db, d.order_id or d.payment_reference, str(new_st), payload=data)

            # Recargar estado
            await db.refresh(d)
            print(f"✅ Estado final de la dispersión #{d.id}: {d.status}")

        print("\n🏁 Proceso de conciliación finalizado.")

if __name__ == "__main__":
    asyncio.run(main())
