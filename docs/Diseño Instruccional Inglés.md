# **🎯 Arquitectura y Diseño Instruccional: Componente de Inglés (Saber 11\)**

Este documento define de manera exhaustiva la estructura, tipología, fundamentos pedagógicos y modelado de datos para las preguntas de Inglés en el Simulador Saber 11\. Está diseñado para garantizar no solo la validez psicométrica del instrumento frente a los estándares del ICFES, sino también su correcta y eficiente integración con una arquitectura de software basada en microservicios, interfaces de usuario dinámicas (React) y generación automatizada mediante Inteligencia Artificial.

## **🧠 1\. Análisis Profundo del Área de Inglés en Saber 11**

El examen Saber 11 en su componente de Inglés rompe con el paradigma de las pruebas de gramática tradicional. Se fundamenta íntegramente en la **competencia comunicativa** —es decir, el saber usar el idioma en contextos reales y con propósitos específicos— alineada al Marco Común Europeo de Referencia para las Lenguas (MCER). La prueba oficial clasifica a los estudiantes en bandas que van desde **Pre-A1 (nivel incipiente)** hasta **B1+ (usuario independiente)**.

### **Competencias Evaluadas al Detalle**

1. **Competencia Pragmática:** Es la capacidad de entender la intención del hablante o el propósito de un mensaje en su contexto material. No basta con traducir las palabras; el estudiante debe saber *qué se busca lograr* con ellas (ej. advertir, sugerir, disculparse). Se evalúa fuertemente a través de avisos públicos, señales de tránsito y diálogos cotidianos.  
2. **Competencia Lingüística:** Comprende el uso adecuado del vocabulario (competencia léxica) y las estructuras gramaticales (competencia sintáctica) pero *siempre* ancladas a un texto. El examen penaliza el conocimiento aislado de reglas gramaticales si el estudiante no sabe aplicarlas para dar sentido a un párrafo.  
3. **Competencia Sociolingüística:** Implica la comprensión de las normas de cortesía, las diferencias de registro (formal vs. informal), modismos y convenciones culturales propias de los países angloparlantes. Un estudiante debe saber que no se le habla igual a un profesor que a un amigo cercano.  
4. **Comprensión Lectora (Reading Comprehension):** La columna vertebral de los niveles superiores (A2 a B1+). Es la capacidad para extraer información desde un nivel de lectura superficial (*skimming* y *scanning* para datos literales) hasta un nivel profundo (inferir el tono del autor, concluir ideas no explícitas) en textos continuos (artículos periodísticos, narraciones) y discontinuos (correos electrónicos, infografías, folletos).

### **Diferencias Estructurales con Otras Áreas (Matemáticas, Ciencias)**

* **Ausencia de "Fórmulas" o Hechos:** A diferencia de Física o Matemáticas, donde se aplica una ecuación, o Sociales, donde se requiere un bagaje histórico, en Inglés no se evalúa el conocimiento teórico de la regla. El estudiante no necesita saber qué es el "Presente Perfecto", sino saber que "I have lived here for 10 years" implica que aún vive allí.  
* **Progresión Estricta de Dificultad:** La prueba real de 45 preguntas se divide estrictamente en 7 partes que actúan como una escalera cognitiva. Empieza evaluando vocabulario aislado (A1) y culmina con textos filosóficos o científicos complejos (B1+).  
* **El Contexto Dicta la Verdad:** En inglés, una palabra o frase puede ser morfológica y sintácticamente perfecta, pero absolutamente incorrecta pragmáticamente según el escenario. Esto exige que **todos los ítems del simulador posean un contexto innegociable**.

## **🔍 2\. Tipología de Preguntas (Disección de las 7 Partes del ICFES)**

Para que el simulador tenga validez ecológica (que se sienta como el examen real), debe replicar de manera idéntica los 5 grandes formatos metodológicos que dan vida a las 7 partes del examen oficial. A continuación, se detalla la anatomía de cada una:

| Tipo / Parte ICFES | Estructura / Formato | Contexto Requerido | Dificultad (MCER) | Competencia Evaluada | Estrategia de Distractores |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **1\. Avisos (Pragmática)** | ¿Dónde puedes ver este aviso? (Matching contextual) | Visual (Imagen o componente HTML de un aviso real) | A1 \- A2 | Pragmática / Sociolingüística | Opciones de lugares que comparten una palabra suelta del aviso, pero cuyo propósito global es ajeno. |
| **2\. Relación de Palabras** | Unir 5 descripciones con una lista de 8 palabras (A-H). | Definiciones cortas de diccionario (Texto) | A1 \- A2 | Lingüística (Léxica semántica) | Palabras del mismo campo semántico (ej. todas son frutas), obligando a leer la distinción exacta de la descripción. |
| **3\. Diálogos Cortos** | Completar una interacción social recíproca de 1 o 2 líneas. | Interfaz visual de chat o globo de diálogo | A2 | Pragmática / Sociolingüística | Respuestas gramaticalmente correctas pero socialmente inadecuadas o traducciones literales del español. |
| **4\. Textos Incompletos (Gramática)** | *Cloze Test*: Seleccionar la palabra correcta para llenar un espacio. | Textos expositivos o informativos cortos | A2 \- B1 | Lingüística (Gramatical y Léxica) | Palabras de la misma categoría gramatical (todos verbos, todas preposiciones) pero con diferente conjugación o uso idiomático. |
| **5\. Comprensión Lectora (Literal)** | Preguntas tipo "Wh-" (What, Where, When) sobre el texto. | Artículos, biografías, notas históricas | B1 | Comprensión Lectora Literal | Información que sí está presente en el texto, pero que responde a una pregunta diferente a la formulada. |
| **6\. Comprensión Lectora (Inferencial)** | Preguntas sobre la intención del autor, el título ideal o conclusiones. | Artículos de opinión, textos narrativos o ensayísticos | B1 \- B1+ | Comprensión Lectora Inferencial | Asunciones lógicas o basadas en sentido común que NO tienen base demostrable en el texto provisto. |
| **7\. Textos Incompletos (Avanzado)** | Igual a la Parte 4, pero evaluando cohesión y coherencia a nivel de párrafo. | Textos académicos o científicos | B1 \- B1+ | Lingüística (Gramática avanzada y Conectores) | Conectores lógicos opuestos (ej. usar *However* en lugar de *Therefore* rompiendo la lógica discursiva). |

## **🏗️ 3\. Modelo Estructural de Pregunta (Diseño Centrado en Evidencias \- DCE)**

Toda pregunta ingresada al sistema (ya sea elaborada manualmente por docentes o generada por el pipeline de IA) debe ajustarse a esta anatomía rígida. Esto asegura la homogeneidad del banco de ítems y facilita la calibración estadística.

1. **Contexto (Stimulus o Prompt Base):** El escenario material que enmarca el problema. Debe ser verosímil y auténtico. Puede ser un artículo sobre el cambio climático, el letrero de "Wet Floor" de un restaurante, o un chat entre dos amigos cancelando una cita.  
2. **Instrucción (Task Request):** Enunciado meta-lingüístico obligatorio, siempre en inglés, que indica al estudiante qué acción cognitiva debe tomar. Ejemplos: *"Read the article and choose the correct answer"* o *"Where can you find this sign?"*.  
3. **Pregunta (Stem):** El problema específico a resolver. Debe ser claro, directo y no contener "trampas" de doble negación a menos que se evalúe específicamente esa estructura. Ej. *"Why did Sarah call John?"*.  
4. **Opciones de Respuesta (Opciones A, B, C, D o A-H para Matching):**  
   * **Clave (Key):** La única respuesta incontestablemente correcta.  
   * **Distractores (Foils):** Respuestas incorrectas derivadas de investigaciones sobre errores comunes de estudiantes hispanohablantes. El mejor distractor en inglés es la **Interferencia de la Lengua Materna (L1)**, también conocida como "Spanglish" o cognados falsos (ej. creer que *actually* significa *actualmente*, o usar *have* para la edad en lugar de *be*).  
5. **Retroalimentación (Feedback Racional):** Explicación pedagógica que aparecerá tras la sesión de estudio. Debe detallar:  
   * Por qué la clave es correcta (justificando con pistas del texto/contexto).  
   * Por qué el distractor más seleccionado es incorrecto, desmitificando la regla lingüística.  
6. **Metadatos DCE para Análisis:** Nivel CEFR (Pre-A1 a B1+), Competencia (Lingüística, Pragmática, etc.), Afirmación del ICFES asociada, y el ID del Tipo de Parte (1-7).

## **🎨 4\. Uso de Recursos Multimedia y Estrategias de Interfaz (UI)**

A diferencia de matemáticas, donde una fórmula puede representarse en texto plano, el área de Inglés depende crítica y fuertemente de la representación visual del contexto para medir la competencia sociolingüística y pragmática.

En el simulador emplearemos una **Estrategia Visual Programática** (definida en estrategia\_imagenes\_saber11.md), que reemplaza imágenes estáticas (JPG/PNG pesados y no accesibles) por componentes nativos del frontend:

* **Parte 1 (Avisos Públicos):** Evitaremos fotos genéricas de letreros. Utilizaremos html\_templates parametrizados. Un componente de React \<NoticeSign type="danger" text="Do not enter" /\> generará un rectángulo rojo brillante con letras blancas y un ícono vectorial estandarizado. Esto permite a la IA generar miles de avisos distintos variando solo el JSON, ahorrando cientos de megabytes en ancho de banda.  
* **Parte 3 (Diálogos):** Renderizaremos los diálogos utilizando un componente de UI \<ChatInterface /\> que imita la apariencia de WhatsApp, iMessage o Telegram. Presentar a un "Speaker A" y "Speaker B" en globos de diálogo verde/azul y gris proporciona un anclaje cognitivo inmediato a los nativos digitales, contextualizando que están frente a un intercambio de lenguaje informal cotidiano.  
* **Partes 5, 6 y 7 (Textos Funcionales):** Si el texto es un correo, se presentará dentro de un componente \<EmailWrapper /\> con sus campos correspondientes reales (*To:*, *From:*, *Subject:*, *Date:*). Esto entrena al estudiante a buscar información específica en metadatos (ej. "Who sent the email?"), tal como lo exige el examen.  
* **Accesibilidad (a11y):** Al ser código renderizado en lugar de imágenes acopladas, todo el contexto en inglés podrá ser leído fluidamente por lectores de pantalla, garantizando el cumplimiento de las normativas de inclusión educativa.

## **💻 5\. Diseño para Desarrollo de Software (Esquema JSON Ampliado)**

El microservicio Question Bank Service debe soportar este modelo de datos (preferiblemente validado mediante Pydantic en Python) que encapsula la extrema variabilidad del formato de inglés sin romper los contratos del API.

### **Ejemplo de JSON Completo: Pregunta Tipo Parte 3 (Diálogos) con Calibración**

{  
  "id": "q\_eng\_8475nf8\_dialogue",  
  "area": "ingles",  
  "part\_type": 3,  
  "cefr\_level": "A2",  
  "status": "APPROVED",  
  "dce\_metadata": {  
    "competence": "pragmatica",  
    "assertion": "Identifica la respuesta adecuada en una interacción social básica, considerando el rol de los interlocutores.",  
    "cognitive\_level": "comprension\_aplicacion",  
    "grammar\_tags": \["apologies", "polite\_reactions", "social\_routines"\]  
  },  
  "irt\_parameters": {  
    "difficulty\_b": \-0.45,  
    "discrimination\_a": 1.12,  
    "guessing\_c": 0.25  
  },  
  "content": {  
    "instruction": "Complete the conversation.",  
    "context": {  
      "type": "react\_component",  
      "component\_name": "ChatUI",  
      "data": {  
        "speaker\_a\_name": "Lucy",  
        "speaker\_a\_message": "I am so sorry I broke your favorite coffee mug\!"  
      }  
    },  
    "stem": "What is the best response for Speaker B?",  
    "options": \[  
      {  
        "id": "opt\_1",  
        "text": "Don't worry about it. It was old anyway.",  
        "is\_correct": true,  
        "feedback": "Correcto. 'Don't worry about it' es la expresión pragmática más natural en inglés para aceptar una disculpa por un incidente menor."  
      },  
      {  
        "id": "opt\_2",  
        "text": "Yes, please do.",  
        "is\_correct": false,  
        "feedback": "Incorrecto. Esta frase se usa para aceptar un ofrecimiento (ej. 'Would you like some water?'), no para reaccionar a una disculpa."  
      },  
      {  
        "id": "opt\_3",  
        "text": "You are welcome.",  
        "is\_correct": false,  
        "feedback": "Incorrecto. Se detecta una fuerte interferencia del español ('de nada'). En inglés, 'You are welcome' se responde a un 'Thank you', nunca a un 'I'm sorry'."  
      },  
      {  
        "id": "opt\_4",  
        "text": "I am agree.",  
        "is\_correct": false,  
        "feedback": "Incorrecto. Falla gramatical común por influencia del español. En inglés es 'I agree', pero además, no tiene sentido contextual estar 'de acuerdo' con una disculpa de esta forma."  
      }  
    \]  
  }  
}

## **📅 6\. Plan de Trabajo de Implementación (Foco Inglés)**

| Fase | Tareas Principales e Hitos (KPIs) | Responsable Principal | Entregable Clave |
| :---- | :---- | :---- | :---- |
| **1\. Investigación y Baseline** | Extracción estadística de los cuadernillos liberados por el ICFES (2018-2023). Análisis de frecuencias léxicas y temáticas (ej. viajes, medio ambiente, vida escolar). | Equipo de Contenido (SMEs) | Matriz maestra de vocabulario B1 y Glosario de situaciones pragmáticas. |
| **2\. Diseño Instruccional** | Creación de las 7 plantillas modulares. Diseño de estrategias de ingeniería de prompts (*Prompt Engineering*) rigurosas para guiar a los LLMs a evadir traducciones literales y generar distractores basados en L1. | Diseñador Instruccional / AI Engineer | 7 *System Prompts* validados y ajustados, 1 para cada parte de la prueba. |
| **3\. Arquitectura y Backend** | Modificación de los esquemas de base de datos relacional/NoSQL en el Question Bank Service para soportar la metadata específica (niveles CEFR, tipos de partes 1-7). | Backend Engineer | Migraciones ejecutadas y documentación Swagger/OpenAPI actualizada. |
| **4\. Experiencia de Usuario (Frontend)** | Codificación de componentes visuales en React (Vite/Tailwind). Implementación de renderizadores dinámicos para los *Cloze Tests* (textos con espacios en blanco interactivos), Avisos públicos y Chats. | Frontend Engineer | Librería de componentes UI de evaluación lista e integrada. |
| **5\. Ejecución Motor IA** | Ingesta masiva. Despliegue de trabajadores asíncronos (Celery/Redis) llamando a la API de Anthropic/Claude para sembrar el banco inicial de 1,500 preguntas equitativamente distribuidas de A1 a B1+. | AI / DevOps Engineer | Base de datos poblada con ítems etiquetados en estado DRAFT. |
| **6\. Control de Calidad y Revisión** | Revisión humana asistida (Human-in-the-loop). Docentes bilingües verifican la coherencia semántica, descartan sesgos culturales y aprueban ítems (pasan a APPROVED). | Equipo Docente Institucional | Aprobación de al menos 500 ítems funcionales. |
| **7\. Piloto y Calibración Psicométrica (TRI)** | Lanzamiento de un examen diagnóstico inicial (piloto). Captura de las matrices de respuesta de los estudiantes reales de Kampus para calcular los parámetros ![][image1] (discriminación) y ![][image2] (dificultad) de los ítems. | Data Scientist / Especialista Evaluación | Motor CAT alimentado con metadatos estadísticos reales. |

## **💡 7\. Bonus: Estrategias Avanzadas e Inteligencia Artificial**

### **Ingeniería de Prompts (Prompt Engineering) para Inglés**

La inteligencia artificial (especialmente modelos entrenados primariamente en inglés como GPT-4 o Claude 3\) tiene una tendencia natural a generar distractores "demasiado obvios" o gramaticalmente perfectos pero descontextualizados. El secreto para que la IA genere preguntas tipo ICFES de alta calidad radica en **exigirle a la IA que piense como un hispanohablante aprendiendo inglés**.

* **Directriz Obligatoria en el Prompt:** *"Para la generación de distractores, debes aplicar estrategias de interferencia del español (L1). Genera opciones que contengan cognados falsos (ej. 'carpet'/'carpeta', 'realize'/'realizar') o errores comunes de transferencia sintáctica (ej. omitir el pronombre 'it' al inicio de una oración, o el uso indebido de preposiciones como 'in' en lugar de 'on' para días de la semana)."*

### **Examen Diagnóstico Dinámico (CAT \- Computerized Adaptive Testing)**

Someter a todos los estudiantes al mismo examen lineal en inglés genera frustración. Un estudiante Pre-A1 abandonará al ver textos B1+, y un estudiante B1+ se aburrirá con los avisos A1.

El motor Diagnostic Engine del sistema operará de forma adaptativa. El algoritmo siempre comenzará sirviendo un ítem de **dificultad media-baja (Nivel A2, Parte 3 \- Diálogos)**.

* **Si acierta:** La función de información del ítem eleva la estimación de habilidad del estudiante (![][image3]). El siguiente ítem saltará inmediatamente a un **Nivel B1 (Parte 5 \- Comprensión Lectora)**.  
* **Si falla:** La estimación cae. El sistema buscará evitar la frustración entregando inmediatamente un ítem **Nivel A1 (Parte 1 \- Avisos)**.  
  Este ruteo inteligente permite ubicar el nivel real MCER de un estudiante en 15 a 20 preguntas máximo, optimizando el tiempo y construyendo un plan de estudio personalizado (Study Planner) milimétricamente ajustado a su banda actual.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAVCAYAAACUhcTwAAAA4klEQVR4Xu2PrQoCQRSFZ1GTgsV1YWH/QViwbRLMgkFBq2C1mGziA5gsZn2DfQHRYLQKJsEmNqPJoN8VpxgNJgc+Zs6dc++ZUeq/vlkZz/PiIAgalmXlPy9VGIYVDDvXdafQ57yFC4xeBjo93/ePMEYaUuOyBw/Hcdqis4gFnCHQk2UCXCVeRPwWqTS8PdKYSqRpmgVFfkvGEjXQU4i3qJ1g/ipoEzS1iVodfYcu1BQPq0qcfiC/LKI3cMOcsE+kbnAYwh6WsIYOHDCt2Gc6QckDoygqc8yITpIkZ9t2SesfrifWvzOuamTCxAAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAWCAYAAAAM2IbtAAAA20lEQVR4XrWQvw/BUBCACRKDgUgj0t8dJOauRrMI/4SImckkYrcb7Fa7nZ2YsJiMBpLiu8YTtZj6ki/v7r7e3UsTidhPUtf1ouM4+UjVtu0h3OEJ44iUY1lWHRGYptn4dSIHyDO3FxHsySKWsNI0LReRhmHoiANdE8/zKnzcJC+H8r3vAUcYITuwV1L2BdBW05DzvzJNcfH7mFCqx8BUCSYVyNcS+ARXaClJXIVLKOEk95fswU0CF3bImgjXldTekvclT5J0YQMzEdJJPaUmhb+QrpLv+5lPMZ7zAhQ7OxZUyUXNAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAXCAYAAAAyet74AAABG0lEQVR4XmNgGFSAUUlJSU1RUdFNXFycG10SDGRkZDjl5OSmy8vLzwHSuUD6uLS0tAyKImNjY1agxCyggvkgtoKCAgeQvxXIL0dRCJQIB0q8lJWV1YEKMQL5S0EYxAaLAI0XBio8BRRcDuSygMRERUV5gPwDIAxiw0yLAAr8A9FQ0xiAfEkgfohsIgvIJCB+DnSPEkwh0AmmQLFvQDwJLAAMBnEg5y4Q/wIqfATDQP4XIP4PxNFghUBBYyDnK1wnBIBsWQPEb4FYE6bQF2QFyCqYKqibQWK2cK1AhTZAwZcgk0F8aKDvAAU8AzQEwADqxjMgDQyQsMsB4t3AaOSHK4IBoEQwEF+Eumsr0GoJdDVwAApUoAIBdPGRDQAos0QeXCioHQAAAABJRU5ErkJggg==>