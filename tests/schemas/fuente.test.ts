import { describe, expect, it } from "vitest";
import { Bibliografia, Fuente } from "../../src/schemas/index.ts";
import { esperarInvalido, fuenteValida } from "../ayudantes.ts";

describe("Fuente (SPEC §4.5)", () => {
  it("nace con verified: false y pendiente de verificación por defecto", () => {
    const f = Fuente.parse(fuenteValida());
    expect(f.verified).toBe(false);
    expect(f.citation_status).toBe("pendiente_de_verificacion");
  });

  it("permite dejar en blanco autores y año cuando no se pueden confirmar", () => {
    const f = Fuente.parse(fuenteValida({ autores: [], anio: null }));
    expect(f.autores).toEqual([]);
    expect(f.anio).toBeNull();
  });

  it("exige título", () => {
    esperarInvalido(Fuente, fuenteValida({ titulo: "  " }), /titulo/);
  });

  it("rechaza verified: true sin citation_status verificada", () => {
    esperarInvalido(Fuente, fuenteValida({ verified: true, nota_verificacion: "x" }), /citation_status/);
  });

  it("rechaza citation_status verificada sin verified: true", () => {
    esperarInvalido(Fuente, fuenteValida({ citation_status: "verificada" }), /verified/);
  });

  it("exige nota_verificacion en una fuente verificada", () => {
    esperarInvalido(Fuente, fuenteValida({ verified: true, citation_status: "verificada" }), /nota_verificacion/);
    expect(Fuente.parse(fuenteValida({ verified: true, citation_status: "verificada", nota_verificacion: "Comprobada en catálogo." })).verified).toBe(true);
  });

  it("valida la forma del DOI y de la URL", () => {
    esperarInvalido(Fuente, fuenteValida({ doi: "doi:abc" }), /DOI/);
    esperarInvalido(Fuente, fuenteValida({ url: "no es url" }), /url/i);
    expect(Fuente.parse(fuenteValida({ doi: "10.1000/xyz123", url: "https://example.org/x" })).doi).toBe("10.1000/xyz123");
  });

  it("rechaza campos desconocidos (para que un typo no pase inadvertido)", () => {
    esperarInvalido(Fuente, { ...fuenteValida(), autor: "x" }, /autor/);
  });

  it("rechaza ids que no sean slug", () => {
    esperarInvalido(Fuente, fuenteValida({ id: "Fuente Uno" }), /slug/);
  });

  it("Bibliografia rechaza ids duplicados", () => {
    esperarInvalido(Bibliografia, [fuenteValida(), fuenteValida()], /duplicado/);
    expect(Bibliografia.parse([fuenteValida(), fuenteValida({ id: "otra" })])).toHaveLength(2);
  });
});
