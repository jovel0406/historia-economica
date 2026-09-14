import { describe, expect, it } from "vitest";
import { normalizarWpp } from "../../scripts/fetch/wpp.ts";

describe("normalizarWpp", () => {
  const cab = ["ISO3_code", "Location", "LocTypeName", "Variant", "Time", "LEx"];
  const filas = [
    cab,
    ["CRI", "Costa Rica", "Country/Area", "Medium", "1950", "55.1"],
    ["CRI", "Costa Rica", "Country/Area", "Medium", "2024", "81"],
    ["ABW", "Aruba", "Country/Area", "Medium", "1950", "60"],
    ["", "World", "World", "Medium", "1950", "46.4"],
    ["", "Latin America and the Caribbean", "Geographic region", "Medium", "1950", "48.7"],
    ["", "Latin America and the Caribbean", "SDG region", "Medium", "1950", "48.7"],
    ["", "ADB region: Central and West Asia", "Other", "Medium", "1950", "38"],
    ["CRI", "Costa Rica", "Country/Area", "High", "1950", "99"],
  ];
  const r = normalizarWpp(filas);
  it("separa países, mapa y regiones, descarta proyecciones y otras variantes", () => {
    expect(r.paises).toEqual([{ serie: "wpp2024-esperanza-de-vida-paises", region: "costa-rica", anio: 1950, valor: 55.1 }]);
    expect(r.mapa.map((o) => o.region)).toEqual(["CRI", "ABW"]);
    expect(r.regiones).toEqual([
      { serie: "wpp2024-esperanza-de-vida-regiones", region: "mundo", anio: 1950, valor: 46.4 },
      { serie: "wpp2024-esperanza-de-vida-regiones", region: "america-latina", anio: 1950, valor: 48.7 },
    ]);
  });
  it("falla si falta una columna", () => {
    expect(() => normalizarWpp([["ISO3_code", "Time"]])).toThrow(/columna/);
  });
});
