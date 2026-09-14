/**
 * Regresión estructural de las vistas (mejora 18): construye el sitio y compara un resumen de cada página
 * (títulos, secciones, cantidad de gráficos, nodos del SVG) con la instantánea guardada. No es una captura
 * de píxeles: para eso haría falta un navegador (Playwright); esto detecta regresiones de estructura sin dependencias.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const RAIZ = resolve(import.meta.dirname, "../..");
let salida = "";

function resumen(html: string): Record<string, unknown> {
  const titulo = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  const h1 = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)].map((m) => m[1]!.replace(/<[^>]+>/g, "").trim());
  const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gs)].map((m) => m[1]!.replace(/<[^>]+>/g, "").trim());
  return {
    titulo,
    h1,
    h2,
    figuras: (html.match(/<figure/g) ?? []).length,
    svgs: (html.match(/<svg/g) ?? []).length,
    nodosTiempo: (html.match(/class="nodo nodo-/g) ?? []).length,
    interpretaciones: (html.match(/class="tarjeta interpretacion"/g) ?? []).length,
    avisos: (html.match(/class="aviso"/g) ?? []).length,
    enlacesGlosario: (html.match(/href="\/glosario#/g) ?? []).length,
  };
}

describe("regresión estructural de las vistas", () => {
  beforeAll(() => {
    salida = mkdtempSync(join(tmpdir(), "sitio-"));
    execFileSync(resolve(RAIZ, "node_modules/.bin/astro"), ["build", "--outDir", salida], { cwd: RAIZ, stdio: "ignore" });
  }, 120_000);

  const paginas = ["index.html", "tiempo/index.html", "espacio/index.html", "datos/index.html", "grafo/index.html", "nodos/gran-divergencia/index.html", "aristas/index.html", "recorridos/index.html", "glosario/index.html", "verificacion/index.html"];
  for (const p of paginas) {
    it(`${p} conserva su estructura`, () => {
      const ruta = join(salida, p);
      expect(existsSync(ruta), `falta ${p}`).toBe(true);
      expect(resumen(readFileSync(ruta, "utf8"))).toMatchSnapshot();
    });
  }

  it("el índice de búsqueda y las exportaciones existen", () => {
    expect(existsSync(join(salida, "buscar.json"))).toBe(true);
    expect(existsSync(join(salida, "nodos/gran-divergencia.md"))).toBe(true);
    expect(readFileSync(join(salida, "nodos/gran-divergencia.md"), "utf8")).toMatch(/^# Gran Divergencia/);
  });
});
