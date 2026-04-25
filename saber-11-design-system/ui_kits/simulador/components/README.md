# Question Components — Saber 11 Simulador

Librería de componentes reutilizables para los 8 tipos de contexto del examen ICFES Saber 11.

**Archivo fuente:** `components/question-components.js`  
**Catálogo visual:** `QuestionTypes.html`  
**Versión:** 1.1.0

---

## Instalación

Incluye el script antes de tu lógica de sesión de examen:

```html
<script src="components/question-components.js"></script>
```

El objeto global `QC` queda disponible inmediatamente. No tiene dependencias externas.

---

## Uso general

Cada función de contexto devuelve `{ badge, contextHTML }`:

```js
const { badge, contextHTML } = QC.proseTable({ /* config */ });

// badge      → string para inyectar en .ctx-badge
// contextHTML → string HTML para inyectar en .ctx-scroll
document.getElementById('ctx-badge').textContent = badge;
document.getElementById('ctx-content').innerHTML  = contextHTML;
```

Los helpers de panel derecho devuelven HTML directamente:

```js
document.getElementById('q-stem-container').innerHTML = QC.stem({ text: '...' });
document.getElementById('q-options').innerHTML        = QC.options(opts);
```

---

## Componentes de contexto (panel izquierdo)

### 1 · `QC.textOnly(config)` — Texto base simple

Material de lectura únicamente textual, sin tabla, gráfico ni layout especial. Es el caso base actual del producto y puede reutilizarse tanto en una pregunta individual como en un bloque de preguntas.

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `paragraphs` | `string[]` | requerido | Párrafos del contexto. Cada elemento se renderiza como un `<p>`. |
| `instruction` | `string` | opcional | Instrucción breve en cursiva sobre el material de lectura. |
| `footer` | `string` | opcional | Nota de fuente o cierre bajo el texto. |

```js
const { badge, contextHTML } = QC.textOnly({
  instruction: 'Lee el siguiente texto y responde la pregunta.',
  paragraphs: [
    'Durante la última década, varias instituciones educativas rurales han reorganizado sus horarios...',
    'Aunque el tiempo destinado a cada actividad es menor que en el modelo tradicional...'
  ],
  footer: 'Fuente: Informe institucional reelaborado con fines académicos.'
});
```

---

### 2 · `QC.proseTable(config)` — Texto continuo + tabla de datos

Pasaje de lectura con una tabla estadística o comparativa integrada.  
**Áreas:** MAT · LC · SC · CN

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `intro` | `string[]` | requerido | Párrafos de texto antes de la tabla. Cada elemento es un `<p>`. |
| `headers` | `{ text, num? }[]` | requerido | Encabezados de columna. `num: true` alinea a la derecha. |
| `rows` | `{ cells: { text, num?, hi? }[] }[]` | requerido | Filas. `hi: true` resalta la celda en azul primario. |
| `tableCaption` | `string` | opcional | Nota de fuente renderizada como `.author` (cursiva). |
| `footer` | `string[]` | opcional | Párrafos adicionales debajo de la tabla. |

```js
const { badge, contextHTML } = QC.proseTable({
  intro: [
    'La siguiente tabla muestra la distribución porcentual de la población colombiana...',
    'Estas cifras contrastan con la distribución territorial...'
  ],
  headers: [
    { text: 'Región Natural' },
    { text: 'Departamentos incluidos' },
    { text: '% Pob.', num: true },
    { text: 'Hab. aprox.', num: true }
  ],
  rows: [
    { cells: [
      { text: 'Andina' },
      { text: 'Cundinamarca, Antioquia, Valle...' },
      { text: '72.1%', num: true, hi: true },
      { text: '35,8M', num: true }
    ]},
    // ...más filas
  ],
  tableCaption: 'Fuente: DANE, Censo Nacional de Población y Vivienda, 2018.'
});
```

---

### 3 · `QC.scientificTable(config)` — Tabla científica

Datos experimentales o de referencia con contexto de indagación científica.  
**Áreas:** CN · MAT

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `intro` | `string` | opcional | Párrafo de contexto (qué está investigando el estudiante). |
| `headers` | `{ text, num? }[]` | requerido | Encabezados de columna. |
| `rows` | `{ cells: { text, num?, hi?, bold? }[] }[]` | requerido | `bold: true` para la columna de nombre del material/elemento. |
| `source` | `string` | opcional | Nota de fuente en cursiva bajo la tabla. |

```js
const { badge, contextHTML } = QC.scientificTable({
  intro: 'Un estudiante investiga la propagación del sonido en diferentes medios materiales.',
  headers: [
    { text: 'Medio' },
    { text: 'Estado' },
    { text: 'Velocidad (m/s)', num: true },
    { text: 'Temp. (°C)', num: true }
  ],
  rows: [
    { cells: [{ text: 'Vacío', bold: true }, { text: '—' }, { text: '0', num: true }, { text: '—', num: true }] },
    { cells: [{ text: 'Aire', bold: true }, { text: 'Gaseoso' }, { text: '343', num: true }, { text: '20', num: true }] },
    { cells: [{ text: 'Agua de mar', bold: true }, { text: 'Líquido' }, { text: '1.531', num: true }, { text: '20', num: true }] },
    // ...más filas
  ],
  source: 'Fuente: Datos de laboratorio reelaborados con fines académicos.'
});
```

---

### 3 · `QC.barChart(config)` — Gráfica de barras

Gráfica de barras agrupadas construida en CSS puro (sin canvas, sin librería).  
**Áreas:** MAT · SC · CN

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `title` | `string` | requerido | Título del gráfico, centrado sobre las barras. |
| `groups` | `{ label, bars: { value, color, label? }[] }[]` | requerido | Cada grupo es una posición horizontal. `bars` son las barras dentro del grupo (ej. año 2018 y 2024). |
| `maxVal` | `number` | requerido | Techo del eje Y. Usa el valor más alto de los datos + ~10 % de margen. |
| `legend` | `{ color, label }[]` | requerido | Leyenda bajo las barras. Orden debe coincidir con `bars`. |
| `intro` | `string` | opcional | Párrafo introductorio sobre el gráfico. |
| `source` | `string` | opcional | Nota de fuente. |
| `height` | `number` | opcional | Altura del área de barras en px. Default: `100`. |

```js
const { badge, contextHTML } = QC.barChart({
  intro: 'La siguiente gráfica compara la producción agrícola en miles de toneladas...',
  title: 'Producción agrícola por departamento (miles de toneladas)',
  maxVal: 430,
  groups: [
    { label: 'Antioquia', bars: [{ value: 280, color: '#1d4ed8' }, { value: 410, color: '#60a5fa' }] },
    { label: 'Valle',     bars: [{ value: 240, color: '#1d4ed8' }, { value: 350, color: '#60a5fa' }] },
    { label: 'Nariño',   bars: [{ value: 100, color: '#1d4ed8' }, { value: 190, color: '#60a5fa' }] },
  ],
  legend: [
    { color: '#1d4ed8', label: '2018' },
    { color: '#60a5fa', label: '2024' }
  ],
  source: 'Fuente: Datos ficticios elaborados con fines pedagógicos.'
});
```

---

### 4 · `QC.publicNotice(config)` — Aviso público institucional

Texto no continuo: letreros, horarios, reglamentos o avisos. Evalúa comprensión pragmática.  
**Áreas:** ING Parte 1 (A1/A2) · LC (textos discontinuos)

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `header` | `string` | requerido | Nombre/título del aviso. Admite HTML (emojis, `<strong>`). |
| `rows` | `{ label, value }[]` | requerido | Filas del aviso (etiqueta izquierda / dato derecho). |
| `lang` | `'es' \| 'en'` | opcional | Controla el badge. Default: `'es'`. |
| `instruction` | `string` | opcional | Instrucción en cursiva sobre el aviso. |
| `note` | `string` | opcional | Recuadro verde destacado (ej. "Free Wi-Fi"). Admite HTML. |
| `footer` | `string` | opcional | Nota al pie centrada en cursiva. |

```js
const { badge, contextHTML } = QC.publicNotice({
  lang: 'en',
  instruction: 'Read the following public notice and answer the question.',
  header: '🏛️ Riverside Public Library',
  rows: [
    { label: 'Monday – Friday',   value: '8:00 a.m. – 6:00 p.m.' },
    { label: 'Saturday',          value: '9:00 a.m. – 1:00 p.m.' },
    { label: 'Sunday & holidays', value: 'CLOSED' }
  ],
  note:   '📶 Free Wi-Fi available for all registered members',
  footer: 'Membership is free — register at the front desk'
});
```

---

### 5 · `QC.dialogue(config)` — Diálogo conversacional

Conversación con burbujas de chat. Soporte para N hablantes y orientación izquierda/derecha.  
**Áreas:** ING Parte 3 (A1/A2) · LC (textos dramáticos)

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `speakers` | `{ [key]: { name, initials, bg, color } }` | requerido | Mapa de hablantes. `key` es el identificador usado en `lines`. `bg`/`color` son para el avatar circular. |
| `lines` | `{ speaker, side: 'left'\|'right', text }[]` | requerido | Turnos en orden. `side: 'right'` alinea la burbuja al lado derecho. |
| `lang` | `'es' \| 'en'` | opcional | Badge: `'Dialogue · Part 3'` o `'Diálogo'`. |
| `instruction` | `string` | opcional | Instrucción en cursiva sobre el diálogo. |

```js
const { badge, contextHTML } = QC.dialogue({
  lang: 'en',
  instruction: 'Read the conversation and answer the question.',
  speakers: {
    ana:   { name: 'Ana',   initials: 'A', bg: '#dbe1ff', color: '#004ac6' },
    marco: { name: 'Marco', initials: 'M', bg: '#ecfdf5', color: '#047857' }
  },
  lines: [
    { speaker: 'ana',   side: 'left',  text: 'Are you going to the science fair this Saturday?' },
    { speaker: 'marco', side: 'right', text: 'Yes! My team is presenting a project about solar energy.' },
    { speaker: 'ana',   side: 'left',  text: "I'm helping with the robotics display. Don't be late!" },
    { speaker: 'marco', side: 'right', text: "Don't worry. See you at the entrance!" }
  ]
});
```

---

### 6 · `QC.cloze(config)` — Cloze gramatical

Texto con huecos numerados. El hueco activo (que se responde) se resalta en azul; los demás aparecen en gris.  
**Áreas:** ING Parte 4 (A2/B1)

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `segments` | `({ type: 'text', text } \| { type: 'blank', n })[]` | requerido | Array que alterna segmentos de texto y huecos numerados. El componente concatena todo para construir el párrafo. |
| `activeBlank` | `number` | requerido | Número del hueco (1-based) que se está contestando. Se resalta en azul primario. |
| `lang` | `'es' \| 'en'` | opcional | Badge: `'Cloze · Part 4'` o `'Texto con Huecos'`. |
| `instruction` | `string` | opcional | Instrucción en cursiva sobre el texto. |
| `footer` | `string` | opcional | Nota aclaratoria bajo el recuadro de texto (ej. "Answer blank (1) only"). Admite HTML. |

```js
const { badge, contextHTML } = QC.cloze({
  lang: 'en',
  instruction: 'Read the text. Choose the option that best fits each blank.',
  activeBlank: 1,
  segments: [
    { type: 'text',  text: 'Last summer, Maria ' },
    { type: 'blank', n: 1 },
    { type: 'text',  text: ' a volunteer program in a small coastal town. Every morning, she ' },
    { type: 'blank', n: 2 },
    { type: 'text',  text: ' to the beach to collect plastic waste. By the time she returned, she ' },
    { type: 'blank', n: 3 },
    { type: 'text',  text: ' more than 50 kg of recyclable materials.' }
  ],
  footer: 'Answer blank (1) only — the correct form of the verb <em>join</em>.'
});
```

---

### 7 · `QC.geometry(config)` — Figura geométrica SVG

Figura vectorial inline para preguntas de geometría, trigonometría o diagramas físicos.  
**Áreas:** MAT (geometría/cálculo) · CN (física/vectores)

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `svgContent` | `string` | requerido | Markup del `<svg>` completo incluyendo `viewBox`, `width` y `height`. Usa `font-family="Inter"` en los textos. |
| `intro` | `string` | opcional | Instrucción antes de la figura. |
| `caption` | `string` | opcional | Nota descriptiva debajo de la figura (ej. medidas de los lados). |

```js
const { badge, contextHTML } = QC.geometry({
  intro: 'Observe el siguiente triángulo rectángulo y responda la pregunta.',
  svgContent: `
    <svg width="320" height="220" viewBox="0 0 320 220">
      <polygon points="40,180 280,180 280,40" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2.5"/>
      <rect x="263" y="163" width="17" height="17" fill="none" stroke="#1d4ed8" stroke-width="2"/>
      <text x="22"  y="185" font-family="Inter" font-size="15" font-weight="700" fill="#191c1e">A</text>
      <text x="286" y="185" font-family="Inter" font-size="15" font-weight="700" fill="#191c1e">B</text>
      <text x="286" y="38"  font-family="Inter" font-size="15" font-weight="700" fill="#191c1e">C</text>
      <text x="145" y="200" font-family="Inter" font-size="13" fill="#505f76">AB = 12 cm</text>
      <text x="287" y="118" font-family="Inter" font-size="13" fill="#505f76">BC = 5 cm</text>
      <text x="130" y="100" font-family="Inter" font-size="13" fill="#004ac6" font-weight="600"
            transform="rotate(-22,130,100)">AC = ?</text>
      <path d="M 60,180 A 20,20 0 0,1 57,162" stroke="#047857" stroke-width="2" fill="none"/>
      <text x="62"  y="174" font-family="Inter" font-size="12" fill="#047857" font-weight="700">α</text>
    </svg>`,
  caption: 'El ángulo recto está en B. Los catetos miden AB = 12 cm y BC = 5 cm.'
});
```

---

## Helpers del panel de pregunta (panel derecho)

### `QC.stem(config)`

Renderiza el enunciado de la pregunta.

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `text` | `string` | requerido | Texto del enunciado. Admite HTML. |
| `type` | `'normal' \| 'cloze'` | opcional | `'cloze'` aplica mayor interlineado. Default: `'normal'`. |

```js
document.getElementById('q-stem-container').innerHTML = QC.stem({
  text: 'Con base en la tabla, ¿qué afirmación describe correctamente...?'
});
```

### `QC.options(opts)`

Renderiza la lista de opciones de respuesta.

```js
document.getElementById('q-options').innerHTML = QC.options([
  { l: 'A', t: 'Primera opción de respuesta.' },
  { l: 'B', t: 'Segunda opción de respuesta.' },
  { l: 'C', t: 'Tercera opción de respuesta.' },
  { l: 'D', t: 'Cuarta opción de respuesta.' }
]);
```

Las opciones llaman a `selectOption(el, letter)` por defecto. Pasa una función como segundo argumento para sobreescribir.

### `QC.explanation(config)`

Renderiza el recuadro de retroalimentación post-respuesta.

| Parámetro | Tipo | | Descripción |
|---|---|---|---|
| `text` | `string` | requerido | Explicación de la respuesta. Admite HTML. |
| `isCorrect` | `boolean` | opcional | `false` cambia el estilo a rojo (respuesta incorrecta). Default: `true`. |

```js
document.getElementById('q-explanation').outerHTML = QC.explanation({
  text: 'La región Andina concentra el 72.1% de la población pero solo el 12% del territorio...',
  isCorrect: true
});
```

---

## Integración con ExamSession.html

Patrón de integración para inyectar un objeto de pregunta desde el array `QTYPES`:

```js
const q = QTYPES[currentIndex];

// 1. Generar el contenido del contexto según el tipo
let contextData;
switch (q.type) {
  case 'proseTable':      contextData = QC.proseTable(q.contextConfig);      break;
  case 'scientificTable': contextData = QC.scientificTable(q.contextConfig); break;
  case 'barChart':        contextData = QC.barChart(q.contextConfig);        break;
  case 'publicNotice':    contextData = QC.publicNotice(q.contextConfig);    break;
  case 'dialogue':        contextData = QC.dialogue(q.contextConfig);        break;
  case 'cloze':           contextData = QC.cloze(q.contextConfig);           break;
  case 'geometry':        contextData = QC.geometry(q.contextConfig);        break;
}

// 2. Inyectar contexto
document.getElementById('ctx-badge').textContent   = contextData.badge;
document.getElementById('ctx-title').textContent   = q.title;
document.getElementById('ctx-content').innerHTML   = contextData.contextHTML;

// 3. Inyectar pregunta
document.getElementById('q-stem-container').innerHTML = QC.stem({ text: q.stem, type: q.stemType });
document.getElementById('q-options').innerHTML        = QC.options(q.opts);
```

---

## Mapa de tipos por área del examen

| Área | Tipos de contexto más frecuentes |
|---|---|
| **MAT** Matemáticas | proseTable · barChart · geometry |
| **LC** Lectura Crítica | proseTable · publicNotice · dialogue |
| **SC** Sociales y Ciudadanas | proseTable · barChart |
| **CN** Ciencias Naturales | scientificTable · barChart · geometry |
| **ING** Inglés Parte 1 | publicNotice |
| **ING** Inglés Parte 3 | dialogue |
| **ING** Inglés Parte 4 | cloze |

---

## Paleta de colores de área (para barras, avatares y acentos)

| Área | Color principal | Uso típico en barChart |
|---|---|---|
| MAT | `#1d4ed8` / `#3b82f6` | Barras año base / año comparación |
| LC  | `#6d28d9` / `#7c3aed` | — |
| SC  | `#be123c` / `#e11d48` | — |
| CN  | `#047857` / `#10b981` | Barras de resultado experimental |
| ING | `#b45309` / `#d97706` | — |

---

## CSS requerido

El componente asume que las siguientes clases están definidas en la hoja de estilos del proyecto:

```
.ctx-prose  .ctx-table  .ctx-sign  .ctx-dialogue  .ctx-chart  .ctx-geo
.dlg-line   .dlg-line.right  .dlg-speaker  .dlg-bubble  .dlg-name
.bar-chart  .bar-col  .bar-label  .chart-legend  .legend-item  .legend-dot
.q-stem     .q-stem-cloze  .options  .option  .opt-letter  .opt-text
.explanation-box  .explanation-box.show  .wrong-exp  .exp-title  .exp-text
```

Todas están definidas en `ExamSession.html` y `QuestionTypes.html`. Para producción, extráelas a un archivo `exam-session.css` compartido.
