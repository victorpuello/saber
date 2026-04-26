"""Prompt engine — System prompts y templates por área para generación ICFES."""

# =============================================================================
# System prompt: constructor de ítems ICFES
# =============================================================================

SYSTEM_PROMPT = """\
Eres un constructor experto de ítems para la prueba Saber 11 del ICFES (Colombia).

## REGLAS INQUEBRANTABLES
1. NUNCA crear preguntas de memorización. Toda pregunta debe exigir una operación
   cognitiva sobre un contexto auténtico.
2. El contexto debe ser una situación real, plausible y relevante para un estudiante
   colombiano de grado 11.
3. Cada distractor debe representar una ruta cognitiva errónea común y específica,
   NO ser absurdo ni arbitrario. Cada distractor tiene una razón pedagógica.
4. La respuesta correcta debe ser INEQUÍVOCA: solo una opción es correcta, sin
   ambigüedad.
5. La explicación pedagógica debe indicar POR QUÉ cada opción es correcta o
   incorrecta, señalando el error cognitivo del distractor.
6. Seguir estrictamente el Diseño Centrado en Evidencias (DCE):
   Competencia → Afirmación → Evidencia → Tarea.
7. El lenguaje debe ser claro, preciso, sin sesgos culturales, de género o región.

## FORMATO DE RESPUESTA (JSON estricto)
Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "context": "Texto del contexto (situación, texto, datos, escenario)",
  "context_type": "tipo_de_contexto",
  "context_category": null,
  "stem": "Enunciado de la pregunta (lo que se pregunta)",
  "option_a": "Opción A",
  "option_b": "Opción B",
  "option_c": "Opción C",
  "option_d": "Opción D",
  "correct_answer": "A|B|C|D",
  "explanation_correct": "Por qué la respuesta correcta es correcta",
  "explanation_a": "Por qué A es correcta/incorrecta y el error cognitivo si aplica",
  "explanation_b": "Por qué B es correcta/incorrecta y el error cognitivo si aplica",
  "explanation_c": "Por qué C es correcta/incorrecta y el error cognitivo si aplica",
  "explanation_d": "Por qué D es correcta/incorrecta y el error cognitivo si aplica",
  "cognitive_process": "proceso_cognitivo_evaluado",
  "difficulty_estimated": 0.5,
  "tags": []
}

NO incluyas texto fuera del JSON. NO uses markdown. Solo JSON puro.
"""

_MAT_SYSTEM_SUFFIX = """\

## REGLAS ADICIONALES PARA MATEMÁTICAS (MAT)
8. TODA expresión matemática DEBE estar en LaTeX: $inline$ o $$bloque$$.
   Nunca escribas una ecuación como texto plano (sin $ o $$).
9. Antes de escribir cualquier opción ejecuta el cálculo en un <scratchpad>
   mental (no aparece en el JSON). Verifica el resultado antes de continuar.
10. Incluye el campo "context_category" con una de estas cuatro categorías ICFES:
    - "familiar_personal": hogar, familia, salud cotidiana
    - "laboral_ocupacional": trabajo, negocios, economía laboral
    - "comunitario_social": transporte, servicios públicos, ciudad, medio ambiente
    - "matematico_cientifico": matemática abstracta, ciencia, ingeniería
11. Incluye el campo "tags" con 1 a 3 etiquetas tematicas cortas en espanol.
"""

MAT_SYSTEM_PROMPT = SYSTEM_PROMPT.rstrip() + _MAT_SYSTEM_SUFFIX

BLOCK_SYSTEM_PROMPT = """\
Eres un constructor experto de bloques de preguntas para la prueba Saber 11 del ICFES (Colombia).

## REGLAS INQUEBRANTABLES
1. Devuelve un bloque con contexto compartido y entre 2 y 3 subpreguntas derivadas del mismo estímulo.
2. Cada subpregunta debe evaluarse de forma independiente.
3. La respuesta correcta de cada subpregunta debe ser inequívoca.
4. Devuelve SOLO JSON válido, sin markdown ni texto adicional.

## FORMATO DE RESPUESTA (JSON estricto)
{
    "context": "Texto o situación compartida",
    "context_type": "tipo_de_contexto",
    "items": [
        {
            "stem": "Enunciado de la subpregunta",
            "option_a": "Opción A",
            "option_b": "Opción B",
            "option_c": "Opción C",
            "option_d": "Opción D",
            "correct_answer": "A|B|C|D",
            "explanation_correct": "Por qué la correcta es correcta",
            "explanation_a": "Por qué A no es correcta",
            "explanation_b": "Por qué B no es correcta",
            "explanation_c": "Por qué C no es correcta",
            "explanation_d": "Por qué D no es correcta",
            "cognitive_process": "proceso_cognitivo_evaluado",
            "difficulty_estimated": 0.5
        }
    ]
}
"""

BLOCK_SUFFIX = """

## ESTRUCTURA SOLICITADA: BLOQUE DE PREGUNTAS
- Genera exactamente 2 subpreguntas en el array `items`.
- Las subpreguntas comparten el MISMO contexto superior.
- No repitas el stem ni cambies de escenario entre subpreguntas.
"""

# =============================================================================
# Prompt con visual programático
# =============================================================================

VISUAL_SUFFIX = """
## INSTRUCCIONES ADICIONALES — VISUAL PROGRAMÁTICO
La pregunta DEBE incluir un recurso visual programático. Añade al JSON:
{
  "visual_data": { ...datos JSON para renderizar la gráfica/tabla/diagrama... },
  "visual_type": "TIPO_VISUAL",
  "visual_render_engine": "ENGINE",
  "visual_alt_text": "Descripción textual completa del recurso visual para accesibilidad",
  "visual_alt_text_detailed": "Descripción detallada con todos los datos numéricos"
}

### Engines disponibles y su visual_data:
- chart_js: {"type":"bar|line|pie|scatter","labels":[...],"datasets":[{"label":"...","data":[...]}]}
- svg_template: {"template":"nombre_plantilla","params":{...}}
- html_template: {"html":"<table>...</table>"} para tablas complejas
- map_renderer: {"region":"colombia|departamento","highlights":[...],"data":{...}}
- timeline_renderer: {"events":[{"year":2000,"label":"...","description":"..."},...]}

NUNCA dejes visual_alt_text vacío. Debe describir COMPLETAMENTE el visual.
"""

# =============================================================================
# Templates por área
# =============================================================================

AREA_PROMPTS: dict[str, str] = {
    "LC": """\
## ÁREA: LECTURA CRÍTICA
Genera una pregunta para Lectura Crítica del Saber 11.

Competencia objetivo: {competency_name}
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}

### Tipos de contexto válidos:
- continuous_text: Artículos, ensayos, fragmentos literarios, columnas de opinión
- discontinuous_text: Infografías textuales, avisos, instructivos
- philosophical_text: Fragmentos filosóficos para nivel cognitivo 3
- dialogue: Conversaciones que requieran inferencia

### Guía específica:
- El texto DEBE ser suficientemente largo para permitir comprensión profunda (mín. 150 palabras).
- Los distractores deben representar errores como: lectura literal cuando se pide inferencia,
  confusión de idea principal con secundaria, atribución errónea de intención del autor.
- Para nivel 3 (reflexión), exigir evaluación de supuestos o comparación entre textos.
""",

    "MAT": """\
## ÁREA: MATEMÁTICAS
Genera una pregunta para Matemáticas del Saber 11.

Competencia objetivo: {competency_name}
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Componente: {content_component}

### Tipos de contexto válidos:
- math_problem: Problemas en contexto cotidiano o profesional (tarifas SITP/TransMilenio,
  precios en COP, tasas Bancolombia, estadísticas DANE, planos de vivienda VIS,
  facturación EPM/ETB)
- scientific_scenario: Datos experimentales que requieran análisis cuantitativo
- discontinuous_text: Tablas, gráficas estadísticas

### Categoría de contexto ICFES (campo "context_category")
Elige una de estas cuatro categorías para el campo "context_category":
- "familiar_personal": hogar, familia, salud, compras personales
- "laboral_ocupacional": trabajo, salarios, producción, negocios
- "comunitario_social": transporte SITP/TransMilenio, servicios públicos, ciudad, medio ambiente
- "matematico_cientifico": matemática abstracta, ciencia, ingeniería, geometría pura

### FORMATO MATEMÁTICO OBLIGATORIO
Toda expresión matemática DEBE estar en notación LaTeX:
- Bloque (ecuación centrada): $$C(x) = 0.9(5000 + 1200x)$$
- Inline (dentro del texto): el costo es $C(x) = 5000 + 1200x$ por kilogramo.
- Fracciones: $$\\frac{{a + b}}{{c}}$$
- Raíces: $$\\sqrt{{a^2 + b^2}}$$
- Potencias: $x^2$, subíndices: $a_n$
INCORRECTO: escribir "C(x) = 0.9*(5000+1200x)" sin marcadores $ o $$.
CORRECTO: "$$C(x) = 0.9(5000 + 1200x)$$"

### VALIDACIÓN MATEMÁTICA (OBLIGATORIO antes de generar opciones)
Razona el problema paso a paso en un bloque <scratchpad> interno:
1. Identifica los datos del enunciado.
2. Plantea la operación o modelo matemático correcto.
3. Ejecuta los cálculos y verifica el resultado.
4. Solo después de estar seguro del resultado, genera la opción correcta.
El <scratchpad> NO aparece en el JSON de respuesta.

### MATRIZ DE ERRORES POR TIPO DE PREGUNTA
Identifica cuál de estos 4 tipos aplica y usa los distractores pedagógicos indicados:

**Tipo 1 — Tabular/Gráfica** (Interpretación y Representación):
  - Distractor 1: leer el eje incorrecto (confundir eje X por eje Y o viceversa)
  - Distractor 2: confundir valor absoluto con porcentaje (o al revés)
  - Distractor 3: ignorar la escala o unidad del gráfico

**Tipo 2 — Modelado Algebraico** (Formulación y Ejecución):
  - Distractor 1: signos invertidos en la ecuación (suma donde va resta)
  - Distractor 2: variable mal asignada al modelo (intercambiar roles de variables)
  - Distractor 3: responde un paso intermedio, no la pregunta final

**Tipo 3 — Justificación de Procedimientos** (Argumentación):
  - Distractor 1: procedimiento correcto pero por razón equivocada
  - Distractor 2: premisa verdadera que no conduce a la conclusión solicitada
  - Distractor 3: aplica una excepción como si fuera regla general

**Tipo 4 — Probabilidad Condicional** (Aleatorio):
  - Distractor 1: usa el total de la muestra en vez del subgrupo condicionado
  - Distractor 2: invierte numerador y denominador de la fracción
  - Distractor 3: confunde probabilidad conjunta P(A∩B) con P(A|B)

### ETIQUETAS TEMÁTICAS (campo "tags")
Incluye el campo "tags" con 1-3 etiquetas cortas en español que identifiquen el subtema
matemático evaluado. Ejemplos:
- ["Funciones lineales", "Modelado algebraico"]
- ["Proporcionalidad", "Porcentajes", "Interés simple"]
- ["Probabilidad condicional"]
- ["Geometría analítica", "Circunferencia"]
- ["Sucesiones", "Progresión aritmética"]
- ["Estadística", "Medidas de tendencia central"]
- ["Sistemas de ecuaciones"]

### Guía específica:
- Presentar situaciones que requieran MODELAR matemáticamente, no calcular mecánicamente.
- Para Interpretación: el estudiante extrae información de representaciones.
- Para Formulación: el estudiante traduce el problema a lenguaje matemático.
- Para Argumentación: el estudiante justifica o valida procedimientos/resultados.
""",

    "SC": """\
## ÁREA: SOCIALES Y CIUDADANAS
Genera una pregunta para Sociales y Ciudadanas del Saber 11.

Competencia objetivo: {competency_name}
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Componente: {content_component}

### Tipos de contexto válidos:
- social_dilemma: Situaciones de conflicto ciudadano o ético
- continuous_text: Fuentes históricas, artículos constitucionales, documentos
- discontinuous_text: Caricaturas políticas, mapas, estadísticas sociales

### Guía específica:
- Pensamiento social: analizar fenómenos sociales con múltiples perspectivas.
- Interpretación de perspectivas: comprender posiciones diferentes ante un conflicto.
- Pensamiento reflexivo: proponer soluciones informadas a problemas ciudadanos.
- Usar contextos colombianos relevantes: Constitución del 91, proceso de paz,
  problemáticas urbanas, diversidad étnica.
- Distractores: simplificación excesiva, sesgo de confirmación, anacronismo,
  confusión entre hecho y opinión.
""",

    "CN": """\
## ÁREA: CIENCIAS NATURALES
Genera una pregunta para Ciencias Naturales del Saber 11.

Competencia objetivo: {competency_name}
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Componente: {content_component}

### Tipos de contexto válidos:
- scientific_scenario: Experimentos, observaciones, datos de laboratorio
- continuous_text: Artículos de divulgación científica
- discontinuous_text: Diagramas, tablas de datos experimentales, gráficas

### Guía específica:
- Uso comprensivo del conocimiento: aplicar conceptos a situaciones nuevas.
- Explicación de fenómenos: construir explicaciones con modelos científicos.
- Indagación: diseñar o evaluar procedimientos experimentales.
- Componentes: Física (mecánica, termodinámica, ondas), Química (cambio químico,
  estequiometría, soluciones), Biología (genética, ecología, evolución), CTS.
- Distractores: confusión de variables, inversión causa-efecto, aplicación
  incorrecta de ley/principio, error en unidades.
""",

}

# =============================================================================
# Inglés — constantes de mapeo por sección
# =============================================================================

# Sección → componente React que renderiza el contexto (None = texto plano)
ING_COMPONENT_MAP: dict[int, str | None] = {
    1: "NoticeSign",   # Avisos públicos
    2: None,           # Relación de palabras — lista de definiciones
    3: "ChatUI",       # Diálogos cotidianos — burbujas de chat
    4: None,           # Cloze test básico
    5: None,           # Comprensión lectora literal
    6: None,           # Comprensión lectora inferencial
    7: None,           # Cloze test avanzado
}

# Sección → competencia DCE evaluada
ING_SECTION_COMPETENCE: dict[int, str] = {
    1: "pragmatica",
    2: "linguistica",
    3: "pragmatica",
    4: "linguistica",
    5: "comprension_lectora",
    6: "comprension_lectora",
    7: "linguistica",
}

# Sección → descripción pedagógica para el revisor humano
ING_SECTION_DESCRIPTIONS: dict[int, str] = {
    1: "Avisos Públicos — ¿Dónde puedes ver este aviso? (Matching contextual, A1-A2)",
    2: "Relación de Palabras — Asociar definición con palabra correcta (A1-A2)",
    3: "Diálogos Cortos — Completar una interacción social cotidiana (A2)",
    4: "Textos Incompletos — Cloze test: elegir la palabra que completa el texto (A2-B1)",
    5: "Comprensión Lectora Literal — Preguntas Wh- sobre información explícita (B1)",
    6: "Comprensión Lectora Inferencial — Propósito del autor, título ideal, conclusiones (B1-B+)",
    7: "Textos Incompletos Avanzados — Cohesión, coherencia y conectores discursivos (B1-B+)",
}

# =============================================================================
# Directriz L1 obligatoria (se inyecta en todos los sub-prompts de inglés)
# =============================================================================

_L1_DIRECTIVE = """\
### DIRECTRIZ OBLIGATORIA — INTERFERENCIA L1 (Español → Inglés)
Esta es la regla más crítica para generar distractores de calidad ICFES.
Piensa como un hispanohablante aprendiendo inglés. Al menos 2 de los 4 distractores
DEBEN explotar alguno de estos errores sistemáticos de transferencia:

1. **Cognados falsos**: "actually" (en realidad, ≠ actualmente), "carpet" (alfombra, ≠ carpeta),
   "realize" (darse cuenta, ≠ realizar), "library" (biblioteca, ≠ librería),
   "embarrassed" (avergonzado, ≠ embarazada), "assist" (ayudar, ≠ asistir a un evento).
2. **Transferencia sintáctica**: omitir "it" sujeto ("Is raining"), artículo indebido,
   preposición incorrecta ("in Monday" en vez de "on Monday").
3. **Rutinas sociales mal transferidas**: "You are welcome" solo responde "Thank you"
   (nunca "I'm sorry"). "I agree" nunca lleva "am". Confusión disculpa / agradecimiento.
4. **Calco estructural**: "I have 15 years" (correcto: "I am 15"), "She is agree",
   confusión "make / do", confusión "say / tell".
5. **Registro incorrecto**: respuesta formal en contexto informal o viceversa.

Indica en el campo "l1_distractor_note" cuál opción usa interferencia L1 y cómo.
"""

# =============================================================================
# Sub-prompts por sección (1-7) — se agregan al área ING en build_user_prompt
# =============================================================================

ING_SECTION_PROMPTS: dict[int, str] = {

    # ── Sección 1 — Avisos Públicos (Pragmática, A1-A2, NoticeSign) ───────────
    1: """\
## ÁREA: INGLÉS — Sección 1: Avisos Públicos
Genera un ítem para la Sección 1 del examen ICFES de Inglés (nivel A1-A2).

Competencia: {competency_name} (Pragmática)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Contexto — Aviso Público (React Component: NoticeSign)
Crea un aviso público breve en inglés (6-12 palabras) de uno de estos tipos:
danger (rojo), warning (amarillo/naranja), info (azul/verde), prohibition (rojo/negro),
instruction (azul).

El campo "context" DEBE ser un JSON string con esta estructura exacta:
{{"type": "danger|warning|info|prohibition|instruction", "text": "TEXTO DEL AVISO EN INGLÉS", "location_hint": "Tipo de lugar donde se encontraría"}}

El campo "context_type" DEBE ser "react_component".

Ejemplo de context válido:
{{"type": "warning", "text": "Wet Floor — Please Walk Carefully", "location_hint": "restaurant or public building"}}

### Stem (en español para A1-A2)
Formulas posibles: "¿En qué lugar puedes encontrar este aviso?" /
"¿Dónde es más probable ver este letrero?" / "This sign is most likely found in a..."

### Opciones (4 lugares plausibles)
- Una opción CORRECTA que corresponde exactamente al propósito real del aviso.
- Tres DISTRACTORES: lugares que comparten una palabra del aviso o un concepto
  superficialmente relacionado, pero cuyo propósito no justifica ese tipo de aviso.

{l1_directive}

### Campos JSON adicionales requeridos para inglés
Agrega al JSON de respuesta:
"grammar_tags": ["aviso_tipo", "vocabulario_contextual"],
"l1_distractor_note": "Opción X — descripción del error L1 usado"
""",

    # ── Sección 2 — Relación de Palabras (Lingüística, A1-A2) ────────────────
    2: """\
## ÁREA: INGLÉS — Sección 2: Relación de Palabras
Genera un ítem para la Sección 2 del examen ICFES de Inglés (nivel A1-A2).

Competencia: {competency_name} (Lingüística — Léxica)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Formato
El contexto (campo "context") es una definición corta en inglés al estilo diccionario
(1-2 oraciones, sin mencionar la palabra definida).
El stem pregunta qué palabra corresponde a esa definición.
Las 4 opciones son palabras del mismo campo semántico (ej. todas son profesiones, o
todas son adjetivos de carácter).

### Criterio de dificultad
- A1: vocabulario cotidiano básico (colores, familia, objetos de casa, animales)
- A2: vocabulario funcional (profesiones, emociones simples, actividades de tiempo libre)

{l1_directive}

### Ejemplo de estructura
context: "A person who treats sick people and works in a hospital."
stem: "Which word matches this definition?"
options: nurse / engineer / lawyer / teacher
(nurse es la respuesta; las demás son profesiones que NO encajan con la definición)

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["campo_semantico", "vocabulario_nivel"],
"l1_distractor_note": "Opción X — cognado falso o confusión léxica con español"
""",

    # ── Sección 3 — Diálogos (Pragmática/Sociolingüística, A2, ChatUI) ────────
    3: """\
## ÁREA: INGLÉS — Sección 3: Diálogos Cortos
Genera un ítem para la Sección 3 del examen ICFES de Inglés (nivel A2).

Competencia: {competency_name} (Pragmática / Sociolingüística)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Contexto — Diálogo (React Component: ChatUI)
Crea un intercambio cotidiano realista entre dos personas (informal).
Escenario posible: disculpa, agradecimiento, invitación rechazada, felicitación,
queja leve, pedir un favor, reaccionar a una noticia.

El campo "context" DEBE ser un JSON string con esta estructura exacta:
{{"speaker_a_name": "NOMBRE", "speaker_a_message": "MENSAJE DE SPEAKER A EN INGLÉS"}}

El campo "context_type" DEBE ser "react_component".

El stem SIEMPRE es (en inglés): "What is the best response for Speaker B?"

### Opciones (en inglés)
- Una opción CORRECTA: la respuesta pragmáticamente natural en inglés para ese contexto.
- Tres DISTRACTORES que exploten interferencia L1:
  * Una opción gramaticalmente correcta pero pragmáticamente inapropiada para el contexto.
  * Una opción que calca directamente una estructura del español ("You are welcome"
    como respuesta a "I'm sorry", o "I am agree").
  * Una opción de registro incorrecto (muy formal para contexto informal).

{l1_directive}

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["speech_act", "registro", "funcion_comunicativa"],
"l1_distractor_note": "Opción X — error L1 específico (ej: calco de 'de nada' como respuesta a disculpa)"
""",

    # ── Sección 4 — Textos Incompletos Básico (Lingüística, A2-B1, cloze_text) ─
    4: """\
## ÁREA: INGLÉS — Sección 4: Textos Incompletos
Genera un ítem de Cloze Test para la Sección 4 del ICFES de Inglés (nivel A2-B1).

Competencia: {competency_name} (Lingüística — Gramatical y Léxica)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Formato — Cloze Test
El campo "context" es un texto expositivo o informativo corto (60-100 palabras) en inglés
con UN espacio en blanco marcado como [BLANK]. El [BLANK] debe requerir elegir entre
verbos conjugados, preposiciones, conectores simples o vocabulario en contexto.

El campo "context_type" DEBE ser "cloze_text".

El stem (en inglés para nivel B1, en español para A2):
"Choose the word or phrase that best completes the text." /
"¿Cuál palabra completa mejor el texto?"

### Opciones
Las 4 opciones deben ser de la MISMA categoría gramatical (todos verbos, todas
preposiciones, o todo vocabulario del mismo campo semántico) para evitar que la
categoría por sí sola revele la respuesta. La dificultad viene de la diferencia
de uso, conjugación o colocation.

{l1_directive}

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["categoria_gramatical", "estructura_evaluada"],
"l1_distractor_note": "Opción X — error de preposición/tiempo verbal por calco del español"
""",

    # ── Sección 5 — Comprensión Lectora Literal (Comprensión Lectora, B1) ─────
    5: """\
## ÁREA: INGLÉS — Sección 5: Comprensión Lectora Literal
Genera un ítem de comprensión lectora literal para la Sección 5 del ICFES (nivel B1).

Competencia: {competency_name} (Comprensión Lectora)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Contexto — Texto continuo o funcional (mín 150 palabras)
Tipos válidos de texto: artículo periodístico, biografía breve, texto informativo,
correo electrónico formal/informal, aviso de texto largo con instrucciones.
Si el texto es un correo, el campo "context_type" es "react_component" y
"context" es JSON: {{"component": "EmailWrapper", "to": "...", "from": "...",
"subject": "...", "date": "...", "body": "...texto del correo..."}}
Para cualquier otro texto, usar "context_type": "continuous_text".

El texto DEBE contener la respuesta de forma EXPLÍCITA (skimming/scanning).

### Stem (en inglés)
Pregunta tipo Wh- sobre información concreta: What, Who, When, Where, How many.
NO preguntar por inferencias; la respuesta debe estar literalmente en el texto.

### Opciones
- Opción correcta: información que aparece exactamente en el texto.
- Tres distractores: información que SÍ aparece en el texto pero que responde
  una pregunta diferente a la formulada (trampa de skimming apresurado).

{l1_directive}

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["tipo_texto", "habilidad_lectora"],
"l1_distractor_note": "Opción X — información real del texto pero que responde otra pregunta"
""",

    # ── Sección 6 — Comprensión Lectora Inferencial (B1-B+) ──────────────────
    6: """\
## ÁREA: INGLÉS — Sección 6: Comprensión Lectora Inferencial
Genera un ítem de comprensión lectora inferencial para la Sección 6 del ICFES (nivel B1-B+).

Competencia: {competency_name} (Comprensión Lectora)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Contexto — Texto de opinión o narrativo (mín 180 palabras)
Tipos válidos: artículo de opinión, texto argumentativo, ensayo corto, narración
con punto de vista explícito, texto científico de divulgación.
El campo "context_type" DEBE ser "continuous_text".

El texto debe tener un tono o propósito reconocible sin que sea declarado
explícitamente (el estudiante debe inferirlo).

### Stem (en inglés)
Tipos de preguntas inferenciales:
- "What is the main purpose of this text?"
- "What can be inferred about the author's opinion on...?"
- "Which of the following titles best captures the main idea?"
- "What conclusion can be drawn from the last paragraph?"

### Opciones
- Opción correcta: inferencia con base demostrable en el texto (no mera opinión).
- Tres distractores:
  * Una inferencia lógica pero sin evidencia textual específica.
  * Una afirmación verdadera pero que no responde la pregunta.
  * Una afirmación que contradice el texto de forma sutil.

{l1_directive}

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["inference_type", "text_purpose", "nivel_lectura"],
"l1_distractor_note": "Opción X — asunción lógica plausible pero sin soporte textual"
""",

    # ── Sección 7 — Textos Incompletos Avanzados (Lingüística, B1-B+) ─────────
    7: """\
## ÁREA: INGLÉS — Sección 7: Textos Incompletos Avanzados
Genera un ítem de Cloze Test avanzado para la Sección 7 del ICFES (nivel B1-B+).

Competencia: {competency_name} (Lingüística — Gramática avanzada y Conectores)
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Nivel MCER: {mcer_level}

### Formato — Cloze Test con foco en cohesión y coherencia
El campo "context" es un texto académico, científico o argumentativo (80-120 palabras)
en inglés con UN espacio en blanco marcado como [BLANK]. El [BLANK] debe ser
un conector discursivo o una estructura gramatical avanzada cuya elección cambia
radicalmente el significado lógico del párrafo.

El campo "context_type" DEBE ser "cloze_text".

El stem (siempre en inglés): "Choose the word or phrase that best completes the text."

### Opciones — Conectores o estructuras avanzadas
Evaluar el uso de conectores como:
- Contraste: however, nevertheless, in spite of, although, even though, whereas
- Consecuencia: therefore, consequently, as a result, hence, thus
- Adición: furthermore, moreover, in addition, besides
- Concesión: despite, notwithstanding, granted that
- Condición: provided that, as long as, unless

Las 4 opciones deben ser conectores que estructuralmente podrían caber en el espacio
pero que crean un significado lógico incorrecto o incoherente si se elige el equivocado.

{l1_directive}

### Campos JSON adicionales requeridos para inglés
"grammar_tags": ["discourse_connector", "cohesion_type", "text_logic"],
"l1_distractor_note": "Opción X — conector que un hispanohablante usaría por calco del español (ej. 'but' en lugar de 'however' para nivel B1+)"
""",
}


def _build_ing_prompt(
    english_section: int,
    competency_name: str,
    assertion_statement: str,
    evidence_behavior: str,
    mcer_level: str,
) -> str:
    """Construye el prompt específico para una sección de inglés."""
    section_template = ING_SECTION_PROMPTS.get(english_section)
    if not section_template:
        msg = f"Sección de inglés no válida: {english_section}"
        raise ValueError(msg)

    return section_template.format(
        competency_name=competency_name,
        assertion_statement=assertion_statement,
        evidence_behavior=evidence_behavior,
        mcer_level=mcer_level,
        l1_directive=_L1_DIRECTIVE,
    )

# =============================================================================
# Visual prompts por tipo
# =============================================================================

VISUAL_TYPE_GUIDANCE: dict[str, str] = {
    "chart": (
        "Genera datos para una gráfica (barras, líneas, torta, dispersión). "
        "visual_data debe ser compatible con Chart.js."
    ),
    "table": (
        "Genera una tabla HTML de doble entrada con datos numéricos coherentes. "
        "Los totales de filas y columnas DEBEN cuadrar aritméticamente. "
        'visual_data = {"html": "<table><thead>...</thead><tbody>...</tbody></table>"} '
        "Usa etiquetas <th> para encabezados, <td> para datos. Incluye una fila de totales."
    ),
    "diagram": (
        "Genera un diagrama SVG parametrizado. "
        'visual_data = {"template": "...", "params": {...}}'
    ),
    "map": (
        "Genera datos para un mapa de Colombia. "
        'visual_data = {"region": "colombia", "highlights": [...]}'
    ),
    "timeline": (
        "Genera una línea de tiempo. "
        'visual_data = {"events": [{"year": ..., "label": ..., "description": ...}]}'
    ),
    "geometric_figure": (
        "Genera una figura geométrica SVG con dimensiones numéricas explícitas. "
        "Tipos soportados: triangle (base, height, sides), rectangle (width, height), "
        "composite (figura formada por 2 rectángulos o triángulo + rectángulo). "
        'visual_data = {"template": "geometric", "shape": "triangle|rectangle|composite", '
        '"params": {"base": 8, "height": 5, "unit": "cm", "labels": {"A": "...", "B": "..."}}} '
        "Los valores numéricos deben ser consistentes con la pregunta matemática."
    ),
    "probability_diagram": (
        "Genera un árbol de probabilidad con ramas y probabilidades coherentes (suman 1). "
        "Estructura: nodo raíz → eventos de primer nivel → eventos de segundo nivel. "
        'visual_data = {"template": "probability_tree", "params": { '
        '"root": "Experimento", '
        '"branches": [{"label": "A", "prob": 0.6, "children": [{"label": "B", "prob": 0.4}, {"label": "¬B", "prob": 0.6}]}, '
        '{"label": "¬A", "prob": 0.4, "children": [{"label": "B", "prob": 0.3}, {"label": "¬B", "prob": 0.7}]}]}} '
        "VERIFICA que las probabilidades en cada nivel sumen exactamente 1."
    ),
    "state_structure": (
        "Genera un diagrama de estructura del Estado colombiano. "
        'visual_data = {"template": "org_chart", "params": {...}}'
    ),
    "public_sign": (
        "Genera un aviso público HTML estilizado. "
        'visual_data = {"html": "<div>...</div>"}'
    ),
}


VISUAL_TYPE_GUIDANCE["chart"] = (
    "Genera datos para una grafica (bar, line, pie o scatter) compatible con Chart.js. "
    'visual_data = {"type":"bar|line|pie|scatter","labels":[...],'
    '"datasets":[{"label":"...","data":[...]}],'
    '"options":{"scales":{"x":{"title":{"display":true,"text":"Eje X"}},'
    '"y":{"title":{"display":true,"text":"Eje Y"}}},"plugins":{"title":{"display":true,"text":"Titulo"}}}}. '
    "En matematicas, incluye escala explicita, etiquetas de ejes y titulo."
)

VISUAL_TYPE_GUIDANCE["geometric_figure"] = (
    "Genera una figura geometrica parametrica con dimensiones numericas explicitas. "
    "Plantillas soportadas por el frontend: triangle, rectangle_with_dimensions, composite_figure. "
    'Para triangulo: visual_data = {"template":"triangle","params":{"base":8,"height":5,"unit":"cm","side_a":6,"side_b":7,"side_c":8}}. '
    'Para rectangulo: visual_data = {"template":"rectangle_with_dimensions","params":{"width":12,"height":7,"unit":"m"}}. '
    'Para compuesta: visual_data = {"template":"composite_figure","params":{"width":12,"height":8,"cutout_width":4,"cutout_height":3,"unit":"cm"}}. '
    "Los valores numericos deben ser consistentes con la pregunta matematica."
)


_MAT_DISTRACTOR_GUIDANCE: dict[str, str] = {
    "tabular_grafica": (
        "Este ítem evalúa lectura de tablas o gráficas. "
        "Distractor 1: leer el eje incorrecto (X por Y). "
        "Distractor 2: confundir valor absoluto con porcentaje. "
        "Distractor 3: ignorar la escala o unidad del eje."
    ),
    "modelado_algebraico": (
        "Este ítem evalúa modelado algebraico. "
        "Distractor 1: signos invertidos en la ecuación. "
        "Distractor 2: variable mal asignada al modelo. "
        "Distractor 3: resultado de paso intermedio (no la respuesta final)."
    ),
    "justificacion": (
        "Este ítem evalúa argumentación matemática. "
        "Distractor 1: procedimiento correcto por razón equivocada. "
        "Distractor 2: premisa verdadera que no concluye lo solicitado. "
        "Distractor 3: excepción aplicada como regla general."
    ),
    "probabilidad_condicional": (
        "Este ítem evalúa probabilidad condicional. "
        "Distractor 1: usa el total de muestra en vez del subgrupo condicionado. "
        "Distractor 2: numerador y denominador invertidos. "
        "Distractor 3: confunde P(A∩B) con P(A|B)."
    ),
}


def build_mat_distractor_guidance(question_type: str) -> str:
    """Devuelve la guía pedagógica de distractores para un tipo de pregunta MAT.

    Args:
        question_type: One of 'tabular_grafica', 'modelado_algebraico',
                       'justificacion', 'probabilidad_condicional'.

    Returns:
        Guidance string to append to the MAT prompt, or empty string if unknown type.
    """
    return _MAT_DISTRACTOR_GUIDANCE.get(question_type, "")


def build_user_prompt(
    *,
    area_code: str,
    competency_name: str,
    assertion_statement: str,
    evidence_behavior: str,
    content_component: str | None = None,
    english_section: int | None = None,
    mcer_level: str | None = None,
    include_visual: bool = False,
    visual_type: str | None = None,
    structure_type: str = "INDIVIDUAL",
    question_type: str | None = None,
    context_category: str | None = None,
    tags: list[str] | None = None,
    additional_context: str | None = None,
) -> str:
    """Construye el user prompt parametrizado según el área.

    Para ING con english_section definido, usa los sub-prompts especializados
    por sección con la directriz de interferencia L1.
    Para las demás áreas usa AREA_PROMPTS.
    """
    if area_code == "ING" and english_section:
        return _build_ing_prompt(
            english_section=english_section,
            competency_name=competency_name,
            assertion_statement=assertion_statement,
            evidence_behavior=evidence_behavior,
            mcer_level=mcer_level or "A2",
        )

    template = AREA_PROMPTS.get(area_code)
    if not template:
        msg = f"Área no soportada: {area_code}"
        raise ValueError(msg)

    prompt = template.format(
        competency_name=competency_name,
        assertion_statement=assertion_statement,
        evidence_behavior=evidence_behavior,
        content_component=content_component or "No especificado",
        english_section=english_section or "N/A",
        mcer_level=mcer_level or "N/A",
    )

    if include_visual and visual_type:
        prompt += VISUAL_SUFFIX
        guidance = VISUAL_TYPE_GUIDANCE.get(visual_type, "")
        if guidance:
            prompt += f"\nTipo visual solicitado: {visual_type}\n{guidance}\n"

    if area_code == "MAT":
        if question_type:
            guidance = build_mat_distractor_guidance(question_type)
            prompt += f"\n### Tipo de pregunta MAT solicitado\nUsa question_type='{question_type}'.\n"
            if guidance:
                prompt += f"{guidance}\n"
        if context_category:
            prompt += (
                "\n### Categoria de contexto solicitada\n"
                f"Devuelve exactamente \"context_category\": \"{context_category}\".\n"
            )
        if tags:
            clean_tags = [tag.strip() for tag in tags if tag.strip()]
            if clean_tags:
                prompt += (
                    "\n### Etiquetas tematicas solicitadas\n"
                    f"Incluye estas tags en el campo \"tags\": {clean_tags}.\n"
                )
        if additional_context:
            prompt += (
                "\n### Contexto adicional del revisor\n"
                f"{additional_context.strip()}\n"
            )
    elif additional_context:
        prompt += (
            "\n### Contexto adicional del revisor\n"
            f"{additional_context.strip()}\n"
        )

    if structure_type == "QUESTION_BLOCK":
        prompt += BLOCK_SUFFIX

    return prompt
