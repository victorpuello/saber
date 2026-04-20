# Diseño: Jobs de Generación IA en Segundo Plano

## 1. Contexto
- Fecha: 2026-04-19
- Proyecto: Simulador Saber 11
- Módulo: Banco de Preguntas / AI Generator
- Objetivo: eliminar timeouts HTTP y mejorar UX al generar preguntas IA.

## 2. Problema actual
La generación IA es síncrona: el docente abre un modal, envía un lote y queda bloqueado esperando toda la respuesta. Cuando la generación tarda más de lo esperado o se lanzan varios lotes seguidos, la UX se degrada y aparecen timeouts. El sistema además no muestra progreso real, no persiste seguimiento tras recargar y no permite reintento/cancelación.

## 3. Decisión de arquitectura
Se implementará un sistema de jobs persistentes en segundo plano usando Redis Streams mediante el EventBus ya existente del repositorio. No se usará Celery en esta iteración.

### Justificación
- Redis ya existe y está operativo en el stack.
- El repositorio ya tiene patrón de consumer sobre Redis Streams en notifications y analytics.
- Menor fricción operativa que introducir Celery.
- Permite evolucionar más adelante a un worker separado si el volumen crece.

## 4. Alcance UX aprobado
Se construirá una experiencia completa:
- Encolar trabajo desde el modal sin esperar a que termine todo el lote.
- Mostrar progreso persistente por job.
- Permitir cerrar el modal y continuar trabajando.
- Mostrar historial/centro de jobs dentro del Banco de Preguntas.
- Permitir reintento de jobs fallidos o parciales.
- Permitir cancelación cooperativa.
- Recuperar seguimiento tras recargar la página.

## 5. Diseño backend
### 5.1 Persistencia
Se crearán dos tablas nuevas en db-ai:
- generation_jobs
- generation_job_items

Cada job almacenará:
- id
- requested_by_user_id
- status (QUEUED, RUNNING, COMPLETED, FAILED, PARTIAL, CANCELLED)
- parámetros de generación
- totales y progreso
- errores agregados
- timestamps

Cada item almacenará:
- job_id
- item_index
- status
- provider/model
- question_id generado si aplica
- token usage
- errores individuales
- timestamps

### 5.2 Cola y worker
Se publicará un evento Redis Stream al crear el job.
Un consumer en ai-generator leerá jobs pendientes y procesará cada pregunta secuencialmente o con concurrencia baja configurable.

### 5.3 API
Se agregarán endpoints:
- POST /api/ai/jobs
- GET /api/ai/jobs
- GET /api/ai/jobs/{job_id}
- POST /api/ai/jobs/{job_id}/retry
- POST /api/ai/jobs/{job_id}/cancel

Se mantendrá compatibilidad temporal con /api/ai/generate/batch.

### 5.4 Estados
- QUEUED
- RUNNING
- COMPLETED
- FAILED
- PARTIAL
- CANCELLED

### 5.5 Reglas operativas
- Límite inicial recomendado: máximo 2 jobs activos por usuario.
- Estado PARTIAL si algunas preguntas fallan pero otras se generan.
- Cancelación cooperativa entre ítems, no interrupción forzada de una llamada LLM en curso.

## 6. Diseño frontend
### 6.1 Modal de generación
GenerateAIModal dejará de esperar un BatchResponse completo. En su lugar:
- valida el formulario
- crea un job
- muestra confirmación inmediata
- ofrece abrir seguimiento

### 6.2 Job Center
Se añadirá una sección persistente dentro de Banco de Preguntas con:
- jobs recientes
- barra de progreso
- estado visual
- contadores
- acciones de cancelar y reintentar

### 6.3 Actualización
Se usará polling corto para jobs activos. Cuando no haya jobs activos, el polling se detendrá.
Al finalizar un job exitoso/parcial, se refrescará la tabla de preguntas.

## 7. Riesgos y mitigación
- Riesgo: sobrecarga del proveedor IA.
  Mitigación: concurrencia baja configurable y límites por usuario.
- Riesgo: pérdida de estado si cae el proceso.
  Mitigación: persistencia de jobs en DB + Redis Stream.
- Riesgo: complejidad de cancelación.
  Mitigación: cancelación cooperativa y contrato explícito.

## 8. Verificación
- Tests de transición de estado de jobs.
- Test de integración de creación y polling de job.
- Pruebas manuales con 1, 5 y 10 preguntas.
- Pruebas manuales con recarga de página y 3 jobs consecutivos.

## 9. Archivos previstos
- services/ai-generator/app/models.py
- services/ai-generator/app/schemas.py
- services/ai-generator/app/routes.py
- services/ai-generator/app/main.py
- frontend/src/pages/admin/questionBank/components/GenerateAIModal.tsx
- frontend/src/pages/admin/QuestionBank.tsx
- frontend/src/pages/admin/questionBank/useQuestionBankViewModel.ts
- frontend/src/services/aiProviders.ts
