import { describe, expect, it } from "vitest";
import { ArchivoGlosario, Escuela, Interpretacion, Recorrido, Serie, FilaCsv } from "../../src/schemas/index.ts";
import { esperarInvalido, interpretacionValida, serieValida } from "../ayudantes.ts";

describe("Recorrido", () => {
  const base = { id: "r", unidad: "u1", titulo: "T", pregunta_de_apertura: "¿Q?", pasos: [{ nodo: "a", texto: "x" }, { nodo: "b", texto: "y" }], cierre: { nodo: "b", texto: "z" } };
  it("exige al menos dos pasos", () => {
    expect(Recorrido.parse(base).pasos).toHaveLength(2);
    esperarInvalido(Recorrido, { ...base, pasos: [base.pasos[0]] }, /dos pasos/);
  });
});

describe("Glosario", () => {
  it("exige fuente y rechaza duplicados", () => {
    esperarInvalido(ArchivoGlosario, [{ id: "t", termino: "T", definicion: "d", fuentes: [] }], /sin fuente/);
    esperarInvalido(ArchivoGlosario, [{ id: "t", termino: "T", definicion: "d", fuentes: ["f"] }, { id: "t", termino: "T2", definicion: "d", fuentes: ["f"] }], /duplicado/);
    expect(ArchivoGlosario.parse([{ id: "t", termino: "T", definicion: "d", fuentes: ["f"] }])[0]?.variantes).toEqual([]);
  });
});

describe("campos nuevos", () => {
  it("contrastable_con es opcional y por defecto vacío", () => {
    expect(Interpretacion.parse(interpretacionValida()).contrastable_con).toEqual([]);
    expect(Interpretacion.parse({ ...interpretacionValida(), contrastable_con: ["s"] }).contrastable_con).toEqual(["s"]);
  });
  it("margen_publicado por defecto es false y FilaCsv lee columnas de margen", () => {
    expect(Serie.parse(serieValida()).margen_publicado).toBe(false);
    expect(FilaCsv.parse({ serie: "s", region: "r", anio: "2000", valor: "1", valor_inf: "0.5", valor_sup: "1.5" })).toMatchObject({ valor_inf: 0.5, valor_sup: 1.5 });
    expect(FilaCsv.parse({ serie: "s", region: "r", anio: "2000", valor: "1", valor_inf: "", valor_sup: "" })).not.toHaveProperty("valor_inf");
  });
  it("vocabulario_propio por defecto es vacío", () => {
    expect(Escuela.parse({ id: "x", nombre: "X", postulado_central: "p", autores_representativos: [], critica_principal: "c" }).vocabulario_propio).toEqual([]);
  });
});
