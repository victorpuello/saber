# Simulador Saber 11 — Arquitectura de Microservicios Descentralizados

## Integración con Kampus (victorpuello/kampus)

---

## 1. Visión general del sistema

El simulador Saber 11 es una plataforma satelital que opera como un ecosistema de microservicios independientes, conectada a **Kampus** (la plataforma institucional existente) exclusivamente para consumir usuarios, roles y datos de estudiantes/docentes. No modifica ni extiende el monorepo de Kampus; se despliega como un sistema autónomo con su propio ciclo de vida.

### Principios de diseño

- **Descentralización real**: cada microservicio tiene su propia base de datos, su propio despliegue y se comunica vía eventos asíncronos (Redis Streams) o APIs REST internas.
- **Metodología ICFES nativa**: la generación de preguntas (tanto por IA como manuales) sigue estrictamente el Diseño Centrado en Evidencias (DCE) con la jerarquía Competencia → Afirmación → Evidencia → Tarea.
- **Evaluación por competencias, no por memorización**: las preguntas evalúan la capacidad de usar información en contexto, no la retención de datos.
- **Diagnóstico adaptativo**: el sistema perfila al estudiante mediante Teoría de Respuesta al Ítem (TRI) para inferir fortalezas/debilidades y generar planes de estudio personalizados.

---

## 2. Integración con Kampus — Consumo de Usuarios

### 2.1 Análisis del stack de Kampus

Según el repositorio (`victorpuello/kampus`), Kampus es un monorepo con:

| Componente | Tecnología |
|---|---|
| Backend | Django + Django REST Framework |
| Frontend | React + TypeScript + Vite |
| Base de datos | PostgreSQL 15 |
| Cola/Cache | Redis 7 |
| Workers | Celery |
| Autenticación | Django Auth (Groups/Permissions) |

Los roles existentes en Kampus que nos interesan:

- **Estudiante**: usuario con perfil en el SIS, vinculado a un grado y grupo.
- **Docente**: usuario con carga académica asignada, potencialmente Director de Grupo.
- **Administrador/Rector**: acceso total a configuración y reportes.
- **Coordinador**: supervisión académica y de convivencia.

### 2.2 Estrategia de autenticación federada

El simulador **no crea usuarios propios**. Consume la API de Kampus mediante OAuth2/JWT:

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Frontend    │────>│  API Gateway     │────>│  Kampus Auth     │
│  Simulador   │<────│  (Auth Proxy)    │<────│  /api/auth/token │
└──────────────┘     └──────────────────┘     └──────────────────┘
```

**Flujo de autenticación:**

1. El usuario accede al simulador e ingresa sus credenciales de Kampus.
2. El API Gateway hace `POST /api/auth/token/` al backend de Kampus con las credenciales.
3. Kampus valida y retorna un JWT con los datos del usuario y sus grupos/roles.
4. El API Gateway emite un token interno del simulador (JWT firmado con clave propia) que incluye: `user_id`, `role` (mapeado desde los Groups de Django), `institution_id`, `grade` (para estudiantes).
5. Cada microservicio valida el token interno; ninguno contacta a Kampus directamente.

**Mapeo de roles Kampus → Simulador:**

| Group en Kampus | Rol en Simulador | Permisos clave |
|---|---|---|
| Estudiante | `STUDENT` | Realizar diagnóstico, presentar simulacros, ver plan de estudio, consultar progreso |
| Docente | `TEACHER` | Crear/editar preguntas manuales, ver analíticas de sus estudiantes, revisar banco de preguntas |
| Administrador, Rector, Coordinador | `ADMIN` | Gestión completa del banco de preguntas, configuración de simulacros, reportes institucionales, gestión de preguntas IA |

### 2.3 Endpoints de Kampus a consumir

El simulador necesita exponer en Kampus (o consumir si ya existen) los siguientes endpoints:

```
GET  /api/users/{id}/                 → Perfil básico del usuario
GET  /api/users/me/                   → Usuario autenticado actual
GET  /api/students/?grade={grade}     → Listado de estudiantes por grado
GET  /api/students/{id}/              → Detalle de un estudiante (grado, grupo)
GET  /api/teachers/{id}/              → Detalle de un docente (asignaturas)
GET  /api/users/{id}/groups/          → Grupos/roles del usuario
POST /api/auth/token/                 → Obtener JWT de autenticación
POST /api/auth/token/refresh/         → Renovar JWT
```

> **Nota**: Si Kampus no expone estos endpoints actualmente, se debe crear una app Django `saber11_bridge` dentro del backend de Kampus que los publique, protegidos con los permisos adecuados y un scope OAuth2 específico (`saber11:read`).

---

## 3. Arquitectura de microservicios

### 3.1 Inventario de servicios

| Servicio | Responsabilidad | Stack | Puerto | Base de datos |
|---|---|---|---|---|
| **API Gateway** | Enrutamiento, autenticación, rate limiting | Node.js / Express o Kong | 3000 | — (stateless) |
| **Question Bank Service** | CRUD del banco de preguntas (IA + manuales), taxonomía DCE | Python / FastAPI | 3001 | PostgreSQL `saber11_questions` |
| **AI Generator Service** | Generación de preguntas con LLM siguiendo metodología ICFES | Python / FastAPI | 3002 | — (usa Question Bank DB vía API) |
| **Exam Engine Service** | Ensamblaje y administración de simulacros, calificación | Python / FastAPI | 3003 | PostgreSQL `saber11_exams` |
| **Diagnostic Engine** | Diagnóstico inicial TRI, perfilamiento de competencias | Python / FastAPI | 3004 | PostgreSQL `saber11_profiles` |
| **Study Planner Service** | Generación de planes de estudio adaptativos | Python / FastAPI | 3005 | PostgreSQL `saber11_profiles` (compartida con Diagnostic) |
| **Analytics Service** | KPIs, reportes de progreso, analítica institucional | Python / FastAPI | 3006 | PostgreSQL `saber11_analytics` |
| **Notification Service** | Alertas de progreso, recordatorios de estudio | Python / Celery Worker | 3007 | Redis (cola) |

### 3.2 Comunicación entre servicios

```
Síncrona (REST):  Gateway ──> Todos los servicios (via HTTP interno)
Asíncrona (Eventos):  Redis Streams como Event Bus

Eventos principales:
  exam.completed        → Analytics, Diagnostic, Study Planner
  diagnostic.completed  → Study Planner
  question.created      → Analytics (conteo)
  question.ai.generated → Question Bank (revisión)
  plan.updated          → Notification Service
  milestone.reached     → Notification Service
```

---

## 4. Modelo de datos — Diseño Centrado en Evidencias

### 4.1 Taxonomía ICFES codificada

El corazón del sistema es la representación fiel de la estructura del DCE en la base de datos:

```sql
-- Áreas de evaluación del Saber 11
CREATE TABLE areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,        -- 'Lectura Crítica', 'Matemáticas', etc.
    code VARCHAR(10) UNIQUE NOT NULL,  -- 'LC', 'MAT', 'SC', 'CN', 'ING'
    total_questions INT NOT NULL,      -- 41, 50, 50, 58, 45
    description TEXT
);

-- Competencias por área (nivel 1 del DCE)
CREATE TABLE competencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    weight_percentage DECIMAL(5,2),  -- Peso en la prueba (ej: 42% inferencial en LC)
    cognitive_level INT CHECK (cognitive_level BETWEEN 1 AND 3)
);

-- Afirmaciones por competencia (nivel 2 del DCE)
CREATE TABLE assertions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competency_id UUID REFERENCES competencies(id),
    code VARCHAR(30) UNIQUE NOT NULL,
    statement TEXT NOT NULL,          -- "El estudiante comprende cómo se articulan..."
    description TEXT
);

-- Evidencias por afirmación (nivel 3 del DCE)
CREATE TABLE evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assertion_id UUID REFERENCES assertions(id),
    code VARCHAR(40) UNIQUE NOT NULL,
    observable_behavior TEXT NOT NULL, -- Comportamiento observable esperado
    description TEXT
);

-- Contenidos temáticos (transversales)
CREATE TABLE content_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID REFERENCES areas(id),
    name VARCHAR(100) NOT NULL,       -- 'Biológico', 'Estadística', 'Geometría'...
    code VARCHAR(20) NOT NULL
);
```

### 4.2 Banco de preguntas

```sql
-- Preguntas del banco (IA + manuales)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Taxonomía DCE
    area_id UUID REFERENCES areas(id) NOT NULL,
    competency_id UUID REFERENCES competencies(id) NOT NULL,
    assertion_id UUID REFERENCES assertions(id) NOT NULL,
    evidence_id UUID REFERENCES evidences(id),
    content_component_id UUID REFERENCES content_components(id),
    
    -- Estructura tripartita ICFES
    context TEXT NOT NULL,            -- El estímulo/contexto (puede ser largo)
    context_type VARCHAR(20) NOT NULL CHECK (context_type IN (
        'continuous_text', 'discontinuous_text', 'scientific_scenario',
        'math_problem', 'social_dilemma', 'philosophical_text',
        'graphic_notice', 'dialogue', 'cloze_text'
    )),
    stem TEXT NOT NULL,               -- El enunciado/pregunta
    
    -- Opciones (siempre 4, excepto Inglés partes 1-3 y 5 que usan 3)
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT,                    -- NULL para preguntas de 3 opciones (Inglés)
    correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
    
    -- Justificación pedagógica de cada distractor
    explanation_correct TEXT NOT NULL,
    explanation_a TEXT,               -- Por qué A es incorrecta (si no es la correcta)
    explanation_b TEXT,
    explanation_c TEXT,
    explanation_d TEXT,
    
    -- Metadatos de diseño
    cognitive_process VARCHAR(30),    -- 'literal', 'inferential', 'critical', etc.
    difficulty_estimated DECIMAL(3,2) CHECK (difficulty_estimated BETWEEN 0 AND 1),
    discrimination_index DECIMAL(3,2),
    
    -- Origen y gestión
    source VARCHAR(10) NOT NULL CHECK (source IN ('AI', 'MANUAL')),
    created_by_user_id INT,          -- ID del docente/admin en Kampus
    created_by_ai_model VARCHAR(50), -- 'claude-sonnet-4-20250514' si es IA
    
    -- Flujo de aprobación
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'
    )),
    reviewed_by_user_id INT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Para Inglés: sección de la prueba (1-7) y nivel MCER
    english_section INT CHECK (english_section BETWEEN 1 AND 7),
    mcer_level VARCHAR(5) CHECK (mcer_level IN ('A-','A1','A2','B1','B+')),
    
    -- TRI parámetros (calculados post-pilotaje)
    irt_difficulty DECIMAL(5,3),      -- Parámetro b (dificultad TRI)
    irt_discrimination DECIMAL(5,3),  -- Parámetro a (discriminación TRI)
    irt_guessing DECIMAL(5,3),        -- Parámetro c (adivinación)
    times_used INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recursos multimedia del contexto
CREATE TABLE question_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN (
        'image', 'table', 'graph', 'infographic', 'diagram', 'map'
    )),
    url TEXT NOT NULL,
    alt_text TEXT,
    position INT DEFAULT 0
);
```

### 4.3 Exámenes y resultados

```sql
-- Simulacros configurados
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN (
        'DIAGNOSTIC', 'FULL_SIMULATION', 'AREA_PRACTICE', 'CUSTOM'
    )),
    area_id UUID REFERENCES areas(id),  -- NULL si es simulacro completo
    total_questions INT NOT NULL,
    time_limit_minutes INT,             -- NULL = sin tiempo
    is_adaptive BOOLEAN DEFAULT FALSE,   -- Para diagnóstico adaptativo
    created_by_user_id INT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preguntas de un examen (ensamblaje)
CREATE TABLE exam_questions (
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    position INT NOT NULL,
    PRIMARY KEY (exam_id, question_id)
);

-- Sesión de un estudiante presentando un examen
CREATE TABLE exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id),
    student_user_id INT NOT NULL,        -- ID del estudiante en Kampus
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (status IN (
        'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'TIMED_OUT'
    )),
    total_correct INT,
    total_answered INT,
    score_global DECIMAL(5,2),           -- Puntaje 0-100 (escala Saber 11)
    time_spent_seconds INT
);

-- Respuestas individuales del estudiante
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    selected_answer CHAR(1) CHECK (selected_answer IN ('A','B','C','D')),
    is_correct BOOLEAN,
    time_spent_seconds INT,              -- Tiempo en esta pregunta
    confidence_level INT CHECK (confidence_level BETWEEN 1 AND 5),
    answered_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Perfil diagnóstico y plan de estudio

```sql
-- Perfil de competencias del estudiante
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id INT NOT NULL UNIQUE,  -- ID en Kampus
    last_diagnostic_at TIMESTAMPTZ,
    overall_estimated_level INT CHECK (overall_estimated_level BETWEEN 1 AND 4),
    estimated_score_global DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nivel por competencia (resultado del diagnóstico)
CREATE TABLE competency_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    competency_id UUID REFERENCES competencies(id),
    theta_estimate DECIMAL(5,3),          -- Habilidad estimada (TRI)
    performance_level INT CHECK (performance_level BETWEEN 1 AND 4),
    classification VARCHAR(20) CHECK (classification IN (
        'STRENGTH', 'ADEQUATE', 'WEAKNESS', 'CRITICAL'
    )),
    questions_attempted INT DEFAULT 0,
    questions_correct INT DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, competency_id)
);

-- Plan de estudio generado
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES student_profiles(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    total_weeks INT,
    current_week INT DEFAULT 1
);

-- Unidades del plan de estudio
CREATE TABLE study_plan_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    competency_id UUID REFERENCES competencies(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    recommended_questions INT DEFAULT 10,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ
);

-- Práctica asignada en cada unidad
CREATE TABLE unit_practice_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES study_plan_units(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    position INT,
    completed BOOLEAN DEFAULT FALSE
);
```

---

## 5. Datos semilla — Taxonomía completa DCE del Saber 11

A continuación la configuración inicial de la taxonomía, extraída fielmente de los dos documentos ICFES proporcionados:

### 5.1 Lectura Crítica (41 preguntas)

| Competencia | Código | Afirmación | Peso |
|---|---|---|---|
| Identificación (Literal) | `LC-LIT` | Identifica y entiende los contenidos locales que conforman un texto | 25% |
| Comprensión (Inferencial) | `LC-INF` | Comprende cómo se articulan las partes de un texto para darle un sentido global | 42% |
| Evaluación (Crítica) | `LC-CRI` | Reflexiona a partir de un texto y evalúa su contenido y su forma | 33% |

**Tipos de contexto**: Textos continuos (narrativos, argumentativos, filosóficos), textos discontinuos (infografías, cómics, tablas), textos digitales/multimedia.

### 5.2 Matemáticas (50 preguntas)

| Competencia | Código | Afirmación | Contenidos |
|---|---|---|---|
| Interpretación y Representación | `MAT-IR` | Comprende y transforma información cuantitativa en distintos formatos | Estadística, Geometría, Álgebra/Cálculo |
| Formulación y Ejecución | `MAT-FE` | Plantea e implementa estrategias para soluciones matemáticas adecuadas | Estadística, Geometría, Álgebra/Cálculo |
| Argumentación | `MAT-AR` | Valida procedimientos y estrategias matemáticas utilizadas | Estadística, Geometría, Álgebra/Cálculo |

**Tipos de contexto**: Genéricos (vida cotidiana, financiero, estadístico) y no genéricos (abstractos, geométricos puros).

### 5.3 Sociales y Ciudadanas (50 preguntas — 60% ciudadanas, 40% sociales)

| Competencia | Código | Afirmación | Peso |
|---|---|---|---|
| Pensamiento Social | `SC-PS` | Comprende modelos conceptuales y dimensiones espacio-temporales | 30% |
| Interpretación y Análisis de Perspectivas | `SC-AP` | Contextualiza, evalúa y contrasta perspectivas de distintos actores | 40% |
| Pensamiento Reflexivo y Sistémico | `SC-RS` | Evalúa usos del conocimiento social y comprende interrelaciones multidimensionales | 30% |

### 5.4 Ciencias Naturales (58 preguntas)

| Competencia | Código | Afirmación | Componentes |
|---|---|---|---|
| Uso Comprensivo del Conocimiento | `CN-UC` | Asocia fenómenos naturales con conceptos científicos validados | Biológico, Químico, Físico, CTS |
| Explicación de Fenómenos | `CN-EF` | Explica cómo y por qué ocurren fenómenos naturales | Biológico, Químico, Físico, CTS |
| Indagación | `CN-IN` | Comprende la investigación científica y deriva conclusiones basadas en evidencia | Biológico, Químico, Físico, CTS |

### 5.5 Inglés (45 preguntas — 7 partes escalonadas)

| Parte | Código | Habilidad | Nivel MCER | # opciones |
|---|---|---|---|---|
| Parte 1 | `ING-P1` | Interpretación pragmática de avisos públicos | A1/A2 | 3 |
| Parte 2 | `ING-P2` | Emparejamiento léxico-semántico | A1/A2 | 8→5 |
| Parte 3 | `ING-P3` | Completar diálogos conversacionales | A1/A2 | 3 |
| Parte 4 | `ING-P4` | Cloze gramatical básico | A2/B1 | 3 |
| Parte 5 | `ING-P5` | Comprensión literal de lectura | A2/B1 | 3 |
| Parte 6 | `ING-P6` | Comprensión inferencial avanzada | B1 | 4 |
| Parte 7 | `ING-P7` | Cloze gramatical avanzado | B1/B+ | 4 |

---

## 6. Microservicio: AI Generator — Generación de preguntas con LLM

### 6.1 Filosofía de generación

Las preguntas generadas por IA deben seguir **exactamente** la misma metodología que el ICFES usa en su construcción de ítems:

1. **Seleccionar la evidencia** a evaluar (nivel 3 del DCE).
2. **Diseñar un contexto auténtico** (situación real, texto, gráfica, dilema).
3. **Formular un enunciado** que exija al estudiante operar cognitivamente sobre el contexto.
4. **Crear distractores verosímiles** que representen rutas cognitivas erróneas comunes, no disparates evidentes.

### 6.2 Prompt engineering para generación

```python
SYSTEM_PROMPT = """
Eres un constructor de ítems del ICFES colombiano, experto en Diseño Centrado 
en Evidencias (DCE). Tu tarea es generar preguntas de selección múltiple con 
única respuesta para el examen Saber 11.

REGLAS INQUEBRANTABLES:
1. La pregunta NUNCA evalúa memorización. Siempre evalúa la capacidad de 
   USAR información proporcionada en el contexto para resolver un problema.
2. El contexto debe ser una situación auténtica, no un ejercicio artificial.
3. Los distractores deben representar errores cognitivos reales y comunes:
   - Lectura superficial sin inferencia
   - Confusión de premisa con conclusión
   - Aplicación incorrecta de un modelo
   - Resultado de un paso intermedio (no la respuesta final)
   - Correlación confundida con causalidad
4. La respuesta correcta debe ser inequívoca dada la información del contexto.
5. Cada distractor debe tener una explicación pedagógica de POR QUÉ un 
   estudiante podría elegirlo erróneamente.

FORMATO DE SALIDA: JSON estricto con la estructura proporcionada.
"""

USER_PROMPT_TEMPLATE = """
Genera una pregunta para el área de {area} que evalúe la siguiente evidencia:

COMPETENCIA: {competency_name}
AFIRMACIÓN: {assertion_statement}
EVIDENCIA: {evidence_description}
COMPONENTE TEMÁTICO: {content_component}
TIPO DE CONTEXTO: {context_type}
NIVEL COGNITIVO: {cognitive_level}

{additional_constraints}

Responde SOLO con el JSON, sin texto adicional.
"""
```

### 6.3 Flujo de aprobación de preguntas IA

```
AI Generator genera pregunta
        │
        ▼
  status: DRAFT
        │
        ▼
  Validación automática:
  - ¿Tiene contexto > 50 palabras?
  - ¿Los distractores son distintos entre sí?
  - ¿Hay explicación para cada opción?
        │
        ▼
  status: PENDING_REVIEW
        │
        ▼
  Docente o Admin revisa
        │
   ┌────┴────┐
   ▼         ▼
APPROVED   REJECTED
   │         │
   ▼         ▼
 Al banco  Feedback → regenerar
```

---

## 7. Microservicio: Diagnostic Engine — Evaluación inicial adaptativa

### 7.1 Objetivo

Cuando un estudiante ingresa por primera vez, debe realizar un **diagnóstico inicial** que permita al sistema inferir su nivel en cada competencia de las 5 áreas. Esto NO es un simulacro completo (244 preguntas sería excesivo). Es una evaluación **adaptativa** de ~60-80 preguntas.

### 7.2 Algoritmo adaptativo (CAT simplificado)

```python
def adaptive_diagnostic(student_id, area):
    """
    Computerized Adaptive Testing simplificado usando TRI de 3 parámetros.
    """
    theta = 0.0  # Habilidad inicial estimada (media poblacional)
    se = 1.0     # Error estándar inicial
    responses = []
    
    for i in range(MAX_QUESTIONS_PER_AREA):  # ~12-15 por área
        # Seleccionar pregunta cuya dificultad esté cerca de theta actual
        question = select_optimal_question(
            area=area,
            theta=theta,
            used_questions=[r.question_id for r in responses],
            # Asegurar cobertura de todas las competencias del área
            competencies_coverage=get_coverage(responses, area)
        )
        
        # Presentar al estudiante y esperar respuesta
        answer = yield question
        
        # Actualizar theta con el modelo de Rasch o 3PL
        theta, se = update_theta_estimate(theta, question, answer.is_correct)
        responses.append(answer)
        
        # Criterio de parada: error estándar < umbral
        if se < 0.3:
            break
    
    return theta, classify_level(theta)  # Nivel 1-4
```

### 7.3 Clasificación de niveles

| Theta estimado | Nivel | Clasificación |
|---|---|---|
| θ < -1.0 | 1 | CRITICAL |
| -1.0 ≤ θ < 0.0 | 2 | WEAKNESS |
| 0.0 ≤ θ < 1.0 | 3 | ADEQUATE |
| θ ≥ 1.0 | 4 | STRENGTH |

---

## 8. Microservicio: Study Planner — Plan de estudio personalizado

### 8.1 Lógica de generación del plan

Una vez completado el diagnóstico, el Study Planner genera un plan semanal:

1. **Priorización**: Las competencias clasificadas como `CRITICAL` y `WEAKNESS` reciben mayor peso.
2. **Distribución temporal**: Se estima un plan de 8-12 semanas (ajustable según fecha del examen).
3. **Unidades de práctica**: Cada semana tiene 3-5 unidades enfocadas en competencias específicas, cada una con ~10 preguntas del banco.
4. **Intercalación**: Se alterna entre áreas para evitar fatiga cognitiva en una sola disciplina.
5. **Retroalimentación continua**: Tras cada unidad completada, se recalcula el theta de la competencia y se reajusta el plan si hay mejora o estancamiento.

### 8.2 Ejemplo de plan generado

```json
{
  "student_id": 12345,
  "total_weeks": 10,
  "focus_areas": [
    {"area": "Matemáticas", "priority": "HIGH", "weakest_competency": "MAT-AR"},
    {"area": "Ciencias Naturales", "priority": "HIGH", "weakest_competency": "CN-IN"},
    {"area": "Lectura Crítica", "priority": "MEDIUM", "weakest_competency": "LC-CRI"}
  ],
  "weeks": [
    {
      "week": 1,
      "units": [
        {
          "title": "Argumentación matemática: validar procedimientos",
          "competency": "MAT-AR",
          "questions": 10,
          "priority": "HIGH",
          "description": "Practica identificando errores en procedimientos ajenos y justificando resultados con lenguaje matemático"
        },
        {
          "title": "Indagación científica: diseño experimental",
          "competency": "CN-IN",
          "questions": 10,
          "priority": "HIGH",
          "description": "Trabaja en identificar variables dependientes, independientes y de control en experimentos hipotéticos"
        },
        {
          "title": "Lectura inferencial: macroestructura del discurso",
          "competency": "LC-INF",
          "questions": 8,
          "priority": "MEDIUM"
        }
      ]
    }
  ]
}
```

---

## 9. Roles y permisos detallados

### 9.1 Estudiante (`STUDENT`)

| Función | Descripción |
|---|---|
| Diagnóstico inicial | Realizar la evaluación adaptativa al ingresar por primera vez |
| Ver perfil de competencias | Consultar fortalezas y debilidades por área y competencia |
| Presentar simulacros | Acceder a simulacros completos o por área |
| Plan de estudio | Consultar y avanzar en su plan personalizado |
| Historial de resultados | Ver evolución temporal de sus puntajes |
| Práctica por competencia | Resolver sets de preguntas filtrados por competencia específica |

### 9.2 Docente (`TEACHER`)

| Función | Descripción |
|---|---|
| Crear preguntas manuales | Agregar preguntas al banco siguiendo el formato DCE |
| Editar preguntas propias | Modificar preguntas que haya creado |
| Revisar preguntas IA | Aprobar o rechazar preguntas generadas por el AI Generator |
| Ver banco de preguntas | Consultar todas las preguntas aprobadas, filtrar por taxonomía |
| Analíticas de estudiantes | Ver el progreso de los estudiantes de sus cursos |
| Crear simulacros custom | Ensamblar evaluaciones seleccionando preguntas del banco |

### 9.3 Administrador (`ADMIN`)

| Función | Descripción |
|---|---|
| Todo lo del docente | Hereda todos los permisos de TEACHER |
| Gestión completa del banco | Aprobar/rechazar/archivar cualquier pregunta |
| Configurar AI Generator | Ajustar parámetros de generación, modelos, frecuencia |
| Reportes institucionales | Analíticas agregadas por grado, área, competencia |
| Configurar simulacros masivos | Programar simulacros para toda la institución |
| Gestionar taxonomía DCE | Agregar/editar competencias, afirmaciones, evidencias |
| Auditoría | Ver logs de actividad del sistema |

---

## 10. Docker Compose — Despliegue completo

```yaml
services:
  # --- API Gateway ---
  gateway:
    build: ./gateway
    ports:
      - "3000:3000"
    environment:
      - KAMPUS_API_URL=http://kampus-backend:8000
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis-saber11:6379/0
    depends_on:
      - redis-saber11

  # --- Question Bank Service ---
  question-bank:
    build: ./services/question-bank
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://saber11:${DB_PASSWORD}@db-questions:5432/saber11_questions
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db-questions
      - redis-saber11

  # --- AI Generator Service ---
  ai-generator:
    build: ./services/ai-generator
    ports:
      - "3002:3002"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - QUESTION_BANK_URL=http://question-bank:3001
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - question-bank

  # --- Exam Engine Service ---
  exam-engine:
    build: ./services/exam-engine
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://saber11:${DB_PASSWORD}@db-exams:5432/saber11_exams
      - QUESTION_BANK_URL=http://question-bank:3001
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db-exams
      - question-bank

  # --- Diagnostic Engine ---
  diagnostic:
    build: ./services/diagnostic
    ports:
      - "3004:3004"
    environment:
      - DATABASE_URL=postgresql://saber11:${DB_PASSWORD}@db-profiles:5432/saber11_profiles
      - QUESTION_BANK_URL=http://question-bank:3001
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db-profiles
      - question-bank

  # --- Study Planner Service ---
  study-planner:
    build: ./services/study-planner
    ports:
      - "3005:3005"
    environment:
      - DATABASE_URL=postgresql://saber11:${DB_PASSWORD}@db-profiles:5432/saber11_profiles
      - QUESTION_BANK_URL=http://question-bank:3001
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db-profiles
      - question-bank

  # --- Analytics Service ---
  analytics:
    build: ./services/analytics
    ports:
      - "3006:3006"
    environment:
      - DATABASE_URL=postgresql://saber11:${DB_PASSWORD}@db-analytics:5432/saber11_analytics
      - REDIS_URL=redis://redis-saber11:6379/0
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db-analytics

  # --- Notification Service ---
  notifications:
    build: ./services/notifications
    environment:
      - REDIS_URL=redis://redis-saber11:6379/0
      - KAMPUS_API_URL=http://kampus-backend:8000
    depends_on:
      - redis-saber11

  # --- Frontend ---
  frontend:
    build: ./frontend
    ports:
      - "5174:5174"
    environment:
      - VITE_API_URL=http://localhost:3000
    depends_on:
      - gateway

  # --- Databases ---
  db-questions:
    image: postgres:15-alpine
    volumes:
      - questions_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=saber11_questions
      - POSTGRES_USER=saber11
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  db-exams:
    image: postgres:15-alpine
    volumes:
      - exams_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=saber11_exams
      - POSTGRES_USER=saber11
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  db-profiles:
    image: postgres:15-alpine
    volumes:
      - profiles_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=saber11_profiles
      - POSTGRES_USER=saber11
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  db-analytics:
    image: postgres:15-alpine
    volumes:
      - analytics_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=saber11_analytics
      - POSTGRES_USER=saber11
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis-saber11:
    image: redis:7-alpine
    ports:
      - "6380:6379"

volumes:
  questions_data:
  exams_data:
  profiles_data:
  analytics_data:
```

---

## 11. Estructura de carpetas del proyecto

```
saber11-simulator/
├── gateway/                        # API Gateway (Node.js/Express)
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.js             # Validación JWT + mapeo de roles
│   │   │   └── rateLimiter.js
│   │   ├── routes/
│   │   │   └── proxy.js            # Enrutamiento a microservicios
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
│
├── services/
│   ├── question-bank/              # Banco de preguntas
│   │   ├── app/
│   │   │   ├── models/
│   │   │   │   ├── area.py
│   │   │   │   ├── competency.py
│   │   │   │   ├── assertion.py
│   │   │   │   ├── evidence.py
│   │   │   │   ├── question.py
│   │   │   │   └── content_component.py
│   │   │   ├── routes/
│   │   │   │   ├── questions.py
│   │   │   │   ├── taxonomy.py
│   │   │   │   └── review.py
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   └── main.py
│   │   ├── migrations/
│   │   ├── seeds/
│   │   │   └── taxonomy_seed.py     # Datos semilla DCE
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── ai-generator/               # Generación IA de preguntas
│   │   ├── app/
│   │   │   ├── prompts/
│   │   │   │   ├── lectura_critica.py
│   │   │   │   ├── matematicas.py
│   │   │   │   ├── sociales.py
│   │   │   │   ├── ciencias_naturales.py
│   │   │   │   └── ingles.py
│   │   │   ├── services/
│   │   │   │   ├── generator.py     # Lógica de generación
│   │   │   │   └── validator.py     # Validación automática
│   │   │   ├── routes/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── exam-engine/                 # Motor de exámenes
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   │   ├── assembler.py     # Ensamblaje de simulacros
│   │   │   │   ├── scorer.py        # Calificación
│   │   │   │   └── timer.py         # Control de tiempo
│   │   │   ├── routes/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── diagnostic/                  # Motor de diagnóstico
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   │   ├── adaptive.py      # Algoritmo CAT
│   │   │   │   ├── irt.py           # Cálculos TRI
│   │   │   │   └── profiler.py      # Perfilamiento
│   │   │   ├── routes/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── study-planner/               # Planes de estudio
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   │   ├── planner.py       # Generación de planes
│   │   │   │   └── adjuster.py      # Reajuste adaptativo
│   │   │   ├── routes/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── analytics/                   # Analíticas y reportes
│   │   ├── app/
│   │   │   ├── models/
│   │   │   ├── services/
│   │   │   │   ├── aggregator.py
│   │   │   │   └── reporter.py
│   │   │   ├── routes/
│   │   │   └── main.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── notifications/               # Notificaciones
│       ├── app/
│       │   ├── consumers/
│       │   │   └── event_listener.py
│       │   ├── services/
│       │   │   └── notifier.py
│       │   └── main.py
│       ├── Dockerfile
│       └── requirements.txt
│
├── frontend/                        # SPA React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Diagnostic.tsx
│   │   │   │   ├── ExamSession.tsx
│   │   │   │   ├── StudyPlan.tsx
│   │   │   │   └── Progress.tsx
│   │   │   ├── teacher/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── QuestionEditor.tsx
│   │   │   │   ├── QuestionReview.tsx
│   │   │   │   └── StudentAnalytics.tsx
│   │   │   └── admin/
│   │   │       ├── Dashboard.tsx
│   │   │       ├── QuestionBank.tsx
│   │   │       ├── AIGenerator.tsx
│   │   │       ├── ExamConfig.tsx
│   │   │       └── Reports.tsx
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## 12. API Endpoints principales

### Question Bank Service (`/api/questions/`)

```
GET    /api/questions/                      → Listar preguntas (paginado, filtros por área/competencia/status/source)
POST   /api/questions/                      → Crear pregunta manual [TEACHER, ADMIN]
GET    /api/questions/{id}                  → Detalle de una pregunta
PUT    /api/questions/{id}                  → Editar pregunta [owner o ADMIN]
DELETE /api/questions/{id}                  → Archivar pregunta [ADMIN]
POST   /api/questions/{id}/review           → Aprobar/rechazar pregunta [TEACHER, ADMIN]
GET    /api/taxonomy/areas                  → Listar áreas
GET    /api/taxonomy/areas/{id}/competencies → Competencias de un área
GET    /api/taxonomy/competencies/{id}/assertions → Afirmaciones
GET    /api/taxonomy/assertions/{id}/evidences    → Evidencias
GET    /api/questions/stats                 → Estadísticas del banco [ADMIN]
```

### AI Generator Service (`/api/ai/`)

```
POST   /api/ai/generate                    → Generar pregunta IA [ADMIN]
POST   /api/ai/generate/batch              → Generar lote de preguntas [ADMIN]
GET    /api/ai/queue                        → Estado de generación pendiente
PUT    /api/ai/config                       → Configurar parámetros del generador [ADMIN]
```

### Exam Engine Service (`/api/exams/`)

```
GET    /api/exams/                          → Listar simulacros disponibles
POST   /api/exams/                          → Crear simulacro [TEACHER, ADMIN]
POST   /api/exams/{id}/start                → Iniciar sesión de examen [STUDENT]
POST   /api/exams/sessions/{id}/answer      → Registrar respuesta [STUDENT]
POST   /api/exams/sessions/{id}/finish      → Finalizar sesión [STUDENT]
GET    /api/exams/sessions/{id}/results     → Ver resultados de una sesión
GET    /api/exams/sessions/history           → Historial de sesiones del estudiante
```

### Diagnostic Engine (`/api/diagnostic/`)

```
POST   /api/diagnostic/start               → Iniciar diagnóstico adaptativo [STUDENT]
POST   /api/diagnostic/sessions/{id}/answer → Responder pregunta adaptativa [STUDENT]
GET    /api/diagnostic/profile              → Ver perfil de competencias [STUDENT]
GET    /api/diagnostic/profile/{student_id} → Ver perfil de un estudiante [TEACHER, ADMIN]
```

### Study Planner Service (`/api/plans/`)

```
GET    /api/plans/current                   → Plan activo del estudiante [STUDENT]
POST   /api/plans/generate                  → Generar nuevo plan [STUDENT, triggered by diagnostic]
PUT    /api/plans/units/{id}/complete        → Marcar unidad como completada [STUDENT]
GET    /api/plans/{student_id}              → Ver plan de un estudiante [TEACHER, ADMIN]
```

### Analytics Service (`/api/analytics/`)

```
GET    /api/analytics/student/{id}/progress → Progreso individual
GET    /api/analytics/classroom/{grade}      → Analítica por grado [TEACHER, ADMIN]
GET    /api/analytics/institution            → Reportes institucionales [ADMIN]
GET    /api/analytics/questions/performance  → Rendimiento del banco de preguntas [ADMIN]
```

---

## 13. Niveles de desempeño y reporte de resultados

Fiel a la estructura del ICFES, los resultados se reportan en dos dimensiones:

### 13.1 Puntaje por área (0-100)

Cada área genera un puntaje en escala continua de 0 a 100, calculado mediante el modelo TRI a partir de las respuestas del estudiante.

### 13.2 Niveles de desempeño

**Para Lectura Crítica, Matemáticas, Sociales y Ciudadanas, Ciencias Naturales:**

| Nivel | Rango estimado | Descriptor |
|---|---|---|
| 1 | 0 - 35 | Desempeño insuficiente |
| 2 | 36 - 50 | Desempeño mínimo |
| 3 | 51 - 65 | Desempeño satisfactorio |
| 4 | 66 - 100 | Desempeño avanzado |

**Para Inglés (alineado al MCER):**

| Nivel | Rango estimado | Descriptor |
|---|---|---|
| A- | 0 - 29 | Pre-principiante |
| A1 | 30 - 43 | Principiante |
| A2 | 44 - 57 | Básico |
| B1 | 58 - 78 | Pre-intermedio |
| B+ | 79 - 100 | Intermedio/avanzado |

### 13.3 Puntaje global

El puntaje global del Saber 11 se calcula como el promedio ponderado de las 5 áreas, en una escala de 0 a 500:

```
Global = LC + MAT + SC + CN + ING
```

Donde cada área aporta entre 0 y 100 puntos.

---

## 14. Consideraciones de seguridad

- **Tokens JWT** con expiración de 1 hora, refresh tokens de 7 días.
- **Rate limiting** en el API Gateway: 100 req/min por usuario, 1000 req/min por IP.
- **Encriptación** de datos sensibles en reposo (AES-256).
- **CORS** configurado para permitir solo el dominio del frontend del simulador.
- **Auditoría**: toda acción de creación/edición/aprobación queda registrada con `user_id`, `timestamp`, `action`.
- **Las preguntas nunca se envían al frontend completas con la respuesta correcta durante un examen**. El frontend recibe solo contexto + enunciado + opciones. La validación se hace server-side.

---

## 15. Roadmap de implementación sugerido

| Sprint | Duración | Entregables |
|---|---|---|
| **Sprint 1** | 2 semanas | API Gateway + autenticación federada con Kampus + estructura base de microservicios |
| **Sprint 2** | 3 semanas | Question Bank Service + modelo de datos DCE + seeds de taxonomía + CRUD completo |
| **Sprint 3** | 2 semanas | AI Generator Service + prompts por área + flujo de aprobación |
| **Sprint 4** | 3 semanas | Exam Engine + ensamblaje de simulacros + calificación + sesiones |
| **Sprint 5** | 3 semanas | Diagnostic Engine + algoritmo CAT + perfilamiento TRI |
| **Sprint 6** | 2 semanas | Study Planner + generación de planes + reajuste adaptativo |
| **Sprint 7** | 2 semanas | Analytics Service + dashboards + reportes |
| **Sprint 8** | 3 semanas | Frontend completo (portales de estudiante, docente, admin) |
| **Sprint 9** | 2 semanas | Notification Service + pruebas de integración + pilotaje |
| **Sprint 10** | 2 semanas | Optimización de rendimiento, seguridad hardening, documentación |

**Total estimado: 24 semanas (~6 meses)**
