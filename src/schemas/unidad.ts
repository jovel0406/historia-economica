import { z } from "zod";
import { Anio, Slug, TextoNoVacio } from "./comunes.ts";

/**
 * Unidades de referencia para la Vista Tiempo (ver docs/DECISIONES.md, D11).
 * Son las ocho unidades oficiales del curso: organizan la línea de tiempo como capa de lectura,
 * no como periodización histórica. Un nodo puede pertenecer a varias unidades.
 */

export const UnidadId = Slug;
export type UnidadId = z.infer<typeof UnidadId>;

export const Unidad = z.strictObject({
  id: UnidadId,
  numero: z.number().int().min(1),
  titulo: TextoNoVacio,
  contenido_central: TextoNoVacio,
  /**
   * Rango orientativo para ubicar la unidad en la línea de tiempo.
   * TODO(editor): fijar estos rangos; no se rellenan sin confirmación.
   */
  periodo_orientativo: z
    .strictObject({ inicio: Anio, fin: Anio.nullable() })
    .refine((p) => p.fin === null || p.fin >= p.inicio, { message: "fin no puede ser anterior a inicio" })
    .optional(),
});
export type Unidad = z.infer<typeof Unidad>;

/** `content/unidades.json`: numeradas consecutivamente desde 1, sin ids repetidos. */
export const ArchivoUnidades = z.array(Unidad).superRefine((lista, ctx) => {
  const ids = new Set<string>();
  lista.forEach((u, i) => {
    if (ids.has(u.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `unidad duplicada "${u.id}"` });
    ids.add(u.id);
  });
  const numeros = lista.map((u) => u.numero).sort((a, b) => a - b);
  numeros.forEach((n, i) => {
    if (n !== i + 1) ctx.addIssue({ code: "custom", message: `las unidades deben numerarse 1..${lista.length} sin huecos ni repeticiones (encontrado ${numeros.join(", ")})` });
  });
});
