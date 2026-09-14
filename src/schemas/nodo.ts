import { z } from "zod";
import { Arista } from "./arista.ts";
import { Anio, Markdown, Marcadores, NodeId, RegionId, SeriesId, SourceId, TextoNoVacio } from "./comunes.ts";
import { Interpretacion } from "./interpretacion.ts";
import type { LensEntry } from "./lente.ts";
import { UnidadId } from "./unidad.ts";

/** Acontecimiento o proceso (SPEC §4.1). Corazón del modelo: todas las vistas son proyecciones de esto. */

export const TipoNodo = z.enum(["proceso", "evento"]);
export type TipoNodo = z.infer<typeof TipoNodo>;

export const PrecisionPeriodo = z.enum(["exacta", "aproximada", "disputada"]);
export type PrecisionPeriodo = z.infer<typeof PrecisionPeriodo>;

export const EstadoEditorial = z.enum(["esqueleto", "borrador", "revisado"]);
export type EstadoEditorial = z.infer<typeof EstadoEditorial>;

/** Mínimo de interpretaciones para un nodo que no sea `esqueleto` (SPEC §8, §11.2). */
export const MINIMO_INTERPRETACIONES = 2;

export const Periodo = z
  .strictObject({
    inicio: Anio,
    /** null = en curso. */
    fin: Anio.nullable(),
    precision: PrecisionPeriodo,
    /** Por qué estas fechas y quién las discute. Obligatoria si la precisión es disputada. */
    nota_periodizacion: TextoNoVacio.optional(),
  })
  .superRefine((p, ctx) => {
    if (p.fin !== null && p.fin < p.inicio) {
      ctx.addIssue({ code: "custom", path: ["fin"], message: `fin (${p.fin}) no puede ser anterior a inicio (${p.inicio})` });
    }
    if (p.precision === "disputada" && !p.nota_periodizacion) {
      ctx.addIssue({
        code: "custom",
        path: ["nota_periodizacion"],
        message: 'una periodización "disputada" debe explicar en nota_periodizacion por qué estas fechas y quién las discute',
      });
    }
  });
export type Periodo = z.infer<typeof Periodo>;

/** Imagen u otro medio asociado al nodo. La ruta es relativa a `public/`; el archivo debe existir. */
export const Medio = z.strictObject({
  ruta: z.string().regex(/^medios\/[a-z0-9_\-/]+\.(png|jpe?g|webp|svg)$/, "debe ser un archivo de imagen bajo public/medios/"),
  titulo: TextoNoVacio,
  /** Texto alternativo accesible. */
  alt: TextoNoVacio,
  credito: TextoNoVacio,
  licencia: TextoNoVacio,
  url_origen: z.url({ protocol: /^https?$/ }).optional(),
});
export type Medio = z.infer<typeof Medio>;

export const SeriesRef = z.strictObject({
  serie: SeriesId,
  /** Por qué esta serie es relevante para este nodo. */
  nota: TextoNoVacio.optional(),
});
export type SeriesRef = z.infer<typeof SeriesRef>;

export const Nodo = z
  .strictObject({
    ...Marcadores,
    id: NodeId,
    titulo: TextoNoVacio,
    tipo: TipoNodo,
    periodo: Periodo,
    regiones: z.array(RegionId).min(1, "un nodo debe ubicarse en al menos una región"),
    /** Unidades de referencia de la Vista Tiempo (content/unidades.json). Opcional; un nodo puede abarcar varias. */
    unidades: z.array(UnidadId).optional(),
    /** 2–3 frases, neutral entre escuelas (SPEC §8). */
    resumen: TextoNoVacio,
    descripcion_larga: Markdown,
    interpretaciones: z.array(Interpretacion),
    series: z.array(SeriesRef),
    aristas: z.array(Arista),
    fuentes: z.array(SourceId),
    /** Imágenes y otros medios; opcional. Cada uno lleva crédito y licencia (nunca una imagen sin procedencia). */
    medios: z.array(Medio).optional(),
    estado_editorial: EstadoEditorial,
  })
  .superRefine((n, ctx) => {
    n.aristas.forEach((a, i) => {
      if (a.desde !== n.id && a.hacia !== n.id) {
        ctx.addIssue({ code: "custom", path: ["aristas", i], message: `la arista ${a.desde} → ${a.hacia} no involucra a este nodo (${n.id})` });
      }
    });

    const escuelasVistas = new Set<string>();
    n.interpretaciones.forEach((it, i) => {
      if (escuelasVistas.has(it.escuela)) {
        ctx.addIssue({ code: "custom", path: ["interpretaciones", i, "escuela"], message: `la escuela "${it.escuela}" ya tiene una interpretación en este nodo` });
      }
      escuelasVistas.add(it.escuela);
    });

    const seriesVistas = new Set<string>();
    n.series.forEach((s, i) => {
      if (seriesVistas.has(s.serie)) {
        ctx.addIssue({ code: "custom", path: ["series", i, "serie"], message: `serie "${s.serie}" referida dos veces` });
      }
      seriesVistas.add(s.serie);
    });

    if (n.estado_editorial === "esqueleto") return;

    // Reglas para borrador y revisado.
    if (n.interpretaciones.length < MINIMO_INTERPRETACIONES) {
      ctx.addIssue({
        code: "custom",
        path: ["interpretaciones"],
        message: `un nodo "${n.estado_editorial}" necesita al menos ${MINIMO_INTERPRETACIONES} interpretaciones (tiene ${n.interpretaciones.length}); si solo hay una, marcalo "esqueleto" (SPEC §8)`,
      });
    }
    if (n.descripcion_larga.trim().length === 0) {
      ctx.addIssue({ code: "custom", path: ["descripcion_larga"], message: `un nodo "${n.estado_editorial}" necesita descripcion_larga` });
    }
    if (n.fuentes.length === 0) {
      ctx.addIssue({ code: "custom", path: ["fuentes"], message: `un nodo "${n.estado_editorial}" necesita al menos una fuente` });
    }

    if (n.estado_editorial !== "revisado") return;

    // Reglas adicionales para revisado.
    n.interpretaciones.forEach((it, i) => {
      if (it.evidencia_a_favor.length === 0) {
        ctx.addIssue({ code: "custom", path: ["interpretaciones", i, "evidencia_a_favor"], message: 'en un nodo "revisado" toda interpretación lista evidencia a favor' });
      }
      if (it.evidencia_en_contra.length === 0) {
        ctx.addIssue({ code: "custom", path: ["interpretaciones", i, "evidencia_en_contra"], message: 'en un nodo "revisado" toda interpretación lista evidencia en contra' });
      }
      if (it.autores_principales.length === 0) {
        ctx.addIssue({ code: "custom", path: ["interpretaciones", i, "autores_principales"], message: 'en un nodo "revisado" toda interpretación cita a sus autores principales' });
      }
    });
  });
export type Nodo = z.infer<typeof Nodo>;

/** Nodo con la lente regional unida (SPEC §4.1 `lente_regional`). Es una forma derivada; el archivo del nodo no la contiene. */
export type NodoCompleto = Nodo & { lente_regional: LensEntry[] };
