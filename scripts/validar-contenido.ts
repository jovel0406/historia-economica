/**
 * `pnpm run validar` / `pnpm run validar:estricto` (SPEC §3, §6, §11.1).
 * Valida todo `content/` y `data/` contra los esquemas Zod y las reglas de integridad referencial.
 *
 *   --strict   las advertencias también fallan (lo usa `pnpm run build`; los fixtures `_placeholder` rompen aquí)
 *   --raiz     raíz del repositorio (por defecto, el directorio actual)
 *   --json     imprime el informe como JSON en vez de texto
 *   --sin-info oculta los hallazgos de nivel info
 */
import { parseArgs } from "node:util";
import { formatearInforme, validarProyecto } from "../src/validacion/index.ts";

const { values } = parseArgs({
  options: {
    strict: { type: "boolean", default: false },
    raiz: { type: "string", default: process.cwd() },
    json: { type: "boolean", default: false },
    "sin-info": { type: "boolean", default: false },
  },
});

const { informe } = validarProyecto({ raiz: values.raiz });

if (values.json) {
  console.log(JSON.stringify({ estricto: values.strict, falla: informe.falla(values.strict), hallazgos: informe.hallazgos }, null, 2));
} else {
  console.log(formatearInforme(informe, { estricto: values.strict, mostrarInfo: !values["sin-info"] }));
}

process.exitCode = informe.falla(values.strict) ? 1 : 0;
