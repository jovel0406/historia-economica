/**
 * Infraestructura común de los adaptadores de ingesta (SPEC §7):
 * descargar → verificar hash → normalizar → escribir data/processed/ → actualizar data/MANIFIESTO.json.
 * Si algo falla, el adaptador lanza y el proceso termina con código 1.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import XLSX from "xlsx";
import { DatasetManifiesto, Manifiesto, Serie, type Observacion } from "../../src/schemas/index.ts";

export interface Contexto {
  raiz: string;
  /** Si es true y el archivo crudo ya existe, no se vuelve a descargar (útil sin red). */
  reutilizarDescargas: boolean;
  hoy: string;
}

export function contextoDesdeArgv(argv: string[] = process.argv.slice(2)): Contexto {
  return {
    raiz: process.cwd(),
    reutilizarDescargas: argv.includes("--reutilizar") || process.env["INGESTA_REUTILIZAR"] === "1",
    hoy: new Date().toISOString().slice(0, 10),
  };
}

export function sha256(rutaAbs: string): string {
  return createHash("sha256").update(readFileSync(rutaAbs)).digest("hex");
}

export function sha1(rutaAbs: string): string {
  return createHash("sha1").update(readFileSync(rutaAbs)).digest("hex");
}

export async function descargar(url: string, rutaAbs: string, ctx: Contexto): Promise<{ bytes: number; sha256: string; reutilizado: boolean }> {
  if (ctx.reutilizarDescargas && existsSync(rutaAbs)) {
    return { bytes: readFileSync(rutaAbs).length, sha256: sha256(rutaAbs), reutilizado: true };
  }
  const res = await fetch(url, { headers: { "User-Agent": "historia-economica/0.1 (ingesta; mailto:74679870+jovel0406@users.noreply.github.com)" } });
  if (!res.ok) throw new Error(`descarga fallida (${res.status} ${res.statusText}): ${url}`);
  const tipo = res.headers.get("content-type") ?? "";
  if (tipo.includes("text/html")) throw new Error(`la descarga devolvió HTML en vez de un archivo (¿página de bloqueo o de términos?): ${url}`);
  const datos = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(rutaAbs), { recursive: true });
  writeFileSync(rutaAbs, datos);
  return { bytes: datos.length, sha256: sha256(rutaAbs), reutilizado: false };
}

export function leerLibro(rutaAbs: string): XLSX.WorkBook {
  // XLSX.read sobre un buffer evita depender de la integración de `fs` del paquete en ESM.
  return XLSX.read(readFileSync(rutaAbs), { type: "buffer" });
}

/** Filas crudas de una hoja (matriz), con `null` en celdas vacías. */
export function hojaComoFilas(wb: XLSX.WorkBook, nombre: string): unknown[][] {
  const hoja = wb.Sheets[nombre];
  if (hoja === undefined) throw new Error(`la hoja "${nombre}" no existe; hojas: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: null });
}

export function numero(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function escribirCsv(raiz: string, rutaRel: string, filas: Observacion[]): { sha256: string; bytes: number } {
  const abs = join(raiz, rutaRel);
  mkdirSync(dirname(abs), { recursive: true });
  const lineas = ["serie,region,anio,valor"];
  for (const f of filas) lineas.push(`${f.serie},${f.region},${f.anio},${formatearValor(f.valor)}`);
  writeFileSync(abs, lineas.join("\n") + "\n");
  return { sha256: sha256(abs), bytes: readFileSync(abs).length };
}

function formatearValor(v: number): string {
  // Sin notación científica y sin ruido de coma flotante más allá de 6 decimales.
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
}

export function escribirSerie(raiz: string, serie: Serie): void {
  const validada = Serie.parse(serie);
  const abs = join(raiz, "data", "series", `${validada.id}.json`);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(validada, null, 2) + "\n");
}

/** Reemplaza (o agrega) la entrada del dataset en el manifiesto, validando el resultado. */
export function actualizarManifiesto(raiz: string, dataset: DatasetManifiesto): void {
  const abs = join(raiz, "data", "MANIFIESTO.json");
  const actual = existsSync(abs) ? Manifiesto.parse(JSON.parse(readFileSync(abs, "utf8"))) : { datasets: [] };
  const otros = actual.datasets.filter((d) => d.id !== dataset.id);
  const nuevo = Manifiesto.parse({ datasets: [...otros, DatasetManifiesto.parse(dataset)].sort((a, b) => a.id.localeCompare(b.id)) });
  writeFileSync(abs, JSON.stringify(nuevo, null, 2) + "\n");
}

export function rel(raiz: string, abs: string): string {
  return relative(raiz, abs).split("\\").join("/");
}

/** Divide observaciones por el umbral de medición: antes de `umbral` son conjeturales. */
export function partirPorUmbral(filas: Observacion[], umbral: number, idAntes: string, idDespues: string): { antes: Observacion[]; despues: Observacion[] } {
  const antes: Observacion[] = [];
  const despues: Observacion[] = [];
  for (const f of filas) {
    if (f.anio < umbral) antes.push({ ...f, serie: idAntes });
    else despues.push({ ...f, serie: idDespues });
  }
  return { antes, despues };
}

export function rango(filas: Observacion[]): [number, number] {
  if (filas.length === 0) throw new Error("no hay observaciones para calcular el rango");
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const f of filas) {
    if (f.anio < min) min = f.anio;
    if (f.anio > max) max = f.anio;
  }
  return [min, max];
}

export function regionesDe(filas: Observacion[]): string[] {
  return [...new Set(filas.map((f) => f.region))].sort();
}

/** Envoltura de CLI: imprime el resultado y fija el código de salida. */
export async function ejecutarAdaptador(nombre: string, fn: (ctx: Contexto) => Promise<string[]>): Promise<void> {
  const ctx = contextoDesdeArgv();
  try {
    const lineas = await fn(ctx);
    console.log(`[${nombre}] OK`);
    for (const l of lineas) console.log(`  ${l}`);
  } catch (e) {
    console.error(`[${nombre}] FALLA: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
