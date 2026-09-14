// @ts-check
import { defineConfig } from "astro/config";

/**
 * Sitio estático (SPEC §3). Despliegue en GitHub Pages; ver docs/DECISIONES.md (D13, D48).
 *
 *   ASTRO_SITE  URL pública completa, ej. https://usuario.github.io/historia-economica
 *   ASTRO_BASE  subdirectorio desde el que se sirve, ej. /historia-economica
 *               (vacío o "/" si el sitio va en la raíz de un dominio)
 *
 * Los enlaces internos usan el helper `enlace()` de src/lib/rutas.ts, que respeta este `base`.
 */
const base = process.env["ASTRO_BASE"] || "/";

export default defineConfig({
  output: "static",
  site: process.env["ASTRO_SITE"] || undefined,
  base,
  trailingSlash: "ignore",
});
