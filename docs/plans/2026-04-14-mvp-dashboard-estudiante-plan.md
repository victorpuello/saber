# Plan formal MVP Dashboard Estudiante

## 1. Contexto
- Fecha: 2026-04-14
- Proyecto: Simulador Saber 11
- Modulo: Dashboard del estudiante 
- Estado: En ejecucion

## 2. Objetivo del MVP
Entregar un dashboard de estudiante funcional, estable y util para toma de accion diaria, con UI completa en desktop y mobile, conectado a APIs reales y con calidad minima de salida a piloto.

## 3. Resultado esperado (MVP al 100%)
- El estudiante entiende su estado academico en menos de 10 segundos.
- El estudiante identifica su siguiente accion recomendada sin navegar a otras vistas.
- El dashboard soporta estados loading, empty y error por modulo.
- La UI mantiene consistencia visual y accesibilidad basica.
- El flujo principal queda cubierto por pruebas automatizadas minimas.

## 4. Alcance funcional
### Incluye
- Hero academico con indicadores clave.
- Progreso del plan activo.
- Proxima tarea recomendada.
- Rendimiento por area.
- Actividad reciente.
- Notificaciones (conteo y listado corto).
- Navegacion principal (desktop + mobile).

### No incluye (post-MVP)
- Personalizacion avanzada del layout por estudiante.
- Motor predictivo nuevo para recomendaciones.
- Gamificacion social avanzada.

## 5. Fuentes de datos comprometidas
- /api/plans/history
- /api/plans/active
- /api/plans/active/progress
- /api/plans/active/week/{week_number}
- /api/diagnostic/sessions
- /api/diagnostic/profile
- /api/sessions/history
- /api/sessions/{session_id}/results
- /api/notifications/unread-count
- /api/notifications
- /api/notifications/read
- /api/analytics/student/{student_id}/progress

## 6. Plan de ejecucion por semanas

### Semana 1 - Arquitectura modular UI
Objetivo: dejar el dashboard desacoplado en componentes, con estructura final y estados base.

Checklist editable:
- [x] Definir view model unico para la pantalla de estudiante.
- [x] Crear carpeta modular para secciones del dashboard.
- [x] Separar header, hero, KPIs, actividad y acciones en componentes.
- [x] Implementar estado loading reutilizable por tarjeta/seccion.
- [x] Implementar estado empty reutilizable por seccion.
- [x] Implementar estado error parcial por modulo.
- [x] Mantener responsive desktop/mobile en layout principal.
- [x] Dejar documentadas decisiones de arquitectura en este plan.

### Semana 2 - Integracion de datos real
Objetivo: conectar cada seccion a endpoints reales con fallback seguro.

Checklist editable:
- [x] Conectar plan activo e historial.
- [x] Conectar progreso por area y progreso global.
- [x] Conectar diagnostico y resumen de competencias.
- [x] Conectar historial de sesiones recientes.
- [x] Conectar notificaciones resumidas y accion de lectura.
- [x] Implementar adaptadores para normalizar payloads.
- [x] Definir reglas de prioridad para "siguiente accion".

### Semana 3 - UX fina y accesibilidad
Objetivo: elevar calidad percibida y usabilidad en escenarios reales.

Checklist editable:
- [x] Completar navegacion lateral (desktop) y bottom nav (mobile).
- [ ] Implementar feedback visual en acciones clave.
- [ ] Validar focus visible y navegacion por teclado.
- [ ] Ajustar contraste y legibilidad en tarjetas criticas.
- [ ] Revisar consistencia de espaciado y jerarquia visual.
- [ ] Ejecutar QA funcional de estados loading/empty/error.

### Semana 4 - Calidad y salida
Objetivo: cerrar pruebas, estabilidad y checklist de release.

Checklist editable:
- [ ] Pruebas unitarias de adaptadores y reglas de negocio.
- [ ] Pruebas de integracion de carga inicial del dashboard.
- [ ] E2E basico: login -> dashboard -> accion principal.
- [ ] Revisar rendimiento (carga paralela, re-render, errores).
- [ ] Cerrar defectos P0/P1 del modulo.
- [ ] Checklist final de salida aprobado.

## 7. Definicion de terminado (DoD)
- [ ] UI completa en desktop y mobile para el alcance MVP.
- [ ] Datos reales conectados en todos los modulos del alcance.
- [ ] Estados loading/empty/error disponibles y validados.
- [ ] Sin bloqueadores criticos de usuario final.
- [ ] Suite minima de pruebas ejecutada en verde.
- [ ] Documentacion de decisiones y riesgos actualizada.

## 8. Riesgos y mitigacion
- Riesgo: latencia o fallas parciales de microservicios.
  Mitigacion: carga paralela, timeout y degradacion por modulo.
- Riesgo: diferencia entre payload real y estructura UI.
  Mitigacion: adaptadores tipados y validacion temprana.
- Riesgo: deuda tecnica por componente monolitico.
  Mitigacion: arquitectura por secciones + hook de orquestacion.

## 8.1 Decisiones de arquitectura aplicadas
- El dashboard del estudiante se desacoplo en un hook de orquestacion (`useStudentDashboardViewModel`) y una capa de componentes presentacionales por seccion.
- La obtencion de datos se mantiene paralela desde `frontend/src/services/dashboard.ts` para evitar waterfalls y degradar por modulo cuando falle un endpoint puntual.
- La pagina `Dashboard.tsx` queda como contenedor de composicion, sin mezclar logica de fetch ni transformaciones complejas de datos.
- Se introdujo un estado vacio reutilizable para homogeneizar secciones sin datos (`DashboardSectionEmptyState`).
- Se agregaron secciones modulares de progreso por area y notificaciones recientes para acercar la UI al MVP definido.
- La compilacion del frontend se valido con `pnpm build` al cierre de esta iteracion.

## 9. Registro de avances
- [x] Semana 1 iniciada
- [x] Semana 1 completada
- [x] Semana 2 completada
- [ ] Semana 3 completada
- [ ] Semana 4 completada
- [ ] MVP dashboard estudiante cerrado
