import { z } from "zod";
import { Markdown, Slug, SourceId, TextoNoVacio } from "./comunes.ts";

/** Glosario (mejora 5): cada término lleva definición con cita y se enlaza automáticamente desde los textos. */
export const Termino = z.strictObject({
  id: Slug,
  termino: TextoNoVacio,
  /** Otras formas con las que aparece en los textos (plural, sigla, inglés). */
  variantes: z.array(TextoNoVacio).default([]),
  definicion: Markdown.pipe(z.string().trim().min(1)),
  fuentes: z.array(SourceId).min(1, "una definición sin fuente no entra al glosario"),
});
export type Termino = z.infer<typeof Termino>;

export const ArchivoGlosario = z.array(Termino).superRefine((lista, ctx) => {
  const ids = new Set<string>();
  lista.forEach((t, i) => {
    if (ids.has(t.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: `término duplicado "${t.id}"` });
    ids.add(t.id);
  });
});
