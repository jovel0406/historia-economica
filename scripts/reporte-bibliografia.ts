/**
 * `pnpm run bibliografia:reporte` (SPEC §4.5): lista las fuentes pendientes de verificación o dudosas
 * y qué contenido depende de cada una. Una fuente solo se marca como verificada a mano, tras comprobarla.
 *
 *   --raiz                 raíz del repositorio
 *   --json                 salida en JSON
 *   --fallar-si-pendientes termina con código 1 si hay fuentes sin verificar (para CI futura)
 */
import { parseArgs } from "node:util";
import { cargarProyecto, type Contenido } from "../src/validacion/index.ts";

export interface DependenciasFuente {
  nodos: string[];
  escuelas: string[];
  lentes: string[];
}

/** Para cada fuente, qué nodos, escuelas y lentes la citan. */
export function dependenciasPorFuente(contenido: Contenido): Map<string, DependenciasFuente> {
  const deps = new Map<string, DependenciasFuente>();
  const de = (id: string): DependenciasFuente => {
    const d = deps.get(id) ?? { nodos: [], escuelas: [], lentes: [] };
    deps.set(id, d);
    return d;
  };
  const agregar = (lista: string[], valor: string): void => {
    if (!lista.includes(valor)) lista.push(valor);
  };
  for (const n of contenido.nodos.values()) {
    const citadas = [
      ...n.fuentes,
      ...n.interpretaciones.flatMap((it) => it.autores_principales),
      ...n.aristas.flatMap((a) => a.fuentes),
    ];
    for (const f of citadas) agregar(de(f).nodos, n.id);
  }
  for (const e of contenido.escuelas.values()) {
    for (const f of e.autores_representativos) agregar(de(f).escuelas, e.id);
  }
  for (const [nodoId, entradas] of contenido.lentes) {
    for (const f of entradas.flatMap((e) => e.fuentes)) agregar(de(f).lentes, nodoId);
  }
  return deps;
}

function principal(): void {
  const { values } = parseArgs({
    options: {
      raiz: { type: "string", default: process.cwd() },
      json: { type: "boolean", default: false },
      "fallar-si-pendientes": { type: "boolean", default: false },
    },
  });

  const { contenido, informe } = cargarProyecto({ raiz: values.raiz });
  const deps = dependenciasPorFuente(contenido);
  const fuentes = [...contenido.fuentes.values()];
  const pendientes = fuentes.filter((f) => f.citation_status === "pendiente_de_verificacion");
  const dudosas = fuentes.filter((f) => f.citation_status === "dudosa");
  const verificadas = fuentes.filter((f) => f.citation_status === "verificada");

  if (values.json) {
    const salida = {
      total: fuentes.length,
      verificadas: verificadas.map((f) => f.id),
      pendientes: pendientes.map((f) => ({ ...f, dependencias: deps.get(f.id) ?? { nodos: [], escuelas: [], lentes: [] } })),
      dudosas: dudosas.map((f) => ({ ...f, dependencias: deps.get(f.id) ?? { nodos: [], escuelas: [], lentes: [] } })),
      erroresDeCarga: informe.errores,
    };
    console.log(JSON.stringify(salida, null, 2));
  } else {
    const lineas: string[] = [];
    lineas.push("REPORTE DE BIBLIOGRAFÍA");
    lineas.push(`${fuentes.length} fuente(s): ${verificadas.length} verificada(s), ${pendientes.length} pendiente(s), ${dudosas.length} dudosa(s)`);
    if (informe.errores.length > 0) {
      lineas.push(`(atención: ${informe.errores.length} error(es) de carga; corré \`pnpm run validar\`)`);
    }
    const seccion = (titulo: string, lista: typeof fuentes): void => {
      if (lista.length === 0) return;
      lineas.push("");
      lineas.push(titulo);
      for (const f of lista) {
        const d = deps.get(f.id) ?? { nodos: [], escuelas: [], lentes: [] };
        const autores = f.autores.length > 0 ? f.autores.join("; ") : "(autores sin confirmar)";
        const anio = f.anio ?? "s.f.";
        lineas.push(`- ${f.id}: ${autores} (${anio}). ${f.titulo}`);
        const usos = [
          d.nodos.length > 0 ? `nodos: ${d.nodos.join(", ")}` : "",
          d.escuelas.length > 0 ? `escuelas: ${d.escuelas.join(", ")}` : "",
          d.lentes.length > 0 ? `lentes: ${d.lentes.join(", ")}` : "",
        ].filter((u) => u.length > 0);
        lineas.push(`    usada en → ${usos.length > 0 ? usos.join(" | ") : "(nadie la cita todavía)"}`);
        if (f.nota_verificacion) lineas.push(`    nota: ${f.nota_verificacion}`);
      }
    };
    seccion("PENDIENTES DE VERIFICACIÓN", pendientes);
    seccion("DUDOSAS", dudosas);
    console.log(lineas.join("\n"));
  }

  if (values["fallar-si-pendientes"] && pendientes.length + dudosas.length > 0) process.exitCode = 1;
}

// Solo ejecuta cuando se invoca como script, no cuando los tests importan `dependenciasPorFuente`.
if (process.argv[1] !== undefined && /reporte-bibliografia\.ts$/.test(process.argv[1])) {
  principal();
}
