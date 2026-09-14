import { z } from "zod";
import { Marcadores, SchoolId, SourceId, TextoNoVacio } from "./comunes.ts";

/** Escuelas interpretativas mínimas para la v1 (SPEC §4.6). El validador advierte si falta alguna. */
export const ESCUELAS_MINIMAS_V1 = [
  "institucionalista",
  "escuela-california",
  "precios-relativos",
  "cultural-capital-humano",
  "sistema-mundo-dependencia",
  "monetarista",
  "keynesiana",
  "estructuralista-cepalina",
  "estado-desarrollista",
] as const;

export const Escuela = z.strictObject({
  ...Marcadores,
  id: SchoolId,
  nombre: TextoNoVacio,
  /** Descripción del postulado central de la escuela. */
  postulado_central: TextoNoVacio,
  /** Referencias a `content/fuentes/bibliografia.json`. Puede estar vacío mientras no haya fuentes verificables. */
  autores_representativos: z.array(SourceId),
  /** La crítica principal que recibe la escuela. */
  critica_principal: TextoNoVacio,
});
export type Escuela = z.infer<typeof Escuela>;
