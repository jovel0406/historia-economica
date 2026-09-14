/** Acceso a las series y observaciones ingeridas (data/series, data/processed) en tiempo de build. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DatasetManifiesto, IndicatorId, Observacion, Serie } from "../schemas/index.ts";
import { FilaCsv } from "../schemas/index.ts";
import { contenido } from "./contenido.ts";

const cacheObs = new Map<string, Observacion[]>();

export function leerObservaciones(s: Serie): Observacion[] {
  const previo = cacheObs.get(s.id);
  if (previo !== undefined) return previo;
  const texto = readFileSync(join(contenido().raiz, s.archivo), "utf8");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(1);
  const obs = lineas.map((l) => {
    const [serie, region, anio, valor, nota] = l.split(",");
    return FilaCsv.parse({ serie, region, anio, valor, nota });
  });
  cacheObs.set(s.id, obs);
  return obs;
}

export function seriesOrdenadas(): Serie[] {
  return [...contenido().series.values()].sort((a, b) => a.indicador.localeCompare(b.indicador) || a.cobertura_temporal[0] - b.cobertura_temporal[0] || a.id.localeCompare(b.id));
}

export function seriesDeIndicador(id: IndicatorId): Serie[] {
  return seriesOrdenadas().filter((s) => s.indicador === id);
}

export function dataset(id: string): DatasetManifiesto | undefined {
  return contenido().manifiesto.datasets.find((d) => d.id === id);
}

export function nombreRegion(id: string): string {
  return contenido().regiones.get(id)?.nombre ?? id;
}

export function csvDe(s: Serie): string {
  return readFileSync(join(contenido().raiz, s.archivo), "utf8");
}
