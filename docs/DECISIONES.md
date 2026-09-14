# Registro de decisiones de arquitectura

Una entrada por decisión, con fecha, motivo y qué la revisaría. Este archivo existe para que dentro de
un año pueda entender por qué el proyecto es como es, y para que cualquiera pueda discutir una decisión
sabiendo qué la motivó.

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
  conjetural» pero el esquema §4.4 admite el nivel intermedio. **Pendiente de confirmar.**
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
Decidí (2026-09-13) que la línea de tiempo use como referencia las ocho unidades oficiales
del curso. Se modelan en `content/unidades.json` (`Unidad`: número, título, contenido central,
período orientativo opcional) y los nodos las referencian con `unidades: UnidadId[]`. Son una capa de
lectura, no una periodización histórica: un nodo puede abarcar varias. Los rangos de años de cada
unidad **no se rellenaron**: los fijo más adelante. Propuesta de asignación para los cinco nodos de la v1,
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
Necesitaba un MVP de la línea de tiempo pronto, presentable y ampliable, con información verificada. Se adelantaron partes de los Hitos 2 (contenido), 4 (Vista Tiempo) y 5 (Vista Debate,
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
licencia y crédito, lo que queda pendiente.

### D20. Rango de las unidades derivado, no declarado
La cinta de unidades de la línea de tiempo calcula el rango de cada unidad como el mínimo y máximo
de sus nodos. `periodo_orientativo` existe en el esquema pero no se rellenó: fijarlo es del autor.

### D21. SVG generado en el build, cliente mínimo
La línea de tiempo se renderiza como SVG en el build con escalas de D3 (polilineal: más espacio al
siglo XX). El cliente solo agrega tooltip y filtro por unidad. Sin islas de React/Svelte todavía:
no hay interactividad que lo justifique (§3). El zoom y el subgrafo ancestral (§5.5) vendrán con la
Vista Grafo.

## 2026-09-14 — Cierre de la v1

### D22. Versiones de datos ingeridas: MPD 2020 y PWT 10.0, no las últimas
Las versiones más recientes (MPD 2023, PWT 10.01) se distribuyen por dataverse.nl, que responde a
descargas automatizadas con una prueba de trabajo anti-bots (Anubis). No se esquivó: la ingesta usa
los archivos que Groningen aloja directamente (`mpd2020.xlsx`, `pwt100.xlsx`). El manifiesto registra
nombre, tamaño y SHA-1 oficiales de los archivos 2023/10.01 (obtenidos de la API de metadatos de
Dataverse, que sí es pública) para que la actualización manual sea verificable.

### D23. Series partidas por el umbral de 1820
Una serie tiene un solo `nivel_evidencia`. Las series largas de Maddison se parten en dos: antes de
1820 (`estimacion_conjetural`) y desde 1820 (`reconstruccion_documentada`). Así el badge de §11.6 es
exacto y no hay que decidir por observación.

### D24. Series de mapa con `granularidad: "paises-iso3"`
Las series por país para la Vista Espacio usan códigos ISO3 en la columna `region`; el resto usa ids
de `content/regiones.json`. El validador comprueba cada fila del CSV contra la granularidad, la serie
y la cobertura temporal declaradas.

### D25. Mapa: agregación a macrorregión antes de 1900, derivada de las regiones de Maddison
Antes de 1900 el mapa colorea cada país con el valor de su macrorregión según la serie regional de
Maddison (que empieza en 1820). La correspondencia país → macrorregión usa las subregiones de
world-countries; las diferencias con las agregaciones de Maddison se declaran en la advertencia
permanente de la vista. Para años anteriores a 1820 no hay agregado regional en la MPD 2020 y el
mapa no dibuja.

### D26. Escuela marxista
Agregada a pedido del autor con sus fuentes cotejadas (Marx, Dobb, Brenner, Aston y Philpin, Wood,
Blackburn, Harvey, Duménil y Lévy) e interpretaciones en la Gran Divergencia (debate Brenner) y la
economía esclavista (acumulación originaria). Son ya once escuelas.

### D27. Selector global de escuela sin framework
Un `<select>` en la cabecera, persistido en localStorage, aplica clases a todo lo que declara
`data-escuela`, `data-sostenida`, `data-negada` o `data-escuelas` y emite `escuela-cambiada` para las
vistas con canvas propio (grafo). Sin islas de React/Svelte (§3).

### D28. Subgrafo ancestral
«Qué tuvo que pasar antes» se calcula con una búsqueda en anchura hacia atrás por aristas
`precondicion_de`, `causa_directa_de` y `amplifica` (entrantes) y `respuesta_a`, `ruptura_de`
(salientes). `contiene` y `alternativa_rechazada` no son causales y se excluyen. Cada arista del
resultado dice qué escuelas la sostienen: ese es el «según quién».

### D29. Estado de los criterios de aceptación (§11)
1. Los cinco nodos pasan `validar` sin advertencias: sí (modo estricto en verde).
2. ≥ 2 interpretaciones con `que_la_refutaria`: sí (3 a 6 por nodo).
3. Toda cifra de la interfaz rastreable al manifiesto: sí; el validador comprueba hashes y filas.
4. Sin campos inventados; no verificadas marcadas: sí, con nota de cotejo por fuente.
5. Arista `disputado` renderizada distinto: sí (punteada en el grafo, dashed y con badge en el nodo).
6. Badge conjetural en series pre-1820: sí (series partidas, D23).
7. Advertencia de anacronismo en el mapa: sí, permanente y con modo agregado.
8. `pnpm run build` falla si un adaptador falla: el build verifica hashes y filas de lo ingerido;
   `pnpm run ingesta` termina con 1 si un adaptador falla. La descarga no forma parte del build
   porque `data/raw/` no se versiona y el despliegue no debe depender de servidores externos.
9. README con versiones reales: sí.
10. DECISIONES.md: este archivo.
Lo que sigue es editorial: verificar fuentes, pasar nodos a `revisado`, redactar esqueletos.

## 2026-09-14 — Dieciocho mejoras

### D30. Recorridos guiados (mejora 1)
`content/recorridos/<id>.json`: unidad, pregunta de apertura, pasos (nodo + texto) y cierre en la Vista
Debate. Uno por unidad. Son capa de lectura para clase; no reintroducen un relato lineal.

### D31. Página por arista (mejora 2)
`/aristas/<desde>--<tipo>--<hacia>` con escuelas a favor y en contra (y su interpretación en cada
extremo), fuentes y series que cada nodo invoca. El índice lista las disputadas primero.

### D32. Contrafactuales contrastables (mejora 3)
`Interpretacion.contrastable_con: SeriesId[]`; el validador exige que las series existan. La página
del nodo marca cada condición de refutación como «contrastable con …» o «no contrastable todavía».

### D33. Cuatro esqueletos redactados (mejora 4)
Primera Revolución Industrial, patrón oro clásico, Bretton Woods e ISI pasan a `borrador` con dos o
tres interpretaciones y fuentes cotejadas en Crossref. Quedan 21 esqueletos.

### D34. Glosario con autoenlace (mejora 5)
`content/glosario.json`: término, variantes, definición con citas, fuentes obligatorias. `renderMarkdown`
enlaza la primera aparición de cada término (palabra completa, sin distinguir mayúsculas, nunca dentro
de un enlace o cita). La página del glosario omite el autoenlace del término que define.

### D35. Esperanza de vida desde la WPP 2024; desigualdad pendiente (mejora 6)
Adaptador para el archivo de indicadores de la World Population Prospects 2024 (16,5 MB, dominio
oficial): tres series de esperanza de vida, solo estimaciones hasta 2023. Licencia y cita exactas
quedan **pendientes de cotejo** porque la página las muestra con JavaScript; el manifiesto lo dice.
La World Inequality Database se distribuye como un único archivo de 882 MB; no se ingirió y no se
adivinó ninguna API alternativa. Salarios reales: sin fuente primaria pública verificada todavía.

### D36. Márgenes de incertidumbre honestos (mejora 7)
`Serie.margen_publicado` (por defecto false) y columnas opcionales `valor_inf`/`valor_sup` en el CSV.
Si la fuente publica intervalos, el gráfico dibuja la banda; si no, lo dice bajo el gráfico en vez de
inventar un ancho. Ninguna de las fuentes actuales publica márgenes por observación.

### D37. Comparador de fuentes (mejora 8)
En `/datos`: PIB per cápita de Maddison y de PWT superpuestos para un país, desde 1950, con la
advertencia de que las unidades son construcciones distintas.

### D38. Actualización manual de datasets (mejora 9)
Documentada en README: descargar a mano `mpd2023_web.xlsx` y `pwt1001.xlsx`, verificar contra los
SHA-1 oficiales registrados en el manifiesto y ajustar las constantes de los adaptadores. No se escribió
código para hojas cuya estructura no se pudo inspeccionar.

### D39. Tres escalas de la línea de tiempo (mejora 10)
Completa, 1750–1950 y 1900–hoy, renderizadas en el build y conmutadas en el cliente. Se prefirió a un
zoom continuo porque mantiene las etiquetas legibles y el SVG generado en el servidor.

### D40. Mapa y tiempo sincronizados (mejora 11)
`/espacio?anio=N` abre el mapa en el año disponible más cercano; bajo el mapa se listan los nodos cuyo
período incluye el año elegido; cada nodo enlaza al mapa en su año de inicio.

### D41. Búsqueda estática (mejora 12)
`/buscar.json` se genera en el build con nodos, escuelas, fuentes, glosario y recorridos; la búsqueda
corre en el cliente sin dependencias, con normalización de acentos.

### D42. Exportación e impresión (mejora 13)
`/nodos/<id>.md` exporta el nodo en Markdown con sus citas y el estado de verificación de cada fuente.
Hoja de estilos de impresión que oculta navegación y controles.

### D43. Accesibilidad de gráficos y mapa (mejora 14)
Cada gráfico lleva una tabla de datos plegable (hasta 400 filas; el CSV tiene todas). El mapa ofrece
«Ver como tabla» con el valor de cada país para el año elegido.

### D44. Flujo de verificación de fuentes (mejora 15)
`/verificacion` lista las pendientes con enlace al DOI y genera, por fuente, el comando
`pnpm run bibliografia:verificar -- <id> --estado … --nota "…"` o el fragmento JSON. El script exige
nota y fecha el registro; el commit es la constancia de quién verificó.

### D45. Historial por nodo (mejora 16)
Derivado de `git log --follow` sobre el archivo del nodo en el build. Sin Git, la sección no aparece.

### D46. Revisión de sesgo léxico (mejora 17)
`Escuela.vocabulario_propio` y regla `sesgo-lexico` (nivel info): un resumen que use vocabulario de
exactamente una escuela recibe un aviso. `pnpm run sesgo` lo lista y termina con 1 si encuentra alguno,
para usarlo en CI sin romper el build. Es una ayuda a §8, no un veredicto.

### D47. Regresión estructural de las vistas (mejora 18)
`tests/vistas/regresion.test.ts` construye el sitio y compara un resumen estructural de diez páginas
(títulos, secciones, gráficos, nodos del SVG) con instantáneas versionadas. No son capturas de píxeles:
eso exigiría Playwright y la descarga de un navegador; se documenta como paso siguiente si se quiere.

## 2026-09-14 — Publicación y autoría

### D48. Enlaces conscientes del `base`
El sitio usaba enlaces absolutos (`/tiempo`), de modo que solo funcionaba servido desde la raíz de un
dominio. Se introdujo `src/lib/rutas.ts` con `enlace()`, que antepone `import.meta.env.BASE_URL`, y se
convirtieron los 58 enlaces internos, incluidos los que se construyen dentro de scripts de cliente y el
`fetch` del índice de búsqueda. `astro.config.mjs` toma `base` de `ASTRO_BASE`. Verificado con dos
builds, en raíz y en `/historia-economica`. Esto permite publicar como sitio de usuario o como sitio de
proyecto sin tocar el código.

### D49. La autoría es contenido validado, no un texto suelto
`content/proyecto.json` es la fuente única de autoría, licencias y URLs; de ahí salen la licencia, el
`CITATION.cff`, los metadatos de cada página, el pie y la página `/creditos`. Sus valores nacen como
marcadores «entre comillas angulares» y el validador emite una advertencia mientras queden: como el
build de producción trata las advertencias como errores, **el sitio no puede publicarse con una autoría
sin definir**. `pnpm autoria` los completa y genera los artefactos en un paso.

### D50. Textos de licencia copiados, no transcritos
`scripts/plantillas/` guarda el texto legal de CC BY 4.0 (creativecommons.org) y de MIT (lista SPDX),
descargados el 2026-09-14 y con su procedencia registrada en `PROCEDENCIA.md`. El script solo rellena
año y titular. Reproducir de memoria un texto legal sería exactamente la falla que este proyecto
prohíbe para las fuentes.

### D51. Doble licencia y atribución de terceros
Código bajo MIT, contenido y datos derivados bajo CC BY 4.0. Es la combinación compatible con las
licencias de los datasets ingeridos, todas CC BY, que exigen atribución. La licencia del contenido y la
página de créditos dicen expresamente que atribuir esta obra no exime de citar a Maddison, Penn World
Table y Naciones Unidas en la forma que cada institución exige.

### D52. Ningún texto se publica sin revisión
La página `/creditos` deja constancia de que los resúmenes, las interpretaciones, las notas de arista
y el glosario están escritos y comprobados a mano. Publicar texto generado automáticamente como
contenido es un anti-objetivo explícito (SPEC §10), y el historial de Git permite auditar cada cambio.


### D53. Flujo de integración continua separado del de despliegue
`verificar.yml` corre validación, tipos y tests en cada push y pull request; `deploy.yml` solo publica
desde `main` y deduce por sí mismo si el repositorio es un sitio de usuario o de proyecto.

## 2026-09-14 — Ampliación de escuelas y voz propia

### D54. `desarrollo` y `debates_internos` en las escuelas
La escuela tenía solo postulado y crítica, lo que la dejaba como una etiqueta. Se agregaron dos campos
markdown opcionales: `desarrollo` (de dónde sale, qué sostiene, dónde se la ve trabajando) y
`debates_internos` (en qué no se ponen de acuerdo entre ellos). El segundo existe para evitar el efecto
que el proyecto combate: tratar cada escuela como un bloque homogéneo. Escritos para marxista,
monetarista y keynesiana; los demás quedan pendientes. La página de escuelas pasó de tarjetas a
secciones con desplegables.

### D55. Veintidós fuentes nuevas, una de ellas sin DOI
Cotejadas en Crossref el 2026-09-14. La excepción es Friedman (1968), «The Role of Monetary Policy»:
Crossref no devolvió DOI pese a varias búsquedas, así que la ficha va sin él y su nota lo dice
expresamente. Es la referencia menos confirmada de la bibliografía y conviene verificarla primero.

### D56. Voz en primera persona fuera de los nodos
Portada, créditos y encabezados de escuelas se reescribieron en la voz del autor: primera persona,
voseo, frases cortas. El límite es el de siempre: los resúmenes de nodo y las interpretaciones siguen
siendo neutrales entre escuelas (SPEC §8), y ahí no entra la primera persona. La regla práctica es que
el autor puede hablar de su proyecto, no de la historia.

### D57. Auditoría de datos personales
Se comprobó que ni el repositorio ni su historial completo contienen correos personales, claves SSH ni
rutas locales. Lo único personal publicado, y a propósito, es el nombre del autor y su seudónimo. Los
commits usan la dirección `@users.noreply.github.com`, que vincula a la cuenta sin exponer un correo.

## 2026-09-14 — El sitio se prepara para el público

### D58. La interfaz deja de exponer el flujo editorial
`esqueleto`, `borrador` y `revisado` son estados de producción, útiles para trabajar y sin interés
para quien lee. Desaparecen de la interfaz: no hay badges de estado, ni historial de cambios derivado
de Git, ni aviso de fuentes pendientes por nodo. Los campos siguen existiendo en el contenido y el
validador los sigue exigiendo, así que las reglas de §8 y §11 no se relajaron. Un nodo sin redactar
muestra ahora un texto dirigido al lector, «sección en preparación», en vez del vocabulario interno.

### D59. Cotejo en lugar de estado de verificación
La página de fuentes ya no marca cada ficha como pendiente o verificada. Muestra en cambio contra qué
catálogo se cotejó y en qué fecha, que es un hecho comprobable y más informativo que una etiqueta de
proceso. `/verificacion` sigue existiendo como página de trabajo, fuera de la navegación.

**Tensión reconocida.** El SPEC §11.4 pide que las fuentes no verificadas aparezcan marcadas. La
decisión de retirar esa marca es del autor, que asume la revisión. Lo que se conserva, y es lo que
sostiene la promesa del proyecto, es que ninguna afirmación aparece sin su fuente y que cada ficha
declara su procedencia. Si la revisión manual se demora, conviene reponer alguna señal.

### D60. Encabezado en dos niveles
Once destinos en una sola fila eran ilegibles. Quedan seis principales (las cinco vistas más el índice
de nodos), un desplegable «Más» con los cinco secundarios, la búsqueda como icono y el selector de
escuela compacto. En pantallas estrechas la navegación baja a su propia fila.

### D61. China contemporánea como nodo propio
No se puede mirar la economía actual sin el ascenso chino, y el nodo de 1978 termina en 2001. El nuevo
nodo cubre de 2001 en adelante con cinco interpretaciones y cinco aristas, una de ellas disputada hacia
la crisis de 2008 (la tesis del exceso de ahorro global) y otra hacia la Gran Divergencia, que plantea
si el ascenso chino la cierra o solo desplaza su centro.

### D62. Veinticinco fuentes más y tres escuelas ampliadas
Marxista, keynesiana y monetarista incorporan a Luxemburgo, Lenin, Baran y Sweezy, Mandel, Amin,
Arrighi, Thompson y Federici; a Kalecki, Robinson, Kaldor, Stiglitz y Summers; y a Cagan, Brunner y
Taylor. Cada incorporación añade además un debate interno, porque el objetivo no es alargar listas de
nombres sino mostrar que dentro de cada escuela también se discute.

## 2026-09-14 — Equilibrio entre escuelas

### D63. La lectura marxista estaba sistemáticamente minimizada
Aparecía en cuatro nodos y siempre con peso «minoritaria»; la monetarista, en cuatro y siempre con
«sustancial». Eso no era una evaluación caso por caso sino un sesgo de origen. Ahora la marxista
interpreta diez nodos y la monetarista siete, cada una con el peso que corresponde a su presencia real
en la literatura de ese episodio concreto.

Dos pesos se corrigieron con justificación explícita. En la Gran Divergencia, el debate que abrió
Brenner en 1976 se publicó como volumen propio y es lectura estándar sobre la transición al
capitalismo, así que «sustancial» describe mejor su lugar que «minoritaria». En la economía esclavista
atlántica, la tesis de Williams y su revisión de las últimas dos décadas son corriente mayor, hasta el
punto de que la réplica cuantitativa de Wright se escribió para responderle.

Donde la lectura marxista es genuinamente minoritaria dentro de la literatura académica, como en la
crisis de 2008 o en China contemporánea, sigue marcada así. Equilibrar no es igualar: el campo
`peso_academico` describe la literatura, no la simpatía del autor.

### D64. La monetarista gana contraste donde faltaba
Se añadió su lectura al patrón oro clásico (el régimen como regla creíble, con Bordo y Schwartz), a
Bretton Woods (Friedman defendía tipos flexibles diez años antes de que el sistema funcionara) y a
China contemporánea (el crédito dirigido como precio fijado por decreto). En los tres casos discute
con una interpretación marxista sobre el mismo episodio, que es el objetivo.

### D65. Fuera la sección de reglas de la portada
Las cuatro reglas del proyecto se explicaban en la portada. Son una declaración de método dirigida a
quien produce el sitio, no a quien lo lee, y ocupaban el espacio que debería llevar al contenido.
Siguen vigentes, documentadas en la especificación y comprobadas por el validador.
