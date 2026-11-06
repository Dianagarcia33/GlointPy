"""H-221: la validación por contenido sigue activa; PNG y JPG reales pasan y un falso .png se rechaza."""
import pytest
from fastapi import HTTPException

from src.core.uploads import validate_receipt_upload

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32


def test_png_real_se_acepta():
    assert validate_receipt_upload("captura.png", PNG) == ".png"


def test_jpg_real_se_acepta():
    assert validate_receipt_upload("foto.jpg", JPG) == ".jpg"


def test_falso_png_se_rechaza():
    with pytest.raises(HTTPException) as e:
        validate_receipt_upload("falso.png", b"id,monto\n1,2\n")
    assert e.value.status_code == 400


def test_jpeg_con_extension_png_se_rechaza():
    # el desajuste original: recompresión a JPEG conservando el nombre .png; el cliente ya renombra a .jpg
    with pytest.raises(HTTPException):
        validate_receipt_upload("x.png", JPG)
