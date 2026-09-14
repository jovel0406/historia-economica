import { z } from "zod";
import { TextoNoVacio } from "./comunes.ts";

/** Conjunto cerrado y pequeño de indicadores canónicos (SPEC §4.7). No ampliar sin justificación. */
export const INDICADORES_CANONICOS = [
  "pib_per_capita",
  "esperanza_de_vida",
  "tasa_urbanizacion",
  "apertura_comercial",
  "desigualdad",
  "energia_per_capita",
  "salario_real",
] as const;

export const IndicatorId = z.enum(INDICADORES_CANONICOS);
export type IndicatorId = z.infer<typeof IndicatorId>;

export const Indicador = z.strictObject({
  id: IndicatorId,
  nombre: TextoNoVacio,
  /** Qué mide y qué no. */
  descripcion: TextoNoVacio,
  unidad_canonica: TextoNoVacio,
  nota: TextoNoVacio.optional(),
});
export type Indicador = z.infer<typeof Indicador>;

/** `content/indicadores.json`: exactamente los siete, una vez cada uno. */
export const ArchivoIndicadores = z.array(Indicador).superRefine((lista, ctx) => {
  const ids = lista.map((i) => i.id);
  for (const esperado of INDICADORES_CANONICOS) {
    const n = ids.filter((id) => id === esperado).length;
    if (n === 0) ctx.addIssue({ code: "custom", message: `falta el indicador canónico "${esperado}"` });
    if (n > 1) ctx.addIssue({ code: "custom", message: `el indicador "${esperado}" aparece ${n} veces` });
  }
});
