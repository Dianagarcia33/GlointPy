# DESIGN.md — GLOINT (página pública)

Dirección: **banca privada, sobria y verificable**. Un fondo de inversión debe parecer un informe, no una app de moda.
Marfil claro como lienzo, azul noche casi negro para texto y paneles, dorado solo como hilo fino y detalle. Sin brillos, partículas, rotaciones ni marquesinas.
Regla de contenido: solo hechos que ya existen en el proyecto (datos de la empresa, planes de 6/12/18 meses, SARLAFT, términos). Nada de cifras sin respaldo; lo pendiente va con un marcador visible.
Nota: no se basó en sitios de UXKIN (el servidor no está conectado).

## Color

| Token | Valor | Rol |
|---|---|---|
| `--g-bg` | `#F7F4EC` | Fondo de página (marfil) |
| `--g-surface` | `#FFFFFF` | Tarjetas y tablas |
| `--g-surface-2` | `#EFEADD` | Bandas alternas |
| `--g-ink` | `#0B1220` | Texto principal, botones primarios, paneles oscuros (contraste ≈ 17:1) |
| `--g-ink-2` | `#121A2B` | Tarjetas dentro de paneles oscuros |
| `--g-text-muted` | `#4B5563` | Texto secundario sobre marfil (≈ 7:1) |
| `--g-border` | `rgba(11,18,32,0.14)` | Líneas y bordes |
| `--g-gold-text` | `#7A5A12` | Dorado legible sobre marfil (≈ 6:1): rótulos y enlaces |
| `--g-gold-line` | `#C9A24A` | Hilos y detalles (no para texto) |
| `--g-gold` / `--g-gold-light` | `#D4A537` / `#F3D27A` | Dorado sobre paneles oscuros |
| `--g-d-text` / `--g-d-muted` | `#F5F3EE` / `#A8A49A` | Texto sobre paneles oscuros |
| `--g-warn-bg` / `--g-warn-text` | `#FFF4D6` / `#6B4A00` | Avisos de riesgo y marcadores pendientes |

## Tipografía
- Títulos: **Fraunces** (serif editorial) 600/700.
- Cuerpo y rótulos: **Inter** 400/500/600; cifras con `font-variant-numeric: tabular-nums`.
- Escala: 12 / 14 / 16 / 18 / 24 / 36 / 48 / 60 px; títulos con interlineado 1.1–1.2, cuerpo 1.65. Cuerpo mínimo 16 px, líneas de 60–75 caracteres.
- Rótulos: Inter 12 px, mayúsculas, tracking 0.14em, color `gold-text`.

## Espacio
Escala de 8 px. Secciones de 96 px (64 en móvil). Contenido de 1120 px, margen lateral 24 px (16 en móvil).

## Forma y profundidad
Radios: 4 px (campos), 8 px (tarjetas y botones). Sin sombras decorativas: separación con bordes de 1 px y hilos dorados. Una sombra suave solo en tarjetas elevadas (`0 1px 2px rgba(11,18,32,.06)`).

## Componentes
- **Botón primario**: fondo `ink`, texto marfil, 48 px de alto; hover: borde dorado. Focus: anillo de 2 px `gold-text` con separación de 2 px.
- **Botón secundario**: borde `ink`, texto `ink`, fondo transparente.
- **Franja de datos de empresa**: 4 datos verificables (razón social, NIT, Cámara de Comercio, domicilio).
- **Aviso de riesgo**: caja `warn` con borde izquierdo dorado, siempre junto a los planes.
- **Preguntas frecuentes**: `<details>` nativos, accesibles con teclado.
- **Navegación**: franja `ink` fija (el logo tiene fondo negro); pie también `ink`.

## Imágenes e iconos
- Logos en `public/logos/brand/` sobre paneles `ink`. Iconos lucide-react, trazo 1.5, sin emojis. Sin fotos de stock; fotos reales del equipo solo cuando existan.
- Movimiento: entradas suaves de opacidad; respetar `prefers-reduced-motion`.
