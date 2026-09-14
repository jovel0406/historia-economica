import { describe, expect, it } from "vitest";
import { encontrarPlaceholders } from "../../src/validacion/index.ts";

describe("encontrarPlaceholders", () => {
  it("encuentra marcadores en cualquier nivel", () => {
    const datos = { _placeholder: true, lista: [{ a: 1 }, { _placeholder: true }], anidado: { mas: { _placeholder: true } } };
    expect(encontrarPlaceholders(datos)).toEqual(["$", "$.lista[1]", "$.anidado.mas"]);
  });
  it("ignora valores que no sean exactamente true", () => {
    expect(encontrarPlaceholders({ _placeholder: "true" })).toEqual([]);
    expect(encontrarPlaceholders([1, "x", null])).toEqual([]);
  });
});
