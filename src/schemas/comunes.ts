import { z } from "zod";

/**
 * Tipos primitivos compartidos por todos los esquemas (SPEC §4).
 * Los tipos de TypeScript se derivan de aquí con `z.infer`; nunca al revés.
 */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const Slug = z
  .string()
  .regex(SLUG_REGEX, "debe ser un slug: minúsculas ASCII, dígitos y guiones simples (ej. gran-divergencia)");

export const NodeId = Slug;
export type NodeId = z.infer<typeof NodeId>;

export const SourceId = Slug;
export type SourceId = z.infer<typeof SourceId>;

export const SchoolId = Slug;
export type SchoolId = z.infer<typeof SchoolId>;

export const RegionId = Slug;
export type RegionId = z.infer<typeof RegionId>;

export const SeriesId = Slug;
export type SeriesId = z.infer<typeof SeriesId>;

export const DatasetId = Slug;
export type DatasetId = z.infer<typeof DatasetId>;

/** Año calendario. El rango es amplio a propósito: el régimen maltusiano precede a la era común. */
export const Anio = z.number().int().min(-10000).max(2100);
export type Anio = z.infer<typeof Anio>;

export const TextoNoVacio = z.string().trim().min(1, "no puede estar vacío");

/** Texto en markdown. Puede estar vacío en nodos `esqueleto`; las reglas por estado viven en `Nodo`. */
export const Markdown = z.string();

/**
 * Marcador de fixture (SPEC §1.2). Un archivo con `_placeholder: true` es contenido de prueba:
 * el validador lo acepta en desarrollo y lo rechaza en modo estricto (build de producción).
 */
export const Marcadores = {
  _placeholder: z.literal(true).optional(),
};
