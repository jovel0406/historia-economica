import { describe, expect, it } from "vitest";
import { Arista, claveArista } from "../../src/schemas/index.ts";
import { aristaValida, esperarInvalido } from "../ayudantes.ts";

describe("Arista (SPEC §4.3)", () => {
  it("acepta una arista de consenso alto sin escuelas", () => {
    expect(Arista.parse(aristaValida()).consenso).toBe("alto");
  });

  it("rechaza aristas reflexivas", () => {
    esperarInvalido(Arista, aristaValida({ hacia: "nodo-a" }), /sí mismo/);
  });

  it("una arista disputada debe decir quién la sostiene y quién la niega", () => {
    esperarInvalido(Arista, aristaValida({ consenso: "disputado" }), /sostenida_por/);
    esperarInvalido(Arista, aristaValida({ consenso: "disputado", sostenida_por: ["a"] }), /negada_por/);
    expect(Arista.parse(aristaValida({ consenso: "disputado", sostenida_por: ["a"], negada_por: ["b"] })).negada_por).toEqual(["b"]);
  });

  it("una arista marginal debe decir quién la sostiene", () => {
    esperarInvalido(Arista, aristaValida({ consenso: "marginal" }), /sostenida_por/);
  });

  it("una escuela no puede sostener y negar la misma arista", () => {
    esperarInvalido(Arista, aristaValida({ consenso: "disputado", sostenida_por: ["a"], negada_por: ["a"] }), /sostener y negar/);
  });

  it("solo admite los tipos de arista del modelo", () => {
    esperarInvalido(Arista, { ...aristaValida(), tipo: "influye" }, /tipo/);
  });

  it("claveArista identifica la arista por extremos y tipo", () => {
    expect(claveArista(aristaValida())).toBe("nodo-a --precondicion_de--> nodo-b");
  });
});
