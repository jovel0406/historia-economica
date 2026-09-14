import { describe, expect, it } from "vitest";
import { FilaCsv, Observacion, Serie, UMBRAL_MEDICION } from "../../src/schemas/index.ts";
import { esperarInvalido, serieValida } from "../ayudantes.ts";

describe("Serie (SPEC §4.4, §1.4)", () => {
  it("acepta una serie contemporánea oficial", () => {
    expect(Serie.parse(serieValida()).nivel_evidencia).toBe("estadistica_oficial");
  });

  it(`una serie anterior a ${UMBRAL_MEDICION} no puede ser estadística oficial`, () => {
    esperarInvalido(Serie, serieValida({ cobertura_temporal: [1500, 2000] }), /estadistica_oficial/);
    expect(Serie.parse(serieValida({ cobertura_temporal: [1500, 2000], nivel_evidencia: "estimacion_conjetural" })).nivel_evidencia).toBe("estimacion_conjetural");
  });

  it("rechaza cobertura temporal invertida", () => {
    esperarInvalido(Serie, serieValida({ cobertura_temporal: [2000, 1950] }), /invertida/);
  });

  it("el CSV debe vivir bajo data/processed/", () => {
    esperarInvalido(Serie, serieValida({ archivo: "data/raw/x.csv" }), /data\/processed/);
    esperarInvalido(Serie, serieValida({ archivo: "data/processed/x.xlsx" }), /data\/processed/);
  });

  it("solo admite indicadores canónicos", () => {
    esperarInvalido(Serie, { ...serieValida(), indicador: "indice_de_desarrollo" }, /indicador/);
  });
});

describe("Observacion y FilaCsv", () => {
  it("rechaza valores no finitos", () => {
    esperarInvalido(Observacion, { serie: "s", region: "r", anio: 2000, valor: Number.POSITIVE_INFINITY }, /valor/);
    esperarInvalido(Observacion, { serie: "s", region: "r", anio: 2000, valor: Number.NaN }, /valor/);
  });

  it("FilaCsv convierte texto de CSV en observación y descarta notas vacías", () => {
    expect(FilaCsv.parse({ serie: "s", region: "r", anio: "1820", valor: "3.5", nota: "  " })).toEqual({ serie: "s", region: "r", anio: 1820, valor: 3.5 });
    expect(FilaCsv.parse({ serie: "s", region: "r", anio: "1820", valor: "3.5", nota: "interpolado" }).nota).toBe("interpolado");
    esperarInvalido(FilaCsv, { serie: "s", region: "r", anio: "1820.5", valor: "1" }, /anio/);
    esperarInvalido(FilaCsv, { serie: "s", region: "r", anio: "1820", valor: "n.d." }, /valor/);
  });
});
