import { z } from "zod";
import { TextoNoVacio } from "./comunes.ts";

/**
 * Identidad y autoría del proyecto (`content/proyecto.json`). De aquí salen la licencia, el archivo de
 * citación, los metadatos del sitio y la página de créditos: un solo lugar, para que no se contradigan.
 *
 * Los valores entre «comillas angulares» son marcadores sin completar: el validador los reporta y el
 * build en modo estricto falla, para que el sitio nunca se publique con una autoría sin definir.
 */
export const MARCADOR = /«[^»]+»/;

export const Autor = z.strictObject({
  /** Nombre como debe aparecer en la licencia, la citación y los metadatos. */
  nombre: TextoNoVacio,
  /** Apellidos y nombre de pila, para la citación académica (CITATION.cff, CFF 1.2.0). */
  apellidos: TextoNoVacio,
  nombre_de_pila: TextoNoVacio,
  seudonimo: TextoNoVacio.optional(),
  email: z.email().optional(),
  orcid: z.string().regex(/^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "ORCID completo, ej. https://orcid.org/0000-0002-1825-0097").optional(),
  afiliacion: TextoNoVacio.optional(),
});
export type Autor = z.infer<typeof Autor>;

export const Licencia = z.strictObject({
  /** Identificador SPDX, ej. "CC-BY-4.0" o "MIT". */
  spdx: TextoNoVacio,
  nombre: TextoNoVacio,
  url: z.url({ protocol: /^https?$/ }),
  archivo: TextoNoVacio,
  /** Qué cubre esta licencia, en una frase. */
  cubre: TextoNoVacio,
});

export const Proyecto = z.strictObject({
  titulo: TextoNoVacio,
  subtitulo: TextoNoVacio,
  descripcion: TextoNoVacio,
  autor: Autor,
  anio: z.number().int().min(2000).max(2100),
  version: TextoNoVacio,
  repositorio: z.url({ protocol: /^https?$/ }).or(z.string().regex(MARCADOR)),
  sitio: z.url({ protocol: /^https?$/ }).or(z.string().regex(MARCADOR)),
  licencia_contenido: Licencia,
  licencia_codigo: Licencia,
});
export type Proyecto = z.infer<typeof Proyecto>;

/** Rutas del objeto que todavía tienen un marcador sin completar. */
export function marcadoresPendientes(p: unknown, ruta = "$"): string[] {
  if (typeof p === "string") return MARCADOR.test(p) ? [ruta] : [];
  if (Array.isArray(p)) return p.flatMap((v, i) => marcadoresPendientes(v, `${ruta}[${i}]`));
  if (p !== null && typeof p === "object") return Object.entries(p as Record<string, unknown>).flatMap(([k, v]) => marcadoresPendientes(v, `${ruta}.${k}`));
  return [];
}
