import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";
import { descargar, ejecutarAdaptador, hojaComoFilas, leerLibro, sha1, type Contexto } from "../../scripts/fetch/comun.ts";
import { RUTA_RAW as RAW_MPD, ingerirMaddison } from "../../scripts/fetch/maddison.ts";
import { RUTA_RAW as RAW_PWT, ingerirPwt } from "../../scripts/fetch/pwt.ts";
import { validarProyecto } from "../../src/validacion/index.ts";

function libro(hojas: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas as (string | number | null)[][]), nombre);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function raizTemporal(): string {
  const raiz = mkdtempSync(join(tmpdir(), "ingesta-e2e-"));
  // Contenido mínimo para que el validador pueda comprobar regiones y unidades.
  mkdirSync(join(raiz, "content", "nodos"), { recursive: true });
  mkdirSync(join(raiz, "content", "escuelas"), { recursive: true });
  mkdirSync(join(raiz, "content", "fuentes"), { recursive: true });
  const origen = join(process.cwd(), "content");
  for (const f of ["regiones.json", "indicadores.json", "unidades.json"]) writeFileSync(join(raiz, "content", f), readFileSync(join(origen, f)));
  writeFileSync(join(raiz, "content", "fuentes", "bibliografia.json"), "[]");
  mkdirSync(join(raiz, "data"), { recursive: true });
  writeFileSync(join(raiz, "data", "MANIFIESTO.json"), JSON.stringify({ datasets: [] }));
  return raiz;
}

const ctxDe = (raiz: string): Contexto => ({ raiz, reutilizarDescargas: true, hoy: "2026-09-14" });

describe("ingesta de extremo a extremo con libros sintéticos", () => {
  it("Maddison: escribe series partidas por 1820, CSV, manifiesto con hashes, y el validador lo acepta", async () => {
    const raiz = raizTemporal();
    mkdirSync(join(raiz, "data", "raw"), { recursive: true });
    writeFileSync(join(raiz, RAW_MPD), libro({
      "Full data": [
        ["countrycode", "country", "year", "gdppc", "pop"],
        ["GBR", "United Kingdom", 1700, 2000, 8000],
        ["GBR", "United Kingdom", 1820, 3000, 21000],
        ["GBR", "United Kingdom", 2018, 38000, 66000],
        ["FRA", "France", 1820, 1500, 31000],
        ["CHN", "China", 2018, 13000, 1400000],
      ],
      "Regional data": [
        [null, "GDP pc 2011 prices", null, "Population", null],
        ["Region", "Western Europe", "Asia (East)", "Western Europe", "Asia (East)"],
        ["Year", null, null, null, null],
        [1820, 2306, 1088, 132371, 400000],
        [2018, 40000, 15000, 400000, 1600000],
      ],
    }));
    const salida = await ingerirMaddison(ctxDe(raiz));
    expect(salida.join("\n")).toMatch(/reutilizado/);
    expect(existsSync(join(raiz, "data/series/mpd2020-pib-per-capita-paises-pre1820.json"))).toBe(true);
    expect(readFileSync(join(raiz, "data/processed/mpd2020-pib-per-capita-paises-pre1820.csv"), "utf8")).toBe("serie,region,anio,valor\nmpd2020-pib-per-capita-paises-pre1820,reino-unido,1700,2000\n");
    const manifiesto = JSON.parse(readFileSync(join(raiz, "data/MANIFIESTO.json"), "utf8")) as { datasets: { id: string; archivos: { ruta: string }[] }[] };
    expect(manifiesto.datasets[0]?.id).toBe("maddison-2020");
    expect(manifiesto.datasets[0]?.archivos.map((a) => a.ruta)).toContain("data/processed/mpd2020-pib-per-capita-mapa.csv");
    const { informe } = validarProyecto({ raiz });
    expect(informe.errores).toEqual([]);
  });

  it("Maddison: falla con claridad si una serie queda vacía", async () => {
    const raiz = raizTemporal();
    mkdirSync(join(raiz, "data", "raw"), { recursive: true });
    writeFileSync(join(raiz, RAW_MPD), libro({
      "Full data": [["countrycode", "country", "year", "gdppc", "pop"], ["GBR", "UK", 1900, 4000, 1]],
      "Regional data": [[null, "GDP pc", "Population"], ["Region", "Western Europe", "Western Europe"], ["Year"], [1900, 3000, 1]],
    }));
    await expect(ingerirMaddison(ctxDe(raiz))).rejects.toThrow(/quedó vacía/);
  });

  it("PWT: escribe PIB per cápita, apertura y mapa, con la leyenda en la nota metodológica", async () => {
    const raiz = raizTemporal();
    mkdirSync(join(raiz, "data", "raw"), { recursive: true });
    writeFileSync(join(raiz, RAW_PWT), libro({
      Info: [["Penn World Table, version 10.0"]],
      Legend: [["Variable name", "Variable definition"], ["rgdpe", "Expenditure-side real GDP"], ["pop", "Population (in millions)"], ["csh_x", "Share of exports"], ["csh_m", "Share of imports"]],
      Data: [
        ["countrycode", "country", "currency_unit", "year", "rgdpe", "pop", "csh_x", "csh_m"],
        ["CRI", "Costa Rica", "Colón", 1990, 20000, 3, 0.3, -0.35],
        ["CRI", "Costa Rica", "Colón", 2019, 90000, 5, 0.33, -0.36],
        ["ABW", "Aruba", "Florín", 1990, 2000, 0.1, 0.5, -0.6],
      ],
    }));
    const salida = await ingerirPwt(ctxDe(raiz));
    expect(salida.some((l) => l.includes("pwt100-apertura-comercial-paises.csv: 2 observaciones"))).toBe(true);
    const serie = JSON.parse(readFileSync(join(raiz, "data/series/pwt100-pib-per-capita-paises.json"), "utf8")) as { nota_metodologica: string; cobertura_temporal: [number, number] };
    expect(serie.nota_metodologica).toContain("Expenditure-side real GDP");
    expect(serie.cobertura_temporal).toEqual([1990, 2019]);
    const { informe } = validarProyecto({ raiz });
    expect(informe.errores).toEqual([]);
  });

  it("hojaComoFilas y leerLibro fallan con mensajes útiles", () => {
    const raiz = raizTemporal();
    const ruta = join(raiz, "x.xlsx");
    writeFileSync(ruta, libro({ Hoja: [["a", 1]] }));
    const wb = leerLibro(ruta);
    expect(hojaComoFilas(wb, "Hoja")).toEqual([["a", 1]]);
    expect(() => hojaComoFilas(wb, "Otra")).toThrow(/no existe; hojas: Hoja/);
    expect(sha1(ruta)).toMatch(/^[a-f0-9]{40}$/);
  });
});

describe("descargar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("descarga con fetch, escribe el archivo y devuelve su hash", async () => {
    const raiz = raizTemporal();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(Buffer.from("hola"), { status: 200, headers: { "content-type": "application/octet-stream" } })));
    const r = await descargar("https://example.invalid/a.bin", join(raiz, "data/raw/a.bin"), { raiz, reutilizarDescargas: false, hoy: "2026-09-14" });
    expect(r.bytes).toBe(4);
    expect(r.reutilizado).toBe(false);
    expect(readFileSync(join(raiz, "data/raw/a.bin"), "utf8")).toBe("hola");
  });

  it("rechaza respuestas HTML (muros de bloqueo) y errores HTTP", async () => {
    const raiz = raizTemporal();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } })));
    await expect(descargar("https://example.invalid/x", join(raiz, "x"), { raiz, reutilizarDescargas: false, hoy: "2026-09-14" })).rejects.toThrow(/HTML/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 404, statusText: "Not Found" })));
    await expect(descargar("https://example.invalid/x", join(raiz, "x"), { raiz, reutilizarDescargas: false, hoy: "2026-09-14" })).rejects.toThrow(/404/);
  });
});

describe("ejecutarAdaptador", () => {
  it("fija el código de salida en 1 cuando el adaptador falla y lo deja en 0 si no", async () => {
    const previo = process.exitCode;
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = 0;
    await ejecutarAdaptador("prueba", async () => ["línea"]);
    expect(process.exitCode).toBe(0);
    await ejecutarAdaptador("prueba", async () => { throw new Error("rompió"); });
    expect(process.exitCode).toBe(1);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("rompió"));
    process.exitCode = previo;
    log.mockRestore();
    err.mockRestore();
  });
});
