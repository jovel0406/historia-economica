import { describe, expect, it } from "vitest";
import { Nodo, Periodo } from "../../src/schemas/index.ts";
import { aristaValida, esperarInvalido, interpretacionValida, nodoValido } from "../ayudantes.ts";

describe("Periodo", () => {
  it("fin null significa en curso", () => {
    expect(Periodo.parse({ inicio: 1978, fin: null, precision: "aproximada" }).fin).toBeNull();
  });
  it("rechaza fin anterior a inicio", () => {
    esperarInvalido(Periodo, { inicio: 1900, fin: 1800, precision: "exacta" }, /anterior/);
  });
  it("una periodización disputada exige nota", () => {
    esperarInvalido(Periodo, { inicio: 1500, fin: 1800, precision: "disputada" }, /nota_periodizacion/);
    expect(Periodo.parse({ inicio: 1500, fin: 1800, precision: "disputada", nota_periodizacion: "Quién y por qué." }).precision).toBe("disputada");
  });
});

describe("Nodo (SPEC §4.1, §8)", () => {
  it("acepta un borrador con dos interpretaciones", () => {
    expect(Nodo.parse(nodoValido()).interpretaciones).toHaveLength(2);
  });

  it("un esqueleto puede ir casi vacío", () => {
    const n = Nodo.parse(nodoValido({ estado_editorial: "esqueleto", interpretaciones: [], descripcion_larga: "", fuentes: [] }));
    expect(n.estado_editorial).toBe("esqueleto");
  });

  it("un borrador necesita al menos dos interpretaciones", () => {
    esperarInvalido(Nodo, nodoValido({ interpretaciones: [interpretacionValida()] }), /al menos 2 interpretaciones/);
    esperarInvalido(Nodo, nodoValido({ interpretaciones: [] }), /al menos 2 interpretaciones/);
  });

  it("un borrador necesita descripción larga y fuentes", () => {
    esperarInvalido(Nodo, nodoValido({ descripcion_larga: " " }), /descripcion_larga/);
    esperarInvalido(Nodo, nodoValido({ fuentes: [] }), /fuentes/);
  });

  it("no admite dos interpretaciones de la misma escuela", () => {
    esperarInvalido(Nodo, nodoValido({ interpretaciones: [interpretacionValida(), interpretacionValida()] }), /ya tiene una interpretación/);
  });

  it("toda arista debe involucrar al nodo", () => {
    esperarInvalido(Nodo, nodoValido({ aristas: [aristaValida({ desde: "x", hacia: "y" })] }), /no involucra/);
    expect(Nodo.parse(nodoValido({ aristas: [aristaValida({ desde: "x", hacia: "nodo-a" })] })).aristas).toHaveLength(1);
  });

  it("un nodo revisado exige evidencia a favor, en contra y autores en cada interpretación", () => {
    const sinEvidencia = interpretacionValida({ escuela: "escuela-california", evidencia_en_contra: [] });
    esperarInvalido(Nodo, nodoValido({ estado_editorial: "revisado", interpretaciones: [interpretacionValida(), sinEvidencia] }), /evidencia en contra/);
    const sinAutores = interpretacionValida({ escuela: "escuela-california", autores_principales: [] });
    esperarInvalido(Nodo, nodoValido({ estado_editorial: "revisado", interpretaciones: [interpretacionValida(), sinAutores] }), /autores principales/);
    expect(Nodo.parse(nodoValido({ estado_editorial: "revisado" })).estado_editorial).toBe("revisado");
  });

  it("exige al menos una región", () => {
    esperarInvalido(Nodo, nodoValido({ regiones: [] }), /región/);
  });

  it("rechaza series repetidas", () => {
    esperarInvalido(Nodo, nodoValido({ series: [{ serie: "s" }, { serie: "s" }] }), /dos veces/);
  });

  it("los medios exigen crédito, licencia y ruta bajo public/medios/", () => {
    const medio = { ruta: "medios/x.jpg", titulo: "t", alt: "a", credito: "c", licencia: "CC BY 4.0" };
    expect(Nodo.parse(nodoValido({ medios: [medio] })).medios).toHaveLength(1);
    esperarInvalido(Nodo, nodoValido({ medios: [{ ...medio, ruta: "imagenes/x.jpg" }] }), /public\/medios/);
    esperarInvalido(Nodo, nodoValido({ medios: [{ ...medio, licencia: "" }] }), /licencia/);
  });

  it("acepta el marcador _placeholder y rechaza otros campos extra", () => {
    expect(Nodo.parse({ ...nodoValido(), _placeholder: true })._placeholder).toBe(true);
    esperarInvalido(Nodo, { ...nodoValido(), _placeholder: false }, /_placeholder/);
    esperarInvalido(Nodo, { ...nodoValido(), extra: 1 }, /extra/);
  });
});
