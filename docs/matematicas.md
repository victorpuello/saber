# Plan de Desarrollo — Matemáticas Saber 11

**Área:** Matemáticas (código `MAT`)
**Documento fuente:** `Arquitectura Instruccional Matemáticas Saber 11.md`
**Creado:** 2026-04-25 | **Actualizado:** 2026-04-25
**Duración estimada:** 10 sprints de 2 semanas (20 semanas)

---

## Propuesta: separación del plan por asignatura

El `TODO.md` documenta la arquitectura de plataforma (completa). Este documento inicia
una segunda capa de planes — uno por asignatura — para rastrear la calidad instruccional
de cada área de forma independiente.

| Archivo | Asignatura | Estado |
|---|---|---|
| `docs/matematicas.md` | Matemáticas | 🔵 En progreso |
| `docs/lectura-critica.md` | Lectura Crítica | ⬜ Pendiente crear |
| `docs/ingles.md` | Inglés | ✅ Existe (mirar `/docs/ingles.md`) |
| `docs/ciencias-naturales.md` | Ciencias Naturales | ⬜ Pendiente crear |
| `docs/sociales.md` | Sociales y Ciudadanas | ⬜ Pendiente crear |

Cada documento de asignatura cubre: diagnóstico de brechas, prompts IA específicos,
banco de ítems semilla, calibración TRI, visuales y analítica de competencias.

---

## Estado actual (auditoría 2026-04-25)

### ✅ Lo que ya está funcionando

- Taxonomía DCE básica cargada: 3 competencias MAT, 3 componentes (`content_components`).
- Prompt MAT en `services/ai-generator/app/prompts.py` con estructura general correcta.
- `content_component` resuelto y pasado al prompt desde el generador.
- Tipos visuales `geometric_figure` y `probability_diagram` marcados como relevantes para MAT en el frontend.
- Validator distingue contextos válidos para MAT (`math_problem`, `scientific_scenario`, `discontinuous_text`).
- Sistema de jobs asíncrono operativo para generación en lote.

### ❌ Brechas críticas (origen: revisión contra arquitectura instruccional)

| # | Brecha | Impacto |
|---|---|---|
| B1 | Prompt MAT no instruye a la IA a usar LaTeX (`$$...$$` / `$...$`) | Ecuaciones llegan como texto plano, no renderizan en KaTeX |
| B2 | No hay Chain of Thought / `<scratchpad>` en el prompt MAT | IA puede inventar cálculos incorrectos en distractores |
| B3 | Distractor genérico; no hay matriz de errores por tipo de pregunta | Distractores pedagógicamente débiles |
| B4 | `context_type` de MAT no sigue las 4 categorías ICFES del documento | Reportes de contexto no alineados con terminología oficial |
| B5 | Sin parámetros IRT reales (`a`, `b`, `c`) por ítem MAT | Motor CAT opera con defaults; diagnóstico no es adaptativo |
| B6 | Frontend no renderiza LaTeX / KaTeX en pantalla de examen | Preguntas con fórmulas son ilegibles |
| B7 | Sin campo `tags` en `GeneratedQuestion` para metadatos temáticos | Imposible filtrar banco por tema específico |
| B8 | Sin ítems semilla calibrados por componente MAT | Sin base para diagnostico inicial |
| B9 | Dashboard docente no distingue "Razonamiento vs Ejecución algorítmica" | No hay analítica diferenciada por competencia MAT |
| B10 | Sin micro-cápsulas de remediación ligadas a errores frecuentes MAT | Study Planner no puede asignar remediación matemática específica |

---

## Definición de terminado (DoD) para este plan

Un sprint MAT se cierra solo si:

- [ ] Todas las tareas del sprint marcadas en este documento.
- [ ] Cambios en prompts validados con al menos 5 preguntas generadas de prueba (una por cada combinación competencia × componente).
- [ ] Preguntas LaTeX renderizan correctamente en KaTeX en la UI de examen.
- [ ] Sin regresiones en las demás áreas (LC, ING, CN, SC) al modificar el generador.
- [ ] Ítems semilla creados con parámetros IRT asignados a mano o con primera calibración.

---

## Fase 1 — Infraestructura de renderizado matemático (Sprints M1–M2)

### Sprint M1 (Semanas 1–2) — KaTeX en el frontend + LaTeX en el prompt MAT

**Meta:** Que las fórmulas matemáticas generadas por la IA rendericen correctamente en
todos los puntos de contacto del estudiante (examen, diagnóstico, plan, resultados).

#### Backend — AI Generator

- [x] **B1** Agregar al prompt MAT (`prompts.py`, bloque `AREA_PROMPTS["MAT"]`) la instrucción explícita de LaTeX:
  ```
  FORMATO MATEMÁTICO OBLIGATORIO:
  - Toda expresión matemática DEBE estar en LaTeX.
  - Bloques: $$...$$  Inline: $...$
  - Correcto: "El costo es $$C(x) = 5000 + 1200x$$"
  - Incorrecto: "El costo es C(x) = 5000 + 1200x"
  ```
- [ ] Agregar la misma instrucción al `SYSTEM_PROMPT` como condición específica para área MAT
  (detectar `area_code == "MAT"` en el generator y añadir suffix).
- [x] Actualizar el validator (`validator.py`) para emitir un `warning` si una pregunta MAT
  no contiene al menos un marcador `$` o `$$` en context/stem/opciones.

#### Frontend

- [x] Instalar `katex` en `frontend/package.json` (v0.16.45).
- [x] Crear componente `<MathText>` que detecta `$...$` y `$$...$$` y delega a KaTeX;
  para texto sin marcadores renderiza como `<span>` normal.
- [x] Aplicar `<MathText>` en:
  - [x] Componente de pregunta en examen (`ExamSession.tsx`).
  - [x] Componente de pregunta en diagnóstico (`DiagnosticSession.tsx`).
  - [x] Vista de resultados / revisión de respuestas (`ExamResults.tsx`).
  - [x] Preview de pregunta en el banco (`QuestionPreviewModal.tsx`). (`QuestionDetailDrawer.tsx` aún no existe)
- [ ] Smoke test visual: abrir una pregunta con `$$\frac{a+b}{c}$$` y confirmar renderizado.

#### Criterios de aceptación del sprint M1

- [ ] Se genera una pregunta MAT con la IA y las opciones contienen `$$...$$`.
- [ ] La misma pregunta se visualiza en la pantalla de examen sin signos `$` visibles.
- [ ] Fracciones (`\frac`), raíces (`\sqrt`), y porcentajes (`0.9(5000+1200x)`) renderizan sin error.
- [ ] Sin regresión en el renderizado de preguntas de otras áreas.

---

### Sprint M2 (Semanas 3–4) — Taxonomía DCE matemática completa y context_type ICFES

**Meta:** Que el banco tenga la taxonomía MAT completa con seeds, y que los
`context_type` sigan la nomenclatura oficial del documento ICFES.

#### Question Bank — seeds y taxonomía

- [x] Verificar que el seed de MAT contiene las **3 competencias** oficiales con sus
  afirmaciones y evidencias:
  - [x] `MAT-C1` — Interpretación y Representación (leer/transformar info cuantitativa).
  - [x] `MAT-C2` — Formulación y Ejecución (modelar situaciones, ejecutar procedimientos).
  - [x] `MAT-C3` — Argumentación (validar, refutar, justificar afirmaciones).
- [x] Verificar que los **3 componentes** están en `content_components`:
  - [x] `MAT-NUM` — Numérico-Variacional (funciones, proporcionalidad, interés, sucesiones).
  - [x] `MAT-GEO` — Geométrico-Métrico (áreas, volúmenes, Pitágoras, trigonometría básica).
  - [x] `MAT-ALT` — Aleatorio (estadística, probabilidad, conteo).
- [x] Cada competencia tiene ≥ 3 afirmaciones (assertions) con ≥ 2 evidencias cada una.
- [x] Seed idempotente (re-ejecutable sin duplicados) — upsert por código en load_seeds.py.

#### Tipos de contexto — alinear con categorías ICFES

El documento define 4 categorías de contexto. **Decisión tomada: Opción A**.

- [x] **Implementada Opción A:** campo `context_category` añadido a `Question` model,
  `QuestionCreate`, `QuestionUpdate`, `QuestionOut` (QB) y `GeneratedQuestion` (AI Generator).
  Valores: `familiar_personal | laboral_ocupacional | comunitario_social | matematico_cientifico`.
- [x] Actualizar el prompt MAT para instruir a la IA a elegir entre las 4 categorías de
  contexto ICFES y rellenar el campo correspondiente.
- [x] `MAT_SYSTEM_PROMPT` añadido en `prompts.py`: sufijo con reglas LaTeX + CoT +
  instrucción de `context_category`. Activado en `generator.py` cuando `area_code == "MAT"`.

#### Criterios de aceptación del sprint M2

- [ ] `GET /api/taxonomy/areas/MAT/competencies` devuelve las 3 competencias con
  sus assertions y evidences pobladas (requiere re-seed en DB).
- [ ] `GET /api/taxonomy/areas/MAT/content-components` devuelve los 3 componentes
  (MAT-NUM, MAT-GEO, MAT-ALT — requiere re-seed en DB).
- [ ] El generador IA selecciona componente y competencia correctos en la resolución.
- [ ] Campo `context_category` visible en el detalle de pregunta del banco.

---

## Fase 2 — Calidad de generación IA matemática (Sprints M3–M4)

### Sprint M3 (Semanas 5–6) — Prompt MAT v2: Chain of Thought y matriz de errores

**Meta:** Que la IA no genere cálculos incorrectos y que los distractores sean
pedagógicamente específicos según el tipo de pregunta.

#### Prompt MAT v2 — Chain of Thought (scratchpad)

- [x] Instrucción de scratchpad en `prompts.py` (`AREA_PROMPTS["MAT"]`):
  `VALIDACIÓN MATEMÁTICA (OBLIGATORIO antes de generar opciones)` — ya estaba desde M1.
- [x] Reforzado en `MAT_SYSTEM_PROMPT` (regla 9 del sufijo de sistema).
- [ ] Probar con 10 preguntas MAT y verificar que no hay errores aritméticos en la opción correcta.
- [ ] Actualizar el validator para rechazar preguntas MAT donde la opción correcta
  tenga inconsistencia numérica detectable (opcional / heurístico).

#### Matriz de errores por tipo de pregunta (4 tipos del documento)

- [x] **Tipo 1 — Tabular/Gráfica** — incluido en sección `MATRIZ DE ERRORES` del prompt MAT.
- [x] **Tipo 2 — Modelado Algebraico** — incluido en sección `MATRIZ DE ERRORES` del prompt MAT.
- [x] **Tipo 3 — Justificación de Procedimientos** — incluido en sección `MATRIZ DE ERRORES`.
- [x] **Tipo 4 — Probabilidad Condicional** — incluido en sección `MATRIZ DE ERRORES`.
- [x] Función `build_mat_distractor_guidance(question_type: str) -> str` creada en `prompts.py`.
  Tipos: `tabular_grafica`, `modelado_algebraico`, `justificacion`, `probabilidad_condicional`.
- [ ] Pasar `question_type` desde la UI de generación (Sprint M4+ — requiere cambio de UI).

#### Contextos colombianos para MAT

- [x] Instrucción de contexto colombiano ya en `AREA_PROMPTS["MAT"]` (desde M1):
  SITP/TransMilenio, precios COP, tasas Bancolombia, estadísticas DANE, VIS, EPM/ETB.

#### Criterios de aceptación del sprint M3

- [ ] Generar 15 preguntas MAT (5 por componente): ninguna tiene error aritmético en la respuesta correcta.
- [ ] Al menos 10/15 tienen distractores con error pedagógico identificable y específico.
- [ ] Al menos 10/15 tienen contexto colombiano reconocible.
- [ ] Al menos 10/15 tienen ecuaciones en LaTeX correctamente formateadas.

---

### Sprint M4 (Semanas 7–8) — Tipos visuales MAT y campo `tags`

**Meta:** Que las preguntas MAT con visual sean generadas con el tipo correcto
y que el banco tenga metadatos de tema para filtros de calibración.

#### Campo `tags` en el modelo de pregunta

- [ ] Agregar `tags: list[str] | None` a `GeneratedQuestion` en `schemas.py`.
- [ ] Agregar campo `tags` (array JSON) al modelo de Question Bank (`question` table).
- [ ] Actualizar el prompt MAT para que la IA devuelva `"tags": ["Funciones lineales", "Porcentajes", "Modelado"]`.
- [ ] Exponer `tags` en los endpoints de consulta del Question Bank con filtro por tag.
- [ ] Actualizar el frontend del banco de preguntas para mostrar tags como chips y filtrar.

#### Tipos visuales específicos para MAT

- [ ] **Plano cartesiano** (`chart_js` tipo `line` o `scatter`): instrucciones en `VISUAL_TYPE_GUIDANCE`
  para que los datos incluyan etiquetas de ejes, escala explícita y título.
- [ ] **Figura geométrica** (`svg_template`): definir al menos 3 plantillas SVG paramétricas:
  - [ ] `triangle` — triángulo con lados y ángulos parametrizables.
  - [ ] `rectangle_with_dimensions` — rectángulo con dimensiones para cálculo de área.
  - [ ] `composite_figure` — figura compuesta para preguntas de área/perímetro.
- [ ] **Diagrama de árbol de probabilidad** (`probability_diagram`): instrucciones
  específicas en el prompt para generar nodos y probabilidades coherentes (suman 1).
- [ ] **Tabla de doble entrada** (`html_template`): instrucciones para que la tabla
  tenga totales de fila y columna correctos (necesario para probabilidad condicional).
- [ ] Validar que el render de cada tipo funciona en el frontend (smoke test por tipo).

#### Criterios de aceptación del sprint M4

- [ ] Una pregunta MAT de Interpretación se genera con gráfica de barras (Chart.js) y
  los datos de la gráfica son coherentes con la pregunta.
- [ ] Una pregunta MAT de Geometría se genera con figura SVG paramétrica correcta.
- [ ] Una pregunta MAT de Probabilidad condicional se genera con tabla de doble entrada
  con totales correctos.
- [ ] El banco de preguntas permite filtrar por tag MAT (ej: "Funciones lineales").

---

## Fase 3 — Banco semilla y calibración TRI (Sprints M5–M6)

### Sprint M5 (Semanas 9–10) — Banco de ítems semilla MAT

**Meta:** Tener ≥ 45 preguntas semilla MAT en estado APPROVED con cobertura
uniforme de competencias, componentes y niveles de dificultad.

#### Generación y curación del banco semilla

Distribución objetivo:

| Componente | Competencia | Dificultad | Cantidad |
|---|---|---|---|
| Numérico-Variacional | Interpretación | Baja | 3 |
| Numérico-Variacional | Formulación | Media | 3 |
| Numérico-Variacional | Formulación | Alta | 2 |
| Numérico-Variacional | Argumentación | Alta | 2 |
| Geométrico-Métrico | Interpretación | Baja | 3 |
| Geométrico-Métrico | Formulación | Media | 3 |
| Geométrico-Métrico | Argumentación | Alta | 2 |
| Aleatorio | Interpretación | Media | 3 |
| Aleatorio | Formulación | Media | 3 |
| Aleatorio | Argumentación | Alta | 3 |
| Bloques (2-3 subpreguntas compartidas) | Mixto | Media-Alta | 18 (6 bloques × 3 subpreguntas) |
| **Total** | | | **45 preguntas** |

Checklist de generación:

- [ ] Usar el generador IA (con prompt v2 del Sprint M3) para generar lote inicial de 60 ítems.
- [ ] Revisión docente: aprobar ≥ 45, rechazar los que tengan error matemático o LaTeX mal formado.
- [ ] Cada ítem aprobado tiene: context, stem, 4 opciones, explicaciones de cada opción, tags, context_category.
- [ ] Al menos 20 ítems tienen recurso visual (gráfica, figura o tabla).
- [ ] Al menos 5 ítems son de tipo Justificación de Procedimientos (Argumentación).
- [ ] Al menos 5 ítems son de tipo Probabilidad Condicional con tabla de doble entrada.

#### Criterios de aceptación del sprint M5

- [ ] 45 ítems en estado APPROVED en el banco con área `MAT`.
- [ ] Distribución uniforme: ningún componente tiene menos de 10 ítems.
- [ ] Ningún ítem aprobado tiene error aritmético verificable.
- [ ] 100 % de ítems tienen LaTeX en al menos un campo (context, stem u opciones).

---

### Sprint M6 (Semanas 11–12) — Parámetros TRI y primera calibración

**Meta:** Asignar parámetros IRT iniciales a cada ítem MAT para que el motor
CAT pueda discriminar preguntas por dificultad de forma real.

#### Modelo IRT — extensión del schema

- [ ] Agregar campos IRT a la tabla de preguntas en Question Bank:
  - [ ] `irt_a` — discriminación (default 1.0, rango típico 0.5–2.5).
  - [ ] `irt_b` — dificultad (default 0.0, rango −3 a +3 en escala theta).
  - [ ] `irt_c` — guessing (default 0.25 para 4 opciones, rango 0–0.35).
- [ ] Migración de base de datos no destructiva (columnas nullable con defaults).
- [ ] Exponer `irt_a`, `irt_b`, `irt_c` en el endpoint de detalle de pregunta (solo ADMIN).
- [ ] Agregar formulario en el panel admin del banco para editar parámetros IRT por ítem.

#### Calibración a priori (basada en el documento instruccional)

Asignar parámetros según la tabla de dificultad del documento (Sección 4):

| Tipo de pregunta | `irt_b` estimado | `irt_a` estimado |
|---|---|---|
| Tabular/Gráfica (Fácil-Media) | −1.0 a 0.5 | 0.8–1.2 |
| Modelado Algebraico (Media-Alta) | 0.0 a 1.5 | 1.0–1.5 |
| Justificación de Procedimientos (Alta) | 1.0 a 2.5 | 1.2–1.8 |
| Probabilidad Condicional (Alta) | 1.5 a 3.0 | 1.3–2.0 |

- [ ] Asignar parámetros a priori a los 45 ítems semilla según la tabla anterior.
- [ ] Verificar que el Diagnostic Service (CAT) carga `irt_a/b/c` desde el Question Bank
  en lugar de defaults hardcodeados (ver brecha en `pendientes.md` §3.1).
- [ ] Ejecutar una sesión de diagnóstico de prueba con los 45 ítems MAT: verificar que
  la selección de ítems sigue la curva de información (ítems cercanos a theta actual).

#### Calibración empírica (post-piloto)

- [ ] Definir pipeline de recalibración: al acumular ≥ 50 respuestas por ítem, recalcular
  `irt_b` con estimación bayesiana simple.
- [ ] Documentar el script de recalibración en `services/diagnostic/scripts/`.

#### Criterios de aceptación del sprint M6

- [ ] Campos `irt_a/b/c` visibles y editables para ADMIN en el panel de preguntas.
- [ ] Sesión de diagnóstico MAT de prueba completa con 10 ítems: los ítems seleccionados
  escalan en dificultad si el estudiante responde correctamente.
- [ ] El motor CAT no usa valores default sino los parámetros reales del banco.
- [ ] Al menos 40 de los 45 ítems semilla tienen parámetros IRT distintos del default.

---

## Fase 4 — Experiencia de examen matemático (Sprints M7–M8)

### Sprint M7 (Semanas 13–14) — UI de examen con soporte LaTeX y visuales MAT

**Meta:** Que el estudiante pueda presentar un examen / diagnóstico MAT con
preguntas que incluyan fórmulas y gráficas renderizadas correctamente.

#### Frontend — pantalla de examen

- [ ] Verificar que `<MathText>` (del Sprint M1) está aplicado en la pantalla de examen.
- [ ] Implementar `<ChartRenderer>` en el frontend para `render_engine: "chart_js"`:
  - [ ] Wrapper sobre Chart.js 4.x.
  - [ ] Recibe `visual_data` JSON y renderiza sin recargar la página.
  - [ ] Responsivo (adapta a móvil).
- [ ] Implementar `<SVGDiagramRenderer>` para `render_engine: "svg_template"`:
  - [ ] Renderiza las plantillas `triangle`, `rectangle_with_dimensions`, `composite_figure` del Sprint M4.
  - [ ] Parámetros inyectados dinámicamente desde `visual_data.params`.
- [ ] Implementar `<HTMLTableRenderer>` para tablas de doble entrada (probabilidad condicional).
- [ ] Probar flujo completo: diagnóstico MAT desde `DiagnosticSession.tsx` con una
  pregunta de cada tipo visual.

#### Accesibilidad visual

- [ ] Todo visual MAT tiene `alt_text` y `alt_text_detailed` no vacíos (ya validado en backend).
- [ ] Verificar que KaTeX tiene descripción `aria-label` en modo `renderToString`.
- [ ] Modo contraste alto: verificar que las gráficas Chart.js son legibles.

#### Criterios de aceptación del sprint M7

- [ ] Presentar un simulacro de 10 preguntas MAT (mezcla de componentes) de inicio a fin sin errores de renderizado.
- [ ] Preguntas con fórmulas LaTeX muestran notación matemática correcta, no signos `$`.
- [ ] Preguntas con gráfica de barras muestran la gráfica dentro del contexto.
- [ ] Preguntas con figura geométrica SVG muestran la figura con dimensiones correctas.
- [ ] En móvil (viewport 375 px), el examen es legible y los visuales no se cortan.

---

### Sprint M8 (Semanas 15–16) — Resultados detallados con desglose por competencia MAT

**Meta:** Que el estudiante vea, al terminar un examen MAT, qué competencia y
componente falló, con el error específico que cometió.

#### Frontend — pantalla de resultados

- [ ] Implementar desglose por competencia en `ExamResults.tsx`:
  - [ ] Tarjeta por competencia (`MAT-C1`, `MAT-C2`, `MAT-C3`) con % de acierto.
  - [ ] Tarjeta por componente (`Numérico-Variacional`, `Geométrico-Métrico`, `Aleatorio`).
- [ ] Para cada pregunta respondida incorrectamente, mostrar:
  - [ ] La opción que eligió el estudiante.
  - [ ] La opción correcta.
  - [ ] La explicación pedagógica del distractor elegido (`explanation_a/b/c/d`).
  - [ ] La explicación de la respuesta correcta (`explanation_correct`).
  - [ ] El contexto y stem con LaTeX renderizado.
- [ ] En la revisión de respuestas, usar `<MathText>` y los renderers visuales.

#### Perfil de competencia

- [ ] Mostrar en el perfil del estudiante (`Plan.tsx` o nuevo `Profile.tsx`) un radar/bar
  chart con nivel por competencia MAT.
- [ ] Si el estudiante tiene < 50 % en un componente, destacarlo como "área de mejora".

#### Criterios de aceptación del sprint M8

- [ ] Al terminar un examen MAT, el estudiante ve las 3 tarjetas de competencia con puntaje.
- [ ] El estudiante puede revisar cada pregunta incorrecta con la explicación del error cometido.
- [ ] Las fórmulas en la revisión de respuestas renderizan en KaTeX.
- [ ] El radar de competencias actualiza al terminar cada sesión.

---

## Fase 5 — Analytics y remediación matemática (Sprints M9–M10)

### Sprint M9 (Semanas 17–18) — Dashboard docente: Razonamiento vs Ejecución

**Meta:** Que el docente identifique si sus estudiantes fallan por falta de
razonamiento matemático o por errores de ejecución algorítmica.

#### Backend — endpoints de analítica MAT

- [ ] Agregar endpoint `GET /api/analytics/areas/MAT/competency-breakdown?group_id=...`:
  devuelve para cada competencia (`C1`, `C2`, `C3`) el % promedio del grado/grupo.
- [ ] Agregar endpoint `GET /api/analytics/areas/MAT/distractor-analysis?question_id=...`:
  devuelve cuántos estudiantes eligieron cada opción (A/B/C/D) para identificar
  el error más común de la clase.
- [ ] Agregar endpoint `GET /api/analytics/areas/MAT/struggling-components?group_id=...`:
  lista los componentes donde > 60 % del grupo falla, ordenados por severidad.

#### Frontend — tablero docente MAT

- [ ] Sección MAT en el dashboard docente con:
  - [ ] Barra de competencias: `Interpretación`, `Formulación`, `Argumentación` con % clase.
  - [ ] Alerta si alguna competencia está por debajo del 40 %.
  - [ ] Lista de preguntas con mayor tasa de error en el grupo.
  - [ ] Para cada pregunta de la lista, mostrar el distractor más elegido y su descripción pedagógica.
- [ ] Texto de insight automático: "El 60 % de la clase no domina Proporcionalidad;
  fallan consistentemente en diferenciar correlación directa de la inversa."
  (Template parametrizado con los datos reales del componente con peor desempeño.)

#### Criterios de aceptación del sprint M9

- [ ] El docente ve el desglose por las 3 competencias MAT de su grupo.
- [ ] El docente ve qué distractor elige la mayoría de estudiantes en las preguntas difíciles.
- [ ] El endpoint `distractor-analysis` devuelve datos reales de sesiones de examen.
- [ ] Sin regresión en los dashboards de las demás áreas.

---

### Sprint M10 (Semanas 19–20) — Micro-cápsulas de remediación MAT + Study Planner

**Meta:** Que el Study Planner asigne automáticamente micro-cápsulas de
remediación cuando el CAT detecta una debilidad matemática específica.

#### Definición de micro-cápsulas MAT

- [ ] Crear catálogo de micro-cápsulas MAT en la base de datos del Study Planner:

| Código | Título | Trigger (distractor frecuente) |
|---|---|---|
| `MAT-MC-01` | Aprende a leer gráficos cartesianos | Error: leer eje incorrecto |
| `MAT-MC-02` | Porcentajes vs valores absolutos | Error: confundir % con unidades |
| `MAT-MC-03` | Modelos lineales en contexto real | Error: variable mal asignada |
| `MAT-MC-04` | Áreas y perímetros: no los confundas | Error: usa perímetro en vez de área |
| `MAT-MC-05` | Probabilidad condicional paso a paso | Error: usa total en vez de subgrupo |
| `MAT-MC-06` | Jerarquía de operaciones PEMDAS/BODMAS | Error: viola jerarquía de operaciones |
| `MAT-MC-07` | Correlación directa vs inversa | Error: confunde tipo de proporcionalidad |
| `MAT-MC-08` | Lectura de tablas de doble entrada | Error: lee fila en vez de columna |

- [ ] Cada micro-cápsula tiene: título, descripción corta, duración estimada (15–30 min),
  recurso externo sugerido (URL de video Khan Academy u otro OER).
- [ ] Seed de las 8 micro-cápsulas en la migración inicial.

#### Lógica de asignación automática

- [ ] En el Study Planner, al procesar el evento `diagnostic.completed` con área MAT:
  - [ ] Leer el historial de distractores elegidos por el estudiante (si está disponible).
  - [ ] Si el estudiante eligió consistentemente el "distractor de eje incorrecto" → asignar `MAT-MC-01`.
  - [ ] Si el componente `Aleatorio` tiene score < 40 % → asignar `MAT-MC-05` y `MAT-MC-08`.
- [ ] Las micro-cápsulas aparecen como tareas en el plan semanal del estudiante,
  antes de las preguntas de práctica del componente débil.

#### Criterios de aceptación del sprint M10

- [ ] El seed de las 8 micro-cápsulas carga sin errores.
- [ ] Al completar un diagnóstico MAT con score bajo en Aleatorio, el plan asigna
  automáticamente al menos 1 micro-cápsula de probabilidad/estadística.
- [ ] Las micro-cápsulas son visibles en el plan del estudiante en `Plan.tsx`.
- [ ] El docente ve en el dashboard qué micro-cápsulas fueron asignadas a cada estudiante.

---

## Tablero de control rápido (actualizar en cada sprint)

| Sprint | Objetivo principal | Estado |
|---|---|---|
| M1 | KaTeX frontend + LaTeX en prompt MAT | ⬜ Pendiente |
| M2 | Taxonomía DCE completa + context_type ICFES | ⬜ Pendiente |
| M3 | Prompt MAT v2: CoT + matriz de distractores | ⬜ Pendiente |
| M4 | Tipos visuales MAT + campo `tags` | ⬜ Pendiente |
| M5 | Banco de 45 ítems semilla aprobados | ⬜ Pendiente |
| M6 | Parámetros IRT + motor CAT calibrado | ⬜ Pendiente |
| M7 | UI examen con renderers visuales MAT | ⬜ Pendiente |
| M8 | Resultados con desglose por competencia | ⬜ Pendiente |
| M9 | Dashboard docente: Razonamiento vs Ejecución | ⬜ Pendiente |
| M10 | Micro-cápsulas + asignación automática en planner | ⬜ Pendiente |

---

## Backlog de mejoras futuras (fuera del alcance inicial)

- [ ] Recalibración empírica de parámetros IRT con datos reales de respuestas (requiere ≥ 50 respuestas por ítem).
- [ ] Ítems con geometría 3D usando Three.js o SVG isométrico.
- [ ] Preguntas de respuesta construida (entrada numérica libre, no solo opciones múltiples).
- [ ] Banco colaborativo: docentes de varias instituciones comparten ítems aprobados.
- [ ] Análisis de funcionamiento diferencial del ítem (DIF) por género o región.
- [ ] Integración con banco oficial de ítems liberados del ICFES.

---

## Referencias cruzadas

| Documento | Relevancia |
|---|---|
| `docs/Arquitectura Instruccional Matemáticas Saber 11.md` | Fuente pedagógica de este plan |
| `docs/Diseño de Preguntas Saber 11 Matemáticas.md` | Ejemplos de ítems y estructura de distractores |
| `docs/estrategia_imagenes_saber11.md` | Frecuencia y tipos de visuales para MAT |
| `docs/TODO.md` | Plan de plataforma completado (Sprints 1–12) |
| `docs/pendientes.md` | Brechas de plataforma aún abiertas (afectan M6, M7) |
| `services/ai-generator/app/prompts.py` | Implementación actual del prompt MAT |
| `services/ai-generator/app/validator.py` | Validador de preguntas generadas |
