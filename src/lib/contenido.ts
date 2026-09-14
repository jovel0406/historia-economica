/**
 * Acceso al contenido validado desde las páginas de Astro. Se ejecuta en tiempo de build.
 * Si el contenido tiene errores, el build falla aquí con el informe completo.
 */
import type { Escuela, Fuente, LensEntry, Nodo, Unidad } from "../schemas/index.ts";
import { Informe, cargarProyecto, formatearInforme, validarReferencias, type Contenido } from "../validacion/index.ts";

export const ANIO_ACTUAL = 2026;

let cache: Contenido | undefined;

export function contenido(): Contenido {
  if (cache !== undefined) return cache;
  const informe = new Informe();
  const { contenido: c } = cargarProyecto({ raiz: process.cwd() }, informe);
  validarReferencias(c, informe);
  if (informe.errores.length > 0) {
    throw new Error(`El contenido no pasa la validación:\n${formatearInforme(informe, { estricto: false, mostrarInfo: false })}`);
  }
  cache = c;
  return c;
}

export function nodosOrdenados(): Nodo[] {
  return [...contenido().nodos.values()].sort((a, b) => a.periodo.inicio - b.periodo.inicio || a.titulo.localeCompare(b.titulo, "es"));
}

export function unidadesOrdenadas(): Unidad[] {
  return [...contenido().unidades.values()].sort((a, b) => a.numero - b.numero);
}

export function unidadesDe(n: Nodo): Unidad[] {
  const u = contenido().unidades;
  return (n.unidades ?? []).flatMap((id) => {
    const x = u.get(id);
    return x === undefined ? [] : [x];
  });
}

export function nodosDeUnidad(unidadId: string): Nodo[] {
  return nodosOrdenados().filter((n) => (n.unidades ?? []).includes(unidadId));
}

export function escuela(id: string): Escuela | undefined {
  return contenido().escuelas.get(id);
}

export function escuelasOrdenadas(): Escuela[] {
  return [...contenido().escuelas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function lenteDe(n: Nodo): LensEntry[] {
  return contenido().lentes.get(n.id) ?? [];
}

export function fuente(id: string): Fuente | undefined {
  return contenido().fuentes.get(id);
}

/** Todas las fuentes que un nodo cita: directas, de sus interpretaciones, de sus aristas y de su lente. */
export function fuentesDe(n: Nodo): Fuente[] {
  const ids = new Set<string>([
    ...n.fuentes,
    ...n.interpretaciones.flatMap((i) => i.autores_principales),
    ...n.aristas.flatMap((a) => a.fuentes),
    ...lenteDe(n).flatMap((l) => l.fuentes),
  ]);
  return [...ids].flatMap((id) => {
    const f = contenido().fuentes.get(id);
    return f === undefined ? [] : [f];
  });
}

export function fuentesSinVerificar(n: Nodo): Fuente[] {
  return fuentesDe(n).filter((f) => !f.verified);
}

export function nodo(id: string): Nodo | undefined {
  return contenido().nodos.get(id);
}

/** Nodos que aparecen en las aristas de `n` pero declaradas en otros archivos (aristas entrantes). */
export function aristasHacia(n: Nodo): { desde: Nodo; arista: Nodo["aristas"][number] }[] {
  const salida: { desde: Nodo; arista: Nodo["aristas"][number] }[] = [];
  for (const otro of contenido().nodos.values()) {
    if (otro.id === n.id) continue;
    for (const a of otro.aristas) {
      if (a.hacia === n.id || a.desde === n.id) salida.push({ desde: otro, arista: a });
    }
  }
  return salida;
}

/** Color de cada unidad de referencia (SPEC §5.1; decisión D11). */
export const COLORES_UNIDAD: Record<number, string> = {
  1: "#8a5a2b",
  2: "#b7412c",
  3: "#5b3a6e",
  4: "#2f4f6f",
  5: "#2e6b5e",
  6: "#c47a1a",
  7: "#4f6b2e",
  8: "#3d3d5c",
};

export function colorUnidad(numero: number | undefined): string {
  return (numero !== undefined && COLORES_UNIDAD[numero]) || "#6b6b6b";
}

export function colorDeNodo(n: Nodo): string {
  const [primera] = unidadesDe(n);
  return colorUnidad(primera?.numero);
}
