import { z } from "zod";
import { Anio, DatasetId, Marcadores, RegionId, SeriesId, TextoNoVacio } from "./comunes.ts";
import { IndicatorId } from "./indicador.ts";

/**
 * Capa de datos (SPEC §4.4). Una `Serie` describe qué se mide, con qué evidencia y de dónde sale;
 * las observaciones viven en el CSV que indica `archivo`, bajo `data/processed/`.
 * `nivel_evidencia` no es metadato oculto: cada gráfico lo muestra como badge.
 */

export const NivelEvidencia = z.enum(["estadistica_oficial", "reconstruccion_documentada", "estimacion_conjetural"]);
export type NivelEvidencia = z.infer<typeof NivelEvidencia>;

/** Antes de este año, toda serie es reconstrucción o conjetura, no observación (SPEC §1.4, §11.6). */
export const UMBRAL_MEDICION = 1820;

export const Serie = z
  .strictObject({
    ...Marcadores,
    id: SeriesId,
    indicador: IndicatorId,
    /** id de dataset en `data/MANIFIESTO.json`. */
    fuente_dataset: DatasetId,
    cobertura_temporal: z.tuple([Anio, Anio]),
    cobertura_geografica: z.array(RegionId).min(1),
    unidad: TextoNoVacio,
    nivel_evidencia: NivelEvidencia,
    /** Qué se está midiendo realmente. */
    nota_metodologica: TextoNoVacio,
    /** Ej. "fronteras modernas aplicadas a datos de 1700". */
    advertencias: z.array(TextoNoVacio),
    /**
     * "regiones": la columna `region` del CSV usa ids de content/regiones.json.
     * "paises-iso3": usa códigos ISO 3166-1 alfa-3 (para el mapa); `cobertura_geografica` sigue siendo macro.
     */
    granularidad: z.enum(["regiones", "paises-iso3"]).default("regiones"),
    /**
     * ¿La fuente publica márgenes de error o intervalos para esta serie? (mejora 7). Si es true, el CSV lleva
     * columnas `valor_inf` y `valor_sup` y el gráfico dibuja la banda; si es false, el gráfico lo dice en vez de inventar un ancho.
     */
    margen_publicado: z.boolean().default(false),
    nota_margen: TextoNoVacio.optional(),
    /** Ruta del CSV relativa a la raíz del repositorio, dentro de data/processed/. */
    archivo: z.string().regex(/^data\/processed\/[a-z0-9_\-/]+\.csv$/, "debe ser un CSV bajo data/processed/"),
  })
  .superRefine((s, ctx) => {
    const [inicio, fin] = s.cobertura_temporal;
    if (fin < inicio) {
      ctx.addIssue({ code: "custom", path: ["cobertura_temporal"], message: `cobertura temporal invertida: ${inicio}–${fin}` });
    }
    if (inicio < UMBRAL_MEDICION && s.nivel_evidencia === "estadistica_oficial") {
      ctx.addIssue({
        code: "custom",
        path: ["nivel_evidencia"],
        message: `una serie que empieza en ${inicio} (antes de ${UMBRAL_MEDICION}) no puede ser "estadistica_oficial": es reconstrucción o estimación conjetural (SPEC §1.4)`,
      });
    }
  });
export type Serie = z.infer<typeof Serie>;

/** Una fila ya normalizada de `data/processed/*.csv`. */
export const Observacion = z.strictObject({
  serie: SeriesId,
  region: z.string().regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*|[A-Z]{3})$/),
  anio: Anio,
  valor: z.number(),
  valor_inf: z.number().optional(),
  valor_sup: z.number().optional(),
  nota: TextoNoVacio.optional(),
});
export type Observacion = z.infer<typeof Observacion>;

/** Fila cruda de CSV (todo texto) → observación. Lo usa el pipeline de ingesta (Hito 3). */
export const FilaCsv = z
  .object({
    serie: SeriesId,
    /** Id de región (slug) o código ISO 3166-1 alfa-3 en mayúsculas, según `granularidad`. */
    region: z.string().regex(/^(?:[a-z0-9]+(?:-[a-z0-9]+)*|[A-Z]{3})$/, "region debe ser un slug o un código ISO3"),
    anio: z.coerce.number().pipe(Anio),
    valor: z.coerce.number(),
    valor_inf: z.union([z.literal(""), z.coerce.number()]).optional(),
    valor_sup: z.union([z.literal(""), z.coerce.number()]).optional(),
    nota: z.string().optional(),
  })
  .transform((f) => {
    const obs: Observacion = { serie: f.serie, region: f.region, anio: f.anio, valor: f.valor };
    if (typeof f.valor_inf === "number") obs.valor_inf = f.valor_inf;
    if (typeof f.valor_sup === "number") obs.valor_sup = f.valor_sup;
    if (f.nota !== undefined && f.nota.trim().length > 0) obs.nota = f.nota.trim();
    return obs;
  });
