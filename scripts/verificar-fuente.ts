/**
 * `pnpm run bibliografia:verificar -- <id> --estado verificada|dudosa --nota "quién y cómo"`
 * Registra la verificación manual de una fuente (mejora 15). Solo cambia el archivo; el commit es el registro.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Bibliografia } from "../src/schemas/index.ts";

export function verificarFuente(raiz: string, id: string, estado: "verificada" | "dudosa", nota: string): void {
  const ruta = join(raiz, "content", "fuentes", "bibliografia.json");
  const lista = Bibliografia.parse(JSON.parse(readFileSync(ruta, "utf8")));
  const f = lista.find((x) => x.id === id);
  if (f === undefined) throw new Error(`no existe la fuente "${id}"`);
  if (nota.trim().length === 0) throw new Error("la nota es obligatoria: decí quién verificó y contra qué");
  f.verified = estado === "verificada";
  f.citation_status = estado;
  f.nota_verificacion = `${nota.trim()} [${new Date().toISOString().slice(0, 10)}]`;
  writeFileSync(ruta, JSON.stringify(Bibliografia.parse(lista), null, 2) + "\n");
}

if (process.argv[1] !== undefined && /verificar-fuente\.ts$/.test(process.argv[1])) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { estado: { type: "string", default: "verificada" }, nota: { type: "string", default: "" }, raiz: { type: "string", default: process.cwd() } },
  });
  const id = positionals[0];
  if (id === undefined || (values.estado !== "verificada" && values.estado !== "dudosa")) {
    console.error("uso: verificar-fuente <id> --estado verificada|dudosa --nota \"quién y cómo\"");
    process.exitCode = 2;
  } else {
    try {
      verificarFuente(values.raiz, id, values.estado, values.nota);
      console.log(`${id}: ${values.estado}. Recordá hacer commit.`);
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      process.exitCode = 1;
    }
  }
}
