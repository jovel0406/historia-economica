/**
 * `pnpm run autoria -- --nombre "Nombre Apellido" --usuario <usuario-github>`
 *
 * Registra la autoría del proyecto en un solo paso (ver docs/DECISIONES.md, D49):
 *   1. completa `content/proyecto.json`;
 *   2. genera LICENSE (código) y LICENSE-CONTENIDO.txt (contenido y datos) a partir de los textos
 *      canónicos versionados en scripts/plantillas/, rellenando año y titular;
 *   3. genera CITATION.cff, para que GitHub y Zenodo muestren cómo citar el trabajo;
 *   4. genera public/humans.txt;
 *   5. con --reescribir-commits, reescribe el autor de todo el historial de Git.
 *
 * Opciones:
 *   --nombre           nombre completo, como debe aparecer en la licencia y la citación (obligatorio)
 *   --usuario          usuario de GitHub (obligatorio salvo que se pasen --repositorio y --sitio)
 *   --repositorio      URL del repositorio, si no es github.com/<usuario>/historia-economica
 *   --sitio            URL pública del sitio, si no es <usuario>.github.io/historia-economica
 *   --nombre-de-pila   si la división automática del nombre no es correcta
 *   --apellidos        idem
 *   --seudonimo        seudónimo a mostrar junto al nombre (por defecto, el que ya esté)
 *   --email            correo de contacto (por defecto, el que ya esté)
 *   --orcid            ORCID completo, ej. https://orcid.org/0000-0002-1825-0097
 *   --afiliacion       institución
 *   --reescribir-commits   reescribe autor y committer de todo el historial con este nombre y correo
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { Proyecto, marcadoresPendientes } from "../src/schemas/index.ts";

export interface Entrada {
  nombre: string;
  usuario?: string | undefined;
  repositorio?: string | undefined;
  sitio?: string | undefined;
  nombreDePila?: string | undefined;
  apellidos?: string | undefined;
  seudonimo?: string | undefined;
  email?: string | undefined;
  orcid?: string | undefined;
  afiliacion?: string | undefined;
}

/**
 * Divide un nombre completo en nombre de pila y apellidos. Heurística deliberadamente simple:
 * la primera palabra es el nombre de pila y el resto son apellidos. Se imprime lo que decidió para
 * que el autor pueda corregirlo con --nombre-de-pila y --apellidos; no se adivinan convenciones.
 */
export function dividirNombre(nombre: string): { nombreDePila: string; apellidos: string } {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return { nombreDePila: partes[0]!, apellidos: partes[0]! };
  return { nombreDePila: partes[0]!, apellidos: partes.slice(1).join(" ") };
}

export function construirProyecto(actual: unknown, e: Entrada): Proyecto {
  const base = Proyecto.parse(actual);
  const division = dividirNombre(e.nombre);
  const repositorio = e.repositorio ?? (e.usuario !== undefined ? `https://github.com/${e.usuario}/historia-economica` : base.repositorio);
  const sitio = e.sitio ?? (e.usuario !== undefined ? `https://${e.usuario}.github.io/historia-economica` : base.sitio);
  const autor: Proyecto["autor"] = {
    nombre: e.nombre.trim(),
    apellidos: e.apellidos ?? division.apellidos,
    nombre_de_pila: e.nombreDePila ?? division.nombreDePila,
  };
  const seudonimo = e.seudonimo ?? base.autor.seudonimo;
  const email = e.email ?? base.autor.email;
  const orcid = e.orcid ?? base.autor.orcid;
  const afiliacion = e.afiliacion ?? base.autor.afiliacion;
  if (seudonimo !== undefined) autor.seudonimo = seudonimo;
  if (email !== undefined) autor.email = email;
  if (orcid !== undefined) autor.orcid = orcid;
  if (afiliacion !== undefined) autor.afiliacion = afiliacion;
  return Proyecto.parse({ ...base, autor, repositorio, sitio });
}

function plantilla(raiz: string, nombre: string): string {
  return readFileSync(join(raiz, "scripts", "plantillas", nombre), "utf8");
}

export function textoLicenciaCodigo(raiz: string, p: Proyecto): string {
  const titular = p.autor.seudonimo !== undefined ? `${p.autor.nombre} (${p.autor.seudonimo})` : p.autor.nombre;
  return plantilla(raiz, "MIT.txt").replace("<year>", String(p.anio)).replace("<copyright holders>", titular);
}

export function textoLicenciaContenido(raiz: string, p: Proyecto): string {
  const titular = p.autor.seudonimo !== undefined ? `${p.autor.nombre} (${p.autor.seudonimo})` : p.autor.nombre;
  const cabecera = [
    `${p.titulo}. ${p.subtitulo}`,
    `Copyright (c) ${p.anio} ${titular}`,
    "",
    `Esta licencia cubre ${p.licencia_contenido.cubre}.`,
    `El código fuente se distribuye por separado bajo ${p.licencia_codigo.nombre} (ver ${p.licencia_codigo.archivo}).`,
    "",
    "Los datos de terceros conservan la licencia y la forma de citación de su institución de origen,",
    "registradas dataset por dataset en data/MANIFIESTO.json y mostradas en la página /fuentes.",
    "Atribuir esta obra no exime de atribuir esas fuentes.",
    "",
    "A continuación, el texto legal de la licencia, copiado literalmente de creativecommons.org",
    "(ver scripts/plantillas/PROCEDENCIA.md).",
    "",
    "=".repeat(70),
    "",
  ].join("\n");
  return cabecera + plantilla(raiz, "CC-BY-4.0.txt");
}

/** CITATION.cff, formato Citation File Format 1.2.0. GitHub lo usa para «Cite this repository». */
export function textoCitacion(p: Proyecto, fecha: string): string {
  const cita = (v: string): string => `"${v.replace(/"/g, '\\"')}"`;
  const L: string[] = [];
  L.push("cff-version: 1.2.0");
  L.push(`message: ${cita("Si usás esta plataforma o su contenido, citala así.")}`);
  L.push("type: software");
  L.push(`title: ${cita(`${p.titulo}: ${p.subtitulo}`)}`);
  L.push(`abstract: ${cita(p.descripcion)}`);
  L.push("authors:");
  L.push(`  - family-names: ${cita(p.autor.apellidos)}`);
  L.push(`    given-names: ${cita(p.autor.nombre_de_pila)}`);
  if (p.autor.seudonimo !== undefined) L.push(`    alias: ${cita(p.autor.seudonimo)}`);
  if (p.autor.email !== undefined) L.push(`    email: ${cita(p.autor.email)}`);
  if (p.autor.orcid !== undefined) L.push(`    orcid: ${cita(p.autor.orcid)}`);
  if (p.autor.afiliacion !== undefined) L.push(`    affiliation: ${cita(p.autor.afiliacion)}`);
  L.push(`version: ${cita(p.version)}`);
  L.push(`date-released: ${cita(fecha)}`);
  L.push(`license: ${cita(p.licencia_codigo.spdx)}`);
  L.push(`license-url: ${cita(p.licencia_contenido.url)}`);
  L.push(`repository-code: ${cita(p.repositorio)}`);
  L.push(`url: ${cita(p.sitio)}`);
  L.push("keywords:");
  for (const k of ["historia económica", "gran divergencia", "crecimiento económico", "historiografía", "América Latina", "humanidades digitales"]) L.push(`  - ${cita(k)}`);
  L.push("");
  return L.join("\n");
}

export function textoHumans(p: Proyecto): string {
  const L = [
    "/* AUTORÍA */",
    `Autor: ${p.autor.nombre}${p.autor.seudonimo !== undefined ? ` (${p.autor.seudonimo})` : ""}`,
    p.autor.email !== undefined ? `Contacto: ${p.autor.email}` : "",
    p.autor.afiliacion !== undefined ? `Afiliación: ${p.autor.afiliacion}` : "",
    p.autor.orcid !== undefined ? `ORCID: ${p.autor.orcid}` : "",
    "",
    "/* PROYECTO */",
    `${p.titulo}. ${p.subtitulo}`,
    `Código: ${p.licencia_codigo.spdx} · Contenido y datos derivados: ${p.licencia_contenido.spdx}`,
    `Repositorio: ${p.repositorio}`,
    `Cómo citar: ver CITATION.cff y la página /creditos`,
    "",
    "/* DATOS DE TERCEROS */",
    "Maddison Project Database (Groningen Growth and Development Centre), Penn World Table",
    "(Groningen) y World Population Prospects (Naciones Unidas). Cada dataset conserva su licencia y",
    "su forma de citación obligatoria, registradas en data/MANIFIESTO.json y publicadas en /fuentes.",
    "",
    "/* HECHO CON */",
    "Astro, TypeScript, Zod, D3, Observable Plot, Vitest. Sin backend, sin cuentas, sin rastreo.",
    "",
  ];
  return L.filter((l) => l !== "").join("\n") + "\n";
}

export function escribirArtefactos(raiz: string, p: Proyecto, fecha: string): string[] {
  const escritos: string[] = [];
  const escribir = (rel: string, contenido: string): void => {
    const abs = join(raiz, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contenido);
    escritos.push(rel);
  };
  escribir("content/proyecto.json", JSON.stringify(p, null, 2) + "\n");
  escribir(p.licencia_codigo.archivo, textoLicenciaCodigo(raiz, p));
  escribir(p.licencia_contenido.archivo, textoLicenciaContenido(raiz, p));
  escribir("CITATION.cff", textoCitacion(p, fecha));
  escribir("public/humans.txt", textoHumans(p));
  return escritos;
}

/** Reescribe autor y committer de todo el historial. Destructivo: cambia los hashes de los commits. */
export function reescribirCommits(raiz: string, nombre: string, email: string): string {
  if (!existsSync(join(raiz, ".git"))) throw new Error("no hay repositorio Git en esta ruta");
  const env = { ...process.env, NOMBRE: nombre, EMAIL: email, FILTER_BRANCH_SQUELCH_WARNING: "1" };
  const guion = 'export GIT_AUTHOR_NAME="$NOMBRE"; export GIT_AUTHOR_EMAIL="$EMAIL"; export GIT_COMMITTER_NAME="$NOMBRE"; export GIT_COMMITTER_EMAIL="$EMAIL";';
  execFileSync("git", ["filter-branch", "-f", "--env-filter", guion, "--", "--all"], { cwd: raiz, env, stdio: ["ignore", "pipe", "pipe"] });
  return execFileSync("git", ["log", "--format=%an <%ae>", "-1"], { cwd: raiz, encoding: "utf8" }).trim();
}

function principal(): void {
  const { values } = parseArgs({
    options: {
      nombre: { type: "string" },
      usuario: { type: "string" },
      repositorio: { type: "string" },
      sitio: { type: "string" },
      "nombre-de-pila": { type: "string" },
      apellidos: { type: "string" },
      seudonimo: { type: "string" },
      email: { type: "string" },
      orcid: { type: "string" },
      afiliacion: { type: "string" },
      "reescribir-commits": { type: "boolean", default: false },
      raiz: { type: "string", default: process.cwd() },
    },
  });
  const raiz = values.raiz;
  if (values.nombre === undefined || values.nombre.trim().length === 0) {
    console.error('Falta --nombre. Ejemplo:\n  pnpm run autoria -- --nombre "Ana Pérez Ramírez" --usuario anaperez');
    process.exitCode = 2;
    return;
  }
  if (values.usuario === undefined && (values.repositorio === undefined || values.sitio === undefined)) {
    console.error("Falta --usuario (o bien --repositorio y --sitio juntos).");
    process.exitCode = 2;
    return;
  }
  const actual = JSON.parse(readFileSync(join(raiz, "content", "proyecto.json"), "utf8"));
  const p = construirProyecto(actual, {
    nombre: values.nombre,
    usuario: values.usuario,
    repositorio: values.repositorio,
    sitio: values.sitio,
    nombreDePila: values["nombre-de-pila"],
    apellidos: values.apellidos,
    seudonimo: values.seudonimo,
    email: values.email,
    orcid: values.orcid,
    afiliacion: values.afiliacion,
  });
  const pendientes = marcadoresPendientes(p);
  if (pendientes.length > 0) {
    console.error(`Quedan marcadores sin completar: ${pendientes.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const escritos = escribirArtefactos(raiz, p, new Date().toISOString().slice(0, 10));
  console.log("Autoría registrada:");
  console.log(`  nombre de pila: ${p.autor.nombre_de_pila} · apellidos: ${p.autor.apellidos}`);
  console.log("  (si la división no es correcta, repetí con --nombre-de-pila y --apellidos)");
  for (const f of escritos) console.log(`  escrito: ${f}`);
  if (values["reescribir-commits"]) {
    const email = p.autor.email ?? "";
    if (email === "") {
      console.error("  --reescribir-commits necesita un correo: pasá --email");
      process.exitCode = 1;
      return;
    }
    const ultimo = reescribirCommits(raiz, p.autor.nombre, email);
    console.log(`  historial reescrito; último commit a nombre de: ${ultimo}`);
    console.log("  atención: los hashes cambiaron. Si ya empujaste el repositorio, hará falta `git push --force`.");
  }
  console.log("\nSiguiente paso: `pnpm run build` y después el despliegue (ver README).");
}

if (process.argv[1] !== undefined && /autoria\.ts$/.test(process.argv[1])) principal();
