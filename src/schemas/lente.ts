import { z } from "zod";
import { Marcadores, NodeId, SourceId, TextoNoVacio } from "./comunes.ts";

/**
 * Lente Costa Rica / América Latina (SPEC §4.8): ¿qué pasaba acá durante este nodo?
 * Vive en `content/lentes/<nodo>.json` como arreglo de entradas; el validador la une al nodo.
 */

export const RegionLente = z.enum(["costa-rica", "america-latina"]);
export type RegionLente = z.infer<typeof RegionLente>;

export const LensEntry = z.strictObject({
  ...Marcadores,
  nodo: NodeId,
  region: RegionLente,
  texto: TextoNoVacio,
  fuentes: z.array(SourceId),
});
export type LensEntry = z.infer<typeof LensEntry>;

export const ArchivoLentes = z.array(LensEntry).min(1, "un archivo de lente no puede estar vacío");
export type ArchivoLentes = z.infer<typeof ArchivoLentes>;
