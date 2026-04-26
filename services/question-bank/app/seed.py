"""Datos semilla de la taxonomía DCE del Saber 11.

Fuente: Marcos de referencia ICFES — Saber 11 (2024).
Áreas: Lectura Crítica, Matemáticas, Sociales y Ciudadanas,
       Ciencias Naturales, Inglés.
"""

TAXONOMY_SEED: list[dict] = [
    # =========================================================================
    # LECTURA CRÍTICA (LC) — 41 preguntas
    # =========================================================================
    {
        "code": "LC",
        "name": "Lectura Crítica",
        "total_questions": 41,
        "description": "Evalúa la capacidad de comprender, interpretar y evaluar textos.",
        "competencies": [
            {
                "code": "LC-C1",
                "name": "Identificar y entender los contenidos locales",
                "description": (
                    "Comprensión del significado de palabras, expresiones y "
                    "afirmaciones que aparecen explícitamente en el texto."
                ),
                "weight_percentage": 30,
                "cognitive_level": 1,
                "assertions": [
                    {
                        "code": "LC-C1-A1",
                        "statement": (
                            "El estudiante identifica los eventos, ideas, "
                            "afirmaciones y demás elementos locales presentes "
                            "en el texto."
                        ),
                        "evidences": [
                            {
                                "code": "LC-C1-A1-E1",
                                "observable_behavior": (
                                    "Reconoce información explícita "
                                    "del texto (datos, hechos, eventos)."
                                ),
                            },
                            {
                                "code": "LC-C1-A1-E2",
                                "observable_behavior": (
                                    "Identifica el significado de palabras "
                                    "o expresiones según el contexto."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "LC-C2",
                "name": "Comprender cómo se articulan las partes de un texto",
                "description": (
                    "Comprensión de la estructura y organización del texto, "
                    "relaciones entre párrafos y entre ideas."
                ),
                "weight_percentage": 35,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "LC-C2-A1",
                        "statement": (
                            "El estudiante comprende la estructura formal "
                            "de un texto y la función de sus partes."
                        ),
                        "evidences": [
                            {
                                "code": "LC-C2-A1-E1",
                                "observable_behavior": (
                                    "Identifica la tesis, argumentos y "
                                    "conclusiones de un texto argumentativo."
                                ),
                            },
                            {
                                "code": "LC-C2-A1-E2",
                                "observable_behavior": (
                                    "Identifica relaciones de causa-efecto, "
                                    "comparación o secuencia entre ideas."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "LC-C3",
                "name": "Reflexionar y evaluar un texto",
                "description": (
                    "Evaluación crítica del contenido, estrategias discursivas "
                    "y la relación del texto con otros textos o contextos."
                ),
                "weight_percentage": 35,
                "cognitive_level": 3,
                "assertions": [
                    {
                        "code": "LC-C3-A1",
                        "statement": (
                            "El estudiante evalúa la validez de argumentos, "
                            "identifica supuestos y establece relaciones "
                            "intertextuales."
                        ),
                        "evidences": [
                            {
                                "code": "LC-C3-A1-E1",
                                "observable_behavior": (
                                    "Evalúa la solidez y pertinencia de "
                                    "argumentos presentados en el texto."
                                ),
                            },
                            {
                                "code": "LC-C3-A1-E2",
                                "observable_behavior": (
                                    "Identifica supuestos, intenciones y "
                                    "sesgos del autor."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {"code": "LC-CC1", "name": "Textos continuos"},
            {"code": "LC-CC2", "name": "Textos discontinuos"},
            {"code": "LC-CC3", "name": "Textos literarios"},
            {"code": "LC-CC4", "name": "Textos filosóficos"},
        ],
    },
    # =========================================================================
    # MATEMÁTICAS (MAT) — 50 preguntas
    # =========================================================================
    {
        "code": "MAT",
        "name": "Matemáticas",
        "total_questions": 50,
        "description": (
            "Evalúa la capacidad de interpretar, formular y resolver "
            "problemas utilizando conceptos matemáticos."
        ),
        "competencies": [
            # ── C1: Interpretación y Representación ───────────────────────────
            {
                "code": "MAT-C1",
                "name": "Interpretación y representación",
                "description": (
                    "Capacidad de comprender y transformar información "
                    "presentada en distintos formatos matemáticos."
                ),
                "weight_percentage": 33,
                "cognitive_level": 1,
                "assertions": [
                    {
                        "code": "MAT-C1-A1",
                        "statement": (
                            "El estudiante interpreta y transforma "
                            "información cuantitativa y esquemática."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C1-A1-E1",
                                "observable_behavior": (
                                    "Interpreta datos presentados en tablas, "
                                    "gráficas o diagramas."
                                ),
                            },
                            {
                                "code": "MAT-C1-A1-E2",
                                "observable_behavior": (
                                    "Transforma representaciones matemáticas "
                                    "(algebraica ↔ gráfica ↔ tabular)."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C1-A2",
                        "statement": (
                            "El estudiante extrae la información relevante de "
                            "situaciones cuantitativas para resolver problemas."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C1-A2-E1",
                                "observable_behavior": (
                                    "Selecciona e interpreta los datos necesarios "
                                    "de enunciados numéricos o estadísticos."
                                ),
                            },
                            {
                                "code": "MAT-C1-A2-E2",
                                "observable_behavior": (
                                    "Reconoce la magnitud y unidad apropiada "
                                    "en una situación de medición."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C1-A3",
                        "statement": (
                            "El estudiante compara y ordena representaciones "
                            "matemáticas según sus propiedades."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C1-A3-E1",
                                "observable_behavior": (
                                    "Ordena magnitudes, fracciones o números "
                                    "expresados en distintas notaciones."
                                ),
                            },
                            {
                                "code": "MAT-C1-A3-E2",
                                "observable_behavior": (
                                    "Identifica equivalencias entre representaciones "
                                    "(decimal, fraccionaria, porcentual)."
                                ),
                            },
                        ],
                    },
                ],
            },
            # ── C2: Formulación y Ejecución ───────────────────────────────────
            {
                "code": "MAT-C2",
                "name": "Formulación y ejecución",
                "description": (
                    "Capacidad de diseñar estrategias y ejecutar procedimientos "
                    "para resolver problemas matemáticos."
                ),
                "weight_percentage": 34,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "MAT-C2-A1",
                        "statement": (
                            "El estudiante formula y ejecuta procedimientos "
                            "para resolver problemas."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C2-A1-E1",
                                "observable_behavior": (
                                    "Diseña planes o estrategias para abordar "
                                    "un problema matemático."
                                ),
                            },
                            {
                                "code": "MAT-C2-A1-E2",
                                "observable_behavior": (
                                    "Ejecuta procedimientos algebraicos, "
                                    "aritméticos o geométricos correctamente."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C2-A2",
                        "statement": (
                            "El estudiante modela situaciones del mundo real "
                            "con expresiones algebraicas o geométricas."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C2-A2-E1",
                                "observable_behavior": (
                                    "Traduce un problema verbal a una ecuación, "
                                    "inecuación o función matemática."
                                ),
                            },
                            {
                                "code": "MAT-C2-A2-E2",
                                "observable_behavior": (
                                    "Calcula medidas geométricas (perímetro, área, "
                                    "volumen) aplicando las fórmulas correspondientes."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C2-A3",
                        "statement": (
                            "El estudiante aplica conceptos probabilísticos y "
                            "estadísticos para resolver problemas."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C2-A3-E1",
                                "observable_behavior": (
                                    "Calcula probabilidades simples o condicionales "
                                    "con base en la información dada."
                                ),
                            },
                            {
                                "code": "MAT-C2-A3-E2",
                                "observable_behavior": (
                                    "Interpreta medidas de tendencia central "
                                    "(media, mediana, moda) en contexto."
                                ),
                            },
                        ],
                    },
                ],
            },
            # ── C3: Argumentación ─────────────────────────────────────────────
            {
                "code": "MAT-C3",
                "name": "Argumentación",
                "description": (
                    "Capacidad de justificar, validar o refutar afirmaciones "
                    "y procedimientos matemáticos."
                ),
                "weight_percentage": 33,
                "cognitive_level": 3,
                "assertions": [
                    {
                        "code": "MAT-C3-A1",
                        "statement": (
                            "El estudiante justifica o refuta resultados, "
                            "estrategias o afirmaciones matemáticas."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C3-A1-E1",
                                "observable_behavior": (
                                    "Identifica la validez o invalidez de "
                                    "un razonamiento matemático."
                                ),
                            },
                            {
                                "code": "MAT-C3-A1-E2",
                                "observable_behavior": (
                                    "Selecciona la justificación correcta para "
                                    "un procedimiento o resultado matemático."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C3-A2",
                        "statement": (
                            "El estudiante evalúa la pertinencia de un "
                            "procedimiento matemático para una situación dada."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C3-A2-E1",
                                "observable_behavior": (
                                    "Determina si un procedimiento es correcto, "
                                    "incompleto o incorrecto para resolver un problema."
                                ),
                            },
                            {
                                "code": "MAT-C3-A2-E2",
                                "observable_behavior": (
                                    "Identifica el error en un razonamiento matemático "
                                    "incorrecto y explica por qué es incorrecto."
                                ),
                            },
                        ],
                    },
                    {
                        "code": "MAT-C3-A3",
                        "statement": (
                            "El estudiante generaliza patrones y propiedades "
                            "a partir de casos particulares."
                        ),
                        "evidences": [
                            {
                                "code": "MAT-C3-A3-E1",
                                "observable_behavior": (
                                    "Reconoce regularidades en sucesiones "
                                    "numéricas o geométricas."
                                ),
                            },
                            {
                                "code": "MAT-C3-A3-E2",
                                "observable_behavior": (
                                    "Aplica una propiedad matemática para explicar "
                                    "por qué un resultado se cumple en general."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {
                "code": "MAT-NUM",
                "name": "Numérico-Variacional (funciones, proporcionalidad, interés, sucesiones)",
            },
            {
                "code": "MAT-GEO",
                "name": "Geométrico-Métrico (áreas, volúmenes, Pitágoras, trigonometría básica)",
            },
            {
                "code": "MAT-ALT",
                "name": "Aleatorio (estadística, probabilidad, conteo)",
            },
        ],
    },
    # =========================================================================
    # SOCIALES Y CIUDADANAS (SC) — 50 preguntas
    # =========================================================================
    {
        "code": "SC",
        "name": "Sociales y Ciudadanas",
        "total_questions": 50,
        "description": (
            "Evalúa la capacidad de analizar problemáticas sociales, "
            "comprender fenómenos políticos y ejercer ciudadanía crítica."
        ),
        "competencies": [
            {
                "code": "SC-C1",
                "name": "Pensamiento social",
                "description": (
                    "Capacidad de usar conceptos de las ciencias sociales "
                    "para analizar fenómenos sociales y políticos."
                ),
                "weight_percentage": 35,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "SC-C1-A1",
                        "statement": (
                            "El estudiante utiliza conceptos de las ciencias "
                            "sociales para analizar situaciones."
                        ),
                        "evidences": [
                            {
                                "code": "SC-C1-A1-E1",
                                "observable_behavior": (
                                    "Reconoce dimensiones políticas, económicas "
                                    "y culturales de una situación social."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "SC-C2",
                "name": "Interpretación y análisis de perspectivas",
                "description": (
                    "Capacidad de reconocer y analizar diferentes perspectivas "
                    "y posiciones frente a un fenómeno social."
                ),
                "weight_percentage": 35,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "SC-C2-A1",
                        "statement": (
                            "El estudiante reconoce y compara diferentes "
                            "perspectivas sobre un tema social."
                        ),
                        "evidences": [
                            {
                                "code": "SC-C2-A1-E1",
                                "observable_behavior": (
                                    "Identifica sesgos, intereses y contextos "
                                    "que fundamentan cada perspectiva."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "SC-C3",
                "name": "Pensamiento reflexivo y sistémico",
                "description": (
                    "Capacidad de evaluar alternativas de acción y sus "
                    "consecuencias en distintos contextos sociales."
                ),
                "weight_percentage": 30,
                "cognitive_level": 3,
                "assertions": [
                    {
                        "code": "SC-C3-A1",
                        "statement": (
                            "El estudiante evalúa alternativas y sus "
                            "posibles consecuencias en un contexto dado."
                        ),
                        "evidences": [
                            {
                                "code": "SC-C3-A1-E1",
                                "observable_behavior": (
                                    "Evalúa consecuencias a corto y largo "
                                    "plazo de decisiones políticas o sociales."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {"code": "SC-CC1", "name": "Fuentes y comprensión histórica"},
            {"code": "SC-CC2", "name": "Estado, democracia y participación"},
            {"code": "SC-CC3", "name": "Economía y sociedad"},
        ],
    },
    # =========================================================================
    # CIENCIAS NATURALES (CN) — 58 preguntas
    # =========================================================================
    {
        "code": "CN",
        "name": "Ciencias Naturales",
        "total_questions": 58,
        "description": (
            "Evalúa la capacidad de comprender y utilizar conceptos "
            "científicos para explicar fenómenos naturales."
        ),
        "competencies": [
            {
                "code": "CN-C1",
                "name": "Uso comprensivo del conocimiento científico",
                "description": (
                    "Capacidad de usar modelos y conceptos de las ciencias "
                    "naturales para comprender fenómenos."
                ),
                "weight_percentage": 35,
                "cognitive_level": 1,
                "assertions": [
                    {
                        "code": "CN-C1-A1",
                        "statement": (
                            "El estudiante asocia fenómenos naturales con "
                            "conceptos y modelos científicos."
                        ),
                        "evidences": [
                            {
                                "code": "CN-C1-A1-E1",
                                "observable_behavior": (
                                    "Identifica el modelo o concepto "
                                    "científico apropiado para un fenómeno."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "CN-C2",
                "name": "Explicación de fenómenos",
                "description": (
                    "Capacidad de construir explicaciones y comprender "
                    "argumentos científicos."
                ),
                "weight_percentage": 35,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "CN-C2-A1",
                        "statement": (
                            "El estudiante construye explicaciones basadas "
                            "en conceptos científicos verificables."
                        ),
                        "evidences": [
                            {
                                "code": "CN-C2-A1-E1",
                                "observable_behavior": (
                                    "Explica fenómenos naturales usando "
                                    "leyes, principios o modelos científicos."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "CN-C3",
                "name": "Indagación",
                "description": (
                    "Capacidad de formular preguntas, diseñar experimentos "
                    "y analizar resultados."
                ),
                "weight_percentage": 30,
                "cognitive_level": 3,
                "assertions": [
                    {
                        "code": "CN-C3-A1",
                        "statement": (
                            "El estudiante diseña procedimientos de "
                            "indagación y analiza datos experimentales."
                        ),
                        "evidences": [
                            {
                                "code": "CN-C3-A1-E1",
                                "observable_behavior": (
                                    "Identifica variables, diseña experimentos "
                                    "controlados y analiza resultados."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {"code": "CN-CC1", "name": "Física"},
            {"code": "CN-CC2", "name": "Química"},
            {"code": "CN-CC3", "name": "Biología"},
            {"code": "CN-CC4", "name": "Ciencia, tecnología y sociedad (CTS)"},
        ],
    },
    # =========================================================================
    # INGLÉS (ING) — 55 preguntas
    # Competencias alineadas al Marco Común Europeo (MCER) y estructura
    # de las 7 partes del examen ICFES Saber 11.
    # =========================================================================
    {
        "code": "ING",
        "name": "Inglés",
        "total_questions": 55,
        "description": (
            "Evalúa la competencia comunicativa en inglés según niveles "
            "del Marco Común Europeo de Referencia (A-, A1, A2, B1, B+). "
            "Organizado en 7 partes que evalúan competencias pragmática, "
            "lingüística, sociolingüística y comprensión lectora."
        ),
        "competencies": [
            # ------------------------------------------------------------------
            # C1 — Competencia Pragmática (Partes 1 y 3)
            # Entiende la intención del hablante y el propósito del mensaje
            # en su contexto material (avisos, diálogos cotidianos).
            # ------------------------------------------------------------------
            {
                "code": "ING-C1",
                "name": "Competencia Pragmática",
                "description": (
                    "Capacidad de entender la intención comunicativa y el "
                    "propósito de un mensaje según su contexto situacional. "
                    "Evalúa avisos públicos (Parte 1) e interacciones "
                    "sociales cotidianas (Parte 3)."
                ),
                "weight_percentage": 25,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "ING-C1-A1",
                        "statement": (
                            "El estudiante identifica el propósito comunicativo "
                            "y la situación contextual de textos breves y "
                            "señales del entorno cotidiano."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C1-A1-E1",
                                "observable_behavior": (
                                    "Reconoce el lugar o situación donde puede "
                                    "encontrarse un aviso, señal o instrucción "
                                    "pública en inglés (Sección 1 — A1/A2)."
                                ),
                            },
                            {
                                "code": "ING-C1-A1-E2",
                                "observable_behavior": (
                                    "Identifica la respuesta pragmáticamente "
                                    "adecuada en una interacción social "
                                    "cotidiana (Sección 3 — A2)."
                                ),
                            },
                        ],
                    },
                ],
            },
            # ------------------------------------------------------------------
            # C2 — Competencia Lingüística (Partes 2, 4 y 7)
            # Uso adecuado de vocabulario y gramática en contexto textual.
            # ------------------------------------------------------------------
            {
                "code": "ING-C2",
                "name": "Competencia Lingüística",
                "description": (
                    "Conocimiento y uso adecuado de vocabulario (competencia "
                    "léxica) y estructuras gramaticales (competencia sintáctica) "
                    "anclados siempre a un texto. Evalúa relación de palabras "
                    "(Parte 2) y textos incompletos — cloze test (Partes 4 y 7)."
                ),
                "weight_percentage": 35,
                "cognitive_level": 1,
                "assertions": [
                    {
                        "code": "ING-C2-A1",
                        "statement": (
                            "El estudiante usa vocabulario y estructuras "
                            "gramaticales apropiadas al contexto y al "
                            "nivel MCER requerido."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C2-A1-E1",
                                "observable_behavior": (
                                    "Asocia palabras con sus definiciones "
                                    "dentro de un campo semántico dado "
                                    "(Sección 2 — A1/A2)."
                                ),
                            },
                            {
                                "code": "ING-C2-A1-E2",
                                "observable_behavior": (
                                    "Selecciona la forma léxica o gramatical "
                                    "correcta para completar un texto con "
                                    "coherencia y cohesión (Secciones 4 y 7 "
                                    "— A2/B1/B+)."
                                ),
                            },
                        ],
                    },
                ],
            },
            # ------------------------------------------------------------------
            # C3 — Competencia Sociolingüística (Parte 3)
            # Comprensión de normas de cortesía, registro y convenciones
            # culturales anglófonas.
            # ------------------------------------------------------------------
            {
                "code": "ING-C3",
                "name": "Competencia Sociolingüística",
                "description": (
                    "Comprensión de las normas de cortesía, diferencias de "
                    "registro (formal vs. informal), modismos y convenciones "
                    "culturales de los países anglófonos. Se evalúa en "
                    "diálogos cotidianos (Parte 3 — A2)."
                ),
                "weight_percentage": 15,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "ING-C3-A1",
                        "statement": (
                            "El estudiante comprende las normas sociales y de "
                            "registro lingüístico en interacciones en inglés, "
                            "distinguiendo contextos formales e informales."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C3-A1-E1",
                                "observable_behavior": (
                                    "Distingue el registro formal e informal "
                                    "apropiado según la relación entre los "
                                    "interlocutores (Sección 3 — A2)."
                                ),
                            },
                            {
                                "code": "ING-C3-A1-E2",
                                "observable_behavior": (
                                    "Reconoce expresiones convencionales de "
                                    "cortesía, disculpa, agradecimiento y "
                                    "acuerdo propias del inglés (Sección 3 — A2)."
                                ),
                            },
                        ],
                    },
                ],
            },
            # ------------------------------------------------------------------
            # C4 — Comprensión Lectora (Partes 5 y 6)
            # Extracción de información literal e inferencial en textos
            # continuos de complejidad B1 a B1+.
            # ------------------------------------------------------------------
            {
                "code": "ING-C4",
                "name": "Comprensión Lectora",
                "description": (
                    "Capacidad para extraer información de textos escritos "
                    "en inglés desde un nivel literal (skimming/scanning) "
                    "hasta un nivel profundo (inferir tono, propósito del "
                    "autor, conclusiones). Evalúa comprensión literal "
                    "(Parte 5) e inferencial (Parte 6)."
                ),
                "weight_percentage": 25,
                "cognitive_level": 3,
                "assertions": [
                    {
                        "code": "ING-C4-A1",
                        "statement": (
                            "El estudiante comprende textos escritos en inglés "
                            "de complejidad A2 a B1+, extrayendo información "
                            "explícita e implícita según el nivel requerido."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C4-A1-E1",
                                "observable_behavior": (
                                    "Identifica información específica y "
                                    "explícita en artículos, biografías y "
                                    "textos informativos (Sección 5 — B1)."
                                ),
                            },
                            {
                                "code": "ING-C4-A1-E2",
                                "observable_behavior": (
                                    "Infiere la intención del autor, el tono "
                                    "del texto y conclusiones no expresadas "
                                    "literalmente (Sección 6 — B1/B+)."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {
                "code": "ING-CC1",
                "name": "Secciones 1-3: Avisos, Relación de Palabras y Diálogos (A- a A2)",
            },
            {
                "code": "ING-CC2",
                "name": "Secciones 4-5: Textos Incompletos y Comprensión Lectora Literal (A2 a B1)",
            },
            {
                "code": "ING-CC3",
                "name": "Secciones 6-7: Comprensión Inferencial y Textos Avanzados (B1 a B1+)",
            },
        ],
    },
]
