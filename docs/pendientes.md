# Informe de estado — Simulador Saber 11

**Fecha:** 2026-04-15 | **Revisión:** Auditoría de código completa

---

## Resumen ejecutivo

El **backend está sustancialmente completo**: los 7 microservicios tienen modelos de datos, endpoints REST y comunicación por eventos implementados. La brecha crítica es el **frontend**: solo el Dashboard del estudiante está terminado. El resto son páginas informativas o esqueletos sin flujos de acción reales.

---

## 1. Estado por servicio de backend

| Servicio | Estado | Observación |
|---|---|---|
| API Gateway | ✅ Completo | Auth proxy, rate limiting, roles mapeados. Dev mode activo (usuarios hardcodeados). |
| Question Bank | ✅ Completo | CRUD, taxonomía DCE, estados DRAFT→APPROVED, visual_assets. |
| AI Generator | ✅ Completo | Integración Claude, generación por área, validación de calidad. |
| Exam Engine | ✅ Completo | Sesiones, scoring server-side, events, historial. |
| Diagnostic (CAT/TRI) | ✅ Completo* | Modelo 3PL implementado. *Sin datos de calibración IRT reales. |
| Study Planner | ✅ Completo | Generación de plan, unidades semanales, progreso, reajuste. |
| Analytics | ✅ Completo | Consumo de eventos, KPIs por estudiante/grado/institución. |
| Notifications | ✅ Completo* | Storage + eventos. *Sin canal de entrega (no push, no email). |

---

## 2. Estado del frontend — La brecha real

### 2.1 Páginas existentes y su nivel real de implementación

| Página / Ruta | Estado | Qué hace realmente |
|---|---|---|
| `/login` | ✅ Real | Login completo con validación, manejo de errores |
| `/auth/forgot-password` | ⚠️ Parcial | UI estática, no conecta al backend |
| `/student/` — Dashboard | ✅ Real | Conectado a todos los endpoints, responsivo, suite de tests |
| `/student/diagnostico` | ❌ Stub | Panel de estado e información. No hay flujo para hacer el diagnóstico |
| `/student/plan` | ❌ Stub | Muestra la unidad siguiente. No permite practicar, completar unidades |
| `/student/resultados` | ❌ Stub | Lista las últimas 3 sesiones. No permite ver el detalle de ningún examen |
| `/teacher` | ❌ Esqueleto | 4 tarjetas KPI + lista de bullets. Sin navegación, sin funcionalidad |
| `/admin` | ❌ Esqueleto | Igual que teacher. Sin navegación ni funcionalidad |

### 2.2 Flujos de acción completamente ausentes

**Para el ESTUDIANTE:**
- **Tomar el diagnóstico CAT**: el backend selecciona preguntas adaptativamente, pero no existe UI para presentar la pregunta, responder y avanzar al siguiente ítem
- **Practicar desde el plan**: no hay UI para responder las preguntas de una unidad semanal y marcarla como completada
- **Tomar un simulacro**: el Exam Engine tiene todo el backend, no existe ninguna pantalla de examen
- **Ver resultados detallados**: solo se muestran 3 tarjetas con puntaje global; no hay desglose por competencia, ni revisión de respuestas correctas/incorrectas

**Para el DOCENTE:**
- No existe layout con navegación (el estudiante tiene `StudentLayout` con sidebar; el docente no tiene nada equivalente)
- No existe UI para crear/editar preguntas manualmente
- No existe UI para revisar y aprobar preguntas `PENDING_REVIEW`
- No existe tabla de analítica de sus estudiantes
- No existe UI para crear exámenes o asignarlos

**Para el ADMIN:**
- No existe panel de gestión del banco de preguntas
- No existe UI para disparar generación de preguntas con IA
- No existe visor de logs de auditoría
- No existe UI para reportes institucionales exportables
- No existe gestión de usuarios/sincronización Kampus

---

## 3. Deuda técnica crítica

### 3.1 Calibración IRT — Diagnóstico no funcional en práctica

El motor CAT/3PL está implementado correctamente, pero los parámetros de dificultad (`b`), discriminación (`a`) y guessing (`c`) de cada pregunta son **valores por defecto hardcodeados**. Esto significa que el algoritmo de selección de ítems no puede discriminar preguntas fáciles de difíciles. El diagnóstico funcionará pero no será adaptativo hasta que haya datos de calibración reales.

### 3.2 Autenticación Kampus no validada en producción

El gateway tiene un `DEV_MODE` con usuarios hardcodeados (`estudiante/demo1234`, `docente/demo1234`, `admin/demo1234`). La integración real con la API de Kampus (`POST /api/auth/token/`) nunca fue validada contra un entorno real. Los ítems de Sprint 1 del plan maestro (validación de endpoints Kampus, método de auth real, CORS/DNS) están marcados como **pendientes** en el TODO.

### 3.3 Renderizado visual programático sin consumidor

El backend genera `visual_data` JSON para gráficas, diagramas SVG, plantillas HTML (avisos para Inglés, etc.) con `render_engine` especificado. El frontend no tiene ningún componente para consumir esto: no existe `ChartRenderer`, `SVGDiagramRenderer`, `HTMLCardRenderer` ni `ColombiaMapRenderer`.

### 3.4 Notificaciones sin entrega real

Las notificaciones se generan y almacenan en base de datos al completar eventos (examen, diagnóstico, plan). No hay mecanismo de entrega: sin WebSocket, sin push, sin email. El estudiante solo las ve si visita el dashboard y el sistema las muestra en el `DashboardNotificationsPreview`.

---

## 4. Elementos del TODO.md aún abiertos

| Ítem | Contexto |
|---|---|
| Validar endpoints reales de Kampus | Sprint 1 del plan maestro, nunca ejecutado |
| Confirmar método auth real (SimpleJWT vs token DRF) | Ídem |
| Confirmar CORS, DNS y certificados de producción | Ídem |
| M1 — Auth federada estable con Kampus | Meta global sin cerrar |
| M3 — Soporte completo de recursos visuales en frontend | Backend listo, frontend sin consumidores |
| Runbooks para incidentes frecuentes | Backlog operaciones |
| Riesgo: endpoints Kampus incompletos | Sin resolver |

---

## 5. Prioridad de implementación recomendada

### Bloquea el uso real del producto (P0)

1. **Flujo de examen / simulacro** (UI completa para Exam Engine)
2. **Flujo de diagnóstico CAT** (UI pregunta-a-pregunta)
3. **Práctica desde el plan** (responder y completar unidades)

### Necesario para valor diferencial (P1)

4. **Teacher Dashboard** con layout, gestión de preguntas y analítica de estudiantes
5. **Calibración IRT**: poblar los parámetros `difficulty`/`discrimination`/`guessing` del banco de preguntas
6. **Renderizado de medios visuales** en la pantalla de examen (Chart.js, SVG templates)
7. **Resultados detallados** con revisión de respuestas y desglose por competencia

### Necesario para operación institucional (P2)

8. **Admin Dashboard** con gestión del banco y generación IA
9. **Validación de la integración Kampus** en entorno real
10. **Canal de notificaciones** (al menos polling WebSocket para in-app; email como siguiente paso)
11. **Exportación de reportes** (PDF/Excel para analítica institucional)

---

**En una frase**: el backend puede procesar todo el ciclo académico; el frontend solo muestra el punto de partida del estudiante. Los flujos de acción — tomar el diagnóstico, practicar, presentar el simulacro, revisar resultados — no existen aún en ningún rol.
