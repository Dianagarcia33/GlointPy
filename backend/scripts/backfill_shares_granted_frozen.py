"""H-192: rellena investors.shares_granted_frozen desde el libro share_movements.

NO se ejecuta automáticamente. Por defecto es DRY-RUN (no escribe nada); solo con --apply actualiza.
Idempotente: solo toca contratos con shares_granted_frozen IS NULL. Sin asientos de package_grant el
valor queda NULL (no se adivina desde el paquete vivo).

ORDEN: correr SOLO DESPUÉS de la restitución de los inversionistas afectados por la sincronización del 25/09/2026;
si no, congelaría el valor reducido. Use --exclude con un archivo (un investor_id por línea) para omitir contratos.

Uso:  python scripts/backfill_shares_granted_frozen.py [--apply] [--out informe.csv] [--exclude ids.txt]
"""
import argparse
import asyncio
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def plan_backfill(contracts, ledger_sums, live_package_shares, exclude=None):
    """Función pura. contracts: [(investor_id, frozen_actual)]; ledger_sums: {investor_id: suma o None};
    live_package_shares: {investor_id: acciones vivas del paquete}. Devuelve filas de informe."""
    exclude = set(exclude or [])
    rows = []
    for investor_id, frozen in contracts:
        live = live_package_shares.get(investor_id, 0) or 0
        ledger = ledger_sums.get(investor_id)
        if frozen is not None:
            action, value = "ya_congelado", frozen
        elif investor_id in exclude:
            action, value = "excluido", None
        elif ledger is None:
            action, value = "sin_asientos_queda_NULL", None
        else:
            action, value = "congelar", int(ledger)
        rows.append({"investor_id": investor_id, "accion": action, "valor_congelado": value,
                     "paquete_vivo_ahora": live, "deriva": (value is not None and value != live)})
    return rows


async def main(apply, out, exclude_path):
    from sqlalchemy import select, func, update
    from src.core.database import async_session_maker
    from src.models.investor import Investor
    from src.models.package import Package
    from src.models.share_market import ShareMovement

    exclude = []
    if exclude_path:
        with open(exclude_path) as f:
            exclude = [int(x.strip()) for x in f if x.strip()]

    async with async_session_maker() as db:
        inv = (await db.execute(select(Investor.id, Investor.shares_granted_frozen, Package.granted_shares)
                                .join(Package, Package.id == Investor.package_id))).all()
        sums = dict((await db.execute(
            select(ShareMovement.investor_id, func.sum(ShareMovement.shares_quantity))
            .where(ShareMovement.movement_type == "package_grant", ShareMovement.investor_id.isnot(None))
            .group_by(ShareMovement.investor_id))).all())
        rows = plan_backfill([(r[0], r[1]) for r in inv], sums, {r[0]: r[2] for r in inv}, exclude)

        if out:
            with open(out, "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["investor_id"])
                w.writeheader()
                w.writerows(rows)
        to_set = [r for r in rows if r["accion"] == "congelar"]
        print(f"contratos={len(rows)} a_congelar={len(to_set)} con_deriva={sum(1 for r in to_set if r['deriva'])} "
              f"sin_asientos={sum(1 for r in rows if r['accion'].startswith('sin_asientos'))} modo={'APPLY' if apply else 'DRY-RUN'}")
        if apply:
            for r in to_set:
                await db.execute(update(Investor).where(Investor.id == r["investor_id"], Investor.shares_granted_frozen.is_(None))
                                 .values(shares_granted_frozen=r["valor_congelado"]))
            await db.commit()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--out")
    ap.add_argument("--exclude")
    a = ap.parse_args()
    asyncio.run(main(a.apply, a.out, a.exclude))
