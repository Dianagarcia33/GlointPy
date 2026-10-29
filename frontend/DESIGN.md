# DESIGN.md — GLOINT (página pública)

Dirección: **negro, oro y plata**, tomada del nuevo logotipo (G dorada facetada + wordmark plateado con globo dorado).
Sensación: sobria, premium, financiera. Poco color, mucho aire, el oro solo donde hay una acción o un dato clave.
Nota: no se basó en sitios de referencia de UXKIN (el servidor no está conectado); la dirección sale del logo y de las reglas de contraste/jerarquía.

## Color (la página pública es solo oscura, como el logo; el panel interno no se toca)

| Token | Valor | Rol |
|---|---|---|
| `--g-bg` | `#050505` | Fondo de página (igual al fondo del logo) |
| `--g-surface` | `#0E0E10` | Secciones alternas y tarjetas |
| `--g-surface-2` | `#17171A` | Tarjetas elevadas, campos |
| `--g-border` | `rgba(255,255,255,0.10)` | Líneas y bordes |
| `--g-text` | `#F5F3EE` | Texto principal (contraste ≈ 18:1) |
| `--g-text-muted` | `#A8A49A` | Texto secundario (≈ 8:1) |
| `--g-silver` | `#C9CCD1` | Títulos secundarios, iconos, cifras |
| `--g-gold` | `#D4A537` | Acción principal, enlaces, acento único |
| `--g-gold-light` | `#F3D27A` | Brillo del degradado del botón y de líneas |
| `--g-gold-deep` | `#8F6A1A` | Extremo oscuro del degradado, bordes dorados |
| `--g-on-gold` | `#140E02` | Texto sobre botones dorados (≈ 9:1) |
| `--g-success / warning / error` | `#4ADE80 / #FBBF24 / #F87171` | Estados de formularios |

Sin naranja, sin azul, sin morado. El dorado es el único acento.

## Tipografía
- Títulos: **Montserrat** 600/700/800 (ya cargada; geométrica como "GROUP" del logo).
- Cuerpo: **Inter** 400/500/600.
- Escala: 12 / 14 / 16 / 18 / 24 / 36 / 56 / 72 px; títulos con interlineado 1.1–1.2, cuerpo 1.6. Cuerpo mínimo 16 px, líneas de 60–75 caracteres.
- Rótulos pequeños: Montserrat 12 px, mayúsculas, tracking 0.24em (eco del "G R O U P").
- Sin texto con degradado en títulos.

## Espacio
Escala de 8 px (4, 8, 16, 24, 32, 48, 64, 96, 128). Secciones: 96 px arriba/abajo en escritorio, 64 px en móvil. Ancho de contenido 1200 px, margen lateral 24 px (16 px en móvil).

## Forma y profundidad
Radios: 4 px (campos), 8 px (botones y tarjetas), 999 px (etiquetas). Ángulos más rectos que antes, como las facetas de la G.
Sombras: ninguna en reposo; botón principal con brillo dorado suave (`0 0 32px rgba(212,165,55,.25)`) al pasar el cursor o enfocar.

## Componentes
- **Botón primario**: degradado `gold-light → gold → gold-deep`, texto `on-gold`, 48 px de alto. Hover: más brillo. Focus: anillo de 2 px `gold-light` con separación de 2 px. Deshabilitado: 40 % de opacidad.
- **Botón secundario**: borde `gold-deep`, texto `gold-light`, fondo transparente.
- **Enlace discreto**: texto `silver`, subrayado al pasar el cursor.
- **Tarjeta**: fondo `surface`, borde `border`, radio 8; no todas iguales (una destacada más grande por sección).
- **Navegación**: fija, transparente al inicio y `#050505` con borde inferior al desplazarse; logo a la izquierda.
- **Pie**: fondo `surface`, datos legales de la empresa en `text-muted`.

## Imágenes e iconos
- Logos en `public/logos/brand/`: marca completa (G + wordmark), solo wordmark y solo la G. Fondo negro, por eso la página es oscura.
- Iconos: lucide-react, trazo 1.5, color `silver` (dorado solo si es acción). Sin emojis.
- Fotos: las existentes en `public/logos/`, con velo oscuro y sin filtros.
- Movimiento: una entrada suave por sección; respetar `prefers-reduced-motion`.
