/**
 * Geometría de la Vista Tiempo (SPEC §5.1), sin DOM: se puede testear.
 * Bandas para procesos, marcadores para eventos, carriles sin solapamiento.
 */

export interface Intervalo {
  id: string;
  x0: number;
  x1: number;
}

/** Asigna a cada intervalo el primer carril libre (greedy por inicio). Devuelve id → índice de carril. */
export function asignarCarriles(items: Intervalo[], separacion = 8): Map<string, number> {
  const orden = [...items].sort((a, b) => a.x0 - b.x0 || b.x1 - b.x0 - (a.x1 - a.x0));
  const finales: number[] = [];
  const res = new Map<string, number>();
  for (const it of orden) {
    let carril = finales.findIndex((fin) => fin + separacion <= it.x0);
    if (carril === -1) {
      carril = finales.length;
      finales.push(it.x1);
    } else {
      finales[carril] = it.x1;
    }
    res.set(it.id, carril);
  }
  return res;
}

export interface NodoParaRango {
  id: string;
  periodo: { inicio: number; fin: number | null };
  unidades?: string[] | undefined;
}

export interface RangoUnidad {
  id: string;
  numero: number;
  inicio: number;
  fin: number;
  nodos: string[];
}

/**
 * Rango temporal de cada unidad, derivado de sus nodos (no se inventan fechas: D11).
 * Las unidades sin nodos no aparecen.
 */
export function rangosUnidades(unidades: { id: string; numero: number }[], nodos: NodoParaRango[], ahora: number): RangoUnidad[] {
  const rangos: RangoUnidad[] = [];
  for (const u of unidades) {
    const miembros = nodos.filter((n) => (n.unidades ?? []).includes(u.id));
    if (miembros.length === 0) continue;
    rangos.push({
      id: u.id,
      numero: u.numero,
      inicio: Math.min(...miembros.map((n) => n.periodo.inicio)),
      fin: Math.max(...miembros.map((n) => n.periodo.fin ?? ahora)),
      nodos: miembros.map((n) => n.id),
    });
  }
  return rangos.sort((a, b) => a.numero - b.numero);
}

/** Ancho estimado de una etiqueta en píxeles (sin medir texto en el servidor). */
export function anchoEtiqueta(texto: string, tamanoFuente = 12): number {
  return texto.length * tamanoFuente * 0.56 + 16;
}
