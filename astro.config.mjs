// @ts-check
import { defineConfig } from "astro/config";

// Sitio estático (SPEC §3). Despliegue en GitHub Pages; ver docs/DECISIONES.md (D13).
// `site` se toma de la variable ASTRO_SITE (definida en el flujo de despliegue). Los enlaces internos
// son absolutos ("/tiempo"), así que el sitio debe servirse desde la raíz de un dominio
// (sitio de usuario u organización, o dominio propio), no desde un subdirectorio de proyecto.
export default defineConfig({
  output: "static",
  site: process.env["ASTRO_SITE"] || undefined,
});
