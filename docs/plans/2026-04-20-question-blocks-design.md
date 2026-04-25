# Diseño: Octavo Componente y Bloques de Preguntas

## 1. Contexto
- Fecha: 2026-04-20
- Proyecto: Simulador Saber 11
- Módulo: Design System, Banco de Preguntas y Sesión de Examen
- Objetivo: incorporar un octavo componente visual de contexto y definir una estructura de bloque para agrupar hasta 3 preguntas derivadas de un mismo contexto.

## 2. Problema actual
El sistema actual modela preguntas de selección múltiple con única respuesta y asume que cada pregunta contiene su propio contexto. En la práctica hay dos vacíos:

- El kit visual no incluye explícitamente el caso de contexto solo textual, aunque ese es el caso operativo más frecuente hoy.
- No existe una estructura formal para representar varios ítems derivados de un mismo estímulo común, a pesar de que este patrón es natural en evaluaciones tipo Saber 11.

Como resultado, el design system, la UX y el modelo de datos no distinguen con claridad entre:

- el tipo visual del contexto
- la estructura pedagógica de una pregunta individual o un bloque de preguntas

## 3. Decisión de arquitectura
Se separarán dos conceptos que hoy están mezclados:

- Tipo de contexto: define la forma visual y semántica del estímulo compartido.
- Tipo de estructura: define si el contexto alimenta una sola pregunta o un bloque.

No se usará el nombre "pregunta múltiple" porque se confunde con selección múltiple. El nombre aprobado para la nueva estructura es:

- Bloque de preguntas

Alias interno aceptable en documentación técnica o conversación de producto:

- Pack de contexto

## 4. Catálogo visual aprobado
El sistema de diseño quedará con 8 componentes de contexto:

1. Texto + tabla
2. Tabla científica
3. Gráfica de barras
4. Aviso público
5. Diálogo
6. Cloze
7. Figura SVG
8. Texto base simple

### 4.1 Texto base simple
Este octavo componente cubre el caso operativo actual donde el contexto es únicamente un texto continuo o un breve material de lectura sin tabla, gráfico, figura o layout especial.

Debe poder usarse tanto en:

- pregunta individual
- bloque de preguntas

## 5. Estructura pedagógica aprobada
Se formalizan dos modos estructurales:

1. Individual
2. Bloque de preguntas

### 5.1 Reglas del bloque
- Un bloque comparte un único contexto base.
- Un bloque puede contener 2 o 3 subpreguntas.
- Nunca puede contener más de 3 subpreguntas.
- Cada subpregunta conserva autonomía evaluativa.

### 5.2 Reglas de la pregunta individual
- Una estructura individual contiene exactamente 1 pregunta evaluable.
- Puede usar cualquiera de los 8 tipos de contexto.

## 6. Alcance UX aprobado
### 6.1 Sesión de examen o diagnóstico
Cuando el estudiante entra a un bloque:

- El panel izquierdo mantiene el mismo contexto durante todo el bloque.
- El panel derecho cambia entre Pregunta 1, Pregunta 2 y Pregunta 3 del bloque.
- La navegación interna del bloque debe mostrarse como chips o pestañas numeradas.
- Debe existir progreso global del examen y progreso interno del bloque.
- Navegar entre subpreguntas no debe recargar ni desplazar el contexto compartido.

### 6.2 Banco de preguntas
La creación de contenido debe separar primero estructura y luego contexto:

- Estructura: Individual o Bloque de preguntas.
- Tipo de contexto: uno de los 8 componentes visuales.

Si la estructura es individual:

- el flujo se mantiene cercano al actual.

Si la estructura es bloque:

- se captura un solo contexto base
- luego se crean 2 o 3 subpreguntas derivadas
- la UI no permite crear una cuarta subpregunta

En listados y detalle, el bloque debe mostrarse como una unidad visible, por ejemplo:

- Bloque · 3 preguntas · Texto base simple

## 7. Modelo de dominio propuesto
### 7.1 Entidades conceptuales
- Contexto
- Tipo de contexto
- Tipo de estructura
- Bloque de preguntas
- Subpregunta

### 7.2 Responsabilidades
Contexto:
- representa el estímulo compartido
- contiene el contenido base y su tipo visual

Bloque de preguntas:
- agrupa subpreguntas derivadas de un contexto común
- define el orden interno
- garantiza el máximo de 3 subpreguntas

Subpregunta:
- contiene enunciado, opciones, respuesta correcta, explicaciones y metadatos
- se evalúa de forma independiente

## 8. Evolución mínima del modelo actual
Para minimizar impacto, no se recomienda rehacer todo el sistema alrededor del bloque desde el primer cambio. La evolución recomendada es incremental:

1. Extraer el contexto como entidad reutilizable.
2. Permitir que una o varias preguntas apunten al mismo contexto.
3. Introducir un agrupador lógico para identificar bloques.
4. Validar que ningún bloque tenga más de 3 subpreguntas.

Dirección técnica sugerida:

- mantener la pregunta como unidad evaluable
- mover context_type al contexto compartido
- agregar block_id opcional en preguntas o una entidad explícita de bloque
- agregar item_order para preservar orden dentro del bloque

## 9. Reglas de negocio aprobadas
1. Una estructura individual tiene exactamente 1 subpregunta.
2. Un bloque tiene mínimo 2 y máximo 3 subpreguntas.
3. Todas las subpreguntas del bloque comparten el mismo contexto.
4. Cada subpregunta guarda su propia respuesta, corrección, tiempo invertido y explicación.
5. El orden de las subpreguntas dentro del bloque debe ser explícito.
6. El límite de 3 es una regla dura de negocio, no solo de interfaz.

## 10. Validaciones requeridas
### 10.1 Frontend admin
- impedir guardar un bloque con una sola subpregunta
- impedir agregar una cuarta subpregunta
- impedir subpreguntas vacías o incompletas

### 10.2 Backend
- rechazar cualquier creación o actualización que supere 3 subpreguntas por bloque
- rechazar estructuras inconsistentes entre modo individual y bloque
- preservar el orden interno del bloque

### 10.3 Runtime de examen
- si existe bloque, renderizar navegación interna
- si no existe bloque, mantener comportamiento actual

## 11. Impacto por capa
### 11.1 Design system
- agregar el componente 8: Texto base simple
- documentar Bloque de preguntas como estructura transversal, no como un noveno contexto visual

### 11.2 Banco de preguntas
- agregar selector de estructura
- permitir creación y edición de bloques
- mostrar el conteo interno de subpreguntas

### 11.3 Servicios y contratos
- introducir contexto compartido y relación de bloque
- mantener compatibilidad gradual con el modelo actual de pregunta individual

### 11.4 Sesión de examen
- soportar múltiples subpreguntas con el mismo contexto base
- persistir respuestas por subpregunta

### 11.5 Resultados y analítica
- mostrar el bloque como unidad agrupada
- conservar scoring por subpregunta

## 12. Estrategia de implementación recomendada
### Fase 1
- actualizar el design system con el componente Texto base simple
- documentar Bloque de preguntas y sus reglas

### Fase 2
- adaptar contratos de datos para contexto compartido y bloque
- mantener preguntas individuales funcionando sin migración masiva inmediata

### Fase 3
- extender el Banco de Preguntas para crear y editar bloques

### Fase 4
- extender sesión de examen, resultados y navegación interna del bloque

## 13. Verificación
Casos mínimos a cubrir:

1. Crear pregunta individual con Texto base simple.
2. Crear bloque de 2 subpreguntas con contexto compartido.
3. Crear bloque de 3 subpreguntas con contexto compartido.
4. Intentar crear una cuarta subpregunta y verificar rechazo.
5. Navegar dentro del bloque sin perder contexto.
6. Persistir respuestas independientes por subpregunta.
7. Visualizar resultados por subpregunta dentro del bloque.

## 14. Archivos probablemente impactados
- saber-11-design-system/ui_kits/simulador/components/question-components.js
- saber-11-design-system/ui_kits/simulador/QuestionTypes.html
- saber-11-design-system/README.md
- frontend/src/pages/admin/questionBank/**
- frontend/src/pages/student/ExamSession.tsx
- frontend/src/services/questions.ts
- frontend/src/services/examSession.ts

## 15. Decisiones aprobadas
- Se aprueba el componente 8: Texto base simple.
- Se aprueba separar tipo de contexto de tipo de estructura.
- Se aprueba usar el nombre Bloque de preguntas.
- Se aprueba un máximo duro de 3 subpreguntas por bloque.
- Se aprueba que el bloque reutilice un único contexto compartido con navegación interna en el panel derecho.