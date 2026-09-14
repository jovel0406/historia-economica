import { z } from "zod";
import { RegionId, TextoNoVacio } from "./comunes.ts";

/**
 * Regiones (`content/regiones.json`). Lista provisional: macrorregiones para datos anteriores a 1900
 * (SPEC §5.2, anacronismo de fronteras) y países solo cuando un nodo los necesita.
 * TODO(Hito 3): alinear los ids de macrorregión con la agregación regional que use Maddison.
 */

export const TipoRegion = z.enum(["mundo", "macrorregion", "pais"]);
export type TipoRegion = z.infer<typeof TipoRegion>;

export const Region = z.strictObject({
  id: RegionId,
  nombre: TextoNoVacio,
  tipo: TipoRegion,
  /** Macrorregión que contiene a un país, o "mundo" para una macrorregión. */
  contenida_en: RegionId.optional(),
  nota: TextoNoVacio.optional(),
});
export type Region = z.infer<typeof Region>;

export const ArchivoRegiones = z.array(Region).superRefine((lista, ctx) => {
  const ids = new Set<string>();
  lista.forEach((r, i) => {
    if (ids.has(r.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `región duplicada "${r.id}"` });
    ids.add(r.id);
  });
  lista.forEach((r, i) => {
    if (r.tipo === "mundo" && r.contenida_en !== undefined) {
      ctx.addIssue({ code: "custom", path: [i, "contenida_en"], message: '"mundo" no está contenida en nada' });
    }
    if (r.tipo !== "mundo" && r.contenida_en === undefined) {
      ctx.addIssue({ code: "custom", path: [i, "contenida_en"], message: `la región "${r.id}" debe declarar en qué región está contenida` });
    }
    if (r.contenida_en !== undefined && !ids.has(r.contenida_en)) {
      ctx.addIssue({ code: "custom", path: [i, "contenida_en"], message: `la región contenedora "${r.contenida_en}" no existe` });
    }
  });
});
