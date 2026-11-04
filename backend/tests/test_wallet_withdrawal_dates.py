"""H-152: los retiros de billetera guardan el día calendario de Colombia, no el del servidor (UTC)."""
from datetime import datetime, timezone
from pathlib import Path

from src.core.timezone import BOGOTA_TZ, get_colombia_today

WALLETS_SRC = Path(__file__).resolve().parents[1] / "src" / "api" / "v1" / "endpoints" / "wallets.py"


def test_wallets_no_usa_date_today_del_servidor():
    # Guarda de regresión: date.today() devolvería el día UTC y el retiro de las 23:57 saldría al día siguiente
    assert "date.today()" not in WALLETS_SRC.read_text(encoding="utf-8")


def test_dia_colombia_a_las_2357_bogota_no_salta_de_dia():
    # 23:57 en Bogotá = 04:57 UTC del día siguiente (caso del retiro #7692 de la bitácora)
    utc = datetime(2026, 10, 26, 4, 57, tzinfo=timezone.utc)
    assert utc.astimezone(BOGOTA_TZ).date().isoformat() == "2026-10-25"
    assert get_colombia_today() == datetime.now(BOGOTA_TZ).date()
