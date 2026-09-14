import type { APIRoute } from "astro";
import { contenido, glosarioOrdenado, nodosOrdenados, recorridosOrdenados } from "../lib/contenido.ts";

/** Índice de búsqueda estático (mejora 12), generado en el build. */
export const GET: APIRoute = () => {
  const entradas: { tipo: string; titulo: string; url: string; texto: string }[] = [];
  for (const n of nodosOrdenados()) entradas.push({ tipo: "nodo", titulo: n.titulo, url: `/nodos/${n.id}`, texto: `${n.resumen} ${n.interpretaciones.map((i) => i.mecanismo).join(" ")}` });
  for (const e of contenido().escuelas.values()) entradas.push({ tipo: "escuela", titulo: e.nombre, url: `/escuelas#${e.id}`, texto: e.postulado_central });
  for (const f of contenido().fuentes.values()) entradas.push({ tipo: "fuente", titulo: `${f.autores.join("; ")} (${f.anio ?? "s.f."}). ${f.titulo}`, url: `/fuentes#${f.id}`, texto: f.id });
  for (const t of glosarioOrdenado()) entradas.push({ tipo: "glosario", titulo: t.termino, url: `/glosario#${t.id}`, texto: `${t.variantes.join(" ")} ${t.definicion}` });
  for (const r of recorridosOrdenados()) entradas.push({ tipo: "recorrido", titulo: r.titulo, url: `/recorridos/${r.id}`, texto: r.pregunta_de_apertura });
  return new Response(JSON.stringify(entradas), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
