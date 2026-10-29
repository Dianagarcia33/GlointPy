from src.services.crm_email_service import friendly_imap_error


def test_error_de_autenticacion_sin_repr_de_bytes():
    msg = friendly_imap_error(Exception("b'[AUTHENTICATIONFAILED] Authentication failed.'"), True)
    assert "b'" not in msg and "AUTHENTICATIONFAILED" not in msg
    assert "contraseña" in msg


def test_otros_errores_no_exponen_la_excepcion():
    assert "Traceback" not in friendly_imap_error(Exception("boom"), False)
    assert "boom" not in friendly_imap_error(Exception("boom"), False)
