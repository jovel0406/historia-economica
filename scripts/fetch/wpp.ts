/**
 * Adaptador: World Population Prospects 2024, Naciones Unidas (DESA, Population Division).
 * Fuente primaria: https://population.un.org/wpp/ — archivo de indicadores demográficos, variante «Medium».
 * Se ingieren solo las estimaciones (años hasta 2023); las proyecciones se descartan.
 * Licencia y cita: la página las muestra con JavaScript y no se cotejaron automáticamente; ver nota del manifiesto.
 */
import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Observacion } from "../../src/schemas/index.ts";
import { actualizarManifiesto, descargar, ejecutarAdaptador, escribirCsv, escribirSerie, numero, rango, regionesDe, type Contexto } from "./comun.ts";
import { PAISES_MPD } from "./maddison.ts";

export const URL_WPP = "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_Demographic_Indicators_Medium.csv.gz";
export const RUTA_RAW = "data/raw/WPP2024_Demographic_Indicators_Medium.csv.gz";
export const ULTIMO_ANIO_ESTIMADO = 2023;

/** Agregados de la WPP → macrorregiones del proyecto (por nombre de «Location» con LocTypeName de región). */
export const REGIONES_WPP: Record<string, string> = {
  World: "mundo",
  "Latin America and the Caribbean": "america-latina",
  "Sub-Saharan Africa": "africa-subsahariana",
  "Northern America": "america-del-norte",
  "Eastern Asia": "asia-oriental",
  "Southern Asia": "asia-meridional",
  Oceania: "oceania",
  "Western Europe": "europa-occidental",
  "Eastern Europe": "europa-oriental",
};

function parsearCsv(texto: string): string[][] {
  // El archivo no usa comillas con comas internas en las columnas que leemos; se parte por coma.
  return texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0).map((l) => l.split(","));
}

export interface ResultadoWpp {
  paises: Observacion[];
  regiones: Observacion[];
  mapa: Observacion[];
}

/** Función pura sobre las filas del CSV. */
export function normalizarWpp(filas: string[][], idSerie = "wpp2024"): ResultadoWpp {
  const cab = filas[0] ?? [];
  const col = (n: string): number => {
    const i = cab.indexOf(n);
    if (i < 0) throw new Error(`el CSV no tiene la columna ${n}`);
    return i;
  };
  const iIso = col("ISO3_code");
  const iLoc = col("Location");
  const iTipo = col("LocTypeName");
  const iAnio = col("Time");
  const iLex = col("LEx");
  const iVar = col("Variant");
  const paises: Observacion[] = [];
  const mapa: Observacion[] = [];
  const regiones: Observacion[] = [];
  const vistasRegion = new Set<string>();
  for (const f of filas.slice(1)) {
    if ((f[iVar] ?? "") !== "Medium") continue;
    const anio = numero(f[iAnio]);
    const lex = numero(f[iLex]);
    if (anio === null || lex === null || anio > ULTIMO_ANIO_ESTIMADO) continue;
    const iso = (f[iIso] ?? "").trim();
    if (/^[A-Z]{3}$/.test(iso)) {
      mapa.push({ serie: `${idSerie}-esperanza-de-vida-mapa`, region: iso, anio, valor: lex });
      const region = PAISES_MPD[iso];
      if (region !== undefined) paises.push({ serie: `${idSerie}-esperanza-de-vida-paises`, region, anio, valor: lex });
      continue;
    }
    const nombre = (f[iLoc] ?? "").trim();
    const tipo = (f[iTipo] ?? "").trim();
    const region = REGIONES_WPP[nombre];
    // La WPP repite «Latin America and the Caribbean» como región geográfica y como región SDG: se toma una sola vez por año.
    if (region !== undefined && /region|World/i.test(tipo)) {
      const clave = `${region}:${anio}`;
      if (vistasRegion.has(clave)) continue;
      vistasRegion.add(clave);
      regiones.push({ serie: `${idSerie}-esperanza-de-vida-regiones`, region, anio, valor: lex });
    }
  }
  return { paises, regiones, mapa };
}

export async function ingerirWpp(ctx: Contexto): Promise<string[]> {
  const rawAbs = join(ctx.raiz, RUTA_RAW);
  const d = await descargar(URL_WPP, rawAbs, ctx);
  const filas = parsearCsv(gunzipSync(readFileSync(rawAbs)).toString("utf8"));
  const r = normalizarWpp(filas);
  const salida = [`${RUTA_RAW}: ${d.bytes} bytes, sha256 ${d.sha256}${d.reutilizado ? " (reutilizado)" : ""}`];
  const archivos: { ruta: string; sha256: string; bytes: number }[] = [{ ruta: RUTA_RAW, sha256: d.sha256, bytes: d.bytes }];
  const nota = "Esperanza de vida al nacer (ambos sexos), columna LEx de la variante «Medium» de las estimaciones de la WPP 2024. Para 1950–2023 son estimaciones basadas en censos, registros vitales y encuestas, con modelización demográfica en los países con registros incompletos: estadística oficial en el sentido de esta plataforma, pero con calidad muy desigual entre países. Se excluyen las proyecciones posteriores a 2023.";
  const escribir = (id: string, filas: Observacion[], granularidad: "regiones" | "paises-iso3", cobertura?: string[]): void => {
    if (filas.length === 0) throw new Error(`la serie ${id} quedó vacía`);
    const ruta = `data/processed/${id}.csv`;
    const h = escribirCsv(ctx.raiz, ruta, filas);
    archivos.push({ ruta, ...h });
    escribirSerie(ctx.raiz, {
      id,
      indicador: "esperanza_de_vida",
      fuente_dataset: "un-wpp-2024",
      cobertura_temporal: rango(filas),
      cobertura_geografica: cobertura ?? regionesDe(filas),
      unidad: "años",
      nivel_evidencia: "estadistica_oficial",
      nota_metodologica: nota,
      advertencias: ["Fronteras actuales.", "Antes de 1990 muchos países carecen de registros vitales completos: la WPP interpola con modelos.", granularidad === "regiones" ? "Los agregados regionales de la WPP no coinciden exactamente con las macrorregiones del proyecto (ver ADVERTENCIAS_MAPA)." : "Solo se usa para el mapa."],
      granularidad,
      margen_publicado: false,
      nota_margen: "La WPP publica intervalos de proyección, no de estimación; no se ingieren.",
      archivo: ruta,
    });
    salida.push(`${ruta}: ${filas.length} observaciones`);
  };
  escribir("wpp2024-esperanza-de-vida-paises", r.paises, "regiones");
  escribir("wpp2024-esperanza-de-vida-regiones", r.regiones, "regiones");
  escribir("wpp2024-esperanza-de-vida-mapa", r.mapa, "paises-iso3", ["mundo"]);
  actualizarManifiesto(ctx.raiz, {
    id: "un-wpp-2024",
    nombre: "World Population Prospects 2024, indicadores demográficos (variante Medium)",
    institucion: "Naciones Unidas, Departamento de Asuntos Económicos y Sociales, División de Población",
    url: "https://population.un.org/wpp/",
    version: "2024",
    fecha_descarga: ctx.hoy,
    licencia: "No cotejada automáticamente: la página de la WPP muestra sus condiciones con JavaScript. Pendiente de confirmar antes de reutilizar los datos.",
    cita_requerida: "Pendiente de cotejo con el sitio de la WPP 2024: registrar aquí la forma de citación exacta que indica la División de Población. Existe DOI para la edición 2022 (10.18356/9789210014380).",
    archivos,
    notas: "Archivo WPP2024_Demographic_Indicators_Medium.csv.gz descargado del dominio oficial. Solo se ingieren estimaciones hasta 2023.",
  });
  return salida;
}

if (process.argv[1] !== undefined && /wpp\.ts$/.test(process.argv[1])) {
  await ejecutarAdaptador("un-wpp-2024", ingerirWpp);
}
