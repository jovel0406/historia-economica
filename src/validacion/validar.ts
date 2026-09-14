import { existsSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import type { z } from "zod";
import {
  ArchivoGlosario,
  ArchivoIndicadores,
  ArchivoLentes,
  ArchivoRegiones,
  ArchivoUnidades,
  Bibliografia,
  ESCUELAS_MINIMAS_V1,
  FilaCsv,
  Escuela,
  Manifiesto,
  Nodo,
  Recorrido,
  Serie,
  UMBRAL_MEDICION,
  claveArista,
  type Consenso,
  type Fuente,
  type Indicador,
  type LensEntry,
  type Region,
  type Termino,
  type Unidad,
} from "../schemas/index.ts";
import { encontrarPlaceholders, leerJson, listarJson, sha256DeArchivo } from "./cargar.ts";
import { citasEn } from "./citas.ts";
import { Informe } from "./hallazgos.ts";

export interface Opciones {
  /** Raíz del repositorio: contiene `content/` y `data/`. */
  raiz: string;
}

/** Todo el contenido cargado y validado contra los esquemas, indexado por id. */
export interface Contenido {
  raiz: string;
  regiones: Map<string, Region>;
  indicadores: Map<string, Indicador>;
  unidades: Map<string, Unidad>;
  escuelas: Map<string, Escuela>;
  fuentes: Map<string, Fuente>;
  manifiesto: Manifiesto;
  series: Map<string, Serie>;
  nodos: Map<string, Nodo>;
  /** Entradas de lente por id de nodo. */
  lentes: Map<string, LensEntry[]>;
  recorridos: Map<string, Recorrido>;
  glosario: Map<string, Termino>;
  /** Archivo (relativo a la raíz) del que salió cada nodo, serie, escuela o lente, por id. */
  archivoDe: Map<string, string>;
}

/** Longitud orientativa de un `resumen` de 2–3 frases (SPEC §4.1). Superarla es advertencia, no error. */
export const LIMITE_RESUMEN = 600;

export const REGLAS = {
  json: "json",
  archivoFaltante: "archivo-faltante",
  esquema: "esquema",
  placeholder: "placeholder",
  idArchivo: "id-archivo",
  escuelasMinimas: "escuelas-minimas",
  fuentesPendientes: "fuentes-pendientes",
  referenciaRegion: "referencia-region",
  referenciaUnidad: "referencia-unidad",
  referenciaFuente: "referencia-fuente",
  referenciaEscuela: "referencia-escuela",
  referenciaSerie: "referencia-serie",
  referenciaNodo: "referencia-nodo",
  referenciaDataset: "referencia-dataset",
  referenciaCita: "referencia-cita",
  medioFaltante: "medio-faltante",
  filaCsv: "fila-csv",
  referenciaSerieContraste: "referencia-serie-contraste",
  sesgoLexico: "sesgo-lexico",
  rawAusente: "raw-ausente",
  datoSinManifiesto: "dato-sin-manifiesto",
  hash: "hash",
  evidenciaPre1820: "evidencia-pre-1820",
  aristaContradictoria: "arista-contradictoria",
  aristaDuplicada: "arista-duplicada",
  resumenLargo: "resumen-largo",
  estadoEditorial: "estado-editorial",
  lenteFaltante: "lente-faltante",
  lenteDuplicada: "lente-duplicada",
} as const;

interface Ctx {
  raiz: string;
  informe: Informe;
}

function rel(ctx: Ctx, rutaAbs: string): string {
  return relative(ctx.raiz, rutaAbs);
}

/** Lee un JSON, registra errores de lectura y advertencias de placeholder. Devuelve undefined si no se pudo leer. */
function cargarJson(ctx: Ctx, rutaAbs: string, obligatorio: boolean): unknown {
  const archivo = rel(ctx, rutaAbs);
  if (!existsSync(rutaAbs)) {
    if (obligatorio) ctx.informe.error(REGLAS.archivoFaltante, archivo, "el archivo es obligatorio y no existe");
    return undefined;
  }
  let datos: unknown;
  try {
    datos = leerJson(rutaAbs);
  } catch (e) {
    ctx.informe.error(REGLAS.json, archivo, `JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
    return undefined;
  }
  for (const ruta of encontrarPlaceholders(datos)) {
    ctx.informe.advertencia(
      REGLAS.placeholder,
      archivo,
      "marcado como _placeholder (fixture): aceptado en desarrollo, rechazado en el build de producción (SPEC §1.2)",
      ruta,
    );
  }
  return datos;
}

function parsear<S extends z.ZodType>(ctx: Ctx, esquema: S, datos: unknown, archivo: string): z.output<S> | undefined {
  const r = esquema.safeParse(datos);
  if (!r.success) {
    ctx.informe.desdeZod(REGLAS.esquema, archivo, r.error);
    return undefined;
  }
  return r.data;
}

/** Carga un directorio de archivos "uno por entidad", exigiendo que el id coincida con el nombre del archivo. */
function cargarDirectorio<S extends z.ZodType<{ id: string }>>(
  ctx: Ctx,
  dir: string,
  esquema: S,
  destino: Map<string, z.output<S>>,
  archivoDe: Map<string, string>,
): void {
  for (const rutaAbs of listarJson(dir)) {
    const archivo = rel(ctx, rutaAbs);
    const datos = cargarJson(ctx, rutaAbs, true);
    if (datos === undefined) continue;
    const entidad = parsear(ctx, esquema, datos, archivo);
    if (entidad === undefined) continue;
    const esperado = basename(rutaAbs, ".json");
    if (entidad.id !== esperado) {
      ctx.informe.error(REGLAS.idArchivo, archivo, `el id "${entidad.id}" no coincide con el nombre del archivo "${esperado}.json"`, "id");
      continue;
    }
    destino.set(entidad.id, entidad);
    archivoDe.set(entidad.id, archivo);
  }
}

/**
 * Carga y valida cada archivo contra su esquema. No comprueba referencias cruzadas (eso es `validarReferencias`).
 * Siempre devuelve un `Contenido`, aunque sea parcial: el informe dice qué falló.
 */
export function cargarProyecto(opciones: Opciones, informe = new Informe()): { contenido: Contenido; informe: Informe } {
  const ctx: Ctx = { raiz: opciones.raiz, informe };
  const content = join(opciones.raiz, "content");
  const data = join(opciones.raiz, "data");
  const archivoDe = new Map<string, string>();

  const regiones = new Map<string, Region>();
  {
    const rutaAbs = join(content, "regiones.json");
    const datos = cargarJson(ctx, rutaAbs, true);
    const lista = datos === undefined ? undefined : parsear(ctx, ArchivoRegiones, datos, rel(ctx, rutaAbs));
    for (const r of lista ?? []) regiones.set(r.id, r);
  }

  const indicadores = new Map<string, Indicador>();
  {
    const rutaAbs = join(content, "indicadores.json");
    const datos = cargarJson(ctx, rutaAbs, true);
    const lista = datos === undefined ? undefined : parsear(ctx, ArchivoIndicadores, datos, rel(ctx, rutaAbs));
    for (const i of lista ?? []) indicadores.set(i.id, i);
  }

  const unidades = new Map<string, Unidad>();
  {
    const rutaAbs = join(content, "unidades.json");
    const datos = cargarJson(ctx, rutaAbs, true);
    const lista = datos === undefined ? undefined : parsear(ctx, ArchivoUnidades, datos, rel(ctx, rutaAbs));
    for (const u of lista ?? []) unidades.set(u.id, u);
  }

  const escuelas = new Map<string, Escuela>();
  cargarDirectorio(ctx, join(content, "escuelas"), Escuela, escuelas, archivoDe);
  for (const id of ESCUELAS_MINIMAS_V1) {
    if (!escuelas.has(id)) {
      informe.advertencia(REGLAS.escuelasMinimas, "content/escuelas", `falta la escuela mínima de la v1 "${id}" (SPEC §4.6)`);
    }
  }

  const fuentes = new Map<string, Fuente>();
  {
    const rutaAbs = join(content, "fuentes", "bibliografia.json");
    const archivo = rel(ctx, rutaAbs);
    const datos = cargarJson(ctx, rutaAbs, true);
    const lista = datos === undefined ? undefined : parsear(ctx, Bibliografia, datos, archivo);
    for (const f of lista ?? []) fuentes.set(f.id, f);
    const pendientes = [...fuentes.values()].filter((f) => !f.verified).length;
    if (pendientes > 0) {
      informe.info(REGLAS.fuentesPendientes, archivo, `${pendientes} fuente(s) sin verificar; ver \`pnpm run bibliografia:reporte\``);
    }
  }

  let manifiesto: Manifiesto = { datasets: [] };
  {
    const rutaAbs = join(data, "MANIFIESTO.json");
    const datos = cargarJson(ctx, rutaAbs, true);
    const m = datos === undefined ? undefined : parsear(ctx, Manifiesto, datos, rel(ctx, rutaAbs));
    if (m !== undefined) manifiesto = m;
  }

  const series = new Map<string, Serie>();
  cargarDirectorio(ctx, join(data, "series"), Serie, series, archivoDe);

  const nodos = new Map<string, Nodo>();
  cargarDirectorio(ctx, join(content, "nodos"), Nodo, nodos, archivoDe);

  const lentes = new Map<string, LensEntry[]>();
  for (const rutaAbs of listarJson(join(content, "lentes"))) {
    const archivo = rel(ctx, rutaAbs);
    const datos = cargarJson(ctx, rutaAbs, true);
    if (datos === undefined) continue;
    const entradas = parsear(ctx, ArchivoLentes, datos, archivo);
    if (entradas === undefined) continue;
    const esperado = basename(rutaAbs, ".json");
    let coherente = true;
    entradas.forEach((e, i) => {
      if (e.nodo !== esperado) {
        informe.error(REGLAS.idArchivo, archivo, `la entrada apunta al nodo "${e.nodo}" pero el archivo se llama "${esperado}.json"`, `${i}.nodo`);
        coherente = false;
      }
    });
    if (!coherente) continue;
    lentes.set(esperado, entradas);
    archivoDe.set(`lente:${esperado}`, archivo);
  }

  const recorridos = new Map<string, Recorrido>();
  cargarDirectorio(ctx, join(content, "recorridos"), Recorrido, recorridos, archivoDe);

  const glosario = new Map<string, Termino>();
  {
    const rutaAbs = join(content, "glosario.json");
    if (existsSync(rutaAbs)) {
      const datos = cargarJson(ctx, rutaAbs, false);
      const lista = datos === undefined ? undefined : parsear(ctx, ArchivoGlosario, datos, rel(ctx, rutaAbs));
      for (const t of lista ?? []) glosario.set(t.id, t);
    }
  }

  return {
    contenido: { raiz: opciones.raiz, regiones, indicadores, unidades, escuelas, fuentes, manifiesto, series, nodos, lentes, recorridos, glosario, archivoDe },
    informe,
  };
}

/** Cada fila del CSV debe parsear, pertenecer a la serie y usar regiones conocidas (§11.3). */
function validarFilasCsv(contenido: Contenido, s: Serie, informe: Informe): void {
  const texto = readFileSync(join(contenido.raiz, s.archivo), "utf8");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cabecera = lineas[0]?.split(",") ?? [];
  const esperada = ["serie", "region", "anio", "valor"];
  if (esperada.some((c, i) => cabecera[i] !== c)) {
    informe.error(REGLAS.filaCsv, s.archivo, `la cabecera debe empezar por "${esperada.join(",")}" (encontrada: "${cabecera.join(",")}")`);
    return;
  }
  const [inicio, fin] = s.cobertura_temporal;
  let erroresMostrados = 0;
  for (let i = 1; i < lineas.length; i++) {
    const celdas = (lineas[i] ?? "").split(",");
    const conMargen = cabecera[4] === "valor_inf";
    const fila = conMargen
      ? { serie: celdas[0], region: celdas[1], anio: celdas[2], valor: celdas[3], valor_inf: celdas[4], valor_sup: celdas[5], nota: celdas[6] }
      : { serie: celdas[0], region: celdas[1], anio: celdas[2], valor: celdas[3], nota: celdas[4] };
    const r = FilaCsv.safeParse(fila);
    let mensaje: string | undefined;
    if (!r.success) mensaje = r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ");
    else if (r.data.serie !== s.id) mensaje = `la fila pertenece a la serie "${r.data.serie}", no a "${s.id}"`;
    else if (s.granularidad === "regiones" && !contenido.regiones.has(r.data.region)) mensaje = `región desconocida "${r.data.region}"`;
    else if (s.granularidad === "paises-iso3" && !/^[A-Z]{3}$/.test(r.data.region)) mensaje = `se esperaba un código ISO3, no "${r.data.region}"`;
    else if (r.data.anio < inicio || r.data.anio > fin) mensaje = `año ${r.data.anio} fuera de la cobertura declarada ${inicio}–${fin}`;
    if (mensaje !== undefined && erroresMostrados < 5) {
      informe.error(REGLAS.filaCsv, s.archivo, `línea ${i + 1}: ${mensaje}`);
      erroresMostrados++;
    }
  }
  if (lineas.length < 2) informe.error(REGLAS.filaCsv, s.archivo, "el CSV no tiene observaciones");
  if (s.margen_publicado && cabecera[4] !== "valor_inf") informe.error(REGLAS.filaCsv, s.archivo, "la serie declara margen_publicado pero el CSV no tiene columnas valor_inf,valor_sup");
}

/** Comprueba integridad referencial y reglas que cruzan archivos. */
export function validarReferencias(contenido: Contenido, informe: Informe): void {
  const { regiones, unidades, escuelas, fuentes, manifiesto, series, nodos, lentes, recorridos, glosario, archivoDe } = contenido;
  const datasets = new Map(manifiesto.datasets.map((d) => [d.id, d]));
  const archivosManifestados = new Set(manifiesto.datasets.flatMap((d) => d.archivos.map((a) => a.ruta)));

  const exigirRegion = (archivo: string, id: string, ruta: string): void => {
    if (!regiones.has(id)) informe.error(REGLAS.referenciaRegion, archivo, `la región "${id}" no existe en content/regiones.json`, ruta);
  };
  const exigirFuente = (archivo: string, id: string, ruta: string): void => {
    if (!fuentes.has(id)) informe.error(REGLAS.referenciaFuente, archivo, `la fuente "${id}" no existe en content/fuentes/bibliografia.json`, ruta);
  };
  const exigirEscuela = (archivo: string, id: string, ruta: string): void => {
    if (!escuelas.has(id)) informe.error(REGLAS.referenciaEscuela, archivo, `la escuela "${id}" no existe en content/escuelas/`, ruta);
  };
  const exigirCitas = (archivo: string, texto: string, ruta: string): void => {
    for (const id of citasEn(texto)) {
      if (!fuentes.has(id)) informe.error(REGLAS.referenciaCita, archivo, `la cita [@${id}] no corresponde a ninguna fuente de content/fuentes/bibliografia.json`, ruta);
    }
  };

  // Manifiesto: cada archivo registrado debe existir y su hash coincidir (procedencia, SPEC §6).
  manifiesto.datasets.forEach((d, i) => {
    d.archivos.forEach((a, j) => {
      const rutaAbs = join(contenido.raiz, a.ruta);
      const ruta = `datasets.${i}.archivos.${j}`;
      if (!existsSync(rutaAbs)) {
        if (a.ruta.startsWith("data/raw/")) {
          informe.info(REGLAS.rawAusente, "data/MANIFIESTO.json", `la descarga cruda "${a.ruta}" no está en este clon (data/raw/ no se versiona); el hash registrado permite verificarla al reingerir`, ruta);
        } else {
          informe.error(REGLAS.archivoFaltante, "data/MANIFIESTO.json", `el archivo manifestado "${a.ruta}" no existe`, ruta);
        }
        return;
      }
      const real = sha256DeArchivo(rutaAbs);
      if (real !== a.sha256) {
        informe.error(REGLAS.hash, "data/MANIFIESTO.json", `el sha256 de "${a.ruta}" no coincide con el manifiesto (real: ${real})`, `${ruta}.sha256`);
      }
    });
  });

  // Escuelas → fuentes.
  for (const e of escuelas.values()) {
    const archivo = archivoDe.get(e.id) ?? `content/escuelas/${e.id}.json`;
    e.autores_representativos.forEach((f, i) => exigirFuente(archivo, f, `autores_representativos.${i}`));
    exigirCitas(archivo, e.postulado_central, "postulado_central");
    exigirCitas(archivo, e.critica_principal, "critica_principal");
  }

  // Series → manifiesto, regiones, archivo CSV.
  for (const s of series.values()) {
    const archivo = archivoDe.get(s.id) ?? `data/series/${s.id}.json`;
    if (!datasets.has(s.fuente_dataset)) {
      informe.error(REGLAS.referenciaDataset, archivo, `el dataset "${s.fuente_dataset}" no está en data/MANIFIESTO.json: sin procedencia registrada, el dato no entra (SPEC §6)`, "fuente_dataset");
    }
    s.cobertura_geografica.forEach((r, i) => exigirRegion(archivo, r, `cobertura_geografica.${i}`));
    if (!existsSync(join(contenido.raiz, s.archivo))) {
      informe.error(REGLAS.archivoFaltante, archivo, `el CSV "${s.archivo}" no existe`, "archivo");
    } else if (!archivosManifestados.has(s.archivo)) {
      informe.error(REGLAS.datoSinManifiesto, archivo, `el CSV "${s.archivo}" no figura en los archivos de ningún dataset del manifiesto`, "archivo");
    } else {
      validarFilasCsv(contenido, s, informe);
    }
    if (s.cobertura_temporal[0] < UMBRAL_MEDICION && s.nivel_evidencia === "reconstruccion_documentada") {
      informe.advertencia(
        REGLAS.evidenciaPre1820,
        archivo,
        `la serie empieza en ${s.cobertura_temporal[0]}, antes de ${UMBRAL_MEDICION}; el SPEC (§1.4, §11.6) trata todo lo anterior como estimación conjetural. Justificalo en nota_metodologica o cambiá nivel_evidencia`,
        "nivel_evidencia",
      );
    }
  }

  // Nodos.
  const aristasVistas = new Map<string, { archivo: string; consenso: Consenso }[]>();
  for (const n of nodos.values()) {
    const archivo = archivoDe.get(n.id) ?? `content/nodos/${n.id}.json`;
    n.regiones.forEach((r, i) => exigirRegion(archivo, r, `regiones.${i}`));
    (n.unidades ?? []).forEach((u, i) => {
      if (!unidades.has(u)) informe.error(REGLAS.referenciaUnidad, archivo, `la unidad "${u}" no existe en content/unidades.json`, `unidades.${i}`);
    });
    n.fuentes.forEach((f, i) => exigirFuente(archivo, f, `fuentes.${i}`));
    exigirCitas(archivo, n.resumen, "resumen");
    exigirCitas(archivo, n.descripcion_larga, "descripcion_larga");
    if (n.periodo.nota_periodizacion !== undefined) exigirCitas(archivo, n.periodo.nota_periodizacion, "periodo.nota_periodizacion");
    n.interpretaciones.forEach((it, i) => {
      exigirEscuela(archivo, it.escuela, `interpretaciones.${i}.escuela`);
      it.autores_principales.forEach((f, j) => exigirFuente(archivo, f, `interpretaciones.${i}.autores_principales.${j}`));
      const ruta = `interpretaciones.${i}`;
      it.contrastable_con.forEach((sid, j) => {
        if (!series.has(sid)) informe.error(REGLAS.referenciaSerieContraste, archivo, `la serie "${sid}" con la que se dice contrastable no existe en data/series/`, `${ruta}.contrastable_con.${j}`);
      });
      exigirCitas(archivo, it.mecanismo, `${ruta}.mecanismo`);
      exigirCitas(archivo, it.desarrollo, `${ruta}.desarrollo`);
      exigirCitas(archivo, it.que_la_refutaria, `${ruta}.que_la_refutaria`);
      it.evidencia_a_favor.forEach((t, j) => exigirCitas(archivo, t, `${ruta}.evidencia_a_favor.${j}`));
      it.evidencia_en_contra.forEach((t, j) => exigirCitas(archivo, t, `${ruta}.evidencia_en_contra.${j}`));
    });
    (n.medios ?? []).forEach((m, i) => {
      if (!existsSync(join(contenido.raiz, "public", m.ruta))) {
        informe.error(REGLAS.medioFaltante, archivo, `el medio "${m.ruta}" no existe bajo public/`, `medios.${i}.ruta`);
      }
    });
    n.series.forEach((s, i) => {
      if (!series.has(s.serie)) informe.error(REGLAS.referenciaSerie, archivo, `la serie "${s.serie}" no existe en data/series/`, `series.${i}.serie`);
    });
    n.aristas.forEach((a, i) => {
      const ruta = `aristas.${i}`;
      for (const extremo of ["desde", "hacia"] as const) {
        if (!nodos.has(a[extremo])) {
          informe.error(
            REGLAS.referenciaNodo,
            archivo,
            `el nodo "${a[extremo]}" no existe en content/nodos/. Si todavía no se implementa, creá un archivo con estado_editorial "esqueleto"`,
            `${ruta}.${extremo}`,
          );
        }
      }
      a.fuentes.forEach((f, j) => exigirFuente(archivo, f, `${ruta}.fuentes.${j}`));
      exigirCitas(archivo, a.nota, `${ruta}.nota`);
      (a.sostenida_por ?? []).forEach((e, j) => exigirEscuela(archivo, e, `${ruta}.sostenida_por.${j}`));
      (a.negada_por ?? []).forEach((e, j) => exigirEscuela(archivo, e, `${ruta}.negada_por.${j}`));

      const clave = claveArista(a);
      const previas = aristasVistas.get(clave) ?? [];
      previas.push({ archivo, consenso: a.consenso });
      aristasVistas.set(clave, previas);
    });

    // Sesgo léxico (mejora 17): un resumen debe leerse sin adherir a ninguna escuela (SPEC §8).
    const normalizado = n.resumen.toLowerCase();
    const escuelasDetectadas = [...escuelas.values()].filter((e) => e.vocabulario_propio.some((v) => normalizado.includes(v.toLowerCase())));
    if (escuelasDetectadas.length === 1) {
      const e = escuelasDetectadas[0]!;
      const terminos = e.vocabulario_propio.filter((v) => normalizado.includes(v.toLowerCase()));
      informe.info(REGLAS.sesgoLexico, archivo, `el resumen usa vocabulario propio de la escuela "${e.nombre}" (${terminos.join(", ")}) y de ninguna otra: revisá si un partidario de las demás lo consideraría tendencioso (SPEC §8)`, "resumen");
    }

    if (n.resumen.length > LIMITE_RESUMEN) {
      informe.advertencia(REGLAS.resumenLargo, archivo, `el resumen tiene ${n.resumen.length} caracteres; debería ser de 2–3 frases (orientativo: ≤ ${LIMITE_RESUMEN})`, "resumen");
    }
    if (n.estado_editorial !== "revisado") {
      informe.info(REGLAS.estadoEditorial, archivo, `nodo en estado "${n.estado_editorial}"`, "estado_editorial");
    }
    if (n.estado_editorial === "revisado" && !lentes.has(n.id)) {
      informe.advertencia(REGLAS.lenteFaltante, archivo, `un nodo "revisado" debería tener lente regional en content/lentes/${n.id}.json (SPEC §4.8)`);
    }
  }

  // Aristas declaradas en más de un archivo: mismo consenso = duplicada (advertencia); distinto = contradicción (error).
  for (const [clave, apariciones] of aristasVistas) {
    if (apariciones.length < 2) continue;
    const consensos = new Set(apariciones.map((a) => a.consenso));
    const archivos = [...new Set(apariciones.map((a) => a.archivo))];
    if (consensos.size > 1) {
      for (const archivo of archivos) {
        informe.error(REGLAS.aristaContradictoria, archivo, `la arista ${clave} se declara con consensos distintos (${[...consensos].join(" / ")}) en: ${archivos.join(", ")}`);
      }
    } else {
      for (const archivo of archivos) {
        informe.advertencia(REGLAS.aristaDuplicada, archivo, `la arista ${clave} está declarada en más de un archivo (${archivos.join(", ")}); dejala en uno solo`);
      }
    }
  }

  // Recorridos → unidad, nodos, citas.
  for (const r of recorridos.values()) {
    const archivo = archivoDe.get(r.id) ?? `content/recorridos/${r.id}.json`;
    if (!unidades.has(r.unidad)) informe.error(REGLAS.referenciaUnidad, archivo, `la unidad "${r.unidad}" no existe`, "unidad");
    r.pasos.forEach((p, i) => {
      if (!nodos.has(p.nodo)) informe.error(REGLAS.referenciaNodo, archivo, `el nodo "${p.nodo}" del paso ${i + 1} no existe`, `pasos.${i}.nodo`);
      exigirCitas(archivo, p.texto, `pasos.${i}.texto`);
    });
    if (!nodos.has(r.cierre.nodo)) informe.error(REGLAS.referenciaNodo, archivo, `el nodo de cierre "${r.cierre.nodo}" no existe`, "cierre.nodo");
    exigirCitas(archivo, r.cierre.texto, "cierre.texto");
  }

  // Glosario → fuentes, citas.
  for (const t of glosario.values()) {
    t.fuentes.forEach((f, i) => exigirFuente("content/glosario.json", f, `${t.id}.fuentes.${i}`));
    exigirCitas("content/glosario.json", t.definicion, `${t.id}.definicion`);
  }

  // Lentes → nodos, fuentes; una entrada por región.
  for (const [nodoId, entradas] of lentes) {
    const archivo = archivoDe.get(`lente:${nodoId}`) ?? `content/lentes/${nodoId}.json`;
    if (!nodos.has(nodoId)) {
      informe.error(REGLAS.referenciaNodo, archivo, `la lente apunta al nodo "${nodoId}", que no existe en content/nodos/`);
    }
    const regionesVistas = new Set<string>();
    entradas.forEach((e, i) => {
      e.fuentes.forEach((f, j) => exigirFuente(archivo, f, `${i}.fuentes.${j}`));
      exigirCitas(archivo, e.texto, `${i}.texto`);
      if (regionesVistas.has(e.region)) {
        informe.error(REGLAS.lenteDuplicada, archivo, `hay más de una entrada para la región "${e.region}"`, `${i}.region`);
      }
      regionesVistas.add(e.region);
    });
  }
}

/** Validación completa: carga + esquemas + referencias. */
export function validarProyecto(opciones: Opciones): { contenido: Contenido; informe: Informe } {
  const { contenido, informe } = cargarProyecto(opciones);
  validarReferencias(contenido, informe);
  return { contenido, informe };
}
