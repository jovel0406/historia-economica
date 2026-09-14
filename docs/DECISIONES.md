# Registro de decisiones de arquitectura

Una entrada por decisión, con fecha, motivo y qué la revisaría. Las decisiones propia se marcan
como tales; las de implementación son propuestas que el autor puede revertir.

## 2026-09-13 — Hito 1

### D1. Versiones: TypeScript 6, Vitest 5, Zod 4, Astro 7
Verificadas en el registro de npm al iniciar. TypeScript 7.0.2 existe pero `@astrojs/check`
declara `typescript: ^5 || ^6`, así que se fija 6.0.3. Vitest 5.0.0 exige Vite `^6.4 || ^7 || ^8`
y Astro 7.3.2 trae Vite `^8.0.13`: compatible. Se comprobó con `astro check`, `astro build`,
`tsc --noEmit` y la suite completa. **Revisar** cuando `@astrojs/check` acepte TS 7.

### D2. Gestor de paquetes: pnpm 12 vía corepack
pnpm 12 bloquea los scripts de build de dependencias por defecto; se aprueba solo `esbuild`
(lo necesitan tsx y Vite) en `pnpm-workspace.yaml`. También impone una edad mínima de publicación
que excluía zod 4.6.5; se lo exceptúa explícitamente porque se verificó como versión estable.

### D3. Contenido en JSON, un archivo por entidad
`content/` usa JSON validado con Zod, sin YAML ni MDX: cero dependencias adicionales, validación
exacta y `id` igual al nombre de archivo. El costo: los campos markdown largos (`descripcion_larga`,
`desarrollo`) son cadenas JSON, incómodas de editar a mano. **Revisar en el Hito 2** si la redacción
de `gran-divergencia` lo hace insoportable; la alternativa es YAML con el mismo esquema.

### D4. Tipos derivados de Zod, esquemas estrictos
Todo esquema es `z.strictObject`: un campo con un typo rompe el build en vez de pasar inadvertido.
La única clave extra permitida es `_placeholder: true` (SPEC §1.2).

### D5. Nodos `esqueleto` como destinos legítimos de aristas
El SPEC pide aristas hacia nodos que no están en la v1 (ej. *esclavista atlántica → primera
revolución industrial*, §4.3) y a la vez prohíbe construir los 34 nodos (§2). Resolución: una arista
solo puede apuntar a un nodo que exista como archivo, pero un nodo puede existir en estado
`esqueleto` con lo mínimo (id, título, tipo, período, regiones, resumen). Un esqueleto no es un nodo
implementado: genera un hallazgo `info`, no una advertencia, y no cuenta para el límite de cinco.

### D6. Tres niveles de hallazgo y modo estricto
`error` rompe siempre; `advertencia` rompe solo en modo estricto (`--strict`, usado por
`pnpm run build`); `info` nunca rompe. Los `_placeholder` son advertencias: aceptados en desarrollo,
fatales en producción, exactamente como pide SPEC §1.2. El criterio §11.1 («sin advertencias») se
verifica con `pnpm run validar:estricto`.

### D7. Reglas añadidas que el SPEC no enuncia literalmente
Se implementaron como inferencias razonables; cualquiera puede revertirse:
- Periodización `disputada` exige `nota_periodizacion` (§4.1 la describe como «por qué estas fechas y quién las discute»).
- Arista `disputado` exige `sostenida_por` y `negada_por` no vacíos; `marginal` exige `sostenida_por`.
- Serie con inicio anterior a 1820 y `nivel_evidencia: estadistica_oficial` es error (§1.4);
  con `reconstruccion_documentada` es advertencia, porque §1.4 y §11.6 hablan de «estimación
  conjetural» pero el esquema §4.4 admite el nivel intermedio. **Pendiente de confirmación propia.**
- `verified: true` ⇔ `citation_status: "verificada"`, y una fuente verificada exige `nota_verificacion`.
- `que_la_refutaria`: mínimo 40 caracteres, lista de formulaciones vacuas rechazadas y prohibición de `TODO`.
- Nodo `borrador`/`revisado`: ≥ 2 interpretaciones, descripción larga y ≥ 1 fuente; `revisado` además
  exige evidencia a favor, en contra y autores en cada interpretación, y advierte si falta la lente.
- Una misma arista declarada en dos archivos: advertencia si coincide, error si el consenso difiere.

### D8. Lente regional en archivos separados
`content/lentes/<nodo>.json` contiene las entradas `LensEntry` de un nodo (una por región). El tipo
`NodoCompleto` (nodo + `lente_regional`) es derivado: el archivo del nodo no lo lleva. Así la lente
se puede escribir y revisar como capa propia, que es lo que §4.8 pide priorizar.

### D9. Series y observaciones
Los metadatos de cada serie viven en `data/series/<id>.json` con un campo `archivo` que apunta al
CSV en `data/processed/`. El validador exige que el dataset esté en `data/MANIFIESTO.json`, que el
CSV exista, que figure entre los archivos manifestados y que su sha256 coincida (§6, §11.3).
El parseo de CSV llega con la ingesta (Hito 3).

### D10. Regiones provisionales
`content/regiones.json` trae macrorregiones y los países que los cinco nodos de la v1 necesitan.
**TODO(Hito 3):** alinear los ids con la agregación regional del dataset de Maddison antes de cargar
datos, para no inventar una correspondencia.

### D11. Unidades de referencia de la Vista Tiempo
Pedí (2026-09-13) que la línea de tiempo use como referencia las ocho unidades oficiales
del curso. Se modelan en `content/unidades.json` (`Unidad`: número, título, contenido central,
período orientativo opcional) y los nodos las referencian con `unidades: UnidadId[]`. Son una capa de
lectura, no una periodización histórica: un nodo puede abarcar varias. Los rangos de años de cada
unidad **no se rellenaron**: los fija el autor. Propuesta de asignación para los cinco nodos de la v1,
a confirmar: Gran Divergencia → 1 y 2; economía esclavista atlántica → 2 y 3; Gran Depresión → 4;
crisis de la deuda latinoamericana → 6; reforma china de 1978 → 7.

### D12. Scripts con tsx; build = validar estricto + astro
`scripts/*.ts` corren con `tsx` (Node 24 podría ejecutarlos sin transpilar, pero tsx evita las
restricciones del type stripping). `pnpm run build` es `validar:estricto && astro build`: si un
archivo de contenido no pasa, no hay sitio (§3, §11.8). Cuando existan adaptadores de ingesta, su
fallo se encadena aquí (§7).

### D13. Despliegue: GitHub Pages
Sitio estático, repositorio en Git, sin backend: GitHub Pages con GitHub Actions es la opción con
menos piezas. El flujo (`.github/workflows/`) se escribe cuando haya contenido publicable, verificando
las versiones vigentes de las acciones en ese momento.

## 2026-09-13 — MVP de la línea de tiempo

### D14. Adelantar la Vista Tiempo y el contenido de cinco nodos
Pedí un MVP de la línea de tiempo «ya», estético y escalable, con información
verificada. Se adelantaron partes de los Hitos 2 (contenido), 4 (Vista Tiempo) y 5 (Vista Debate,
embebida en la página del nodo). No se adelantó el selector global de escuela ni la ingesta de datos.
El orden del SPEC §9 sigue vigente para lo que falta: Hito 3 (ingesta y Vista Datos) es lo siguiente.

### D15. Cómo se «verificó» la bibliografía sin violar §1.1 y §12
Cada ficha se cotejó el 2026-09-13 contra Crossref (DOI resuelto), Open Library o el repositorio
institucional (CEPAL, Groningen, SlaveVoyages, COMEX), y `nota_verificacion` dice contra qué.
Solo se rellenaron los campos que el catálogo confirmó; el resto quedó en blanco (editorial de
Williams 1944, año de primera edición de Wallerstein, subtítulos que Crossref no registra).
Todas siguen `verified: false`: la verificación manual es la que cuenta (§4.5).
Se descartaron referencias que no pudieron cotejarse (Beckert 2014, Frieden 2006, Naughton 2007).

### D16. Escala de esqueletos
Para que la línea de tiempo cubra las ocho unidades sin construir 34 nodos completos (§2), los
nodos no prioritarios existen como `esqueleto`: título, período, regiones, resumen neutral,
unidades. Sus fechas son provisionales (las `disputada` llevan una nota que lo dice) y se dibujan
con contorno discontinuo para que nadie los confunda con nodos redactados.

### D17. Décima escuela: neoclásica y cliométrica
El SPEC fija nueve escuelas «mínimas». Se agregó `neoclasica-cliometrica` porque la crítica
cuantitativa a la tesis de Williams (Eltis y Engerman), la lectura de Cole y Ohanian sobre el New
Deal y la contabilidad del crecimiento chino (Zhu) no encajaban en ninguna de las nueve y son
posiciones centrales de tres nodos. Reversible.

### D18. Citas en línea `[@id]`
Los textos markdown citan con `[@id-de-fuente]`. El validador (`referencia-cita`) exige que el id
exista; la interfaz lo convierte en enlace a `/fuentes#id`. Es la implementación de §8 («ninguna
cifra en prosa sin su SourceId») verificable por máquina.

### D19. Medios con procedencia
`Nodo.medios[]` (ruta bajo `public/medios/`, título, alt, crédito, licencia, URL de origen).
El validador exige que el archivo exista. No se cargó ninguna imagen: cada una requiere comprobar
licencia y crédito, lo que queda para el autor o para una sesión dedicada.

### D20. Rango de las unidades derivado, no declarado
La cinta de unidades de la línea de tiempo calcula el rango de cada unidad como el mínimo y máximo
de sus nodos. `periodo_orientativo` existe en el esquema pero no se rellenó: fijarlo es propia.

### D21. SVG generado en el build, cliente mínimo
La línea de tiempo se renderiza como SVG en el build con escalas de D3 (polilineal: más espacio al
siglo XX). El cliente solo agrega tooltip y filtro por unidad. Sin islas de React/Svelte todavía:
no hay interactividad que lo justifique (§3). El zoom y el subgrafo ancestral (§5.5) vendrán con la
Vista Grafo.
