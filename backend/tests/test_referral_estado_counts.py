from src.services.potential_referral_service import summarize_estado_counts


def test_conteos_por_estado_del_caso_qa():
    # 28 pendientes, 3 contactados, 3 registrados, 3 rechazados = 37 (H-227)
    c = summarize_estado_counts([("pendiente", 28), ("contactado", 3), ("registrado", 3), ("rechazado", 3)])
    assert c == {"total": 37, "pendiente": 28, "contactado": 3, "registrado": 3, "rechazado": 3}


def test_estado_vacio_cuenta_como_pendiente():
    c = summarize_estado_counts([(None, 2), ("pendiente", 1)])
    assert c["pendiente"] == 3 and c["total"] == 3
