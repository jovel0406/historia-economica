import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dependenciasPorFuente } from "../../scripts/reporte-bibliografia.ts";
import { cargarProyecto } from "../../src/validacion/index.ts";

const RAIZ_REPO = resolve(import.meta.dirname, "../..");
const VALIDO = resolve(import.meta.dirname, "../fixtures/valido");

describe("dependenciasPorFuente", () => {
  it("lista qué nodos, escuelas y lentes citan cada fuente", () => {
    const { contenido } = cargarProyecto({ raiz: VALIDO });
    const deps = dependenciasPorFuente(contenido);
    expect(deps.get("fuente-uno")).toEqual({
      nodos: ["evento-borrador", "proceso-revisado"],
      escuelas: [...contenido.escuelas.keys()],
      lentes: ["proceso-revisado"],
    });
    expect(deps.get("fuente-dos")).toEqual({ nodos: ["evento-borrador", "proceso-revisado"], escuelas: [], lentes: [] });
  });
});

describe("CLI scripts/reporte-bibliografia.ts", () => {
  const TSX = resolve(RAIZ_REPO, "node_modules/.bin/tsx");
  const SCRIPT = resolve(RAIZ_REPO, "scripts/reporte-bibliografia.ts");

  it("imprime las pendientes y sus usos", () => {
    const salida = execFileSync(TSX, [SCRIPT, "--raiz", VALIDO], { encoding: "utf8" });
    expect(salida).toContain("PENDIENTES DE VERIFICACIÓN");
    expect(salida).toContain("- fuente-uno:");
    expect(salida).toContain("nodos: evento-borrador, proceso-revisado");
    expect(salida).not.toContain("- fuente-dos:");
  });

  it("emite JSON y puede fallar si hay pendientes", () => {
    let codigo = 0;
    let salida = "";
    try {
      salida = execFileSync(TSX, [SCRIPT, "--raiz", VALIDO, "--json", "--fallar-si-pendientes"], { encoding: "utf8" });
    } catch (e) {
      const err = e as { status: number; stdout: string };
      codigo = err.status;
      salida = err.stdout;
    }
    expect(codigo).toBe(1);
    const json = JSON.parse(salida) as { total: number; pendientes: { id: string }[] };
    expect(json.total).toBe(2);
    expect(json.pendientes.map((p) => p.id)).toEqual(["fuente-uno"]);
  });
});
