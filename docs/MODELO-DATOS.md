# Modelo de datos

Los esquemas viven en `src/schemas/` (Zod) y los tipos de TypeScript se derivan de ellos. Este
documento dice dónde vive cada entidad en el repositorio y cómo el validador las une. La definición
de campos está en [SPEC.md §4](SPEC.md).

| Entidad | Esquema | Archivo(s) | Clave |
|---|---|---|---|
| Node | `Nodo` | `content/nodos/<id>.json` | `id` = nombre del archivo |
| Interpretation | `Interpretacion` | dentro del nodo, `interpretaciones[]` | una por escuela y nodo |
| Edge | `Arista` | dentro del nodo, `aristas[]`; debe involucrar al nodo | (`desde`, `hacia`, `tipo`) |
| School | `Escuela` | `content/escuelas/<id>.json` | `id` |
| Source | `Fuente` | `content/fuentes/bibliografia.json` (arreglo) | `id` |
| LensEntry | `LensEntry` | `content/lentes/<nodo>.json` (arreglo, una entrada por región) | (`nodo`, `region`) |
| Region | `Region` | `content/regiones.json` | `id`; árbol con raíz `mundo` |
| Indicator | `Indicador` | `content/indicadores.json` | exactamente los siete canónicos |
| Unidad | `Unidad` | `content/unidades.json` | numeradas 1..n; los nodos las referencian en `unidades[]` |
| Recorrido | `Recorrido` | `content/recorridos/<id>.json` | `id`; pasos → nodos |
| Término | `Termino` | `content/glosario.json` | `id`; fuentes obligatorias |
| Medio | `Medio` | dentro del nodo, `medios[]`; archivo bajo `public/medios/` | ruta |
| Series | `Serie` | `data/series/<id>.json` (las escriben los adaptadores) | `id`; `archivo` → CSV; `granularidad` regiones o ISO3 |
| Observation | `Observacion` / `FilaCsv` | `data/processed/*.csv` (columnas `serie,region,anio,valor[,nota]`) | (`serie`, `region`, `anio`) |
| Manifiesto | `Manifiesto` | `data/MANIFIESTO.json` | `datasets[].id`; hash por archivo |

## Citas en línea

Los campos de texto (resumen, descripción larga, desarrollo, evidencias, notas de arista y de
periodización, lentes, escuelas) pueden citar con `[@id-de-fuente]`. El validador exige que el id
exista en la bibliografía (`referencia-cita`); la interfaz lo convierte en enlace.

## Referencias que el validador comprueba

- Nodo → regiones, unidades, fuentes, series; interpretación → escuela y fuentes; arista → nodos en
  ambos extremos (deben existir como archivo, aunque sea `esqueleto`), fuentes y escuelas.
- Escuela → fuentes. Lente → nodo (por nombre de archivo y por campo) y fuentes.
- Serie → dataset del manifiesto, regiones, CSV existente y manifestado con sha256 correcto; cada
  fila del CSV parsea, pertenece a la serie, usa una región o ISO3 válido y cae en la cobertura.
- Archivos de `data/raw/` en el manifiesto: hash verificado si están presentes; info si no (no se versionan).
- Entre archivos: una arista repetida con el mismo consenso es advertencia; con consenso distinto, error.

## Estados editoriales

| Estado | Mínimo exigido | Hallazgo |
|---|---|---|
| `esqueleto` | id, título, tipo, período, regiones, resumen | info |
| `borrador` | + ≥ 2 interpretaciones, descripción larga, ≥ 1 fuente | info |
| `revisado` | + evidencia a favor, en contra y autores en cada interpretación; lente regional | ninguno |

## Forma derivada

`NodoCompleto = Nodo & { lente_regional: LensEntry[] }`: es lo que consumen las vistas; se construye
uniendo `content/nodos/` con `content/lentes/`. El archivo del nodo nunca lleva la lente.

## Fixtures

Cualquier objeto con `_placeholder: true` es contenido de prueba: advertencia en desarrollo, error en
`pnpm run build`. Los fixtures de los tests viven aparte, en `tests/fixtures/{valido,invalido}/`.
