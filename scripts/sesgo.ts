/**
 * `pnpm run sesgo`: lista los resúmenes que usan vocabulario propio de una sola escuela (regla sesgo-lexico).
 * Es una ayuda a la regla de neutralidad del SPEC §8, no un veredicto. Termina con 1 si encuentra alguno.
 */
import { parseArgs } from "node:util";
import { REGLAS, validarProyecto } from "../src/validacion/index.ts";

const { values } = parseArgs({ options: { raiz: { type: "string", default: process.cwd() } } });
const { informe } = validarProyecto({ raiz: values.raiz });
const hallazgos = informe.conRegla(REGLAS.sesgoLexico);
if (hallazgos.length === 0) {
  console.log("Sin resúmenes con vocabulario de una sola escuela.");
} else {
  console.log(`${hallazgos.length} resumen(es) a revisar:`);
  for (const h of hallazgos) console.log(`- ${h.archivo}: ${h.mensaje}`);
  process.exitCode = 1;
}
