# Plan de Implementación: Componente de Inglés — Simulador Saber 11

> **Documento vivo.** Marca cada ítem con `[x]` conforme se complete. Última revisión: 2026-04-25.

---

## Diagnóstico de Brechas (baseline)

| Área | Estado | Descripción |
|---|---|---|
| Taxonomía de competencias (4 reales) | ❌ Ausente | Solo hay 2 competencias genéricas en seed |
| Niveles MCER en BD | ✅ Implementado | Campo `mcer_level` con constraint correcto |
| Secciones 1-7 (`english_section`) | ✅ Implementado | Cubre part_type del diseño instruccional |
| IRT básico (a, b, c) | ✅ Implementado | Campos separados en `models.py` |
| Prompt IA con interferencia L1 | ✅ Implementado | Sub-prompts por sección exigen distractores por interferencia L1 |
| `dce_metadata` como objeto estructurado | ✅ Implementado | JSON estructurado via Question Bank y AI Generator |
| Contexto `react_component` + `component_name` | ✅ Implementado | Contrato soportado en QB, AI Generator, Exam Engine y frontend |
| Componente `<ChatUI />` (Parte 3) | ✅ Implementado | Disponible en `src/components/english/` |
| Componente `<NoticeSign />` (Parte 1) | ✅ Implementado | Disponible en `src/components/english/` |
| Componente `<EmailWrapper />` (Partes 5/6) | ✅ Implementado | Disponible en `src/components/english/` |
| Preguntas semilla de inglés | ❌ Ausente | Taxonomía cargada, cero preguntas reales |

---

## Sprints de Implementación

### Sprint 1 — Fundamentos: Taxonomía y Modelo de Datos
**Duración estimada:** 1 semana  
**Objetivo:** Que el backend soporte fielmente el Diseño Instruccional (DCE) sin romper contratos existentes.

#### Backend — `question-bank`

- [x] **[QB-ING-01]** Corregir taxonomía en `seed.py`: reemplazar las 2 competencias genéricas por las 4 reales del ICFES:
  - `ING-C1: Competencia Pragmática` (Partes 1, 3)
  - `ING-C2: Competencia Lingüística` (Partes 2, 4, 7)
  - `ING-C3: Competencia Sociolingüística` (Parte 3)
  - `ING-C4: Comprensión Lectora` (Partes 5, 6)
  - Cada competencia con sus assertions y evidences alineadas a las 7 partes del examen real.

- [x] **[QB-ING-02]** Campo `dce_metadata JSONB` agregado a `models.py` + `ALTER TABLE IF EXISTS ADD COLUMN IF NOT EXISTS` en `main.py`.

- [x] **[QB-ING-03]** Campo `component_name VARCHAR(50)` con check constraint (`ChatUI|NoticeSign|EmailWrapper`) agregado a `models.py` + migración en `main.py`.

- [x] **[QB-ING-04]** `react_component` agregado al enum `ContextType` en `schemas.py` y al `CheckConstraint` en `models.py`. Migración DO block en `main.py` actualiza el constraint en DBs existentes.

- [x] **[QB-ING-05]** Schemas Pydantic actualizados: modelo `DceMetadata`, campos `dce_metadata` y `component_name` en `QuestionCreate`, `QuestionUpdate`, `QuestionBlockItemCreate` y `QuestionOut`.

- [x] **[QB-ING-06 extra]** `load_seeds.py` reescrito con upsert completo por código (Area → Competency → Assertion → Evidence → ContentComponent). Idempotente en cualquier entorno.

#### Criterios de aceptación Sprint 1
- [ ] `POST /api/questions` acepta `dce_metadata` y `component_name` sin error de validación.
- [ ] `GET /api/taxonomy/areas/ING/competencies` devuelve las 4 competencias reales.
- [ ] Migraciones ejecutan sin errores en entorno local (verificar al levantar docker-compose).
- [ ] Tests unitarios de schemas pasan con los nuevos campos.

---

### Sprint 2 — Motor de IA: Prompts de Alta Fidelidad
**Duración estimada:** 1 semana  
**Objetivo:** Que el generador de IA produzca preguntas con distractores de calidad ICFES (interferencia L1) y contextos estructurados para cada parte.

#### Backend — `ai-generator`

- [x] **[AI-ING-01]** Directriz L1 obligatoria (`_L1_DIRECTIVE`) inyectada en los 7 sub-prompts: cognados falsos, transferencia sintáctica, rutinas sociales mal transferidas, calcos de estructura, registro incorrecto.

- [x] **[AI-ING-02]** 7 sub-prompts en `ING_SECTION_PROMPTS` — cada uno con instrucciones de contexto visual (JSON para `NoticeSign`/`ChatUI`/`EmailWrapper`), competencia DCE, estrategia de distractores y campos adicionales (`grammar_tags`, `l1_distractor_note`). `build_user_prompt` despacha automáticamente al sub-prompt correcto cuando `area_code == "ING"`.

- [x] **[AI-ING-03]** `generator.py` ahora: asigna `component_name` vía `ING_COMPONENT_MAP`, construye `dce_metadata` (competence, assertion, cognitive_level, grammar_tags, part_description), extrae `grammar_tags` y `l1_distractor_note` del JSON devuelto por la IA, permite que la sección 5 devuelva `EmailWrapper` desde el JSON.

- [x] **[AI-ING-04]** `validator.py` actualizado: `react_component` en `VALID_CONTEXT_TYPES["ING"]`, validaciones para secciones 1/3 (react_component requerido + component_name obligatorio), secciones 4/7 (cloze_text recomendado), secciones 5/6 (longitud mínima 150 palabras), verificación de `dce_metadata`.

- [x] **[AI-ING-05]** `part_description` incluido dentro de `dce_metadata` generado en `generator.py`. `question_bank_client.py` pasa `component_name` y `dce_metadata` en el payload al Question Bank.

#### Criterios de aceptación Sprint 2
- [ ] Generación de 10 preguntas por cada sección (1-7) sin error.
- [ ] Al menos 2 de 4 distractores de cada pregunta contienen error de L1 (verificado manualmente por revisor).
- [ ] El campo `component_name` se asigna automáticamente en el 100% de preguntas secciones 1, 3.
- [ ] El campo `dce_metadata.grammar_tags` no está vacío en ningún ítem generado.

---

### Sprint 3 — Frontend: Componentes de Renderizado Especializado
**Duración estimada:** 1.5 semanas  
**Objetivo:** Reproducir fielmente la experiencia visual del examen ICFES para las partes que requieren contexto visual.

#### Frontend — `src/components/english/`

- [x] **[FE-ING-01]** Crear componente `<NoticeSign />` para Parte 1 (Avisos públicos):
  - Props: `type` (danger | warning | info | prohibition | instruction), `text`, `icon?`, `location?`
  - Renderiza: fondo de color semántico, texto en blanco bold, ícono SVG según tipo
  - Ejemplos: "WET FLOOR" (warning/amarillo), "NO SMOKING" (prohibition/rojo), "FIRE EXIT" (info/verde)
  - Accesible: `aria-label` descriptivo del aviso

- [x] **[FE-ING-02]** Crear componente `<ChatUI />` para Parte 3 (Diálogos):
  - Props: `speakerA: { name, message }`, `speakerBPlaceholder?`
  - Renderiza: interfaz tipo mensajería (burbuja derecha azul para A, burbuja izquierda gris para B)
  - El mensaje de Speaker B es el espacio de la pregunta (blank o `[__?__]`)
  - Accesible: `role="log"`, nombres de hablantes visibles

- [x] **[FE-ING-03]** Crear componente `<EmailWrapper />` para Partes 5/6 cuando el contexto es un correo electrónico:
  - Props: `to`, `from`, `subject`, `date`, `body`
  - Renderiza: header con los campos de metadatos y cuerpo del correo en fuente monospace
  - Entrena al estudiante a buscar info en metadatos (Who sent the email? What is the subject?)
  - Accesible: estructura semántica con `<header>`, `<main>`, roles apropiados

- [x] **[FE-ING-04]** Actualizar `QuestionContextMedia.tsx` para detectar `context_type === "react_component"` y despachar al componente correcto usando `component_name`:
  ```tsx
  case "react_component":
    switch (question.component_name) {
      case "ChatUI": return <ChatUI data={context.data} />;
      case "NoticeSign": return <NoticeSign data={context.data} />;
      case "EmailWrapper": return <EmailWrapper data={context.data} />;
    }
  ```

- [x] **[FE-ING-05]** Crear componente `<ClozeText />` para Partes 4 y 7 (Textos Incompletos):
  - Renderiza el texto con `[BLANK]` como campo interactivo inline (dropdown o resaltado)
  - Permite al estudiante ver el contexto completo mientras selecciona la opción
  - Diferenciador vs. pregunta estándar: las opciones no son bloques separados sino parte del flujo del párrafo

- [x] **[FE-ING-06]** Crear storybook/preview local de los 3 componentes con datos de ejemplo de cada parte (1-7) para validación visual antes de integrar.

- [x] **[FE-ING-07]** Integrar los componentes en `ExamSession.tsx` y `DiagnosticSession.tsx` verificando que el renderizado sea correcto en:
  - Desktop (≥1024px)
  - Tablet (768px)
  - Móvil (375px)

#### Criterios de aceptación Sprint 3
- [x] `<NoticeSign />` renderiza 5 tipos de aviso diferentes sin errores de layout.
- [x] `<ChatUI />` muestra correctamente el diálogo con el espacio vacío de Speaker B.
- [x] `<EmailWrapper />` muestra todos los campos de cabecera más el cuerpo.
- [x] `<ClozeText />` resalta el espacio en blanco de manera distinguible del resto del texto.
- [ ] Todos los componentes pasan Axe accessibility audit (0 errores críticos).
- [ ] Los componentes renderizan correctamente dentro de `ExamSession` en una sesión de prueba con datos mock.

> Nota: implementación e integración completadas; quedan pendientes la auditoría Axe y la validación visual manual en sesión mock.

---

### Sprint 4 — Siembra y Revisión Humana (Human-in-the-Loop)
**Duración estimada:** 2 semanas  
**Objetivo:** Poblar el banco con 500 ítems aprobados, distribuidos equitativamente entre niveles y secciones.

#### Generación

- [ ] **[SEED-ING-01]** Ejecutar batch de generación: 30 preguntas × 7 secciones × ~3 iteraciones = ~630 ítems DRAFT.
  - Distribución objetivo: Sección 1 (15%), 2 (10%), 3 (15%), 4 (15%), 5 (15%), 6 (15%), 7 (15%)
  - Niveles MCER objetivo: Pre-A1 (5%), A1 (20%), A2 (35%), B1 (30%), B1+ (10%)

- [ ] **[SEED-ING-02]** Validar automáticamente que todos los ítems DRAFT tienen: `english_section`, `mcer_level`, `dce_metadata`, al menos 4 opciones, `is_correct = true` en exactamente 1 opción.
  - [x] Implementado endpoint admin `GET /api/questions/english/audit` con conteos por estado, sección, MCER y defectos estructurales.
  - [x] Implementado bloqueo de envío a revisión/aprobación para ítems de inglés con metadatos incompletos.
  - [x] El panel admin del banco muestra la auditoría Sprint 4 para seguimiento de siembra.
  - [ ] Ejecutar la auditoría contra la base real luego del batch de generación.

#### Revisión

- [ ] **[SEED-ING-03]** Asignar revisores bilingües a cola de revisión (mínimo 2 revisores por ítem).
  - Criterios de aprobación: coherencia semántica ✓, distractores basados en L1 ✓, sin sesgo cultural ✓, contexto visual completo ✓

- [ ] **[SEED-ING-04]** Alcanzar 500 ítems en estado `APPROVED` antes del piloto.
  - [ ] 100 ítems Sección 1 (Avisos)
  - [ ] 70 ítems Sección 2 (Relación de Palabras — Matching)
  - [ ] 100 ítems Sección 3 (Diálogos)
  - [ ] 70 ítems Sección 4 (Textos Incompletos básico)
  - [ ] 60 ítems Sección 5 (Comprensión Literal)
  - [ ] 60 ítems Sección 6 (Comprensión Inferencial)
  - [ ] 40 ítems Sección 7 (Textos Incompletos avanzado)

- [ ] **[SEED-ING-05]** Verificar distribución de niveles MCER en el banco aprobado con consulta SQL y documentar resultado.

#### Criterios de aceptación Sprint 4
- [ ] 500 ítems en `status = 'APPROVED'` y `area = 'ING'`.
- [ ] Distribución de secciones dentro del ±10% del objetivo.
- [ ] 0 ítems con `component_name = NULL` en secciones 1 y 3.

---

### Sprint 5 — Motor Diagnóstico Adaptativo (CAT) para Inglés
**Duración estimada:** 1 semana  
**Objetivo:** Implementar la lógica CAT específica para inglés descrita en el diseño instruccional.

- [x] **[CAT-ING-01]** Implementar lógica de punto de entrada CAT en el `diagnostic` service:
  - Ítem inicial siempre: Sección 3 (Diálogo), nivel A2
  - Si acierta → siguiente ítem: Sección 5, nivel B1
  - Si falla → siguiente ítem: Sección 1, nivel A1

- [x] **[CAT-ING-02]** Implementar el árbol de decisión completo por sección y nivel MCER:
  - Mapear las 7 partes del examen como nodos del árbol adaptativo
  - Definir umbrales de habilidad (θ) para transiciones entre niveles

- [x] **[CAT-ING-03]** Al finalizar el diagnóstico (15-20 preguntas), calcular y guardar:
  - Banda MCER estimada (Pre-A1 a B1+)
  - Secciones con mayor número de errores (para el Study Planner)
  - Nivel de confianza de la estimación (Standard Error of Measurement)

- [x] **[CAT-ING-04]** Exponer el resultado del diagnóstico de inglés en el `StudyPlanner` como recomendaciones por sección (ej. "Necesitas reforzar Parte 3 — Diálogos a nivel A2").

> Nota Sprint 5: implementación completada en `services/diagnostic` y `services/study-planner`. Queda pendiente ejecutar casos simulados end-to-end con banco aprobado suficiente para validar las bandas extremas.

#### Criterios de aceptación Sprint 5
- [ ] Un estudiante simulado que responde correctamente todas las preguntas recibe banda B1+.
- [ ] Un estudiante simulado que falla todas recibe banda Pre-A1.
- [x] El diagnóstico termina en máximo 20 preguntas.
- [x] El resultado es visible en el perfil del estudiante con la banda MCER asignada.

---

### Sprint 6 — Calibración Psicométrica (TRI/IRT)
**Duración estimada:** 2 semanas (requiere datos reales de piloto)  
**Prerrequisito:** Mínimo 200 estudiantes reales han completado el diagnóstico de inglés.

- [x] **[IRT-ING-01]** Exportar matriz de respuestas (estudiante × ítem) del piloto a formato CSV para análisis externo.
  - Endpoint admin: `GET /api/diagnostic/irt/export.csv?area_code=ING`.
- [x] **[IRT-ING-02]** Calcular parámetros IRT (Modelo 3PL): `difficulty_b`, `discrimination_a`, `guessing_c` para cada ítem aprobado.
  - Endpoint admin: `POST /api/diagnostic/irt/calibrate?area_code=ING&apply=false`.
- [x] **[IRT-ING-03]** Actualizar los campos `irt_difficulty`, `irt_discrimination`, `irt_guessing` en BD con valores empíricos (reemplazando estimaciones iniciales).
  - Tooling listo con `apply=true` y endpoint `PATCH /api/questions/{question_id}/irt`.
- [x] **[IRT-ING-04]** Recalibrar el motor CAT con los parámetros reales para mejorar la precisión del diagnóstico.
  - El CAT ya consume `irt_difficulty`, `irt_discrimination` e `irt_guessing` desde Question Bank en cada selección.
- [x] **[IRT-ING-05]** Identificar y archivar ítems con `discrimination_a < 0.5` (no discriminan adecuadamente) o `guessing_c > 0.35` (muy adivinables).
  - La calibración retorna `archive_candidates`; el archivado final queda como acción admin con `POST /api/questions/{question_id}/archive`.

> Nota Sprint 6: tooling implementado. Los criterios empíricos siguen bloqueados hasta ejecutar piloto real con suficientes respuestas.

#### Criterios de aceptación Sprint 6
- [ ] Al menos 300 ítems con parámetros IRT empíricos en BD.
- [ ] Correlación point-biserial > 0.3 en ≥80% de los ítems activos.
- [ ] Error estándar de medición del CAT ≤ 0.35 en escala θ.

---

## Evaluación: ¿Separar cada asignatura como microservicio?

### Contexto arquitectónico actual

El sistema tiene **10 microservicios por dominio funcional** (question-bank, ai-generator, exam-engine, diagnostic, etc.) con todas las asignaturas conviviendo dentro de cada uno, diferenciadas por `area_id`.

### Análisis de la propuesta: microservicios por asignatura

#### Qué significaría en la práctica

Cambiaría de una arquitectura por **dominio funcional** a una por **dominio de conocimiento**:

```
ACTUAL (por función):                PROPUESTO (por asignatura):
├── question-bank (todas áreas)      ├── questions-matematicas
├── ai-generator  (todas áreas)      ├── questions-ciencias
├── exam-engine   (todas áreas)      ├── questions-ingles
├── diagnostic    (todas áreas)      ├── questions-sociales
└── ...                              ├── questions-lectura-critica
                                     ├── ai-matematicas
                                     ├── ai-ingles
                                     └── ...
```

#### Ventajas reales

| Ventaja | Aplica en Saber 11 hoy? |
|---|---|
| Escalar independientemente según demanda por asignatura | ⚠️ Solo si las asignaturas tienen carga muy diferente |
| Deploy independiente (un docente puede actualizar preguntas de inglés sin tocar matemáticas) | ✅ Sí, valor claro para equipos de contenido separados |
| Fallos aislados (si el generador de inglés falla, no afecta matemáticas) | ✅ Reducción de blast radius |
| Modelos de IA especializados por área (un fine-tuned para STEM, otro para inglés) | ✅ Alta potencial futuro |
| Prompts de IA viven con el servicio de la asignatura (cohesión) | ✅ Diseño más natural |

#### Costos y riesgos

| Costo | Magnitud |
|---|---|
| De 10 servicios pasan a ~40-50 (10 func × 5 áreas) | Alto — complejidad operacional se multiplica |
| 5 bases de datos separadas para preguntas vs. 1 tabla con `area_id` | Medio — consultas cross-área se vuelven costosas |
| Gateway necesita routing por área además de por función | Medio |
| CI/CD pipeline se multiplica × 5 | Alto si no se tiene infraestructura madura |
| Compartir infraestructura (Redis, auth, media) es más complejo | Medio |
| Equipo actual pequeño; más servicios = más overhead de mantenimiento | **Crítico en etapa actual** |

### Recomendación: Arquitectura Híbrida (separación selectiva)

**No separar ahora** question-bank, exam-engine, diagnostic ni study-planner — son genéricos por diseño y funcionan bien así.

**Sí separar `ai-generator` en módulos por asignatura**, pero como **módulos dentro del mismo servicio**, no como servicios independientes:

```
services/ai-generator/
├── app/
│   ├── areas/
│   │   ├── ingles/
│   │   │   ├── prompts.py       # prompts especializados inglés
│   │   │   ├── validator.py     # validación L1, niveles MCER
│   │   │   └── templates/       # plantillas por sección 1-7
│   │   ├── matematicas/
│   │   │   ├── prompts.py
│   │   │   └── validator.py
│   │   ├── ciencias/
│   │   ├── sociales/
│   │   └── lectura_critica/
│   ├── generator.py             # orquestador genérico
│   └── main.py
```

**Si en el futuro se justifica la separación completa**, el punto de corte natural es cuando:
1. El equipo de contenido de inglés y de matemáticas trabajan de forma completamente independiente
2. Se requieren modelos de IA diferentes por asignatura (fine-tuning separado)
3. La carga de generación de una asignatura específica supera 10× a las demás

### Decisión recomendada

```
✅ HACER AHORA:
   Refactorizar ai-generator internamente con carpeta /areas/{asignatura}/
   — Sin impacto en API, sin cambio de infraestructura, máxima cohesión.

⏳ EVALUAR EN 6 MESES:
   Separar ai-generator en 5 servicios independientes si:
   - El equipo crece a >3 ingenieros de IA trabajando en paralelo
   - Se necesitan modelos o configuraciones de Claude diferentes por área

❌ NO HACER (al menos en esta etapa):
   Separar question-bank, exam-engine, diagnostic por asignatura
   — El costo operacional supera con creces el beneficio para el tamaño actual del sistema.
```

---

## Resumen de Entregables por Sprint

| Sprint | Duración | Entregable clave | Estado |
|---|---|---|---|
| Sprint 1 — Modelo de datos | 1 semana | Taxonomía 4 competencias + campos `dce_metadata`, `component_name` | ✅ Completado |
| Sprint 2 — Prompts IA | 1 semana | 7 sub-prompts con interferencia L1 + asignación automática de `component_name` | ✅ Completado |
| Sprint 3 — Componentes React | 1.5 semanas | `<ChatUI>`, `<NoticeSign>`, `<EmailWrapper>`, `<ClozeText>` integrados | ✅ Completado |
| Sprint 4 — Siembra y revisión | 2 semanas | 500 ítems APPROVED en banco | ⬜ Pendiente |
| Sprint 5 — CAT diagnóstico | 1 semana | Motor adaptativo inglés funcional | ✅ Implementado; falta prueba end-to-end con banco aprobado |
| Sprint 6 — Calibración IRT | 2 semanas | Parámetros empíricos en 300+ ítems | ✅ Tooling listo; requiere piloto real |

**Total estimado:** ~8.5 semanas de desarrollo activo + tiempo de piloto con estudiantes reales para Sprint 6.

---

*Referencia: [Diseño Instruccional Inglés](Diseño%20Instruccional%20Inglés.md) · [Arquitectura General](arquitectura_simulador_saber11.md) · [Estrategia Imágenes](estrategia_imagenes_saber11.md)*
