import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { construirProyecto, dividirNombre, escribirArtefactos, textoCitacion, textoHumans, textoLicenciaCodigo, textoLicenciaContenido } from "../../scripts/autoria.ts";
import { Proyecto, marcadoresPendientes } from "../../src/schemas/index.ts";

const RAIZ = resolve(import.meta.dirname, "../..");

/**
 * Proyecto sin completar, con los marcadores tal como nace el archivo. Se define aquí en vez de leer
 * `content/proyecto.json` para que el test no dependa de si la autoría del repositorio ya se registró.
 */
const BASE: unknown = {
  "titulo": "Historia económica mundial",
  "subtitulo": "Tiempo, espacio, datos e interpretaciones en disputa",
  "descripcion": "Plataforma interactiva para explorar por qué el crecimiento económico moderno ocurrió cuándo y dónde ocurrió, y por qué se distribuyó tan desigualmente, recorriendo la misma historia bajo escuelas interpretativas distintas.",
  "autor": {
    "nombre": "«NOMBRE COMPLETO»",
    "apellidos": "«APELLIDOS»",
    "nombre_de_pila": "«NOMBRE DE PILA»",
    "seudonimo": "refuseniks",
    "email": "autor@ejemplo.org"
  },
  "anio": 2026,
  "version": "1.0.0",
  "repositorio": "https://github.com/«USUARIO-GITHUB»/historia-economica",
  "sitio": "https://«USUARIO-GITHUB».github.io/historia-economica",
  "licencia_contenido": {
    "spdx": "CC-BY-4.0",
    "nombre": "Creative Commons Atribución 4.0 Internacional",
    "url": "https://creativecommons.org/licenses/by/4.0/deed.es",
    "archivo": "LICENSE-CONTENIDO.txt",
    "cubre": "los textos, las interpretaciones, la bibliografía, el glosario y los datos normalizados de data/processed/"
  },
  "licencia_codigo": {
    "spdx": "MIT",
    "nombre": "Licencia MIT",
    "url": "https://opensource.org/licenses/MIT",
    "archivo": "LICENSE",
    "cubre": "el código fuente: esquemas, validador, adaptadores de ingesta, componentes y páginas"
  }
};

describe("dividirNombre", () => {
  it("toma la primera palabra como nombre de pila y el resto como apellidos", () => {
    expect(dividirNombre("Ana Pérez Ramírez")).toEqual({ nombreDePila: "Ana", apellidos: "Pérez Ramírez" });
    expect(dividirNombre("  Marx  ")).toEqual({ nombreDePila: "Marx", apellidos: "Marx" });
  });
});

describe("construirProyecto", () => {
  it("completa autoría y URLs a partir del usuario de GitHub", () => {
    const p = construirProyecto(BASE, { nombre: "Ana Pérez Ramírez", usuario: "anaperez" });
    expect(marcadoresPendientes(p)).toEqual([]);
    expect(p.repositorio).toBe("https://github.com/anaperez/historia-economica");
    expect(p.sitio).toBe("https://anaperez.github.io/historia-economica");
    expect(p.autor.apellidos).toBe("Pérez Ramírez");
    expect(p.autor.seudonimo).toBe("refuseniks");
  });

  it("respeta la división explícita del nombre y los datos opcionales", () => {
    const p = construirProyecto(BASE, { nombre: "Ana Pérez Ramírez", usuario: "x", nombreDePila: "Ana María", apellidos: "Pérez", orcid: "https://orcid.org/0000-0002-1825-0097", afiliacion: "UCR" });
    expect(p.autor.nombre_de_pila).toBe("Ana María");
    expect(p.autor.orcid).toBe("https://orcid.org/0000-0002-1825-0097");
    expect(p.autor.afiliacion).toBe("UCR");
  });

  it("acepta repositorio y sitio propios sin usuario", () => {
    const p = construirProyecto(BASE, { nombre: "Ana P", repositorio: "https://codeberg.org/ana/he", sitio: "https://historia.ejemplo.org" });
    expect(p.sitio).toBe("https://historia.ejemplo.org");
  });

  it("rechaza un ORCID mal formado", () => {
    expect(() => construirProyecto(BASE, { nombre: "Ana P", usuario: "x", orcid: "0000-0002-1825-0097" })).toThrow();
  });
});

describe("artefactos de autoría", () => {
  const p: Proyecto = construirProyecto(BASE, { nombre: "Ana Pérez Ramírez", usuario: "anaperez", email: "ana@ejemplo.org" });

  it("la licencia del código lleva año y titular, y conserva el texto MIT", () => {
    const t = textoLicenciaCodigo(RAIZ, p);
    expect(t).toContain(`Copyright (c) ${p.anio} Ana Pérez Ramírez (refuseniks)`);
    expect(t).toContain("MIT License");
    expect(t).not.toContain("<year>");
  });

  it("la licencia del contenido antepone la atribución y conserva el texto legal de CC BY 4.0", () => {
    const t = textoLicenciaContenido(RAIZ, p);
    expect(t).toContain("Attribution 4.0 International");
    expect(t).toContain("Ana Pérez Ramírez");
    expect(t).toContain("data/MANIFIESTO.json");
    expect(t.length).toBeGreaterThan(15000);
  });

  it("CITATION.cff es válido en lo esencial y no rompe con comillas", () => {
    const t = textoCitacion({ ...p, titulo: 'Título con "comillas"' }, "2026-09-14");
    expect(t).toContain("cff-version: 1.2.0");
    expect(t).toContain('family-names: "Pérez Ramírez"');
    expect(t).toContain('given-names: "Ana"');
    expect(t).toContain('date-released: "2026-09-14"');
    expect(t).toContain('\\"comillas\\"');
  });

  it("humans.txt nombra al autor y a las fuentes de datos", () => {
    const t = textoHumans(p);
    expect(t).toContain("Ana Pérez Ramírez (refuseniks)");
    expect(t).toContain("Maddison");
  });

  it("escribirArtefactos deja los cinco archivos en un repositorio limpio", () => {
    // Se trabaja sobre una copia temporal: el repositorio real nunca recibe una autoría de prueba.
    const destino = mkdtempSync(join(tmpdir(), "autoria-"));
    cpSync(join(RAIZ, "scripts", "plantillas"), join(destino, "scripts", "plantillas"), { recursive: true });
    mkdirSync(join(destino, "content"), { recursive: true });
    writeFileSync(join(destino, "content", "proyecto.json"), JSON.stringify(BASE, null, 2) + "\n");

    const escritos = escribirArtefactos(destino, p, "2026-09-14");
    expect(escritos).toEqual(["content/proyecto.json", "LICENSE", "LICENSE-CONTENIDO.txt", "CITATION.cff", "public/humans.txt"]);
    const guardado = Proyecto.parse(JSON.parse(readFileSync(join(destino, "content", "proyecto.json"), "utf8")));
    expect(guardado.autor.nombre).toBe("Ana Pérez Ramírez");
    expect(marcadoresPendientes(guardado)).toEqual([]);
    expect(readFileSync(join(destino, "CITATION.cff"), "utf8")).toContain("cff-version: 1.2.0");
    expect(readFileSync(join(destino, "LICENSE"), "utf8")).toContain("MIT License");

    // El repositorio real conserva sus marcadores sin completar.
    expect(marcadoresPendientes(BASE)).toHaveLength(5);
  });
});

describe("quitarCoautor", () => {
  it("borra solo los coautores que coinciden con el prefijo y respeta a los demás", async () => {
    const { quitarCoautor } = await import("../../scripts/autoria.ts");
    const mensaje = "Título\n\nCuerpo del commit.\n\nCo-Authored-By: Herramienta Automatica <bot@ejemplo.org>\nCo-Authored-By: Otra Persona <otra@ejemplo.org>\n";
    const limpio = quitarCoautor(mensaje, "Herramienta");
    expect(limpio).toContain("Co-Authored-By: Otra Persona <otra@ejemplo.org>");
    expect(limpio).not.toContain("Herramienta Automatica");
    expect(limpio.endsWith("\n")).toBe(true);
    expect(limpio).not.toMatch(/\n\n\n/);
  });

  it("no toca un mensaje sin coautores y no deja líneas en blanco al final", async () => {
    const { quitarCoautor } = await import("../../scripts/autoria.ts");
    expect(quitarCoautor("Solo un título\n", "Herramienta")).toBe("Solo un título\n");
    expect(quitarCoautor("Título\n\nCo-Authored-By: Herramienta X <a@b>\n\n", "Herramienta")).toBe("Título\n");
  });
});
