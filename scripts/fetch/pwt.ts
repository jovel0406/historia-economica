/**
 * Adaptador: Penn World Table 10.0 (Groningen Growth and Development Centre).
 * Fuente primaria: https://www.rug.nl/ggdc/productivity/pwt/pwt-releases/pwt100
 * Licencia (según la página): CC BY 4.0. Cita requerida: Feenstra, Inklaar y Timmer (2015), AER 105(10).
 * La versión 10.01 (Dataverse, doi:10.34894/QT5BCC, pwt1001.xlsx) está tras un muro anti-bots: descarga manual.
 */
import { join } from "node:path";
import type { Observacion, Serie } from "../../src/schemas/index.ts";
import { actualizarManifiesto, descargar, ejecutarAdaptador, escribirCsv, escribirSerie, hojaComoFilas, leerLibro, numero, rango, regionesDe, type Contexto } from "./comun.ts";
import { PAISES_MPD } from "./maddison.ts";

export const URL_PWT100 = "https://www.rug.nl/ggdc/docs/pwt100.xlsx";
export const RUTA_RAW = "data/raw/pwt100.xlsx";

export interface ResultadoPwt {
  pibPaises: Observacion[];
  pibMapa: Observacion[];
  aperturaPaises: Observacion[];
  leyenda: Record<string, string>;
}

/** Normaliza la hoja "Data" (y lee la "Legend" para documentar las variables). Función pura. */
export function normalizarPwt(data: unknown[][], legend: unknown[][], idSerie = "pwt100"): ResultadoPwt {
  const cab = (data[0] ?? []).map((c) => String(c ?? ""));
  const col = (n: string): number => {
    const i = cab.indexOf(n);
    if (i < 0) throw new Error(`"Data" no tiene la columna ${n}: ${cab.slice(0, 12).join(",")}…`);
    return i;
  };
  const iCodigo = col("countrycode");
  const iAnio = col("year");
  const iRgdpe = col("rgdpe");
  const iPop = col("pop");
  const iX = col("csh_x");
  const iM = col("csh_m");

  const leyenda: Record<string, string> = {};
  for (const fila of legend) {
    const k = String(fila[0] ?? "").trim();
    const v = String(fila[1] ?? "").trim();
    if (k && v) leyenda[k] = v;
  }

  const pibPaises: Observacion[] = [];
  const pibMapa: Observacion[] = [];
  const aperturaPaises: Observacion[] = [];
  for (const fila of data.slice(1)) {
    const codigo = String(fila[iCodigo] ?? "").trim();
    const anio = numero(fila[iAnio]);
    if (!/^[A-Z]{3}$/.test(codigo) || anio === null) continue;
    const rgdpe = numero(fila[iRgdpe]);
    const pop = numero(fila[iPop]);
    const region = PAISES_MPD[codigo];
    if (rgdpe !== null && pop !== null && pop > 0) {
      const pc = rgdpe / pop;
      pibMapa.push({ serie: `${idSerie}-pib-per-capita-mapa`, region: codigo, anio, valor: pc });
      if (region !== undefined) pibPaises.push({ serie: `${idSerie}-pib-per-capita-paises`, region, anio, valor: pc });
    }
    const x = numero(fila[iX]);
    const m = numero(fila[iM]);
    if (region !== undefined && x !== null && m !== null) {
      // csh_m es negativo en PWT (participación de las importaciones con signo menos).
      aperturaPaises.push({ serie: `${idSerie}-apertura-comercial-paises`, region, anio, valor: (x + Math.abs(m)) * 100 });
    }
  }
  return { pibPaises, pibMapa, aperturaPaises, leyenda };
}

export async function ingerirPwt(ctx: Contexto): Promise<string[]> {
  const rawAbs = join(ctx.raiz, RUTA_RAW);
  const d = await descargar(URL_PWT100, rawAbs, ctx);
  const wb = leerLibro(rawAbs);
  const r = normalizarPwt(hojaComoFilas(wb, "Data"), hojaComoFilas(wb, "Legend"));
  const salida: string[] = [`${RUTA_RAW}: ${d.bytes} bytes, sha256 ${d.sha256}${d.reutilizado ? " (reutilizado)" : ""}`];
  const archivos: { ruta: string; sha256: string; bytes: number }[] = [{ ruta: RUTA_RAW, sha256: d.sha256, bytes: d.bytes }];
  const ley = (k: string): string => r.leyenda[k] ?? `(sin definición en la leyenda para ${k})`;

  const escribir = (id: string, filas: Observacion[], serie: Omit<Serie, "id" | "archivo" | "cobertura_temporal">): void => {
    if (filas.length === 0) throw new Error(`la serie ${id} quedó vacía`);
    const ruta = `data/processed/${id}.csv`;
    const h = escribirCsv(ctx.raiz, ruta, filas);
    archivos.push({ ruta, ...h });
    escribirSerie(ctx.raiz, { ...serie, id, archivo: ruta, cobertura_temporal: rango(filas) });
    salida.push(`${ruta}: ${filas.length} observaciones (${serie.nivel_evidencia})`);
  };

  const notaPib = `PIB real por el lado del gasto dividido por la población. Según la leyenda de PWT 10.0: rgdpe = «${ley("rgdpe")}»; pop = «${ley("pop")}». Se construye a partir de cuentas nacionales oficiales y de las comparaciones de precios del Programa de Comparación Internacional; el ajuste por paridad de poder adquisitivo es una construcción estadística, no una observación directa.`;
  escribir("pwt100-pib-per-capita-paises", r.pibPaises, {
    indicador: "pib_per_capita",
    fuente_dataset: "pwt-100",
    cobertura_geografica: regionesDe(r.pibPaises),
    unidad: "rgdpe / pop: dólares internacionales a PPA encadenadas por persona (base según la leyenda de PWT 10.0)",
    nivel_evidencia: "estadistica_oficial",
    nota_metodologica: notaPib,
    advertencias: ["Fronteras actuales; los países que cambiaron de territorio (Alemania, ex URSS) requieren cuidado.", "Las PPA encadenadas hacen comparables niveles entre países pero no reproducen las tasas de crecimiento oficiales."],
    granularidad: "regiones",
  });
  escribir("pwt100-pib-per-capita-mapa", r.pibMapa, {
    indicador: "pib_per_capita",
    fuente_dataset: "pwt-100",
    cobertura_geografica: ["mundo"],
    unidad: "rgdpe / pop: dólares internacionales a PPA encadenadas por persona (base según la leyenda de PWT 10.0)",
    nivel_evidencia: "estadistica_oficial",
    nota_metodologica: notaPib,
    advertencias: ["Solo se usa para el mapa.", "Fronteras actuales."],
    granularidad: "paises-iso3",
  });
  escribir("pwt100-apertura-comercial-paises", r.aperturaPaises, {
    indicador: "apertura_comercial",
    fuente_dataset: "pwt-100",
    cobertura_geografica: regionesDe(r.aperturaPaises),
    unidad: "(exportaciones + importaciones de mercancías) / PIB, en porcentaje, a PPA corrientes",
    nivel_evidencia: "estadistica_oficial",
    nota_metodologica: `Suma de las participaciones de exportaciones e importaciones de mercancías en el PIB por el lado del producto a PPA corrientes. Según la leyenda de PWT 10.0: csh_x = «${ley("csh_x")}»; csh_m = «${ley("csh_m")}» (con signo negativo en la base, aquí en valor absoluto). Excluye servicios: subestima la apertura de economías con exportaciones de servicios.`,
    advertencias: ["Solo mercancías; excluye servicios.", "Participaciones a PPA, no a tipo de cambio de mercado."],
    granularidad: "regiones",
  });

  actualizarManifiesto(ctx.raiz, {
    id: "pwt-100",
    nombre: "Penn World Table 10.0",
    institucion: "Groningen Growth and Development Centre, Rijksuniversiteit Groningen",
    url: "https://www.rug.nl/ggdc/productivity/pwt/pwt-releases/pwt100",
    version: "10.0",
    fecha_descarga: ctx.hoy,
    licencia: "Creative Commons Attribution 4.0 International (CC BY 4.0), según la página de la versión 10.0",
    cita_requerida: "Feenstra, Robert C., Robert Inklaar and Marcel P. Timmer (2015), “The Next Generation of the Penn World Table”, American Economic Review, 105(10), 3150-3182, available for download at www.ggdc.net/pwt",
    archivos,
    notas: "Descargado del sitio de Groningen. La versión 10.01 (Dataverse, doi:10.34894/QT5BCC, archivo pwt1001.xlsx, 6 551 843 bytes, SHA-1 7461933f7561767ffbd77db3ab984d60cb21e9ef según la API de Dataverse) no se pudo descargar automáticamente: el servidor exige una prueba de trabajo anti-bots. Queda como descarga manual.",
  });
  return salida;
}

if (process.argv[1] !== undefined && /pwt\.ts$/.test(process.argv[1])) {
  await ejecutarAdaptador("pwt-100", ingerirPwt);
}
