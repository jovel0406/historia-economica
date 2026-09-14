import type { Hallazgo, Informe } from "./hallazgos.ts";

const PREFIJO: Record<Hallazgo["nivel"], string> = {
  error: "✖ error",
  advertencia: "⚠ advertencia",
  info: "ℹ info",
};

/** Texto para consola, agrupado por archivo. */
export function formatearInforme(informe: Informe, opciones: { estricto: boolean; mostrarInfo?: boolean }): string {
  const mostrarInfo = opciones.mostrarInfo ?? true;
  const lineas: string[] = [];
  const porArchivo = new Map<string, Hallazgo[]>();
  for (const h of informe.hallazgos) {
    if (h.nivel === "info" && !mostrarInfo) continue;
    const lista = porArchivo.get(h.archivo) ?? [];
    lista.push(h);
    porArchivo.set(h.archivo, lista);
  }
  for (const archivo of [...porArchivo.keys()].sort()) {
    lineas.push(archivo);
    for (const h of porArchivo.get(archivo) ?? []) {
      const ruta = h.ruta !== undefined ? ` [${h.ruta}]` : "";
      lineas.push(`  ${PREFIJO[h.nivel]} (${h.regla})${ruta}: ${h.mensaje}`);
    }
  }
  const e = informe.errores.length;
  const a = informe.advertencias.length;
  const i = informe.infos.length;
  lineas.push("");
  lineas.push(`${e} error(es), ${a} advertencia(s), ${i} info(s)${opciones.estricto ? " — modo estricto: las advertencias fallan" : ""}`);
  lineas.push(informe.falla(opciones.estricto) ? "RESULTADO: FALLA" : "RESULTADO: OK");
  return lineas.join("\n");
}
