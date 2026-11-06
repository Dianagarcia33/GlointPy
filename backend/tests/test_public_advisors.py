from types import SimpleNamespace as NS

from src.api.v1.endpoints.commercial_sales import _public_advisor_entry


def _user(roles, superuser=False, email="directivo@gloint.com.co"):
    return NS(id=1, name="Ana Pérez", email=email, document_id="123", phone_number="3001234567",
              is_superuser=superuser, roles=[NS(name=r) for r in roles])


def test_directivo_se_lista_con_nombre_y_correo_completo_sin_otros_datos():
    # Requerimiento explícito del cliente (H-108): nombre y correo completo visibles en el selector.
    e = _public_advisor_entry(_user(["Directivo de Inversiones"]))
    assert e == {"id": 1, "name": "Ana Pérez", "email": "directivo@gloint.com.co"}
    assert "document_id" not in e and "phone_number" not in e


def test_asesor_sin_correo_devuelve_cadena_vacia():
    assert _public_advisor_entry(_user(["Asesor Comercial"], email=None))["email"] == ""


def test_superadmin_y_roles_de_administracion_no_se_listan():
    assert _public_advisor_entry(_user(["Directivo"], superuser=True)) is None
    assert _public_advisor_entry(_user(["Administrador"])) is None
    assert _public_advisor_entry(_user(["SuperAdmin"])) is None


def test_inversionista_no_se_lista():
    assert _public_advisor_entry(_user(["Inversionista"])) is None
