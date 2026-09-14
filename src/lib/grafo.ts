/** Datos de la Vista Grafo (SPEC §5.5): nodos y aristas tipadas, sin duplicados, listos para serializar. */
import { claveArista } from "../schemas/index.ts";
import { colorDeNodo, contenido, nodosOrdenados, unidadesDe } from "./contenido.ts";

export interface NodoGrafo {
  id: string;
  titulo: string;
  tipo: "proceso" | "evento";
  estado: string;
  inicio: number;
  color: string;
  unidad: number | null;
  escuelas: string[];
}

export interface AristaGrafo {
  id: string;
  desde: string;
  hacia: string;
  tipo: string;
  consenso: string;
  nota: string;
  sostenida: string[];
  negada: string[];
}

export function datosGrafo(): { nodos: NodoGrafo[]; aristas: AristaGrafo[]; escuelas: Record<string, string> } {
  const nodos = nodosOrdenados().map((n) => ({
    id: n.id,
    titulo: n.titulo,
    tipo: n.tipo,
    estado: n.estado_editorial,
    inicio: n.periodo.inicio,
    color: colorDeNodo(n),
    unidad: unidadesDe(n)[0]?.numero ?? null,
    escuelas: n.interpretaciones.map((i) => i.escuela),
  }));
  const vistas = new Map<string, AristaGrafo>();
  for (const n of nodosOrdenados()) {
    for (const a of n.aristas) {
      const clave = claveArista(a);
      if (vistas.has(clave)) continue;
      vistas.set(clave, { id: clave, desde: a.desde, hacia: a.hacia, tipo: a.tipo, consenso: a.consenso, nota: a.nota, sostenida: a.sostenida_por ?? [], negada: a.negada_por ?? [] });
    }
  }
  const escuelas = Object.fromEntries([...contenido().escuelas.values()].map((e) => [e.id, e.nombre]));
  return { nodos, aristas: [...vistas.values()], escuelas };
}
