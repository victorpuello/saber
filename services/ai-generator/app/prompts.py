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
  "difficulty_estimated": 0.5
}

NO incluyas texto fuera del JSON. NO uses markdown. Solo JSON puro.
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
- math_problem: Problemas en contexto cotidiano o profesional
- scientific_scenario: Datos experimentales que requieran análisis cuantitativo
- discontinuous_text: Tablas, gráficas estadísticas

### Guía específica:
- Presentar situaciones que requieran MODELAR matemáticamente, no calcular mecánicamente.
- Para Interpretación: el estudiante extrae información de representaciones.
- Para Formulación: el estudiante traduce el problema a lenguaje matemático.
- Para Argumentación: el estudiante justifica o valida procedimientos/resultados.
- Distractores: errores de signo, confusión de fórmula, error en la lectura de gráfica,
  aplicación incorrecta de propiedad.
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

    "ING": """\
## ÁREA: INGLÉS
Genera una pregunta para Inglés del Saber 11.

Competencia objetivo: {competency_name}
Afirmación: {assertion_statement}
Evidencia: {evidence_behavior}
Sección: {english_section}
Nivel MCER esperado: {mcer_level}

### Tipos de contexto válidos:
- continuous_text: Artículos, emails, cartas, historias cortas (en inglés)
- dialogue: Conversaciones cotidianas (en inglés)
- discontinuous_text: Avisos, menús, horarios, instrucciones (en inglés)
- cloze_text: Texto con espacios para completar (secciones 4-5)

### Guía específica:
- Secciones 1-3 (A-/A1): vocabulario básico, información explícita, anuncios simples.
- Secciones 4-5 (A2): completar textos, gramática en contexto, coherencia.
- Secciones 6-7 (B1/B+): inferencia, propósito del autor, lectura crítica en inglés.
- TODO el contexto y las opciones DEBEN estar en INGLÉS.
- El enunciado (stem) puede estar en español para secciones 1-3, en inglés para 4-7.
- Distractores: falsos amigos, colocaciones incorrectas, error de tiempo verbal,
  confusión de preposición.
""",
}

# =============================================================================
# Visual prompts por tipo
# =============================================================================

VISUAL_TYPE_GUIDANCE: dict[str, str] = {
    "chart": (
        "Genera datos para una gráfica (barras, líneas, torta, dispersión). "
        "visual_data debe ser compatible con Chart.js."
    ),
    "table": (
        "Genera una tabla HTML con datos. "
        'visual_data = {"html": "<table>...</table>"}'
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
        "Genera una figura geométrica SVG. "
        'visual_data = {"template": "geometric", "params": {...}}'
    ),
    "probability_diagram": (
        "Genera un diagrama de probabilidad (árbol). "
        'visual_data = {"template": "probability_tree", "params": {...}}'
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
) -> str:
    """Construye el user prompt parametrizado según el área."""
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

    return prompt
