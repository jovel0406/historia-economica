import { marked } from "marked";
import type { Consenso, EstadoEditorial, NivelEvidencia, Periodo, PesoAcademico, TipoArista } from "../schemas/index.ts";
import { CITA_REGEX } from "../validacion/citas.ts";
import { ANIO_ACTUAL, contenido } from "./contenido.ts";
import { enlace } from "./rutas.ts";

function enlazarCitas(texto: string): string {
  return texto.replace(CITA_REGEX, (_m, id: string) => `<a class="cita" href="${enlace(`/fuentes#${id}`)}" title="Ver fuente ${id}">${id}</a>`);
}

function escaparRegex(t: string): string {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let patronesGlosario: { id: string; re: RegExp }[] | undefined;

/** Patrones del glosario (mejora 5): término y variantes, palabra completa, sin distinguir mayúsculas. */
function patrones(): { id: string; re: RegExp }[] {
  if (patronesGlosario !== undefined) return patronesGlosario;
  const lista: { id: string; re: RegExp }[] = [];
  for (const t of contenido().glosario.values()) {
    const formas = [t.termino, ...t.variantes].sort((a, b) => b.length - a.length).map(escaparRegex);
    lista.push({ id: t.id, re: new RegExp(`(^|[^\\w\\[@/#-])(${formas.join("|")})(?![\\w-])`, "iu") });
  }
  patronesGlosario = lista;
  return lista;
}

/**
 * Enlaza la primera aparición de cada término del glosario. Solo si el término no está ya dentro de un
 * enlace o cita (el patrón exige que no lo preceda `[`, `@`, `/` o `#`).
 */
export function enlazarGlosario(md: string, omitir?: string): string {
  let salida = md;
  for (const { id, re } of patrones()) {
    if (id === omitir) continue;
    salida = salida.replace(re, (_m, antes: string, termino: string) => `${antes}[${termino}](${enlace(`/glosario#${id}`)})`);
  }
  return salida;
}

/** Markdown → HTML, con `[@id]` convertido en enlace a la bibliografía y términos del glosario enlazados. */
export function renderMarkdown(md: string, opciones: { sinGlosario?: boolean; omitirTermino?: string } = {}): string {
  const conGlosario = opciones.sinGlosario ? md : enlazarGlosario(md, opciones.omitirTermino);
  return marked.parse(enlazarCitas(conGlosario), { async: false, gfm: true });
}

/** Una sola línea (sin <p>), para listas de evidencia y notas. */
export function renderInline(texto: string, opciones: { sinGlosario?: boolean } = {}): string {
  const conGlosario = opciones.sinGlosario ? texto : enlazarGlosario(texto);
  return marked.parseInline(enlazarCitas(conGlosario), { async: false, gfm: true });
}

export function anioTexto(a: number): string {
  return a < 0 ? `${-a} a. C.` : String(a);
}

/** "c. 1500 – c. 1850", "1929 – 1939", "1978 – hoy". La precisión se muestra, no se esconde. */
export function periodoTexto(p: Periodo): string {
  const c = p.precision === "exacta" ? "" : "c. ";
  const fin = p.fin === null ? "hoy" : `${c}${anioTexto(p.fin)}`;
  if (p.fin !== null && p.fin === p.inicio) return `${c}${anioTexto(p.inicio)}`;
  return `${c}${anioTexto(p.inicio)} – ${fin}`;
}

export function finEfectivo(p: Periodo): number {
  return p.fin ?? ANIO_ACTUAL;
}

export const ETIQUETA_PRECISION: Record<Periodo["precision"], string> = {
  exacta: "fechas exactas",
  aproximada: "fechas aproximadas",
  disputada: "periodización disputada",
};

export const ETIQUETA_ESTADO: Record<EstadoEditorial, string> = {
  esqueleto: "esqueleto",
  borrador: "borrador",
  revisado: "revisado",
};

export const DESCRIPCION_ESTADO: Record<EstadoEditorial, string> = {
  esqueleto: "Solo título, período y resumen. Sin interpretaciones todavía.",
  borrador: "Contenido completo, pendiente de revisión editorial y de verificación de fuentes.",
  revisado: "Revisado y dado por bueno.",
};

export const ETIQUETA_CONSENSO: Record<Consenso, string> = {
  alto: "consenso alto",
  medio: "consenso medio",
  disputado: "disputada",
  marginal: "marginal",
};

export const ETIQUETA_ARISTA: Record<TipoArista, string> = {
  precondicion_de: "es precondición de",
  causa_directa_de: "es causa directa de",
  contiene: "contiene",
  respuesta_a: "es respuesta a",
  ruptura_de: "es ruptura de",
  alternativa_rechazada: "es alternativa rechazada frente a",
  amplifica: "amplifica",
};

export const ETIQUETA_PESO: Record<PesoAcademico, string> = {
  dominante: "dominante",
  sustancial: "sustancial",
  minoritaria: "minoritaria",
  marginal: "marginal",
};

export const ETIQUETA_EVIDENCIA: Record<NivelEvidencia, string> = {
  estadistica_oficial: "estadística oficial",
  reconstruccion_documentada: "reconstrucción documentada",
  estimacion_conjetural: "estimación conjetural",
};
