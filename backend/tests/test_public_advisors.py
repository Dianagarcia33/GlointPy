from types import SimpleNamespace as NS

from src.api.v1.endpoints.commercial_sales import _public_advisor_entry, _mask_email


def _user(roles, superuser=False):
    return NS(id=1, name="Ana Pérez", email="directivo@gloint.com.co", document_id="123", phone_number="3001234567",
              is_superuser=superuser, roles=[NS(name=r) for r in roles])


def test_directivo_se_lista_sin_datos_personales():
    e = _public_advisor_entry(_user(["Directivo de Inversiones"]))
    assert e == {"id": 1, "name": "Ana Pérez", "email": "di***@gloint.com.co"}
    assert "document_id" not in e and "phone_number" not in e


def test_superadmin_y_roles_de_administracion_no_se_listan():
    assert _public_advisor_entry(_user(["Directivo"], superuser=True)) is None
    assert _public_advisor_entry(_user(["Administrador"])) is None
    assert _public_advisor_entry(_user(["SuperAdmin"])) is None


def test_inversionista_no_se_lista():
    assert _public_advisor_entry(_user(["Inversionista"])) is None


def test_mask_email():
    assert _mask_email("a@x.co") == "a***@x.co"
    assert _mask_email(None) == ""
