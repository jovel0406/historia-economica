import { expect } from "vitest";
import type { z } from "zod";
import type { Arista, DatasetManifiesto, FuenteEntrada, Interpretacion, Nodo, Serie } from "../src/schemas/index.ts";

/** Afirma que el esquema rechaza los datos y que algún mensaje de issue coincide con `patron`. */
export function esperarInvalido(esquema: z.ZodType, datos: unknown, patron: RegExp | string): void {
  const r = esquema.safeParse(datos);
  expect(r.success, "se esperaba que el esquema rechazara los datos").toBe(false);
  if (r.success) return;
  const mensajes = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const coincide = mensajes.some((m) => (typeof patron === "string" ? m.includes(patron) : patron.test(m)));
  expect(coincide, `ningún issue coincide con ${String(patron)}. Issues:\n${mensajes.join("\n")}`).toBe(true);
}

export function fuenteValida(extra: Partial<FuenteEntrada> = {}): FuenteEntrada {
  return { id: "fuente-prueba", tipo: "libro", autores: ["Prueba, Autora"], titulo: "Título de prueba", anio: 2000, ...extra };
}

export function interpretacionValida(extra: Partial<Interpretacion> = {}): Interpretacion {
  return {
    escuela: "institucionalista",
    mecanismo: "Mecanismo de prueba.",
    desarrollo: "Desarrollo de prueba.",
    autores_principales: ["fuente-prueba"],
    evidencia_a_favor: ["Evidencia a favor."],
    evidencia_en_contra: ["Evidencia en contra."],
    que_la_refutaria: "Quedaría refutada si la serie de salarios reales mostrara el patrón inverso durante todo el período.",
    peso_academico: "sustancial",
    ...extra,
  };
}

export function aristaValida(extra: Partial<Arista> = {}): Arista {
  return { desde: "nodo-a", hacia: "nodo-b", tipo: "precondicion_de", consenso: "alto", nota: "Nota de prueba.", fuentes: [], ...extra };
}

export function nodoValido(extra: Partial<Nodo> = {}): Nodo {
  return {
    id: "nodo-a",
    titulo: "Nodo de prueba",
    tipo: "proceso",
    periodo: { inicio: 1700, fin: 1850, precision: "aproximada" },
    regiones: ["europa-occidental"],
    resumen: "Resumen de prueba.",
    descripcion_larga: "Descripción larga de prueba.",
    interpretaciones: [interpretacionValida(), interpretacionValida({ escuela: "escuela-california" })],
    series: [],
    aristas: [],
    fuentes: ["fuente-prueba"],
    estado_editorial: "borrador",
    ...extra,
  };
}

export function serieValida(extra: Partial<Serie> = {}): Serie {
  return {
    id: "serie-prueba",
    indicador: "pib_per_capita",
    fuente_dataset: "dataset-prueba",
    cobertura_temporal: [1950, 2020],
    cobertura_geografica: ["mundo"],
    unidad: "dólares internacionales de 2011",
    nivel_evidencia: "estadistica_oficial",
    nota_metodologica: "Nota metodológica de prueba.",
    advertencias: [],
    archivo: "data/processed/serie-prueba.csv",
    ...extra,
  };
}

export function datasetValido(extra: Partial<DatasetManifiesto> = {}): DatasetManifiesto {
  return {
    id: "dataset-prueba",
    nombre: "Dataset de prueba",
    institucion: "Institución de prueba",
    url: "https://example.invalid/dataset",
    version: "2023",
    fecha_descarga: "2026-01-01",
    licencia: "CC BY 4.0",
    cita_requerida: "Cita de prueba.",
    archivos: [{ ruta: "data/processed/serie-prueba.csv", sha256: "a".repeat(64) }],
    ...extra,
  };
}
