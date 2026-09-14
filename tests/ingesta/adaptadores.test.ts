import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { actualizarManifiesto, escribirCsv, numero, partirPorUmbral, rango, regionesDe } from "../../scripts/fetch/comun.ts";
import { normalizarMaddison } from "../../scripts/fetch/maddison.ts";
import { normalizarPwt } from "../../scripts/fetch/pwt.ts";

describe("normalizarMaddison", () => {
  const full = [
    ["countrycode", "country", "year", "gdppc", "pop"],
    ["GBR", "United Kingdom", 1700, 2000.5, 8000],
    ["GBR", "United Kingdom", 1820, 3000, 21000],
    ["GBR", "United Kingdom", 2018, 38000, 66000],
    ["ZZZ", "Inventado", 2018, 1, 1],
    ["CHN", "China", 1820, null, 381000],
    ["CHN", "China", 2018, 13000, 1400000],
  ];
  const regional = [
    [null, "GDP pc 2011 prices", null, null, "Population", null],
    ["Region", "Western Europe", "Asia (East)", "Región desconocida", "Western Europe", "Asia (East)"],
    ["Year", null, null, null, null, null],
    [1820, 2306.97, 1088.58, 5, 132371, 400000],
    [2018, 40000, 15000, 5, 400000, 1600000],
    ["nota al pie", null, null, null, null, null],
  ];
  const r = normalizarMaddison(full, regional);

  it("separa países del proyecto, mapa por ISO3 y regiones", () => {
    expect(r.paises).toEqual([
      { serie: "mpd2020-pib-per-capita-paises", region: "reino-unido", anio: 1700, valor: 2000.5 },
      { serie: "mpd2020-pib-per-capita-paises", region: "reino-unido", anio: 1820, valor: 3000 },
      { serie: "mpd2020-pib-per-capita-paises", region: "reino-unido", anio: 2018, valor: 38000 },
      { serie: "mpd2020-pib-per-capita-paises", region: "china", anio: 2018, valor: 13000 },
    ]);
    expect(r.mapa.map((o) => o.region)).toEqual(["GBR", "GBR", "GBR", "ZZZ", "CHN"]);
    expect(r.regiones).toEqual([
      { serie: "mpd2020-pib-per-capita-regiones", region: "europa-occidental", anio: 1820, valor: 2306.97 },
      { serie: "mpd2020-pib-per-capita-regiones", region: "asia-oriental", anio: 1820, valor: 1088.58 },
      { serie: "mpd2020-pib-per-capita-regiones", region: "europa-occidental", anio: 2018, valor: 40000 },
      { serie: "mpd2020-pib-per-capita-regiones", region: "asia-oriental", anio: 2018, valor: 15000 },
    ]);
  });

  it("falla si faltan columnas o regiones reconocibles", () => {
    expect(() => normalizarMaddison([["a", "b"]], regional)).toThrow(/columnas esperadas/);
    expect(() => normalizarMaddison(full, [[null], ["Region", "Nada"], ["Year"]])).toThrow(/regiones reconocidas/);
  });
});

describe("normalizarPwt", () => {
  const data = [
    ["countrycode", "country", "currency_unit", "year", "rgdpe", "pop", "csh_x", "csh_m"],
    ["CRI", "Costa Rica", "Colón", 1990, 20000, 3, 0.3, -0.35],
    ["CRI", "Costa Rica", "Colón", 1950, null, 1, null, null],
    ["ABW", "Aruba", "Florín", 1990, 2000, 0.1, 0.5, -0.6],
  ];
  const legend = [["Variable name", "Variable definition"], ["rgdpe", "Expenditure-side real GDP"], ["pop", "Population (in millions)"], ["", ""]];
  const r = normalizarPwt(data, legend);

  it("calcula PIB per cápita y apertura comercial con el signo de csh_m corregido", () => {
    expect(r.pibPaises).toEqual([{ serie: "pwt100-pib-per-capita-paises", region: "costa-rica", anio: 1990, valor: 20000 / 3 }]);
    expect(r.pibMapa.map((o) => o.region)).toEqual(["CRI", "ABW"]);
    expect(r.aperturaPaises).toHaveLength(1);
    expect(r.aperturaPaises[0]).toMatchObject({ serie: "pwt100-apertura-comercial-paises", region: "costa-rica", anio: 1990 });
    expect(r.aperturaPaises[0]?.valor).toBeCloseTo(65, 9);
    expect(r.leyenda["pop"]).toBe("Population (in millions)");
  });

  it("falla si falta una columna", () => {
    expect(() => normalizarPwt([["countrycode", "year"]], legend)).toThrow(/columna rgdpe/);
  });
});

describe("utilidades de comun.ts", () => {
  it("numero acepta números y cadenas numéricas, rechaza el resto", () => {
    expect(numero(3)).toBe(3);
    expect(numero("4.5")).toBe(4.5);
    expect(numero("")).toBeNull();
    expect(numero("n.d.")).toBeNull();
    expect(numero(null)).toBeNull();
    expect(numero(Number.NaN)).toBeNull();
  });

  it("partirPorUmbral, rango y regionesDe", () => {
    const filas = [
      { serie: "s", region: "b", anio: 1700, valor: 1 },
      { serie: "s", region: "a", anio: 1900, valor: 2 },
    ];
    const p = partirPorUmbral(filas, 1820, "antes", "despues");
    expect(p.antes[0]?.serie).toBe("antes");
    expect(p.despues[0]?.serie).toBe("despues");
    expect(rango(filas)).toEqual([1700, 1900]);
    expect(regionesDe(filas)).toEqual(["a", "b"]);
    expect(() => rango([])).toThrow();
  });

  it("escribirCsv escribe la cabecera canónica y valores sin ruido, y actualizarManifiesto reemplaza por id", () => {
    const raiz = mkdtempSync(join(tmpdir(), "ingesta-"));
    const h = escribirCsv(raiz, "data/processed/x.csv", [{ serie: "x", region: "mundo", anio: 2000, valor: 0.1 + 0.2 }, { serie: "x", region: "mundo", anio: 2001, valor: 3 }]);
    expect(readFileSync(join(raiz, "data/processed/x.csv"), "utf8")).toBe("serie,region,anio,valor\nx,mundo,2000,0.3\nx,mundo,2001,3\n");
    expect(h.sha256).toMatch(/^[a-f0-9]{64}$/);
    const dataset = {
      id: "d",
      nombre: "D",
      institucion: "I",
      url: "https://example.invalid/d",
      version: "1",
      fecha_descarga: "2026-01-01",
      licencia: "L",
      cita_requerida: "C",
      archivos: [{ ruta: "data/processed/x.csv", sha256: h.sha256 }],
    };
    actualizarManifiesto(raiz, dataset);
    actualizarManifiesto(raiz, { ...dataset, version: "2" });
    const m = JSON.parse(readFileSync(join(raiz, "data/MANIFIESTO.json"), "utf8")) as { datasets: { version: string }[] };
    expect(m.datasets).toHaveLength(1);
    expect(m.datasets[0]?.version).toBe("2");
    writeFileSync(join(raiz, "data/MANIFIESTO.json"), "{}");
    expect(() => actualizarManifiesto(raiz, dataset)).toThrow();
  });
});
