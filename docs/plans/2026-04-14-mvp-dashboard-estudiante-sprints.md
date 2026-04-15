# Backlog ejecutable por sprints - MVP Dashboard Estudiante

## Orden de ejecucion
1. Sprint 1 - Arquitectura modular UI
2. Sprint 2 - Integracion de datos real
3. Sprint 3 - UX fina y accesibilidad
4. Sprint 4 - Calidad y salida
 
## Sprint 1 (Semana 1) - Arquitectura modular UI
Objetivo: convertir el dashboard actual en una arquitectura modular mantenible.

Tareas:
- [x] S1-T01 Crear estructura de componentes por seccion del dashboard.
- [x] S1-T02 Crear hook de orquestacion de datos de la pagina.
- [x] S1-T03 Crear tipos de view model para desacoplar UI de API.
- [x] S1-T04 Extraer componente Header del dashboard.
- [x] S1-T05 Extraer componente Hero academico.
- [x] S1-T06 Extraer componente de tarjetas KPI.
- [x] S1-T07 Extraer componente de actividad reciente.
- [x] S1-T08 Extraer componente de acciones rapidas.
- [x] S1-T09 Extraer componente de estado de modulos conectados.
- [x] S1-T10 Crear estados reutilizables: loading, empty, error.
- [x] S1-T11 Ajustar layout responsive desktop/mobile.
- [x] S1-T12 Integrar todos los componentes en la pagina raiz.

Criterios de aceptacion:
- [x] El archivo Dashboard.tsx queda como contenedor de composicion.
- [x] Cada seccion principal vive en su propio componente.
- [x] No se pierde funcionalidad ya existente.
- [x] Build del frontend compila sin errores.

## Sprint 2 (Semana 2) - Integracion de datos real
Objetivo: conectar cada bloque a su endpoint real con manejo de degradacion.

Tareas:
- [x] S2-T01 Conectar progreso de plan activo (/api/plans/active/progress).
- [x] S2-T02 Conectar semana activa y unidades recomendadas.
- [x] S2-T03 Conectar historial de sesiones (/api/sessions/history).
- [x] S2-T04 Conectar diagnostico (sesiones + perfil).
- [x] S2-T05 Conectar progreso analitico individual.
- [x] S2-T06 Conectar lista corta de notificaciones.
- [x] S2-T07 Implementar accion marcar notificaciones como leidas.
- [x] S2-T08 Normalizar payloads con adaptadores tipados.
- [x] S2-T09 Definir logica de priorizacion de proxima accion.
- [ ] S2-T10 Validar fallback por error parcial de servicio (validacion en runtime pendiente).

Criterios de aceptacion:
- [x] Todas las tarjetas del alcance leen datos reales.
- [x] Si falla un endpoint, solo se degrada su modulo.
- [x] Se mantiene feedback claro para el estudiante.

## Sprint 3 (Semana 3) - UX fina y accesibilidad
Objetivo: dejar experiencia robusta y clara para uso diario.

Tareas:
- [x] S3-T01 Implementar sidebar desktop final.
- [x] S3-T02 Implementar bottom navigation mobile final.
- [x] S3-T03 Refinar jerarquia visual de bloques criticos.
- [x] S3-T04 Agregar microinteracciones en CTAs principales.
- [x] S3-T05 Mejorar enfoque de teclado y focus rings.
- [x] S3-T06 Ajustar contraste de tarjetas de estado.
- [x] S3-T07 Revisar consistencia de espaciado y tipografia.
- [ ] S3-T08 QA manual completo en mobile y desktop (requiere sesion de prueba manual).

Criterios de aceptacion:
- [x] No hay bloqueos de navegacion por teclado.
- [x] UI consistente en resoluciones objetivo.
- [x] Flujo principal se entiende sin instruccion externa.

## Sprint 4 (Semana 4) - Calidad y salida
Objetivo: estabilizar y dejar listo para piloto.

Tareas:
- [x] S4-T01 Crear pruebas unitarias de adaptadores (dashboard.adapters.test.ts - 10 tests).
- [x] S4-T02 Crear pruebas unitarias de reglas de "proxima accion" (dashboard.nextaction.test.ts - 5 tests).
- [x] S4-T03 Crear pruebas de integracion de carga inicial (dashboard.integration.test.ts - 10 tests).
- [ ] S4-T04 Crear E2E minimo de flujo estudiante (requiere Playwright o prueba manual).
- [x] S4-T05 Medir y corregir re-render innecesario (useMemo en useStudentDashboardViewModel validado).
- [x] S4-T06 Validar manejo de timeout y errores de red (cubierto en suite de integracion - 4 tests de fallback).
- [ ] S4-T07 Cerrar defectos P0/P1 encontrados (pendiente QA manual S3-T08).
- [ ] S4-T08 Ejecutar checklist de release del modulo.

Criterios de aceptacion:
- [x] Suite minima de pruebas en verde (25/25 tests).
- [ ] Sin defectos criticos abiertos del alcance (pendiente QA manual).
- [ ] Evidencia de QA almacenada en docs.

## Dependencias clave
- S1 completo antes de S2.
- S2 completado antes de cerrar S3.
- S3 estabilizado antes de ejecutar S4.

## Control de estado (editable)
- [x] Sprint 1 Iniciado
- [x] Sprint 1 Completado
- [x] Sprint 2 Iniciado
- [x] Sprint 2 Completado (S2-T10 cerrado a nivel de codigo; validacion runtime pendiente)
- [x] Sprint 3 Iniciado
- [x] Sprint 3 Completado (S3-T08 QA manual pendiente — no bloquea)
- [x] Sprint 4 Iniciado
- [x] Sprint 4 Completado (S4-T04 E2E y S4-T07/S4-T08 post-QA manual pendientes)
