"""
Catálogo de departamentos y ciudades de Colombia para formularios públicos (H-148).

El navegador del visitante ya no consulta api-colombia.com directamente: el backend la consulta,
guarda la respuesta en memoria 24 horas y, si el servicio no responde, usa la lista local de
departamentos con su capital. Así la IP del visitante no se envía a un tercero y el formulario
sigue funcionando aunque ese servicio esté caído.
"""
import time
from typing import Dict, List, Optional, Tuple

import httpx
from fastapi import APIRouter

router = APIRouter()

API_COLOMBIA_URL = "https://api-colombia.com/api/v1"
CACHE_SECONDS = 24 * 60 * 60

# Departamentos (y Bogotá D.C.) con su capital, para cuando api-colombia.com no responde
FALLBACK_DEPARTMENTS: List[Tuple[str, str]] = [
    ("Amazonas", "Leticia"), ("Antioquia", "Medellín"), ("Arauca", "Arauca"), ("Atlántico", "Barranquilla"),
    ("Bogotá D.C.", "Bogotá"), ("Bolívar", "Cartagena"), ("Boyacá", "Tunja"), ("Caldas", "Manizales"),
    ("Caquetá", "Florencia"), ("Casanare", "Yopal"), ("Cauca", "Popayán"), ("Cesar", "Valledupar"),
    ("Chocó", "Quibdó"), ("Córdoba", "Montería"), ("Cundinamarca", "Bogotá"), ("Guainía", "Inírida"),
    ("Guaviare", "San José del Guaviare"), ("Huila", "Neiva"), ("La Guajira", "Riohacha"),
    ("Magdalena", "Santa Marta"), ("Meta", "Villavicencio"), ("Nariño", "Pasto"),
    ("Norte de Santander", "Cúcuta"), ("Putumayo", "Mocoa"), ("Quindío", "Armenia"), ("Risaralda", "Pereira"),
    ("San Andrés y Providencia", "San Andrés"), ("Santander", "Bucaramanga"), ("Sucre", "Sincelejo"),
    ("Tolima", "Ibagué"), ("Valle del Cauca", "Cali"), ("Vaupés", "Mitú"), ("Vichada", "Puerto Carreño"),
]
FALLBACK_ID_OFFSET = 1000  # ids propios para no confundirlos con los de api-colombia

_cache: Dict[str, Tuple[float, list]] = {}


async def _fetch_cached(key: str, url: str) -> Optional[list]:
    cached = _cache.get(key)
    if cached and time.time() - cached[0] < CACHE_SECONDS:
        return cached[1]
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = [{"id": item["id"], "name": item["name"]} for item in response.json()]
    except Exception:
        return cached[1] if cached else None  # mejor una copia vieja que nada
    data.sort(key=lambda item: item["name"])
    _cache[key] = (time.time(), data)
    return data


@router.get("/departments")
async def list_departments():
    data = await _fetch_cached("departments", f"{API_COLOMBIA_URL}/Department")
    if data:
        return data
    return [{"id": FALLBACK_ID_OFFSET + i, "name": name} for i, (name, _) in enumerate(FALLBACK_DEPARTMENTS)]


@router.get("/departments/{department_id}/cities")
async def list_cities(department_id: int):
    if department_id >= FALLBACK_ID_OFFSET:
        index = department_id - FALLBACK_ID_OFFSET
        if 0 <= index < len(FALLBACK_DEPARTMENTS):
            return [{"id": department_id * 100, "name": FALLBACK_DEPARTMENTS[index][1]}]
        return []
    data = await _fetch_cached(f"cities:{department_id}", f"{API_COLOMBIA_URL}/Department/{department_id}/cities")
    return data or []
