/** `pnpm run ingesta`: ejecuta todos los adaptadores en orden. Si uno falla, el proceso termina con 1 (SPEC §7). */
import { contextoDesdeArgv } from "./comun.ts";
import { ingerirMaddison } from "./maddison.ts";
import { ingerirPwt } from "./pwt.ts";

const ctx = contextoDesdeArgv();
const adaptadores: [string, (c: typeof ctx) => Promise<string[]>][] = [
  ["maddison-2020", ingerirMaddison],
  ["pwt-100", ingerirPwt],
];
let fallos = 0;
for (const [nombre, fn] of adaptadores) {
  try {
    const lineas = await fn(ctx);
    console.log(`[${nombre}] OK`);
    for (const l of lineas) console.log(`  ${l}`);
  } catch (e) {
    fallos++;
    console.error(`[${nombre}] FALLA: ${e instanceof Error ? e.message : String(e)}`);
  }
}
process.exitCode = fallos > 0 ? 1 : 0;
