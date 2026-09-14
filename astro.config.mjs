// @ts-check
import { defineConfig } from "astro/config";

// Sitio estático (SPEC §3). El despliegue elegido es GitHub Pages; ver docs/DECISIONES.md.
// TODO(Hito 2+): fijar `site` y `base` cuando exista el repositorio remoto.
export default defineConfig({
  output: "static",
});
