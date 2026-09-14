import { describe, expect, it } from "vitest";
import { citasEn } from "../../src/validacion/index.ts";

describe("citasEn", () => {
  it("extrae ids únicos en orden de aparición", () => {
    expect(citasEn("Según [@pomeranz-2000] y [@allen-2009], y de nuevo [@pomeranz-2000].")).toEqual(["pomeranz-2000", "allen-2009"]);
  });
  it("ignora corchetes que no son citas", () => {
    expect(citasEn("[enlace](x) y [@Mayúscula] y [@con espacio]")).toEqual([]);
  });
});
