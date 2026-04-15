# TODO - Plan de trabajo de desarrollo

Fecha de creacion: 2026-04-14
Estado general: Sprint 2 en progreso
Duracion objetivo: 24 semanas (12 sprints de 2 semanas)

## 1) Verificacion de documentos fuente

- [x] Revisado: arquitectura_simulador_saber11.md
- [x] Revisado: estrategia_imagenes_saber11.md
- [x] Revisado: integracion_kampus_produccion.md
- [ ] Validar en entorno real los endpoints exactos de Kampus (/api)
- [ ] Confirmar metodo de autenticacion real (JWT simplejwt vs token DRF)
- [ ] Confirmar CORS, DNS y certificados para dominios del simulador

## 2) Metas del programa (medibles)

- [ ] M1. Autenticacion federada estable con Kampus para STUDENT, TEACHER y ADMIN.
- [ ] M2. Banco de preguntas DCE operativo con flujo manual + IA + revision.
- [ ] M3. Soporte completo de recursos visuales: upload, programmatic, asset library.
- [ ] M4. Motor de examenes con sesiones, calificacion y eventos.
- [ ] M5. Diagnostico adaptativo (CAT/TRI) y perfil por competencias.
- [ ] M6. Plan de estudio adaptativo con reajuste por progreso.
- [ ] M7. Analitica por estudiante, grado e institucion.
- [ ] M8. Despliegue productivo con seguridad, observabilidad y piloto institucional.

## 3) Definicion de terminado (DoD) transversal

Cada sprint se considera completado solo si cumple todo:

- [ ] Historias/tareas del sprint cerradas y demostradas.
- [ ] Pruebas minimas definidas para el sprint (unitarias + integracion clave).
- [ ] Documentacion tecnica y API actualizada.
- [ ] Logs y metricas de los nuevos componentes visibles.
- [ ] Sin defectos criticos P0/P1 abiertos del alcance del sprint.

## 4) Plan por fases y sprints chequeables

## Fase A - Fundaciones e integracion (Sprints 1-3)

### Sprint 1 (Semanas 1-2) - Descubrimiento tecnico y contratos Kampus

Meta del sprint:
Tener contratos reales de integracion y autenticacion validados contra Kampus.

Checklist:
- [ ] Mapear endpoints reales desde /api y urls.py del backend Kampus.
- [ ] Confirmar flujo de login real y refresh token.
- [ ] Definir contrato de rol Kampus -> rol simulador (STUDENT/TEACHER/ADMIN).
- [ ] Especificar contrato de datos minimos por usuario (grado, grupo, asignaturas).
- [ ] Definir estrategia de fallback: app saber11_bridge si faltan endpoints.
- [ ] Registrar riesgos, decisiones y supuestos de integracion.

Criterios de aceptacion:
- [ ] Documento de contratos aprobado por equipo tecnico.
- [ ] Prueba manual: login de un usuario real de Kampus en ambiente de desarrollo.
- [ ] Decisiones de autenticacion y seguridad cerradas para implementar.

### Sprint 2 (Semanas 3-4) - Plataforma base y entorno de desarrollo

Meta del sprint:
Levantar arquitectura base de microservicios con ejecucion local reproducible.

Checklist:
- [x] Crear estructura base de gateway + servicios + frontend.
- [x] Configurar docker compose de desarrollo con Postgres y Redis.
- [x] Implementar health checks por servicio.
- [x] Configurar manejo de variables de entorno y secretos locales.
- [x] Configurar pipeline CI basico (lint, test, build).
- [x] Definir convenciones de logs, tracing y correlacion de requests.

Criterios de aceptacion:
- [x] Comando unico para levantar entorno local completo.
- [x] Todos los servicios reportan estado saludable.
- [x] Pipeline CI ejecuta validaciones base sin errores.

### Sprint 3 (Semanas 5-6) - API Gateway + autenticacion federada

Meta del sprint:
Operar autenticacion federada de punta a punta desde el gateway.

Checklist:
- [x] Implementar endpoint de login del simulador (proxy controlado a Kampus).
- [x] Emitir JWT interno del simulador con claims requeridos.
- [x] Implementar middleware de autorizacion por rol y permisos.
- [x] Configurar rate limiting por usuario e IP.
- [x] Implementar refresh token y expiracion de sesiones.
- [x] Pruebas de seguridad basicas (token invalido, expirado, rol incorrecto).

Criterios de aceptacion:
- [x] Flujo login -> acceso protegido -> refresh funcionando.
- [x] Rutas protegidas niegan acceso cuando el rol no aplica.
- [x] Auditoria minima de autenticacion habilitada.

## Fase B - Banco de preguntas y recursos visuales (Sprints 4-6)

### Sprint 4 (Semanas 7-8) - Question Bank + taxonomia DCE

Meta del sprint:
Tener el banco de preguntas con modelo DCE y datos semilla del Saber 11.

Checklist:
- [x] Implementar modelo de datos de areas, competencias, afirmaciones y evidencias.
- [x] Crear migraciones y seeds de taxonomia para 5 areas.
- [x] Exponer APIs de consulta de taxonomia.
- [x] Implementar CRUD base de preguntas manuales.
- [x] Implementar estados DRAFT, PENDING_REVIEW, APPROVED, REJECTED, ARCHIVED.
- [x] Validar reglas de negocio para preguntas de 3 y 4 opciones.

Criterios de aceptacion:
- [x] Seed completo cargado sin errores.
- [x] Docente/Admin pueden crear y consultar preguntas por filtros.
- [x] Flujo de revision cambia estado de forma auditable.

### Sprint 5 (Semanas 9-10) - Estrategia visual: upload y asset library

Meta del sprint:
Soportar medios visuales como entidad de primera clase del item.

Checklist:
- [x] Implementar upload manual con validaciones de formato, peso y dimensiones.
- [x] Procesar imagenes (optimizacion, thumbnail, version HD).
- [x] Persistir media en object storage y relacionar en question_media.
- [x] Implementar visual_assets con metadata, tags y licencias.
- [x] Implementar busqueda y seleccion de assets por area/tipo/tag.
- [x] Hacer alt_text obligatorio para todo recurso visual.

Criterios de aceptacion:
- [x] Docente puede subir imagen, verla y asociarla a una pregunta.
- [x] Docente/Admin pueden reutilizar assets del banco curado.
- [x] Preguntas con media no se publican si falta alt_text.

### Sprint 6 (Semanas 11-12) - AI Generator + visuales programaticos

Meta del sprint:
Generar preguntas IA con salida validada y soporte visual programatico.

Checklist:
- [x] Implementar endpoints /generate y /generate/batch para ADMIN.
- [x] Implementar prompts por area y validador automatico de calidad.
- [x] Implementar visual_data y render_engine para chart/svg/html/map.
- [x] Validar coherencia imagen-pregunta-alt_text antes de enviar a revision.
- [x] Enviar preguntas IA a flujo PENDING_REVIEW.
- [x] Registrar metrica de tasa aprobacion/rechazo IA.

Criterios de aceptacion:
- [x] Se generan preguntas validas y pasan a revision.
- [x] El render de visuales programaticos funciona en modo no interactivo para examen.
- [x] Todas las preguntas IA tienen explicaciones pedagogicas por opcion.

## Fase C - Evaluacion, diagnostico y plan adaptativo (Sprints 7-9)

### Sprint 7 (Semanas 13-14) - Exam Engine

Meta del sprint:
Ejecutar simulacros con sesiones reales y calificacion segura server-side.

Checklist:
- [ ] Implementar creacion de examenes (DIAGNOSTIC, FULL_SIMULATION, AREA_PRACTICE, CUSTOM).
- [ ] Implementar inicio de sesion de examen y guardado de respuestas.
- [ ] Implementar cierre de sesion y calculo de puntajes.
- [ ] Emitir evento exam.completed al finalizar.
- [ ] Asegurar que el frontend no reciba la respuesta correcta durante examen.
- [ ] Implementar historial de sesiones por estudiante.

Criterios de aceptacion:
- [ ] Estudiante puede presentar y finalizar examen completo.
- [ ] Puntaje y resultados quedan persistidos y consultables.
- [ ] Validacion de seguridad evita fuga de respuesta correcta.

### Sprint 8 (Semanas 15-16) - Diagnostic Engine (CAT/TRI)

Meta del sprint:
Calcular perfil inicial por competencias con evaluacion adaptativa.

Checklist:
- [ ] Implementar sesion de diagnostico adaptativo por area.
- [ ] Implementar seleccion de items cercana a theta y cobertura de competencias.
- [ ] Implementar actualizacion de theta y error estandar por respuesta.
- [ ] Implementar criterio de parada por precision minima.
- [ ] Persistir student_profiles y competency_scores.
- [ ] Emitir evento diagnostic.completed.

Criterios de aceptacion:
- [ ] Diagnostico finaliza con clasificacion por competencia.
- [ ] Perfil resultante es consultable por estudiante y por docente/admin autorizado.
- [ ] Eventos de diagnostico disponibles para plan y analitica.

### Sprint 9 (Semanas 17-18) - Study Planner adaptativo

Meta del sprint:
Generar y reajustar plan de estudio semanal segun debilidades detectadas.

Checklist:
- [ ] Implementar generacion inicial de plan (8-12 semanas).
- [ ] Priorizar competencias CRITICAL y WEAKNESS.
- [ ] Crear unidades semanales con practica asignada.
- [ ] Implementar marcado de avance por unidad.
- [ ] Recalcular prioridad del plan tras progreso o estancamiento.
- [ ] Emitir evento plan.updated para notificaciones.

Criterios de aceptacion:
- [ ] Estudiante visualiza plan activo y puede completar unidades.
- [ ] Plan se reajusta con evidencia de rendimiento.
- [ ] Docente/Admin pueden consultar plan por estudiante.

## Fase D - Analitica, operaciones y salida a produccion (Sprints 10-12)

### Sprint 10 (Semanas 19-20) - Analytics Service y tableros

Meta del sprint:
Entregar analitica accionable por estudiante, grado e institucion.

Checklist:
- [ ] Consumir eventos del bus (exam.completed, diagnostic.completed, question.created).
- [ ] Implementar KPIs de progreso individual y por curso.
- [ ] Implementar reporte de desempeno por competencia y area.
- [ ] Implementar metricas de rendimiento del banco de preguntas.
- [ ] Exponer endpoints de analitica por rol.
- [ ] Validar performance de consultas analiticas.

Criterios de aceptacion:
- [ ] Dashboard muestra datos consistentes con resultados reales.
- [ ] Consultas clave responden dentro de tiempos objetivo definidos.
- [ ] Reportes institucionales exportables y auditables.

### Sprint 11 (Semanas 21-22) - Notificaciones, sync y hardening

Meta del sprint:
Completar operacion institucional con sincronizacion y seguridad reforzada.

Checklist:
- [ ] Implementar Notification Service para hitos y recordatorios.
- [ ] Implementar jobs periodicos de sync de estudiantes/docentes desde Kampus.
- [ ] Completar auditoria de acciones criticas (crear/editar/aprobar).
- [ ] Aplicar politicas finales de CORS, rate limiting y rotacion de tokens.
- [ ] Configurar backups, retencion y plan de recuperacion.
- [ ] Ejecutar pruebas de seguridad basicas (authz, inyeccion, abuso API).

Criterios de aceptacion:
- [ ] Notificaciones disparadas por eventos reales del sistema.
- [ ] Datos sincronizados con Kampus sin inconsistencias criticas.
- [ ] Checklist de seguridad operativa aprobado.

### Sprint 12 (Semanas 23-24) - Piloto institucional y salida a produccion

Meta del sprint:
Ejecutar piloto controlado y pasar a produccion con observabilidad completa.

Checklist:
- [ ] Desplegar entorno productivo con dominios y SSL.
- [ ] Ejecutar pruebas E2E del flujo completo (login -> diagnostico -> plan -> simulacro).
- [ ] Ejecutar prueba de carga y estabilidad.
- [ ] Cerrar defectos P0/P1 del piloto.
- [ ] Preparar runbook de operacion y soporte.
- [ ] Entrenar usuarios clave (admin, docente lider, soporte).

Criterios de aceptacion:
- [ ] Go/No-Go formal aprobado.
- [ ] Operacion productiva estable en ventana de observacion definida.
- [ ] Acta de cierre del proyecto con backlog post-lanzamiento.

## 5) Backlog transversal (ejecucion continua)

## 5.1 Calidad y pruebas
- [ ] Definir estrategia de pruebas por servicio.
- [ ] Cobertura minima por modulo critico.
- [ ] Pruebas de contrato entre gateway y servicios.
- [ ] Pruebas de regresion para examen y diagnostico.

## 5.2 Seguridad y cumplimiento
- [ ] Matriz de permisos por rol revisada y testeada.
- [ ] Cifrado en reposo y en transito verificado.
- [ ] Politica de secretos y rotacion implementada.
- [ ] Evidencias de auditoria disponibles por accion critica.

## 5.3 Observabilidad y operaciones
- [ ] Dashboards de salud por servicio.
- [ ] Alertas para errores, latencia y disponibilidad.
- [ ] Trazabilidad de eventos del bus de Redis Streams.
- [ ] Runbooks para incidentes frecuentes.

## 6) Riesgos principales y mitigacion

- [ ] Riesgo: endpoints Kampus incompletos o no estandar.
  Mitigacion: activar saber11_bridge y cerrar contratos en Sprint 1.

- [ ] Riesgo: inconsistencia entre pregunta y recurso visual generado por IA.
  Mitigacion: validaciones automaticas + revision docente obligatoria.

- [ ] Riesgo: deriva de complejidad por arquitectura distribuida.
  Mitigacion: observabilidad desde Sprint 2 y contratos estrictos por servicio.

- [ ] Riesgo: bajo rendimiento en reportes analiticos.
  Mitigacion: modelado de agregados, indices y pruebas de carga desde Sprint 10.

- [ ] Riesgo: adopcion lenta por usuarios institucionales.
  Mitigacion: piloto guiado, capacitacion y soporte en Sprint 12.

## 7) Tablero de control rapido (marcado semanal)

- [ ] Sprint 1 completado
- [ ] Sprint 2 completado
- [ ] Sprint 3 completado
- [ ] Sprint 4 completado
- [ ] Sprint 5 completado
- [ ] Sprint 6 completado
- [ ] Sprint 7 completado
- [ ] Sprint 8 completado
- [ ] Sprint 9 completado
- [ ] Sprint 10 completado
- [ ] Sprint 11 completado
- [ ] Sprint 12 completado
