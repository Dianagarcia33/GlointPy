from typing import Any

from fastapi.responses import JSONResponse

from src.core.timezone import colombia_timestamps


class ColombiaJSONResponse(JSONResponse):
    """Respuesta JSON por defecto del API: marcas de tiempo en hora Colombia (H-152)."""

    def render(self, content: Any) -> bytes:
        return super().render(colombia_timestamps(content))
