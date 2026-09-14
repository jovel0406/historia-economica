/**
 * Geometrías y correspondencias para la Vista Espacio (SPEC §5.2).
 * - Geometrías: Natural Earth 1:110m vía el paquete `world-atlas` (TopoJSON; ids ISO 3166-1 numéricos).
 * - Correspondencia numérico ↔ alfa-3 y subregión: paquete `world-countries`.
 * - Macrorregiones del proyecto: asignación por subregión, documentada aquí y como advertencia en la interfaz.
 */
import paisesCrudos from "world-countries";
import { z } from "zod";

const Pais = z.object({
  cca3: z.string().regex(/^[A-Z]{3}$/),
  ccn3: z.string(),
  name: z.object({ common: z.string() }),
  translations: z.record(z.string(), z.object({ common: z.string() })).optional(),
  subregion: z.string(),
});

/** Subregión de world-countries → macrorregión de content/regiones.json. */
export const MACRORREGION_POR_SUBREGION: Record<string, string> = {
  "Western Europe": "europa-occidental",
  "Northern Europe": "europa-occidental",
  "Southern Europe": "europa-occidental",
  "Eastern Europe": "europa-oriental",
  "Central Europe": "europa-oriental",
  "Southeast Europe": "europa-oriental",
  "Central Asia": "europa-oriental",
  "North America": "america-del-norte",
  Caribbean: "america-latina",
  "Central America": "america-latina",
  "South America": "america-latina",
  "Eastern Asia": "asia-oriental",
  "Southern Asia": "asia-meridional",
  "South-Eastern Asia": "asia-meridional",
  "Western Asia": "asia-occidental-y-norte-de-africa",
  "Northern Africa": "asia-occidental-y-norte-de-africa",
  "Eastern Africa": "africa-subsahariana",
  "Middle Africa": "africa-subsahariana",
  "Southern Africa": "africa-subsahariana",
  "Western Africa": "africa-subsahariana",
  "Australia and New Zealand": "oceania",
  Melanesia: "oceania",
  Micronesia: "oceania",
  Polynesia: "oceania",
};

export const ADVERTENCIAS_MAPA = [
  "Proyectar fronteras nacionales modernas sobre datos anteriores a 1900 es un anacronismo: los Estados que se colorean no existían, o no con esos límites. Para esos años el mapa agrega a macrorregión y muestra el mismo valor en todos los países que hoy la componen.",
  "La asignación de países a macrorregiones sigue las subregiones de Naciones Unidas (paquete world-countries) y no coincide exactamente con las agregaciones de Maddison: Europa central y balcánica y Asia central se asignan a «Europa oriental» (como la ex URSS en Maddison); Australia y Nueva Zelanda quedan en Oceanía, sin agregado regional, aunque Maddison las cuenta entre los «Western Offshoots».",
  "Un país sin color no tiene dato en esa fuente y ese año; no significa que su ingreso fuera nulo.",
];

export interface PaisGeo {
  ccn3: string;
  cca3: string;
  nombre: string;
  macrorregion: string | null;
}

export function tablaPaises(): PaisGeo[] {
  const lista = z.array(Pais).parse(paisesCrudos);
  return lista
    .filter((p) => /^\d{3}$/.test(p.ccn3))
    .map((p) => ({
      ccn3: p.ccn3,
      cca3: p.cca3,
      nombre: p.translations?.["spa"]?.common ?? p.name.common,
      macrorregion: MACRORREGION_POR_SUBREGION[p.subregion] ?? null,
    }));
}
