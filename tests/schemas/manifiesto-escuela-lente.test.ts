import { describe, expect, it } from "vitest";
import { ArchivoIndicadores, ArchivoLentes, ArchivoRegiones, Escuela, INDICADORES_CANONICOS, Manifiesto } from "../../src/schemas/index.ts";
import { datasetValido, esperarInvalido } from "../ayudantes.ts";

describe("Manifiesto (SPEC §6)", () => {
  it("acepta un dataset con procedencia completa", () => {
    expect(Manifiesto.parse({ datasets: [datasetValido()] }).datasets).toHaveLength(1);
  });
  it("exige fecha ISO, URL, hash hexadecimal y al menos un archivo", () => {
    esperarInvalido(Manifiesto, { datasets: [datasetValido({ fecha_descarga: "01/01/2026" })] }, /fecha_descarga/);
    esperarInvalido(Manifiesto, { datasets: [datasetValido({ url: "ftp://example.invalid/x" })] }, /url/);
    esperarInvalido(Manifiesto, { datasets: [datasetValido({ archivos: [{ ruta: "data/processed/x.csv", sha256: "ZZ" }] })] }, /sha256/);
    esperarInvalido(Manifiesto, { datasets: [datasetValido({ archivos: [] })] }, /al menos un archivo/);
    esperarInvalido(Manifiesto, { datasets: [datasetValido({ archivos: [{ ruta: "descargas/x.csv", sha256: "a".repeat(64) }] })] }, /data\/raw/);
  });
  it("rechaza datasets duplicados", () => {
    esperarInvalido(Manifiesto, { datasets: [datasetValido(), datasetValido()] }, /duplicado/);
  });
});

describe("Escuela (SPEC §4.6)", () => {
  it("exige postulado y crítica", () => {
    esperarInvalido(Escuela, { id: "x", nombre: "X", postulado_central: "", autores_representativos: [], critica_principal: "c" }, /postulado_central/);
    expect(Escuela.parse({ id: "x", nombre: "X", postulado_central: "p", autores_representativos: [], critica_principal: "c" }).id).toBe("x");
  });
});

describe("Lentes (SPEC §4.8)", () => {
  it("solo admite las dos regiones de la lente y no acepta archivos vacíos", () => {
    esperarInvalido(ArchivoLentes, [{ nodo: "n", region: "mexico", texto: "t", fuentes: [] }], /region/);
    esperarInvalido(ArchivoLentes, [], /vacío/);
    expect(ArchivoLentes.parse([{ nodo: "n", region: "costa-rica", texto: "t", fuentes: [] }])).toHaveLength(1);
  });
});

describe("Indicadores y regiones", () => {
  const indicadores = INDICADORES_CANONICOS.map((id) => ({ id, nombre: id, descripcion: "d", unidad_canonica: "u" }));
  it("exige exactamente los siete indicadores canónicos", () => {
    expect(ArchivoIndicadores.parse(indicadores)).toHaveLength(7);
    esperarInvalido(ArchivoIndicadores, indicadores.slice(1), /falta el indicador/);
    esperarInvalido(ArchivoIndicadores, [...indicadores, indicadores[0]], /aparece 2 veces/);
  });
  it("las regiones forman un árbol con raíz «mundo»", () => {
    esperarInvalido(ArchivoRegiones, [{ id: "mundo", nombre: "M", tipo: "mundo", contenida_en: "x" }], /no está contenida/);
    esperarInvalido(ArchivoRegiones, [{ id: "mundo", nombre: "M", tipo: "mundo" }, { id: "cr", nombre: "CR", tipo: "pais" }], /contenida/);
    esperarInvalido(ArchivoRegiones, [{ id: "mundo", nombre: "M", tipo: "mundo" }, { id: "cr", nombre: "CR", tipo: "pais", contenida_en: "al" }], /no existe/);
    esperarInvalido(ArchivoRegiones, [{ id: "mundo", nombre: "M", tipo: "mundo" }, { id: "mundo", nombre: "M2", tipo: "mundo" }], /duplicada/);
  });
});
