# Historia económica mundial — plataforma interactiva

Herramienta argumentativa para explorar la transformación de la economía mundial en cuatro
dimensiones: tiempo, espacio, datos e interpretaciones en disputa. La pregunta central:

> ¿Por qué el crecimiento económico moderno ocurrió cuándo y dónde ocurrió, y por qué se
> distribuyó tan desigualmente?

La especificación completa está en [docs/SPEC.md](docs/SPEC.md). Las reglas innegociables de
integridad epistémica (§1) mandan sobre todo lo demás: ninguna fuente, cifra ni API inventada.

## Estado

**MVP de la línea de tiempo** (2026-09-13), adelantando partes de los Hitos 2, 4 y 5 por decisión
propia (ver D14 en `docs/DECISIONES.md`):

- Fundamentos del Hito 1: esquemas Zod, validador con integridad referencial, tests.
- Contenido real: 5 nodos con interpretaciones en disputa (`borrador`), 25 nodos `esqueleto`
  que sitúan el resto de la línea de tiempo, 10 escuelas, 5 lentes regionales y 64 fuentes
  cotejadas contra catálogos, todas `verified: false` hasta que el autor las verifique.
- Interfaz: inicio, Vista Tiempo (bandas, marcadores, bordes difuminados, cinta de unidades del
  curso, filtro y tooltip), páginas de nodo (Vista Debate embebida), escuelas y fuentes.
- Pendiente: ingesta de datos y Vista Datos (Hito 3), selector global de escuela (Hito 5),
  Vista Grafo (Hito 6), Vista Espacio (Hito 7).

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
| d3 | 7.9.0 | escalas de la línea de tiempo, calculadas en el build |
| marked | 18.0.13 | markdown → HTML para los textos de contenido |
| @types/d3 | 7.4.3 | |
| tsx | 4.23.13 | ejecuta los scripts `.ts` de `scripts/` |
| @types/node | 26.5.1 | |
| pnpm | 12.4.1 | fijado en `packageManager` |
| node | 24.20.0 | entorno de desarrollo |

Pendientes de instalar en hitos posteriores (versiones vigentes al 2026-09-13): `@observablehq/plot` 0.6.17,
`@astrojs/react` 6.0.5 o `@astrojs/svelte` 9.0.1 (solo si aparece interactividad que lo exija).

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
scripts/fetch/               un adaptador por dataset (Hito 3)
scripts/validar-contenido.ts
scripts/reporte-bibliografia.ts
src/schemas/                 esquemas Zod
src/validacion/              librería del validador (carga, referencias, citas, formato)
src/lib/                     acceso al contenido validado y utilidades de texto para las páginas
src/layouts/, src/styles/    diseño base
src/components/              LineaDeTiempo.astro (SVG), AvisoFuentes.astro
src/vistas/tiempo/layout.ts  geometría de la línea de tiempo (carriles, rangos de unidad), testeada
src/pages/                   index, tiempo, nodos/, escuelas, fuentes
public/medios/               imágenes de los nodos (cada una con crédito y licencia en el nodo)
tests/                       Vitest; fixtures válidos e inválidos en tests/fixtures/
```

## Despliegue

Sitio estático en **GitHub Pages** (decisión en [docs/DECISIONES.md](docs/DECISIONES.md)). El flujo de
despliegue se agrega cuando exista contenido publicable; hasta entonces `pnpm run build` es la única
puerta y falla si el contenido no pasa la validación estricta.
