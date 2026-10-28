"""Utilidades para búsquedas de texto con LIKE/ILIKE."""

# Carácter de escape para los patrones de like_contains/like_escape; pásalo siempre como
# `columna.ilike(patron, escape=LIKE_ESCAPE)`. Se usa '/' (igual que autoescape de SQLAlchemy)
# en vez de '\' para no depender de cómo MySQL interprete la barra invertida en el SQL.
LIKE_ESCAPE = "/"


def like_escape(term: str) -> str:
    """Escapa '/', '%' y '_' para que se busquen como texto literal y no como comodines."""
    return term.replace("/", "//").replace("%", "/%").replace("_", "/_")


def like_contains(term: str) -> str:
    """Patrón '%term%' para buscar el texto escrito por el usuario en cualquier posición."""
    return f"%{like_escape(term)}%"
