# Historia económica mundial — plataforma interactiva

Herramienta argumentativa para explorar la transformación de la economía mundial en cuatro
dimensiones: tiempo, espacio, datos e interpretaciones en disputa. La pregunta central:

> ¿Por qué el crecimiento económico moderno ocurrió cuándo y dónde ocurrió, y por qué se
> distribuyó tan desigualmente?

La especificación completa está en [docs/SPEC.md](docs/SPEC.md). Las reglas innegociables de
integridad epistémica (§1) mandan sobre todo lo demás: ninguna fuente, cifra ni API inventada.

## Estado

**v1 completa y ampliada** (2026-09-14): los siete hitos del SPEC §9 más dieciocho mejoras
(recorridos, páginas de arista, contrafactuales contrastables, glosario, búsqueda, comparador de
fuentes, exportación, verificación de fuentes, historial, sesgo léxico, regresión estructural;
D30–D47 en `docs/DECISIONES.md`).

- Fundamentos: esquemas Zod, validador con integridad referencial, citas `[@id]`, hashes del
  manifiesto y filas de CSV; 94 tests.
- Contenido: 5 nodos con interpretaciones en disputa (`borrador`), 25 nodos `esqueleto`, 11
  escuelas (las nueve mínimas, neoclásica-cliométrica y marxista), 5 lentes Costa Rica / América
  Latina y 77 fuentes cotejadas contra catálogos, todas `verified: false` hasta que el autor las
  verifique a mano.
- Datos: ingesta de la Maddison Project Database 2020, la Penn World Table 10.0 y la World Population
  Prospects 2024 con procedencia y hashes en `data/MANIFIESTO.json`; 11 series con nivel de evidencia.
- Vistas: Tiempo (D3), Espacio (mapa coroplético con advertencia de anacronismo y agregación a
  macrorregión antes de 1900), Datos (Observable Plot, badges, notas, descarga de CSV), Debate
  (en cada nodo, con comparación de dos escuelas), Grafo (D3, subgrafo ancestral «según quién»)
  y selector global de escuela que reencuadra el sitio.
- Despliegue: flujo de GitHub Pages en `.github/workflows/deploy.yml`.

Queda como trabajo editorial, no técnico: verificar fuentes, pasar nodos de `borrador` a
`revisado`, redactar esqueletos, y cargar imágenes con licencia.

## Requisitos

- Linux (desarrollado en Pop!_OS). Node ≥ 24. `pnpm` vía `corepack enable pnpm`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm install` | instala dependencias (pnpm 12 aprueba solo el build script de esbuild, ver `pnpm-workspace.yaml`) |
| `pnpm run validar` | valida `content/` y `data/` contra los esquemas y la integridad referencial; los placeholders son advertencias |
| `pnpm run validar:estricto` | igual, pero las advertencias fallan; es la puerta de entrada de `pnpm run build` |
| `pnpm run bibliografia:reporte` | lista las fuentes pendientes de verificación y qué contenido depende de cada una (`--json`, `--fallar-si-pendientes`) |
| `pnpm test` / `pnpm run test:cobertura` | tests con Vitest; la cobertura exige ≥ 90 % en esquemas, validador e ingesta |
| `pnpm run check` | `astro check` + `tsc --noEmit` |
| `pnpm run build` | `validar:estricto && astro build`: si el contenido no pasa, no hay sitio |
| `pnpm run bibliografia:verificar -- <id> --estado verificada\|dudosa --nota "…"` | registra una verificación manual de fuente |
| `pnpm run sesgo` | lista resúmenes con vocabulario de una sola escuela; termina con 1 si hay alguno |
| `pnpm run test:regresion` | construye el sitio y compara la estructura de diez páginas con las instantáneas |
| `pnpm run ingesta` | corre todos los adaptadores (`ingesta:maddison`, `ingesta:pwt`): descarga, hash, normaliza, escribe `data/processed/` y el manifiesto. `-- --reutilizar` evita volver a descargar |
| `pnpm run dev` | servidor de desarrollo de Astro |

## Cómo escribir contenido

- Un nodo = `content/nodos/<id>.json`. Estado `esqueleto` (título, período, regiones, resumen,
  unidades) o `borrador`/`revisado` (≥ 2 interpretaciones, cada una con `que_la_refutaria`).
- Las citas en los textos se escriben `[@id-de-fuente]`; el validador exige que el id exista y la
  interfaz las convierte en enlaces a `/fuentes`. Ninguna cifra en prosa sin su cita.
- Toda fuente nueva entra en `content/fuentes/bibliografia.json` con `verified: false` y solo los
  campos confirmados. `pnpm run bibliografia:reporte` lista las pendientes.
- Imágenes: archivo en `public/medios/` y entrada `medios[]` en el nodo con crédito y licencia.

## Versiones usadas (verificadas en el registro de npm el 2026-09-13)

| Paquete | Versión | Nota |
|---|---|---|
| astro | 7.3.2 | sitio estático; islas de React/Svelte solo cuando haya interactividad real (Hito 4+) |
| zod | 4.6.5 | API v4 (`z.strictObject`, `z.url`, `z.iso.date`); los tipos TS se derivan de aquí |
| typescript | 6.0.3 | no 7.x: `@astrojs/check` solo acepta `^5 \|\| ^6` |
| vitest | 5.0.0 | compatible con el Vite 8 que trae Astro 7 |
| @vitest/coverage-v8 | 5.0.0 | |
| @astrojs/check | 0.9.10 | |
| d3 | 7.9.0 | línea de tiempo (build), grafo de fuerzas y mapa (cliente) |
| @observablehq/plot | 0.6.17 | gráficos de la Vista Datos |
| xlsx | 0.18.5 | lectura de los Excel de Maddison y PWT en la ingesta |
| topojson-client | 3.1.0 | geometrías del mapa |
| world-atlas | 2.0.2 | Natural Earth 1:110m en TopoJSON |
| world-countries | 5.1.0 | correspondencia ISO numérico ↔ alfa-3 y subregiones |
| marked | 18.0.13 | markdown → HTML para los textos de contenido |
| @types/d3 | 7.4.3 | |
| tsx | 4.23.13 | ejecuta los scripts `.ts` de `scripts/` |
| @types/node | 26.5.1 | |
| pnpm | 12.4.1 | fijado en `packageManager` |
| node | 24.20.0 | entorno de desarrollo |

No se instaló ninguna isla de React o Svelte: toda la interactividad cabe en scripts de página.

## Estructura

```
docs/SPEC.md                 especificación completa
docs/DECISIONES.md           registro de decisiones de arquitectura
docs/MODELO-DATOS.md         entidades, dónde vive cada una y cómo se unen
content/nodos/*.json         un archivo por nodo (id = nombre del archivo)
content/escuelas/*.json      escuelas interpretativas
content/fuentes/bibliografia.json
content/lentes/<nodo>.json   lente Costa Rica / América Latina, por nodo
content/regiones.json        regiones (macrorregiones y países)
content/indicadores.json     los siete indicadores canónicos
content/unidades.json        ocho unidades de referencia de la Vista Tiempo
content/backlog.md           nodos futuros, sin implementar
data/MANIFIESTO.json         procedencia de cada dataset (origen, versión, fecha, hash)
data/series/*.json           metadatos de cada serie (indicador, nivel de evidencia, CSV)
data/processed/*.csv         observaciones normalizadas, versionadas
data/raw/                    descargas sin tocar (ignoradas por git)
scripts/fetch/               adaptadores de ingesta: comun.ts, maddison.ts, pwt.ts, todos.ts
scripts/validar-contenido.ts
scripts/reporte-bibliografia.ts
src/schemas/                 esquemas Zod
src/validacion/              librería del validador (carga, referencias, citas, formato)
src/lib/                     acceso al contenido validado y utilidades de texto para las páginas
src/layouts/, src/styles/    diseño base
src/components/              LineaDeTiempo.astro (SVG), AvisoFuentes.astro
src/vistas/tiempo/layout.ts  geometría de la línea de tiempo (carriles, rangos de unidad), testeada
src/pages/                   index, tiempo, espacio, datos (+ csv), grafo, nodos/ (+ .md), aristas/, recorridos/, escuelas, fuentes, glosario, buscar (+ json), verificacion
content/recorridos/          recorridos guiados, uno por unidad
content/glosario.json        términos con definición citada
public/medios/               imágenes de los nodos (cada una con crédito y licencia en el nodo)
tests/                       Vitest; fixtures válidos e inválidos en tests/fixtures/
```

## Datos: procedencia y versiones

`data/MANIFIESTO.json` registra, por dataset, origen, versión, fecha de descarga, licencia, cita
requerida y el sha256 de cada archivo crudo y procesado. El validador comprueba los hashes de
`data/processed/` en cada build. Las descargas crudas (`data/raw/`) no se versionan; se regeneran con
`pnpm run ingesta`.

Versiones ingeridas: **Maddison Project Database 2020** y **Penn World Table 10.0**, descargadas del
sitio de Groningen. Existen la MPD 2023 y la PWT 10.01, pero se distribuyen por Dataverse detrás de un
muro anti-bots que la ingesta no esquiva. Para actualizarlas: descargar a mano `mpd2023_web.xlsx` y
`pwt1001.xlsx` (nombres, tamaños y SHA-1 oficiales en las notas del manifiesto) y adaptar las
constantes `URL_*`/`RUTA_RAW` de los adaptadores.

## Despliegue

Sitio estático en **GitHub Pages** mediante `.github/workflows/deploy.yml`. El flujo corre
`pnpm run build`, que valida el contenido en modo estricto antes de construir. Definí la variable
`ASTRO_SITE` del repositorio con la URL pública. Los enlaces internos son absolutos, así que el sitio
debe servirse desde la raíz de un dominio (sitio de usuario u organización, o dominio propio).
