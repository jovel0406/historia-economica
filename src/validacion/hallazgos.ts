import type { ZodError } from "zod";

/**
 * Resultado de una validación. Tres niveles:
 * - error: rompe el build siempre.
 * - advertencia: se muestra en desarrollo; en modo estricto (build de producción) rompe el build.
 * - info: estado del contenido (nodos esqueleto, fuentes pendientes); nunca rompe nada.
 */
export type Nivel = "error" | "advertencia" | "info";

export interface Hallazgo {
  nivel: Nivel;
  /** Identificador estable de la regla, para tests y filtros (ej. "referencia-fuente"). */
  regla: string;
  /** Ruta del archivo relativa a la raíz del repositorio. */
  archivo: string;
  /** Ruta dentro del JSON (ej. "interpretaciones.1.escuela"), si aplica. */
  ruta?: string;
  mensaje: string;
}

export class Informe {
  readonly hallazgos: Hallazgo[] = [];

  agregar(h: Hallazgo): void {
    this.hallazgos.push(h);
  }

  error(regla: string, archivo: string, mensaje: string, ruta?: string): void {
    this.agregar(ruta === undefined ? { nivel: "error", regla, archivo, mensaje } : { nivel: "error", regla, archivo, mensaje, ruta });
  }

  advertencia(regla: string, archivo: string, mensaje: string, ruta?: string): void {
    this.agregar(ruta === undefined ? { nivel: "advertencia", regla, archivo, mensaje } : { nivel: "advertencia", regla, archivo, mensaje, ruta });
  }

  info(regla: string, archivo: string, mensaje: string, ruta?: string): void {
    this.agregar(ruta === undefined ? { nivel: "info", regla, archivo, mensaje } : { nivel: "info", regla, archivo, mensaje, ruta });
  }

  /** Convierte cada issue de Zod en un error con su ruta dentro del JSON. */
  desdeZod(regla: string, archivo: string, error: ZodError): void {
    for (const issue of error.issues) {
      const ruta = issue.path.map(String).join(".");
      this.error(regla, archivo, issue.message, ruta.length > 0 ? ruta : undefined);
    }
  }

  get errores(): Hallazgo[] {
    return this.hallazgos.filter((h) => h.nivel === "error");
  }

  get advertencias(): Hallazgo[] {
    return this.hallazgos.filter((h) => h.nivel === "advertencia");
  }

  get infos(): Hallazgo[] {
    return this.hallazgos.filter((h) => h.nivel === "info");
  }

  /** ¿Debe fallar el proceso? En modo estricto, las advertencias también fallan. */
  falla(estricto: boolean): boolean {
    return this.errores.length > 0 || (estricto && this.advertencias.length > 0);
  }

  conRegla(regla: string): Hallazgo[] {
    return this.hallazgos.filter((h) => h.regla === regla);
  }
}
