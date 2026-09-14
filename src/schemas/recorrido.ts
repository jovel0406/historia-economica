import { z } from "zod";
import { Markdown, Marcadores, NodeId, Slug, TextoNoVacio } from "./comunes.ts";
import { UnidadId } from "./unidad.ts";

/**
 * Recorrido guiado (mejora 1): una secuencia corta de nodos por unidad, con una pregunta de apertura
 * y un cierre en la Vista Debate. Es una capa de lectura para clase, no un relato lineal de progreso.
 */
export const PasoRecorrido = z.strictObject({
  nodo: NodeId,
  /** Por qué este nodo viene ahora y qué mirar en él. Markdown con citas. */
  texto: Markdown.pipe(z.string().trim().min(1)),
});

export const Recorrido = z.strictObject({
  ...Marcadores,
  id: Slug,
  unidad: UnidadId,
  titulo: TextoNoVacio,
  pregunta_de_apertura: TextoNoVacio,
  pasos: z.array(PasoRecorrido).min(2, "un recorrido tiene al menos dos pasos"),
  /** Nodo cuya Vista Debate cierra el recorrido, y con qué pregunta. */
  cierre: z.strictObject({ nodo: NodeId, texto: TextoNoVacio }),
});
export type Recorrido = z.infer<typeof Recorrido>;
