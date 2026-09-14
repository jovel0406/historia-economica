import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Lista los `.json` de un directorio (no recursivo), ordenados. Si el directorio no existe, devuelve []. */
export function listarJson(dir: string): string[] {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  return readdirSync(dir)
    .filter((nombre) => nombre.endsWith(".json") && !nombre.startsWith("."))
    .sort()
    .map((nombre) => join(dir, nombre));
}

/** Lee y parsea un JSON. Lanza si el archivo no existe o no es JSON válido. */
export function leerJson(ruta: string): unknown {
  return JSON.parse(readFileSync(ruta, "utf8"));
}

/**
 * Busca `"_placeholder": true` en cualquier nivel de un documento JSON (SPEC §1.2).
 * Devuelve las rutas donde aparece, en notación "$.a.b[2]".
 */
export function encontrarPlaceholders(datos: unknown, ruta = "$"): string[] {
  if (Array.isArray(datos)) {
    return datos.flatMap((item, i) => encontrarPlaceholders(item, `${ruta}[${i}]`));
  }
  if (datos !== null && typeof datos === "object") {
    const obj = datos as Record<string, unknown>;
    const propias = obj["_placeholder"] === true ? [ruta] : [];
    const anidadas = Object.entries(obj).flatMap(([clave, valor]) => encontrarPlaceholders(valor, `${ruta}.${clave}`));
    return [...propias, ...anidadas];
  }
  return [];
}

export function sha256DeArchivo(ruta: string): string {
  return createHash("sha256").update(readFileSync(ruta)).digest("hex");
}
