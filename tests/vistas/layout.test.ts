import { describe, expect, it } from "vitest";
import { anchoEtiqueta, asignarCarriles, rangosUnidades } from "../../src/vistas/tiempo/layout.ts";

describe("asignarCarriles", () => {
  it("pone en carriles distintos los intervalos que se solapan y reutiliza carriles libres", () => {
    const carriles = asignarCarriles(
      [
        { id: "a", x0: 0, x1: 100 },
        { id: "b", x0: 50, x1: 150 },
        { id: "c", x0: 120, x1: 200 },
        { id: "d", x0: 160, x1: 300 },
      ],
      10,
    );
    expect(carriles.get("a")).toBe(0);
    expect(carriles.get("b")).toBe(1);
    expect(carriles.get("c")).toBe(0);
    expect(carriles.get("d")).toBe(1);
  });
  it("respeta la separación mínima", () => {
    const carriles = asignarCarriles([{ id: "a", x0: 0, x1: 100 }, { id: "b", x0: 105, x1: 150 }], 10);
    expect(carriles.get("b")).toBe(1);
  });
});

describe("rangosUnidades", () => {
  it("deriva el rango de cada unidad de sus nodos y omite las vacías", () => {
    const rangos = rangosUnidades(
      [{ id: "u1", numero: 1 }, { id: "u2", numero: 2 }, { id: "u3", numero: 3 }],
      [
        { id: "a", periodo: { inicio: 1500, fin: 1850 }, unidades: ["u1", "u2"] },
        { id: "b", periodo: { inicio: 1978, fin: null }, unidades: ["u2"] },
      ],
      2026,
    );
    expect(rangos).toEqual([
      { id: "u1", numero: 1, inicio: 1500, fin: 1850, nodos: ["a"] },
      { id: "u2", numero: 2, inicio: 1500, fin: 2026, nodos: ["a", "b"] },
    ]);
  });
});

describe("anchoEtiqueta", () => {
  it("crece con la longitud del texto", () => {
    expect(anchoEtiqueta("abcd")).toBeLessThan(anchoEtiqueta("abcdefgh"));
  });
});
