import { z } from "zod";
import { Anio, Marcadores, SourceId, TextoNoVacio } from "./comunes.ts";

/**
 * Bibliografía (SPEC §4.5). Toda fuente nace con `verified: false`.
 * Los campos que no se puedan confirmar se dejan en blanco (`autores: []`, `anio: null`, sin `doi`/`url`);
 * NUNCA se rellenan con valores plausibles (SPEC §1.1).
 */

export const TipoFuente = z.enum(["libro", "articulo", "dataset", "documento_oficial", "capitulo"]);
export type TipoFuente = z.infer<typeof TipoFuente>;

export const CitationStatus = z.enum(["verificada", "pendiente_de_verificacion", "dudosa"]);
export type CitationStatus = z.infer<typeof CitationStatus>;

/**
 * Cotejo automático contra un catálogo. Es un dato, no una frase: así la interfaz lo muestra
 * compacto y `nota_verificacion` queda libre para lo que de verdad hay que contar de cada ficha.
 * Cotejar no es verificar: solo `verified` marca la comprobación hecha a mano.
 */
export const Catalogo = z.enum(["crossref", "open-library", "repositorio", "sitio-oficial"]);
export type Catalogo = z.infer<typeof Catalogo>;

export const Cotejo = z.strictObject({
  catalogo: Catalogo,
  fecha: z.iso.date(),
  /** El catálogo devolvió un DOI que resuelve a esta obra. */
  doi_resuelto: z.boolean().default(false),
});
export type Cotejo = z.infer<typeof Cotejo>;

/** Forma sintáctica de un DOI (prefijo 10.xxxx/sufijo). No comprueba que exista. */
export const DOI_REGEX = /^10\.\d{4,9}\/\S+$/i;

export const Fuente = z
  .strictObject({
    ...Marcadores,
    id: SourceId,
    tipo: TipoFuente,
    autores: z.array(TextoNoVacio),
    titulo: TextoNoVacio,
    anio: Anio.nullable(),
    publicacion: TextoNoVacio.optional(),
    editorial: TextoNoVacio.optional(),
    doi: z.string().regex(DOI_REGEX, "no tiene forma de DOI (10.xxxx/...)").optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
    cotejo: Cotejo.optional(),
    verified: z.boolean().default(false),
    citation_status: CitationStatus.default("pendiente_de_verificacion"),
    nota_verificacion: TextoNoVacio.optional(),
  })
  .superRefine((f, ctx) => {
    if (f.verified && f.citation_status !== "verificada") {
      ctx.addIssue({
        code: "custom",
        path: ["citation_status"],
        message: 'una fuente con verified: true debe tener citation_status "verificada"',
      });
    }
    if (!f.verified && f.citation_status === "verificada") {
      ctx.addIssue({
        code: "custom",
        path: ["verified"],
        message: 'citation_status "verificada" exige verified: true (la verificación es manual y explícita)',
      });
    }
    if (f.verified && !f.nota_verificacion) {
      ctx.addIssue({
        code: "custom",
        path: ["nota_verificacion"],
        message: "una fuente verificada debe registrar en nota_verificacion cómo y cuándo se comprobó",
      });
    }
  });
export type Fuente = z.infer<typeof Fuente>;
export type FuenteEntrada = z.input<typeof Fuente>;

/** `content/fuentes/bibliografia.json` es un arreglo de fuentes con ids únicos. */
export const Bibliografia = z.array(Fuente).superRefine((fuentes, ctx) => {
  const vistos = new Map<string, number>();
  fuentes.forEach((f, i) => {
    const previo = vistos.get(f.id);
    if (previo !== undefined) {
      ctx.addIssue({ code: "custom", path: [i, "id"], message: `id duplicado "${f.id}" (ya aparece en la posición ${previo})` });
    } else {
      vistos.set(f.id, i);
    }
  });
});
export type Bibliografia = z.infer<typeof Bibliografia>;
