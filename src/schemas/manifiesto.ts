import { z } from "zod";
import { DatasetId, Marcadores, TextoNoVacio } from "./comunes.ts";

/**
 * `data/MANIFIESTO.json` (SPEC §6): procedencia de cada dataset. Sin entrada aquí, el dato no entra al repositorio.
 * Lo escriben los adaptadores de `scripts/fetch/` (SPEC §7); no se edita a mano.
 */

export const ArchivoManifestado = z.strictObject({
  /** Ruta relativa a la raíz del repositorio. */
  ruta: z.string().regex(/^data\/(raw|processed)\/.+$/, "debe estar bajo data/raw/ o data/processed/"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/, "sha256 en hexadecimal minúscula, 64 caracteres"),
  bytes: z.number().int().nonnegative().optional(),
});
export type ArchivoManifestado = z.infer<typeof ArchivoManifestado>;

export const DatasetManifiesto = z.strictObject({
  ...Marcadores,
  id: DatasetId,
  nombre: TextoNoVacio,
  institucion: TextoNoVacio,
  url: z.url({ protocol: /^https?$/ }),
  /** Versión exacta publicada por la institución (ej. "2023"). */
  version: TextoNoVacio,
  /** Fecha ISO (AAAA-MM-DD) de la descarga. */
  fecha_descarga: z.iso.date(),
  licencia: TextoNoVacio,
  /** Forma de citación que exige la institución, textual. */
  cita_requerida: TextoNoVacio,
  archivos: z.array(ArchivoManifestado).min(1, "un dataset debe registrar al menos un archivo con su hash"),
  notas: TextoNoVacio.optional(),
});
export type DatasetManifiesto = z.infer<typeof DatasetManifiesto>;

export const Manifiesto = z
  .strictObject({
    datasets: z.array(DatasetManifiesto),
  })
  .superRefine((m, ctx) => {
    const ids = new Set<string>();
    m.datasets.forEach((d, i) => {
      if (ids.has(d.id)) ctx.addIssue({ code: "custom", path: ["datasets", i, "id"], message: `dataset duplicado "${d.id}"` });
      ids.add(d.id);
    });
  });
export type Manifiesto = z.infer<typeof Manifiesto>;
