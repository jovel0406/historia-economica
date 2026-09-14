import type { APIRoute } from "astro";
import { contenido, fuentesDe, lenteDe, nodo, nodosOrdenados, unidadesDe } from "../../lib/contenido.ts";
import { ETIQUETA_ARISTA, ETIQUETA_CONSENSO, ETIQUETA_PESO, ETIQUETA_PRECISION, periodoTexto } from "../../lib/texto.ts";

/** Exporta un nodo como Markdown con sus citas, para material de curso (mejora 13). */
export function getStaticPaths() {
  return nodosOrdenados().map((n) => ({ params: { id: n.id } }));
}

export const GET: APIRoute = ({ params }) => {
  const n = nodo(params["id"] ?? "");
  if (n === undefined) return new Response("nodo desconocido", { status: 404 });
  const nombre = (id: string) => contenido().escuelas.get(id)?.nombre ?? id;
  const titulo = (id: string) => contenido().nodos.get(id)?.titulo ?? id;
  const L: string[] = [];
  L.push(`# ${n.titulo}`, "");
  L.push(`*${periodoTexto(n.periodo)} · ${ETIQUETA_PRECISION[n.periodo.precision]} · ${n.tipo}*`, "");
  if (n.periodo.nota_periodizacion) L.push(`> ${n.periodo.nota_periodizacion}`, "");
  L.push(`Unidades: ${unidadesDe(n).map((u) => `${u.numero}. ${u.titulo}`).join("; ") || "—"}. Regiones: ${n.regiones.join(", ")}.`, "");
  L.push(n.resumen, "");
  if (n.descripcion_larga.trim()) L.push(n.descripcion_larga.trim(), "");
  if (n.interpretaciones.length > 0) {
    L.push("## Interpretaciones en disputa", "");
    for (const it of n.interpretaciones) {
      L.push(`### ${nombre(it.escuela)} (${ETIQUETA_PESO[it.peso_academico]})`, "", `**Mecanismo.** ${it.mecanismo}`, "", it.desarrollo, "");
      L.push("**A favor**", "", ...it.evidencia_a_favor.map((e) => `- ${e}`), "", "**En contra**", "", ...it.evidencia_en_contra.map((e) => `- ${e}`), "");
      L.push(`**Qué la refutaría.** ${it.que_la_refutaria}`, "");
      if (it.contrastable_con.length > 0) L.push(`Contrastable con: ${it.contrastable_con.join(", ")}.`, "");
    }
  }
  if (n.aristas.length > 0) {
    L.push("## Relaciones", "");
    for (const a of n.aristas) L.push(`- ${titulo(a.desde)} **${ETIQUETA_ARISTA[a.tipo]}** ${titulo(a.hacia)} (${ETIQUETA_CONSENSO[a.consenso]}). ${a.nota}`);
    L.push("");
  }
  const lente = lenteDe(n);
  if (lente.length > 0) {
    L.push("## Lente regional", "");
    for (const l of lente) L.push(`### ${l.region === "costa-rica" ? "Costa Rica" : "América Latina"}`, "", l.texto, "");
  }
  const fuentes = fuentesDe(n);
  if (fuentes.length > 0) {
    L.push("## Fuentes citadas", "");
    for (const f of fuentes) {
      const partes = [`[${f.id}]`, f.autores.length ? f.autores.join("; ") : "(autores sin confirmar)", `(${f.anio ?? "s.f."}).`, `*${f.titulo}*.`];
      if (f.publicacion) partes.push(`${f.publicacion}.`);
      if (f.editorial) partes.push(`${f.editorial}.`);
      if (f.doi) partes.push(`https://doi.org/${f.doi}`);
      else if (f.url) partes.push(f.url);
      L.push(`- ${partes.join(" ")}`);
    }
    L.push("");
  }
  L.push("---", "", "Exportado de la plataforma «Historia económica mundial». Las citas `[@id]` remiten a la lista de fuentes que aparece más arriba. Ninguna cifra de este texto carece de fuente.", "");
  return new Response(L.join("\n"), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
