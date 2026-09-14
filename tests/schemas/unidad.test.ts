import { describe, expect, it } from "vitest";
import { ArchivoUnidades, Nodo, Unidad } from "../../src/schemas/index.ts";
import { esperarInvalido, nodoValido } from "../ayudantes.ts";

const unidad = (numero: number, id = `u${numero}`): Unidad => ({ id, numero, titulo: `Unidad ${numero}`, contenido_central: "Contenido." });

describe("Unidades de referencia de la línea de tiempo", () => {
  it("acepta la lista numerada sin huecos", () => {
    expect(ArchivoUnidades.parse([unidad(1), unidad(2), unidad(3)])).toHaveLength(3);
  });
  it("rechaza huecos, repeticiones e ids duplicados", () => {
    esperarInvalido(ArchivoUnidades, [unidad(1), unidad(3)], /sin huecos/);
    esperarInvalido(ArchivoUnidades, [unidad(1), unidad(1, "otra")], /sin huecos/);
    esperarInvalido(ArchivoUnidades, [unidad(1), unidad(2, "u1")], /duplicada/);
  });
  it("el periodo orientativo es opcional y debe ser coherente", () => {
    expect(Unidad.parse({ ...unidad(1), periodo_orientativo: { inicio: 1929, fin: null } }).periodo_orientativo?.fin).toBeNull();
    esperarInvalido(Unidad, { ...unidad(1), periodo_orientativo: { inicio: 1950, fin: 1929 } }, /anterior/);
  });
  it("un nodo puede declarar varias unidades", () => {
    expect(Nodo.parse(nodoValido({ unidades: ["u1", "u2"] })).unidades).toEqual(["u1", "u2"]);
  });
});
