/** Citas en línea dentro de texto markdown: `[@id-de-fuente]` (SPEC §8: ninguna cifra en prosa sin su SourceId). */
export const CITA_REGEX = /\[@([a-z0-9]+(?:-[a-z0-9]+)*)\]/g;

/** Ids de fuente citados en un texto, sin repetir, en orden de aparición. */
export function citasEn(texto: string): string[] {
  const ids: string[] = [];
  for (const m of texto.matchAll(CITA_REGEX)) {
    const id = m[1];
    if (id !== undefined && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
