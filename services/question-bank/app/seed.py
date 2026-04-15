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
                ],
            },
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
                ],
            },
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
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {"code": "MAT-CC1", "name": "Álgebra y cálculo"},
            {"code": "MAT-CC2", "name": "Geometría"},
            {"code": "MAT-CC3", "name": "Estadística"},
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
    # =========================================================================
    {
        "code": "ING",
        "name": "Inglés",
        "total_questions": 55,
        "description": (
            "Evalúa la competencia comunicativa en inglés según niveles "
            "del Marco Común Europeo de Referencia (A-, A1, A2, B1, B+)."
        ),
        "competencies": [
            {
                "code": "ING-C1",
                "name": "Comprensión de textos escritos",
                "description": (
                    "Capacidad de comprender textos escritos en inglés "
                    "de distinta complejidad."
                ),
                "weight_percentage": 50,
                "cognitive_level": 1,
                "assertions": [
                    {
                        "code": "ING-C1-A1",
                        "statement": (
                            "El estudiante comprende información explícita "
                            "e implícita en textos escritos en inglés."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C1-A1-E1",
                                "observable_behavior": (
                                    "Identifica información específica en "
                                    "avisos, correos, instrucciones (A1-A2)."
                                ),
                            },
                            {
                                "code": "ING-C1-A1-E2",
                                "observable_behavior": (
                                    "Comprende ideas principales y secundarias "
                                    "en artículos y ensayos (B1-B+)."
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                "code": "ING-C2",
                "name": "Uso del lenguaje (gramática y vocabulario)",
                "description": (
                    "Conocimiento y uso de estructuras gramaticales "
                    "y vocabulario en contexto."
                ),
                "weight_percentage": 50,
                "cognitive_level": 2,
                "assertions": [
                    {
                        "code": "ING-C2-A1",
                        "statement": (
                            "El estudiante usa vocabulario y estructuras "
                            "gramaticales apropiadas según el nivel."
                        ),
                        "evidences": [
                            {
                                "code": "ING-C2-A1-E1",
                                "observable_behavior": (
                                    "Selecciona la forma gramatical correcta "
                                    "para completar oraciones y textos."
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
        "content_components": [
            {"code": "ING-CC1", "name": "Secciones 1-3 (nivel A- a A1)"},
            {"code": "ING-CC2", "name": "Secciones 4-5 (nivel A2)"},
            {"code": "ING-CC3", "name": "Secciones 6-7 (nivel B1 a B+)"},
        ],
    },
]
