from src.core.webhook_security import is_transient_verification_error


def test_fallos_de_dns_son_temporales():
    assert is_transient_verification_error("Tiempo de espera agotado al resolver DNS del webhook")
    assert is_transient_verification_error("No se pudo resolver el dominio del webhook: x")


def test_destinos_internos_son_permanentes():
    assert not is_transient_verification_error("El dominio resuelve a una IP interna no permitida (10.0.0.5)")
    assert not is_transient_verification_error("Nombre de host interno bloqueado: localhost")
