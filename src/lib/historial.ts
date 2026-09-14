/** Historial de cambios por nodo (mejora 16), derivado del registro de git en tiempo de build. Sin git, lista vacía. */
import { execFileSync } from "node:child_process";
import { contenido } from "./contenido.ts";

export interface Cambio {
  fecha: string;
  hash: string;
  asunto: string;
}

const cache = new Map<string, Cambio[]>();

export function historialDe(rutaRelativa: string): Cambio[] {
  const previo = cache.get(rutaRelativa);
  if (previo !== undefined) return previo;
  let cambios: Cambio[] = [];
  try {
    const salida = execFileSync("git", ["log", "--follow", "--date=short", "--format=%ad%x09%h%x09%s", "--", rutaRelativa], { cwd: contenido().raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    cambios = salida
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => {
        const [fecha = "", hash = "", ...resto] = l.split("\t");
        return { fecha, hash, asunto: resto.join("\t") };
      });
  } catch {
    cambios = [];
  }
  cache.set(rutaRelativa, cambios);
  return cambios;
}
