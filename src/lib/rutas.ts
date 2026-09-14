/**
 * Enlaces internos conscientes del `base` de Astro (SPEC §3: sitio estático).
 * Permite desplegar el sitio en la raíz de un dominio (`usuario.github.io`) o en un subdirectorio
 * (`usuario.github.io/historia-economica`) sin tocar el código: el prefijo lo fija ASTRO_BASE.
 */
const BASE = import.meta.env.BASE_URL;

/** Prefijo sin barra final: "" cuando el sitio va en la raíz, "/historia-economica" si no. */
export const PREFIJO: string = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;

/** Convierte una ruta absoluta del sitio ("/tiempo") en la ruta servida ("/base/tiempo"). */
export function enlace(ruta: string): string {
  if (!ruta.startsWith("/")) return ruta;
  if (ruta === "/") return PREFIJO === "" ? "/" : `${PREFIJO}/`;
  return `${PREFIJO}${ruta}`;
}
