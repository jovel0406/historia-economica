import { describe, expect, it } from "vitest";
import { Interpretacion, LONGITUD_MINIMA_REFUTACION, esFormulacionVacua } from "../../src/schemas/index.ts";
import { esperarInvalido, interpretacionValida } from "../ayudantes.ts";

describe("Interpretacion (SPEC §4.2)", () => {
  it("acepta una interpretación bien formulada", () => {
    expect(Interpretacion.parse(interpretacionValida()).escuela).toBe("institucionalista");
  });

  it("que_la_refutaria es obligatorio y no admite cadena vacía", () => {
    esperarInvalido(Interpretacion, interpretacionValida({ que_la_refutaria: "" }), /que_la_refutaria/);
    const { que_la_refutaria: _omitida, ...sinCampo } = interpretacionValida();
    esperarInvalido(Interpretacion, sinCampo, /que_la_refutaria/);
  });

  it("rechaza formulaciones vacuas del tipo «evidencia en contra»", () => {
    for (const vacua of ["Evidencia en contra.", "evidencia en contra", "Nueva evidencia empírica en contra", "Datos que la contradigan", "Que se demuestre lo contrario.", "N/A", "Pendiente"]) {
      expect(esFormulacionVacua(vacua), vacua).toBe(true);
      esperarInvalido(Interpretacion, interpretacionValida({ que_la_refutaria: vacua }), /que_la_refutaria/);
    }
  });

  it("rechaza una condición de refutación demasiado corta", () => {
    const corta = "x".repeat(LONGITUD_MINIMA_REFUTACION - 1);
    esperarInvalido(Interpretacion, interpretacionValida({ que_la_refutaria: corta }), /mínimo/);
  });

  it("rechaza un TODO como condición de refutación", () => {
    esperarInvalido(Interpretacion, interpretacionValida({ que_la_refutaria: "TODO: pensar qué observación concreta refutaría esta interpretación" }), /TODO/);
  });

  it("no confunde la palabra española «todo» con un TODO pendiente", () => {
    const texto = "Todo registro de salarios urbanos anterior a 1750 que mostrara paridad con Europa la refutaría.";
    expect(Interpretacion.parse(interpretacionValida({ que_la_refutaria: texto })).que_la_refutaria).toBe(texto);
  });

  it("exige un peso académico del conjunto cerrado", () => {
    esperarInvalido(Interpretacion, { ...interpretacionValida(), peso_academico: "hegemonica" }, /peso_academico/);
  });
});
