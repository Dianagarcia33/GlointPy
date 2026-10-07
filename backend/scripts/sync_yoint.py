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

        # Obtener token OAuth real de Cognito
        oauth_token = await YointService.get_oauth_token()
        print(f"[CLI sync_yoint] Token Cognito obtenido: {'Sí (longitud: ' + str(len(oauth_token)) + ')' if oauth_token else 'NO'}")

        base_url = settings.YOINT_API_URL.rstrip('/')
        
        # Probar con el primer retiro (#7408 si está en la lista)
        target_disp = None
        for d in dispersions:
            if str(d.order_id) == "335591" or d.withdrawal_id == 7408:
                target_disp = d
                break
        if not target_disp:
            target_disp = dispersions[0]

        order_id = target_disp.order_id or "335591"
        ref = target_disp.payment_reference or f"RET-{target_disp.withdrawal_id}"

        print(f"\n=======================================================")
        print(f"🔬 SONDEO TÉCNICO EXHAUSTIVO PARA RETIRO #{target_disp.withdrawal_id} (Order: {order_id}, Ref: {ref})")
        print(f"=======================================================")

        # Definir configuraciones de headers
        h_bearer = {"Content-Type": "application/json", "Authorization": f"Bearer {oauth_token}"}
        h_raw = {"Content-Type": "application/json", "Authorization": f"{oauth_token}"} # Sin la palabra Bearer
        h_token = {"Content-Type": "application/json", "token": f"{oauth_token}", "x-token": f"{oauth_token}"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            success_data = None

            # 1. Probar variantes POST (Comunes en pasarelas bancarias)
            post_payloads = [
                {"orderId": order_id},
                {"id": int(order_id) if order_id.isdigit() else order_id},
                {"paymentReference": ref}
            ]
            post_endpoints = [
                "/api/payments/v2/dispersions/status",
                "/api/payments/v2/dispersions/query",
                "/api/payments/v2/dispersions/consult",
                "/api/payments/v2/dispersions/search",
                "/api/payments/v2/dispersions/detail",
                "/api/payments/v2/dispersions/filter",
                "/api/payments/v2/dispersions/history",
                "/api/payments/v2/dispersions/check"
            ]
            print("\n🔍 1. Probando métodos POST:")
            for ep in post_endpoints:
                for pl in post_payloads[:1]:
                    data = await test_call(client, "POST", f"{base_url}{ep}", h_bearer, pl, f"POST {ep}")
                    if data:
                        success_data = data
                        break
                if success_data:
                    break

            # 2. Probar variantes GET alternativas
            if not success_data:
                print("\n🔍 2. Probando rutas GET alternativas:")
                get_endpoints = [
                    f"/api/payments/v2/dispersions/status/{order_id}",
                    f"/api/payments/v2/dispersions/detail/{order_id}",
                    f"/api/payments/v2/dispersion/{order_id}",
                    f"/api/payments/v1/dispersions/{order_id}",
                    f"/api/payments/v1/dispersions?paymentReference={ref}",
                    f"/api/dispersions/{order_id}",
                    f"/api/v2/dispersions/{order_id}",
                    f"/api/payments/v2/orders/{order_id}",
                    f"/api/payments/v2/transactions/{order_id}"
                ]
                for ep in get_endpoints:
                    data = await test_call(client, "GET", f"{base_url}{ep}", h_bearer, None, f"GET {ep}")
                    if data:
                        success_data = data
                        break

            # 3. Probar GET sin la palabra 'Bearer ' en Authorization
            if not success_data:
                print("\n🔍 3. Probando encabezado Authorization directo (sin palabra 'Bearer'):")
                direct_eps = [
                    f"/api/payments/v2/dispersions/{order_id}",
                    f"/api/payments/v2/dispersions?paymentReference={ref}",
                    "/api/payments/v2/dispersions"
                ]
                for ep in direct_eps:
                    data = await test_call(client, "GET", f"{base_url}{ep}", h_raw, None, f"RAW GET {ep}")
                    if data:
                        success_data = data
                        break

            # 4. Probar con header token / x-token
            if not success_data:
                print("\n🔍 4. Probando encabezados alternativos de token:")
                for ep in direct_eps[:1]:
                    data = await test_call(client, "GET", f"{base_url}{ep}", h_token, None, f"CUSTOM HEADER GET {ep}")
                    if data:
                        success_data = data
                        break

            # Si alguna variante fue exitosa, procesar de inmediato
            if success_data:
                print("\n🎉 ¡ENCONTRADA LA RUTA EXACTA DE YOINT!")
                print(f"Respuesta completa: {success_data}")
                new_st = None
                if isinstance(success_data, dict):
                    data_inner = success_data.get("data") if isinstance(success_data.get("data"), dict) else {}
                    new_st = success_data.get("status") or success_data.get("state") or success_data.get("estado") or data_inner.get("status") or data_inner.get("state") or data_inner.get("estado")
                if new_st:
                    await YointService.process_status_transition(db, order_id, str(new_st), payload=success_data)
                    await db.refresh(target_disp)
                    print(f"✅ ¡Retiro #{target_disp.withdrawal_id} actualizado con éxito a: {target_disp.status}!")
            else:
                print("\n⚠️ Ninguna ruta pública estándar de consulta respondió 200.")
                print("Esto confirma que Yoint actualiza los estados vía Webhook (push) en lugar de polling.")

if __name__ == "__main__":
    asyncio.run(main())
