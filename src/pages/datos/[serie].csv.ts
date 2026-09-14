import type { APIRoute } from "astro";
import { csvDe, seriesOrdenadas } from "../../lib/datos.ts";
import { contenido } from "../../lib/contenido.ts";

/** Descarga del CSV exacto usado en el gráfico (SPEC §5.3). */
export function getStaticPaths() {
  return seriesOrdenadas().map((s) => ({ params: { serie: s.id } }));
}

export const GET: APIRoute = ({ params }) => {
  const s = contenido().series.get(params["serie"] ?? "");
  if (s === undefined) return new Response("serie desconocida", { status: 404 });
  return new Response(csvDe(s), { headers: { "Content-Type": "text/csv; charset=utf-8" } });
};
