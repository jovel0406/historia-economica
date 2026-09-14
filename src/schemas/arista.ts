import { z } from "zod";
import { NodeId, SchoolId, SourceId, TextoNoVacio } from "./comunes.ts";

/** Grafo causal (SPEC §4.3). Las aristas `disputado` son las más interesantes de la plataforma. */

export const TipoArista = z.enum([
  "precondicion_de",
  "causa_directa_de",
  "contiene",
  "respuesta_a",
  "ruptura_de",
  "alternativa_rechazada",
  "amplifica",
]);
export type TipoArista = z.infer<typeof TipoArista>;

export const Consenso = z.enum(["alto", "medio", "disputado", "marginal"]);
export type Consenso = z.infer<typeof Consenso>;

export const Arista = z
  .strictObject({
    desde: NodeId,
    hacia: NodeId,
    tipo: TipoArista,
    consenso: Consenso,
    /** Escuelas que afirman esta arista. */
    sostenida_por: z.array(SchoolId).optional(),
    /** Escuelas que la rechazan. */
    negada_por: z.array(SchoolId).optional(),
    nota: TextoNoVacio,
    fuentes: z.array(SourceId),
  })
  .superRefine((a, ctx) => {
    if (a.desde === a.hacia) {
      ctx.addIssue({ code: "custom", path: ["hacia"], message: "una arista no puede ir de un nodo a sí mismo" });
    }
    const sostenida = a.sostenida_por ?? [];
    const negada = a.negada_por ?? [];
    if (a.consenso === "disputado") {
      if (sostenida.length === 0) {
        ctx.addIssue({ code: "custom", path: ["sostenida_por"], message: 'una arista "disputado" debe decir qué escuelas la sostienen' });
      }
      if (negada.length === 0) {
        ctx.addIssue({ code: "custom", path: ["negada_por"], message: 'una arista "disputado" debe decir qué escuelas la niegan' });
      }
    }
    if (a.consenso === "marginal" && sostenida.length === 0) {
      ctx.addIssue({ code: "custom", path: ["sostenida_por"], message: 'una arista "marginal" debe decir qué escuela minoritaria la sostiene' });
    }
    const enAmbas = sostenida.filter((s) => negada.includes(s));
    if (enAmbas.length > 0) {
      ctx.addIssue({ code: "custom", path: ["negada_por"], message: `una escuela no puede sostener y negar la misma arista: ${enAmbas.join(", ")}` });
    }
  });
export type Arista = z.infer<typeof Arista>;

/** Clave de identidad de una arista, para detectar duplicados y contradicciones entre archivos. */
export function claveArista(a: Pick<Arista, "desde" | "hacia" | "tipo">): string {
  return `${a.desde} --${a.tipo}--> ${a.hacia}`;
}
