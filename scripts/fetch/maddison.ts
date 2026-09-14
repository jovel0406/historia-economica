/**
 * Adaptador: Maddison Project Database 2020 (Groningen Growth and Development Centre).
 * Fuente primaria: https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2020
 * Licencia (según la página): CC BY 4.0. Cita requerida: Bolt y van Zanden (2020) y, para subconjuntos
 * de menos de 12 países o gráficos, los papers originales listados en la hoja "Sources".
 *
 * La versión 2023 existe (Dataverse, doi:10.34894/INZBF2) pero su descarga automática está bloqueada por
 * un muro anti-bots; se documenta y queda como descarga manual (ver docs/DECISIONES.md).
 */
import { join } from "node:path";
import type { Observacion, Serie } from "../../src/schemas/index.ts";
import { UMBRAL_MEDICION } from "../../src/schemas/index.ts";
import { actualizarManifiesto, descargar, ejecutarAdaptador, escribirCsv, escribirSerie, hojaComoFilas, leerLibro, numero, partirPorUmbral, rango, regionesDe, type Contexto } from "./comun.ts";

export const URL_MPD2020 = "https://www.rug.nl/ggdc/historicaldevelopment/maddison/data/mpd2020.xlsx";
export const RUTA_RAW = "data/raw/mpd2020.xlsx";

/** Países de content/regiones.json presentes en la MPD (código ISO3 → id de región). */
export const PAISES_MPD: Record<string, string> = {
  GBR: "reino-unido",
  USA: "estados-unidos",
  CHN: "china",
  JPN: "japon",
  IND: "india",
  MEX: "mexico",
  BRA: "brasil",
  ARG: "argentina",
  CRI: "costa-rica",
};

/** Regiones de la hoja "Regional data" → macrorregiones del proyecto. Las equivalencias imperfectas se declaran como advertencias. */
export const REGIONES_MPD: Record<string, string> = {
  "Western Europe": "europa-occidental",
  "Eastern Europe": "europa-oriental",
  "Western Offshoots": "america-del-norte",
  "Latin America": "america-latina",
  "Asia (East)": "asia-oriental",
  "Asia (South and South-East)": "asia-meridional",
  "Middle East": "asia-occidental-y-norte-de-africa",
  "Sub-Sahara Africa": "africa-subsahariana",
  World: "mundo",
};

export const ADVERTENCIAS_REGIONALES = [
  "Fronteras modernas aplicadas a todo el período: cada país se mide con su territorio actual.",
  "«Western Offshoots» de Maddison (Estados Unidos, Canadá, Australia, Nueva Zelanda) se asigna a america-del-norte.",
  "«Asia (South and South-East)» de Maddison se asigna a asia-meridional aunque incluye el sudeste asiático.",
  "«Middle East» de Maddison se asigna a asia-occidental-y-norte-de-africa; la cobertura del norte de África en esa agregación debe comprobarse en la documentación.",
  "«Eastern Europe» de Maddison incluye a la ex URSS.",
];

export interface ResultadoMaddison {
  paises: Observacion[];
  mapa: Observacion[];
  regiones: Observacion[];
}

/** Normaliza las hojas "Full data" y "Regional data". Función pura: se testea con libros sintéticos. */
export function normalizarMaddison(full: unknown[][], regional: unknown[][], idSerie = "mpd2020"): ResultadoMaddison {
  const cab = (full[0] ?? []).map((c) => String(c ?? ""));
  const iCodigo = cab.indexOf("countrycode");
  const iAnio = cab.indexOf("year");
  const iGdp = cab.indexOf("gdppc");
  if (iCodigo < 0 || iAnio < 0 || iGdp < 0) throw new Error(`"Full data" no tiene las columnas esperadas (countrycode, year, gdppc): ${cab.join(",")}`);

  const paises: Observacion[] = [];
  const mapa: Observacion[] = [];
  for (const fila of full.slice(1)) {
    const codigo = String(fila[iCodigo] ?? "").trim();
    const anio = numero(fila[iAnio]);
    const valor = numero(fila[iGdp]);
    if (!/^[A-Z]{3}$/.test(codigo) || anio === null || valor === null) continue;
    mapa.push({ serie: `${idSerie}-pib-per-capita-mapa`, region: codigo, anio, valor });
    const region = PAISES_MPD[codigo];
    if (region !== undefined) paises.push({ serie: `${idSerie}-pib-per-capita-paises`, region, anio, valor });
  }

  // Regional data: fila 0 marca el bloque "GDP pc ..." y el bloque "Population"; fila 1 trae los nombres de región.
  const fila0 = (regional[0] ?? []).map((c) => String(c ?? ""));
  const fila1 = (regional[1] ?? []).map((c) => String(c ?? ""));
  const inicioPop = fila0.findIndex((c) => /population/i.test(c));
  const columnas: { indice: number; region: string }[] = [];
  fila1.forEach((nombre, i) => {
    if (inicioPop >= 0 && i >= inicioPop) return;
    const region = REGIONES_MPD[nombre.trim()];
    if (region !== undefined) columnas.push({ indice: i, region });
  });
  if (columnas.length === 0) throw new Error(`"Regional data" no contiene regiones reconocidas; fila de nombres: ${fila1.join(" | ")}`);
  const regiones: Observacion[] = [];
  for (const fila of regional.slice(2)) {
    const anio = numero(fila[0]);
    if (anio === null) continue;
    for (const c of columnas) {
      const valor = numero(fila[c.indice]);
      if (valor !== null) regiones.push({ serie: `${idSerie}-pib-per-capita-regiones`, region: c.region, anio, valor });
    }
  }
  return { paises, mapa, regiones };
}

const NOTA = "PIB per cápita en dólares internacionales de 2011 (paridad de poder adquisitivo), según la hoja «GDP pc 2011 prices» de la MPD 2020. Las cifras combinan estadísticas nacionales recientes con reconstrucciones de historiadores económicos a partir de salarios, precios, producción agraria y población; la MPD 2020 volvió parcialmente al método original de Maddison para los niveles históricos (Bolt y van Zanden, 2020). No es una observación: es una estimación con márgenes amplios, mayores cuanto más atrás.";

function serieBase(id: string, nivel: Serie["nivel_evidencia"], filas: Observacion[], archivo: string, extra: Partial<Serie>): Serie {
  return {
    id,
    indicador: "pib_per_capita",
    fuente_dataset: "maddison-2020",
    cobertura_temporal: rango(filas),
    cobertura_geografica: extra.cobertura_geografica ?? regionesDe(filas),
    unidad: "dólares internacionales de 2011 (PPA) por persona y año",
    nivel_evidencia: nivel,
    nota_metodologica: NOTA,
    advertencias: extra.advertencias ?? ["Fronteras modernas aplicadas a todo el período."],
    granularidad: extra.granularidad ?? "regiones",
    margen_publicado: false,
    nota_margen: "La MPD no publica márgenes de error por observación; la documentación describe la incertidumbre cualitativamente.",
    archivo,
  };
}

export async function ingerirMaddison(ctx: Contexto): Promise<string[]> {
  const rawAbs = join(ctx.raiz, RUTA_RAW);
  const d = await descargar(URL_MPD2020, rawAbs, ctx);
  const wb = leerLibro(rawAbs);
  const r = normalizarMaddison(hojaComoFilas(wb, "Full data"), hojaComoFilas(wb, "Regional data"));
  const salida: string[] = [`${RUTA_RAW}: ${d.bytes} bytes, sha256 ${d.sha256}${d.reutilizado ? " (reutilizado)" : ""}`];

  const archivos: { ruta: string; sha256: string; bytes: number }[] = [{ ruta: RUTA_RAW, sha256: d.sha256, bytes: d.bytes }];
  const conj = ["Antes de 1820 toda cifra es una estimación conjetural (SPEC §1.4).", "Fronteras modernas aplicadas a todo el período."];

  const escribir = (id: string, filas: Observacion[], nivel: Serie["nivel_evidencia"], extra: Partial<Serie>): void => {
    if (filas.length === 0) throw new Error(`la serie ${id} quedó vacía`);
    const ruta = `data/processed/${id}.csv`;
    const h = escribirCsv(ctx.raiz, ruta, filas);
    archivos.push({ ruta, ...h });
    escribirSerie(ctx.raiz, serieBase(id, nivel, filas, ruta, extra));
    salida.push(`${ruta}: ${filas.length} observaciones (${nivel})`);
  };

  const p = partirPorUmbral(r.paises, UMBRAL_MEDICION, "mpd2020-pib-per-capita-paises-pre1820", "mpd2020-pib-per-capita-paises");
  escribir("mpd2020-pib-per-capita-paises-pre1820", p.antes, "estimacion_conjetural", { advertencias: conj });
  escribir("mpd2020-pib-per-capita-paises", p.despues, "reconstruccion_documentada", {});

  const rg = partirPorUmbral(r.regiones, UMBRAL_MEDICION, "mpd2020-pib-per-capita-regiones-pre1820", "mpd2020-pib-per-capita-regiones");
  if (rg.antes.length > 0) escribir("mpd2020-pib-per-capita-regiones-pre1820", rg.antes, "estimacion_conjetural", { advertencias: [...conj, ...ADVERTENCIAS_REGIONALES.slice(1)] });
  escribir("mpd2020-pib-per-capita-regiones", rg.despues, "reconstruccion_documentada", { advertencias: ADVERTENCIAS_REGIONALES });

  const m = partirPorUmbral(r.mapa, UMBRAL_MEDICION, "mpd2020-pib-per-capita-mapa-pre1820", "mpd2020-pib-per-capita-mapa");
  escribir("mpd2020-pib-per-capita-mapa-pre1820", m.antes, "estimacion_conjetural", { granularidad: "paises-iso3", cobertura_geografica: ["mundo"], advertencias: [...conj, "Solo se usa para el mapa; para años anteriores a 1900 la Vista Espacio agrega a macrorregión."] });
  escribir("mpd2020-pib-per-capita-mapa", m.despues, "reconstruccion_documentada", { granularidad: "paises-iso3", cobertura_geografica: ["mundo"], advertencias: ["Fronteras modernas aplicadas a todo el período.", "Solo se usa para el mapa."] });

  actualizarManifiesto(ctx.raiz, {
    id: "maddison-2020",
    nombre: "Maddison Project Database 2020",
    institucion: "Groningen Growth and Development Centre, Rijksuniversiteit Groningen",
    url: "https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2020",
    version: "2020",
    fecha_descarga: ctx.hoy,
    licencia: "Creative Commons Attribution 4.0 International (CC BY 4.0), según la página de la versión 2020",
    cita_requerida: "Bolt, Jutta and Jan Luiten van Zanden (2020), “Maddison style estimates of the evolution of the world economy. A new 2020 update”, Maddison Project Database, version 2020. Cuando los datos se muestran en forma gráfica o se usan menos de 12 países, deben citarse además los papers originales listados en la hoja «Sources» de la base.",
    archivos,
    notas: "Descargado del sitio de Groningen. La versión 2023 (Dataverse, doi:10.34894/INZBF2, archivo mpd2023_web.xlsx, 4 903 804 bytes, SHA-1 1480521f602fbd5df64e108867ac971caa00ed1a según la API de Dataverse) no se pudo descargar automáticamente: el servidor exige una prueba de trabajo anti-bots. Queda como descarga manual.",
  });
  return salida;
}

if (process.argv[1] !== undefined && /maddison\.ts$/.test(process.argv[1])) {
  await ejecutarAdaptador("maddison-2020", ingerirMaddison);
}
