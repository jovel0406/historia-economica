import { z } from "zod";
import { Markdown, SchoolId, SeriesId, SourceId, TextoNoVacio } from "./comunes.ts";

/**
 * Interpretación: entidad de primera clase, no nota al pie (SPEC §4.2).
 * `que_la_refutaria` es obligatorio y no admite formulaciones vacuas.
 */

export const PesoAcademico = z.enum(["dominante", "sustancial", "minoritaria", "marginal"]);
export type PesoAcademico = z.infer<typeof PesoAcademico>;

/** Longitud mínima (en caracteres) de `que_la_refutaria`. Heurística: una condición de refutación real no cabe en menos. */
export const LONGITUD_MINIMA_REFUTACION = 40;

/**
 * Formulaciones vacuas conocidas, comparadas contra el texto normalizado (minúsculas, sin puntuación final).
 * La lista es una heurística; la longitud mínima hace el grueso del trabajo.
 */
const FORMULACIONES_VACUAS: readonly RegExp[] = [
  /^(la |una |nueva |mas |más |otra )?(evidencia|datos|pruebas|informacion|información)( empirica| empírica| nueva| adicional)?( (en|de) contra| contraria| contrarios| contrarias| que la (contradiga|refute|desmienta))?$/,
  /^(que se )?(demuestre|demostrar|probar|pruebe) (lo|el) contrario$/,
  /^(lo contrario|todo lo contrario|nada|ninguna|ninguno|todo|pendiente|por definir|por escribir|a definir|n\/a|na|tbd|sin definir|no aplica)$/,
  /^(evidencia|datos) que (la|lo) (refute|refuten|contradiga|contradigan)$/,
];

export function esFormulacionVacua(texto: string): boolean {
  const normalizado = texto
    .trim()
    .toLowerCase()
    .replace(/[.!…:;,]+$/u, "")
    .replace(/\s+/g, " ");
  return FORMULACIONES_VACUAS.some((re) => re.test(normalizado));
}

export const QueLaRefutaria = z
  .string()
  .trim()
  .min(
    LONGITUD_MINIMA_REFUTACION,
    `que_la_refutaria debe describir una condición concreta de refutación (mínimo ${LONGITUD_MINIMA_REFUTACION} caracteres)`,
  )
  .refine((t) => !esFormulacionVacua(t), {
    message: 'que_la_refutaria es vacua ("evidencia en contra" y similares no cuentan): decí qué observación concreta la refutaría',
  })
  .refine((t) => !/^TODO\b/.test(t), { message: "que_la_refutaria no puede quedar como TODO: si no se puede responder, la interpretación no está bien formulada" });

export const Interpretacion = z.strictObject({
  escuela: SchoolId,
  /** El enlace causal propuesto, en una frase. */
  mecanismo: TextoNoVacio,
  desarrollo: Markdown,
  autores_principales: z.array(SourceId),
  evidencia_a_favor: z.array(TextoNoVacio),
  evidencia_en_contra: z.array(TextoNoVacio),
  que_la_refutaria: QueLaRefutaria,
  /** Series ingeridas con las que la condición de refutación podría contrastarse (mejora 3). Vacío = no contrastable todavía. */
  contrastable_con: z.array(SeriesId).default([]),
  peso_academico: PesoAcademico,
});
export type Interpretacion = z.infer<typeof Interpretacion>;
