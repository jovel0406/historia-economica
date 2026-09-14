# Especificación del proyecto

Historia económica mundial: tiempo, espacio, datos e interpretaciones en disputa.

Este documento es el diseño del proyecto: qué construyo, con qué reglas y por qué. Manda sobre
cualquier otra cosa que escriba después. Si una decisión de implementación lo contradice, gana este
documento o hay que cambiarlo aquí primero.

El registro de decisiones concretas, con fecha y motivo, está en [DECISIONES.md](DECISIONES.md).
La ubicación de cada entidad, en [MODELO-DATOS.md](MODELO-DATOS.md).

---

## 1. Qué es y qué no es

Una plataforma web para explorar la transformación de la economía mundial por cuatro caminos a la vez:
**tiempo, espacio, datos e interpretaciones en disputa**.

No es una enciclopedia ni una línea de tiempo ilustrada. Es una herramienta para discutir: su valor
está en mostrar **por qué los historiadores económicos no se ponen de acuerdo**, y en dejar que quien
la use recorra la misma historia bajo escuelas interpretativas distintas.

La pregunta que la organiza es esta:

> **¿Por qué el crecimiento económico moderno ocurrió cuándo y dónde ocurrió, y por qué se distribuyó
> tan desigualmente?**

La formulación es deliberada. Descarto cualquier diseño, texto de interfaz o estructura de datos que
reintroduzca un relato de progreso lineal hacia el presente.

---

## 2. Reglas innegociables

Estas reglas tienen prioridad sobre todo lo demás en este documento. Si cumplirlas significa publicar
menos, publico menos.

1. **Ninguna fuente inventada.** Ni título, ni autor, ni año, ni DOI, ni URL, ni número de página. Si
   necesito una referencia que no tengo verificada, la entrada se crea con `verified: false` y
   `citation_status: "pendiente_de_verificacion"`, y los campos que no puedo confirmar quedan en
   blanco. No se rellenan con valores plausibles.
2. **Ninguna cifra inventada.** Ninguna serie histórica contiene números que no vengan del pipeline de
   ingesta (§8) desde una fuente primaria con procedencia registrada.
3. **Ninguna API adivinada.** Si no estoy seguro de la firma de una función de una librería, consulto
   su documentación antes de escribirla.
4. **Medir no es reconstruir.** Toda serie anterior a 1820 es una estimación conjetural, no una
   observación. Eso tiene que verse en la interfaz, no solo en los metadatos.
5. **El consenso se etiqueta.** Toda afirmación causal lleva un grado de consenso explícito. Una
   relación disputada nunca se dibuja igual que una establecida.
6. **Lo que no sé, queda escrito como TODO.** No se resuelve con una suposición silenciosa.

El validador hace cumplir por máquina buena parte de esto, y el build de producción falla si algo no
pasa. Esa es la garantía de que las reglas no dependen de mi disciplina el día que esté apurado.

---

## 3. Alcance: una rebanada vertical, no un esqueleto vacío

El modo de fallo de un proyecto así es un armazón enorme y hueco: cuarenta nodos con título y nada
dentro. Por eso la versión 1 implementa **cinco nodos completos**, con todas sus capas, elegidos
porque cubren toda la variedad estructural del modelo de datos:

| # | Nodo | Tipo | Por qué está |
|---|------|------|--------------|
| 1 | Gran Divergencia | proceso largo | máxima disputa interpretativa; datos conjeturales |
| 2 | Economía esclavista atlántica | proceso | datos primarios excelentes; nexo moral y económico |
| 3 | Gran Depresión | evento | escuelas rivales nítidas; datos abundantes |
| 4 | Crisis de la deuda latinoamericana | evento regional | ángulo latinoamericano; lente Costa Rica |
| 5 | Reforma china de 1978 | proceso | contrapeso no occidental; rompe la narrativa estándar |

Si el modelo aguanta estos cinco, aguanta los cuarenta. Los nodos restantes existen como `esqueleto`:
título, período provisional, regiones y resumen neutral, solo para situar a los demás en la línea de
tiempo. Un esqueleto no cuenta como nodo implementado, y la interfaz lo dibuja con contorno
discontinuo para que nadie los confunda.

El backlog completo está en [`content/backlog.md`](../content/backlog.md).

---

## 4. Decisiones técnicas

- **Framework:** Astro. El grueso del sitio es estático; la interactividad va en scripts de página, no
  en islas de React o Svelte, porque hasta ahora ninguna vista lo ha justificado.
- **Lenguaje:** TypeScript en modo estricto. Sin `any` sin comentario que lo justifique.
- **Visualización:** Observable Plot para gráficos estándar; D3 directo para la línea de tiempo, el
  grafo causal y el mapa, que son visualizaciones a medida.
- **Validación:** Zod. Todo archivo de contenido se valida en tiempo de build; uno inválido rompe el
  build. Los tipos de TypeScript se derivan de los esquemas, nunca al revés.
- **Datos:** JSON y CSV versionados en Git. Sin base de datos.
- **Tests:** Vitest, con cobertura obligatoria en el validador y en el pipeline de ingesta.
- **Despliegue:** sitio estático en GitHub Pages, con despliegue automático en cada push.
- **Idioma:** español. El contenido está estructurado para permitir traducciones más adelante, pero no
  hay ninguna implementada.

Las versiones exactas de cada librería están en el [README](../README.md), comprobadas contra el
registro de paquetes el día que se instalaron.

---

## 5. Modelo de datos

Es el corazón del proyecto: todas las vistas son proyecciones de estas entidades. Los esquemas viven
en `src/schemas/`.

### 5.1 Nodo: acontecimiento o proceso

```ts
{
  id: string,                       // slug estable, ej. "gran-divergencia"
  titulo: string,
  tipo: "proceso" | "evento",
  periodo: {
    inicio: number,
    fin: number | null,             // null = en curso
    precision: "exacta" | "aproximada" | "disputada",
    nota_periodizacion?: string     // obligatoria si la precisión es disputada
  },
  regiones: RegionId[],
  unidades?: UnidadId[],            // capa de lectura, no periodización
  resumen: string,                  // 2–3 frases, neutral entre escuelas
  descripcion_larga: string,        // markdown
  interpretaciones: Interpretacion[],
  series: SeriesRef[],
  aristas: Arista[],
  medios?: Medio[],                 // cada imagen con crédito y licencia
  fuentes: SourceId[],
  estado_editorial: "esqueleto" | "borrador" | "revisado"
}
```

La lente regional vive aparte, en `content/lentes/<nodo>.json`, para poder escribirla y revisarla como
capa propia.

### 5.2 Interpretación: entidad de primera clase, no nota al pie

```ts
{
  escuela: SchoolId,
  mecanismo: string,                // el enlace causal propuesto, en una frase
  desarrollo: string,               // markdown
  autores_principales: SourceId[],
  evidencia_a_favor: string[],
  evidencia_en_contra: string[],
  que_la_refutaria: string,         // obligatorio, y el validador rechaza fórmulas vacuas
  contrastable_con: SeriesId[],     // series con las que esa condición se puede poner a prueba
  peso_academico: "dominante" | "sustancial" | "minoritaria" | "marginal"
}
```

`que_la_refutaria` es el campo que sostiene todo lo demás. Si una interpretación no puede decir qué
observación concreta la dejaría sin pie, está mal formulada y no entra. El validador lo exige, impone
una longitud mínima y rechaza fórmulas como «evidencia en contra».

### 5.3 Arista: el grafo causal

```ts
{
  desde: NodeId,
  hacia: NodeId,
  tipo: "precondicion_de" | "causa_directa_de" | "contiene" | "respuesta_a"
      | "ruptura_de" | "alternativa_rechazada" | "amplifica",
  consenso: "alto" | "medio" | "disputado" | "marginal",
  sostenida_por?: SchoolId[],
  negada_por?: SchoolId[],
  nota: string,
  fuentes: SourceId[]
}
```

Las aristas `disputado` son lo más interesante de la plataforma: se dibujan punteadas y tienen página
propia. El ejemplo canónico es *economía esclavista atlántica → primera revolución industrial*, la
tesis de Eric Williams.

### 5.4 Serie y observación

```ts
{
  id: string,
  indicador: IndicatorId,
  fuente_dataset: DatasetId,        // debe existir en data/MANIFIESTO.json
  cobertura_temporal: [number, number],
  cobertura_geografica: RegionId[],
  unidad: string,
  nivel_evidencia: "estadistica_oficial" | "reconstruccion_documentada" | "estimacion_conjetural",
  nota_metodologica: string,        // qué se está midiendo realmente
  advertencias: string[],
  granularidad: "regiones" | "paises-iso3",
  margen_publicado: boolean,        // ¿la fuente publica intervalos, o no hay ninguno?
  archivo: string                   // CSV bajo data/processed/
}
```

`nivel_evidencia` no es metadato oculto: es contenido, y aparece como badge en cada gráfico. Las
series largas se parten en el umbral de 1820 para que el badge sea exacto sin decidir observación por
observación. Cuando la fuente no publica márgenes de error, el gráfico lo dice en vez de inventar un
ancho de incertidumbre.

### 5.5 Fuente

Toda fuente nace con `verified: false`. Solo se marca como verificada a mano, tras comprobarla, y el
comando que lo registra exige una nota que diga quién la comprobó y contra qué. La interfaz avisa en
cualquier nodo que dependa de fuentes no verificadas.

### 5.6 Escuela

Nombre, postulado central, crítica principal que recibe, autores representativos y vocabulario propio.
Opcionalmente, `desarrollo` (de dónde sale y qué sostiene en detalle) y `debates_internos` (en qué no
se ponen de acuerdo entre ellos), porque tratar cada escuela como un bloque homogéneo es justo el error
que el proyecto intenta combatir.

Las once actuales: institucionalista, escuela de California, precios relativos, cultural y de capital
humano, sistema-mundo y dependencia, monetarista, keynesiana, estructuralista cepalina, estado
desarrollista, neoclásica y cliométrica, y marxista.

### 5.7 Indicadores

Conjunto cerrado y pequeño al que se conectan todos los nodos: `pib_per_capita`,
`esperanza_de_vida`, `tasa_urbanizacion`, `apertura_comercial`, `desigualdad`, `energia_per_capita`,
`salario_real`. No se amplía sin justificación.

### 5.8 Lente Costa Rica y América Latina

Para cada nodo, qué pasaba acá mientras tanto. Es un diferenciador del proyecto y tiene prioridad, no
se deja para el final.

### 5.9 Recorridos y glosario

Un recorrido encadena tres nodos con una pregunta de apertura y cierra en la Vista Debate: es una capa
de lectura para clase, no un relato lineal. El glosario define términos con su fuente y se enlaza
automáticamente desde los textos la primera vez que cada uno aparece.

---

## 6. Las vistas

Cinco proyecciones del mismo grafo, con un **selector global de escuela** que reencuadra el sitio
entero: resalta las interpretaciones de esa escuela y las aristas que sostiene, y atenúa las que niega.

**Tiempo.** Bandas horizontales para los procesos, con duración, solapamiento y anidamiento;
marcadores puntuales para los eventos. La incertidumbre de periodización se dibuja con bordes
difuminados: nunca un límite nítido sobre una fecha discutida.

**Espacio.** Mapa coroplético animable sobre el tiempo. Lleva una advertencia permanente y visible:
proyectar fronteras nacionales modernas sobre datos anteriores a 1900 es un anacronismo. Para esos
años el mapa agrega a macrorregión. Eso es parte del contenido, no un descargo legal.

**Datos.** Explorador de los siete indicadores. Cada serie muestra su badge de nivel de evidencia, su
nota metodológica a un clic, el enlace a la fuente primaria, una tabla accesible y la descarga del CSV
exacto que dibuja el gráfico.

**Debate.** La vista distintiva. Presenta las interpretaciones en paralelo —mecanismo, evidencia a
favor, evidencia en contra, qué la refutaría— y permite contrastar dos escuelas lado a lado.

**Grafo.** Grafo dirigido, filtrable por tipo de arista, consenso y escuela. El color codifica el tipo;
el trazo, el consenso. Permite aislar el subgrafo ancestral de un nodo: qué tuvo que pasar antes para
que esto ocurriera, y según quién. Esa interacción es la respuesta a la pregunta central.

---

## 7. Estructura del repositorio

```
docs/            especificación, decisiones y modelo de datos
content/         nodos, escuelas, lentes, recorridos, glosario, bibliografía, unidades, regiones
data/            MANIFIESTO.json (procedencia), series/ (metadatos), processed/ (CSV), raw/ (sin versionar)
scripts/         validador, reporte de bibliografía, adaptadores de ingesta
src/             schemas/ (Zod), validacion/, lib/, components/, layouts/, pages/
tests/           Vitest, con fixtures válidos e inválidos
```

`data/MANIFIESTO.json` es obligatorio: para cada dataset, su origen, versión exacta, fecha de descarga,
licencia, forma de citación y el hash de cada archivo. Sin procedencia registrada, el dato no entra.

---

## 8. Pipeline de ingesta

Un adaptador por dataset, todos con la misma forma: descargar, verificar el hash, normalizar, escribir
en `data/processed/` y actualizar el manifiesto. Si un adaptador falla, el proceso termina con error;
no se degrada silenciosamente a datos de ejemplo.

Cada adaptador registra la licencia del dataset y la forma de citación que exige la institución, y esas
citas se publican en `/fuentes` y en `/creditos`. Atribuir esta plataforma no exime de citarlas.

Ingeridos hasta ahora: Maddison Project Database, Penn World Table y World Population Prospects.
Pendientes: World Inequality Database para desigualdad, y una fuente primaria pública para salarios
reales.

---

## 9. Reglas de redacción

- El resumen de cada nodo tiene que leerse sin adherir a ninguna escuela. Si un partidario de
  cualquiera de las interpretaciones lo consideraría tendencioso, se reescribe. Hay una comprobación
  automática que avisa cuando un resumen usa vocabulario propio de una sola escuela.
- Prohibido el registro «y entonces pasó esto, y entonces pasó aquello». Cada nodo se explica por sus
  mecanismos y sus disputas.
- Ninguna cifra en prosa sin su fuente citada con la sintaxis `[@id]`, que el validador comprueba.
- Cuando una cifra es reconstrucción y no medición, se dice en la propia frase, no en una nota al pie.
- Ningún nodo puede tener una sola interpretación. Mínimo dos. Si solo se me ocurre una, el nodo está
  mal delimitado o me falta leer, y se queda en `esqueleto`.
- La primera persona es para hablar del proyecto, no de la historia. En los resúmenes de nodo y en las
  interpretaciones, no entra.

---

## 10. Anti-objetivos

No construir nada de esto, aunque parezca una mejora natural: cuentas de usuario, comentarios o
backend; texto generado automáticamente publicado como contenido; una narrativa única de «progreso» o
un índice compuesto de «desarrollo»; barras de progreso, gamificación o cuestionarios; contenido
dinámico que no esté versionado en Git; scroll infinito o animaciones que estorben la lectura
comparada.

---

## 11. Criterios de aceptación

1. Los cinco nodos pasan la validación sin advertencias.
2. Cada nodo tiene dos interpretaciones o más, cada una con su condición de refutación.
3. Toda cifra mostrada es rastreable hasta una entrada del manifiesto de datos.
4. Ninguna fuente tiene campos inventados, y las no verificadas aparecen marcadas.
5. Existe al menos una arista disputada renderizada de forma visualmente distinta.
6. Cada serie anterior a 1820 muestra su badge de estimación conjetural.
7. El mapa muestra la advertencia de anacronismo de fronteras.
8. El build de producción falla si el contenido no valida.
9. El README documenta las versiones reales de las librerías usadas.
10. Existe un registro de decisiones de arquitectura con sus motivos.

Los diez se cumplen. Lo que queda por delante es trabajo editorial: verificar fuentes a mano, redactar
los esqueletos, pasar nodos a `revisado` y cargar imágenes con licencia comprobada.
