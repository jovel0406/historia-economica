import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Informe, REGLAS, formatearInforme, validarProyecto } from "../../src/validacion/index.ts";

const RAIZ_REPO = resolve(import.meta.dirname, "../..");
const VALIDO = resolve(import.meta.dirname, "../fixtures/valido");
const INVALIDO = resolve(import.meta.dirname, "../fixtures/invalido");

describe("validarProyecto sobre el fixture válido", () => {
  const { contenido, informe } = validarProyecto({ raiz: VALIDO });

  it("no produce errores ni advertencias", () => {
    expect(informe.errores, formatearInforme(informe, { estricto: true })).toEqual([]);
    expect(informe.advertencias).toEqual([]);
    expect(informe.falla(true)).toBe(false);
  });

  it("carga todas las entidades y las une por id", () => {
    expect([...contenido.nodos.keys()].sort()).toEqual(["evento-borrador", "nodo-esqueleto", "proceso-revisado"]);
    expect(contenido.escuelas.size).toBe(9);
    expect(contenido.fuentes.size).toBe(2);
    expect(contenido.series.has("serie-fixture")).toBe(true);
    expect(contenido.lentes.get("proceso-revisado")).toHaveLength(2);
    expect(contenido.archivoDe.get("proceso-revisado")).toBe("content/nodos/proceso-revisado.json");
  });

  it("informa el estado editorial y las fuentes pendientes como info, no como advertencia", () => {
    const reglas = informe.infos.map((h) => h.regla);
    expect(reglas).toContain(REGLAS.estadoEditorial);
    expect(reglas).toContain(REGLAS.fuentesPendientes);
  });
});

describe("validarProyecto sobre el fixture inválido", () => {
  const { informe } = validarProyecto({ raiz: INVALIDO });
  const mensajes = (regla: string): string[] => informe.conRegla(regla).map((h) => `${h.archivo} ${h.ruta ?? ""} ${h.mensaje}`);

  it("falla", () => {
    expect(informe.falla(false)).toBe(true);
  });

  it("detecta JSON roto", () => {
    expect(mensajes(REGLAS.json).join("\n")).toMatch(/content\/nodos\/roto\.json/);
  });

  it("exige que el id coincida con el nombre del archivo, también en lentes", () => {
    expect(mensajes(REGLAS.idArchivo).join("\n")).toMatch(/mal-id\.json.*otro-id/);
    expect(mensajes(REGLAS.idArchivo).join("\n")).toMatch(/mal-nombrada\.json/);
  });

  it("detecta referencias rotas a regiones, fuentes, escuelas, series y nodos", () => {
    expect(mensajes(REGLAS.referenciaRegion).join("\n")).toMatch(/atlantida/);
    expect(mensajes(REGLAS.referenciaUnidad).join("\n")).toMatch(/unidad-fantasma/);
    expect(mensajes(REGLAS.referenciaCita)).toHaveLength(3);
    expect(mensajes(REGLAS.referenciaCita).join("\n")).toMatch(/descripcion_larga.*fuente-fantasma/);
    expect(mensajes(REGLAS.medioFaltante).join("\n")).toMatch(/no-existe\.png/);
    expect(mensajes(REGLAS.referenciaSerieContraste).join("\n")).toMatch(/serie-fantasma/);
    expect(mensajes(REGLAS.referenciaNodo).join("\n")).toMatch(/recorridos\/roto\.json.*paso 2/);
    expect(mensajes(REGLAS.referenciaUnidad).join("\n")).toMatch(/roto\.json/);
    expect(mensajes(REGLAS.referenciaFuente).join("\n")).toMatch(/glosario\.json t\.fuentes\.0/);
    expect(mensajes(REGLAS.referenciaCita).join("\n")).toMatch(/glosario\.json/);
    expect(mensajes(REGLAS.referenciaFuente).join("\n")).toMatch(/refs-rotas\.json interpretaciones\.0\.autores_principales\.0/);
    expect(mensajes(REGLAS.referenciaFuente).join("\n")).toMatch(/aristas\.0\.fuentes\.0/);
    expect(mensajes(REGLAS.referenciaFuente).join("\n")).toMatch(/escuela-california\.json/);
    expect(mensajes(REGLAS.referenciaFuente).join("\n")).toMatch(/nodo-inexistente\.json 0\.fuentes\.0/);
    expect(mensajes(REGLAS.referenciaEscuela).join("\n")).toMatch(/escuela-fantasma/);
    expect(mensajes(REGLAS.referenciaEscuela).join("\n")).toMatch(/aristas\.0\.sostenida_por\.0/);
    expect(mensajes(REGLAS.referenciaSerie).join("\n")).toMatch(/serie-fantasma/);
    expect(mensajes(REGLAS.referenciaNodo).join("\n")).toMatch(/nodo-fantasma.*esqueleto/);
    expect(mensajes(REGLAS.referenciaNodo).join("\n")).toMatch(/lentes\/nodo-inexistente\.json/);
  });

  it("detecta aristas contradictorias (error) y duplicadas (advertencia)", () => {
    const contradictorias = mensajes(REGLAS.aristaContradictoria);
    expect(contradictorias.join("\n")).toMatch(/arista-a --amplifica--> arista-b.*alto \/ medio/);
    expect(contradictorias).toHaveLength(2);
    const duplicadas = informe.conRegla(REGLAS.aristaDuplicada);
    expect(duplicadas.every((h) => h.nivel === "advertencia")).toBe(true);
    expect(duplicadas.map((h) => h.archivo).sort()).toEqual(["content/nodos/arista-a.json", "content/nodos/arista-b.json"]);
  });

  it("detecta series sin procedencia y hashes que no coinciden", () => {
    expect(mensajes(REGLAS.referenciaDataset).join("\n")).toMatch(/dataset-fantasma/);
    expect(mensajes(REGLAS.hash).join("\n")).toMatch(/serie-fixture\.csv/);
  });

  it("exige columnas de margen cuando la serie declara margen_publicado", () => {
    expect(mensajes(REGLAS.filaCsv).join("\n")).toMatch(/margen_publicado/);
  });

  it("advierte sobre reconstrucción documentada antes de 1820", () => {
    const h = informe.conRegla(REGLAS.evidenciaPre1820);
    expect(h).toHaveLength(1);
    expect(h[0]?.nivel).toBe("advertencia");
  });

  it("advierte sobre escuelas mínimas faltantes y placeholders; exige lente en nodos revisados", () => {
    expect(informe.conRegla(REGLAS.escuelasMinimas)).toHaveLength(7);
    const placeholders = informe.conRegla(REGLAS.placeholder);
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]?.nivel).toBe("advertencia");
    expect(mensajes(REGLAS.lenteFaltante).join("\n")).toMatch(/revisado-sin-lente/);
  });

  it("rechaza dos entradas de lente para la misma región", () => {
    expect(mensajes(REGLAS.lenteDuplicada).join("\n")).toMatch(/costa-rica/);
  });
});

describe("validarProyecto sobre un directorio vacío", () => {
  it("marca como faltantes los archivos obligatorios", () => {
    const { informe } = validarProyecto({ raiz: resolve(import.meta.dirname, "../fixtures/no-existe") });
    const faltantes = informe.conRegla(REGLAS.archivoFaltante).map((h) => h.archivo).sort();
    expect(faltantes).toEqual(["content/fuentes/bibliografia.json", "content/indicadores.json", "content/regiones.json", "content/unidades.json", "data/MANIFIESTO.json"]);
  });
});

describe("Informe y formato", () => {
  it("falla solo con errores, o con advertencias en modo estricto", () => {
    const i = new Informe();
    expect(i.falla(true)).toBe(false);
    i.advertencia("r", "a.json", "m");
    expect(i.falla(false)).toBe(false);
    expect(i.falla(true)).toBe(true);
    i.error("r", "a.json", "m", "x.y");
    expect(i.falla(false)).toBe(true);
    const texto = formatearInforme(i, { estricto: true });
    expect(texto).toContain("a.json");
    expect(texto).toContain("[x.y]");
    expect(texto).toContain("RESULTADO: FALLA");
    expect(formatearInforme(new Informe(), { estricto: false })).toContain("RESULTADO: OK");
  });

  it("oculta los info si se pide", () => {
    const i = new Informe();
    i.info("r", "a.json", "solo info");
    expect(formatearInforme(i, { estricto: false, mostrarInfo: false })).not.toContain("solo info");
  });
});

describe("el contenido real del repositorio (content/ y data/)", () => {
  it("no tiene errores", () => {
    const { informe } = validarProyecto({ raiz: RAIZ_REPO });
    expect(informe.errores, formatearInforme(informe, { estricto: false })).toEqual([]);
  });
});

describe("CLI scripts/validar-contenido.ts", () => {
  const TSX = resolve(RAIZ_REPO, "node_modules/.bin/tsx");
  const SCRIPT = resolve(RAIZ_REPO, "scripts/validar-contenido.ts");
  const correr = (...args: string[]): { codigo: number; salida: string } => {
    try {
      return { codigo: 0, salida: execFileSync(TSX, [SCRIPT, ...args], { encoding: "utf8" }) };
    } catch (e) {
      const err = e as { status: number; stdout: string };
      return { codigo: err.status, salida: err.stdout };
    }
  };

  it("sale con 0 sobre el fixture válido, también en modo estricto", () => {
    expect(correr("--raiz", VALIDO, "--strict").codigo).toBe(0);
  });

  it("sale con 1 sobre el fixture inválido y emite JSON si se pide", () => {
    const r = correr("--raiz", INVALIDO, "--json");
    expect(r.codigo).toBe(1);
    const json = JSON.parse(r.salida) as { falla: boolean; hallazgos: unknown[] };
    expect(json.falla).toBe(true);
    expect(json.hallazgos.length).toBeGreaterThan(5);
  });

  it("el contenido real pasa también en modo estricto (SPEC §11.1)", () => {
    expect(correr("--raiz", RAIZ_REPO).codigo).toBe(0);
    expect(correr("--raiz", RAIZ_REPO, "--strict").codigo).toBe(0);
  });

  it("los placeholders hacen fallar el modo estricto (SPEC §1.2)", () => {
    const estricto = correr("--raiz", INVALIDO, "--strict");
    expect(estricto.codigo).toBe(1);
    expect(estricto.salida).toContain("(placeholder)");
  });
});
