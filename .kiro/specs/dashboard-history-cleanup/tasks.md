# Plan de Implementación: dashboard-history-cleanup

## Visión General

Completar la separación activos/historial en `dashboard.js` para que los paneles del dashboard principal, la vista de proyectos y la vista staff muestren únicamente elementos vigentes, desplazando los completados/vencidos a sus secciones de historial correspondientes.

## Tareas

- [x] 1. Agregar funciones helper de clasificación
  - Implementar `esProyectoActivo(p)` que retorna `true` si `calcularEstadoProyecto(p) !== 'Completado'`
  - Implementar `esTareaHistorica(t)` que evalúa `vencimiento < hoy` OR `estadoTarea === 'completada'` OR `estadoTarea === 'no-efectuado'`
  - Colocar ambas funciones junto a `calcularEstadoProyecto()` en `dashboard.js`
  - Manejar casos borde: proyecto sin `fecha` → activo; tarea sin `vencimiento` → clasificar solo por `estadoTarea`
  - _Requisitos: 1.1, 1.2, 3.2, 3.4_

  - [ ]* 1.1 Escribir test de propiedad para `esProyectoActivo`
    - **Propiedad 1: Los paneles activos excluyen proyectos completados**
    - **Valida: Requisitos 1.1, 1.2, 5.2**

  - [ ]* 1.2 Escribir test de propiedad para `esTareaHistorica`
    - **Propiedad 3: Los paneles activos excluyen tareas históricas**
    - **Valida: Requisitos 3.2, 6.2, 7.2**

  - [ ]* 1.3 Escribir tests unitarios para los helpers
    - Proyecto con fecha pasada → `esProyectoActivo` retorna `false`
    - Proyecto sin campo `fecha` → `esProyectoActivo` retorna `true`
    - Tarea con `estadoTarea='completada'` → `esTareaHistorica` retorna `true`
    - Tarea con vencimiento ayer y `estadoTarea='pendiente'` → `esTareaHistorica` retorna `true`
    - Tarea con vencimiento mañana y `estadoTarea='pendiente'` → `esTareaHistorica` retorna `false`
    - Tarea sin `vencimiento` y `estadoTarea='en-progreso'` → `esTareaHistorica` retorna `false`
    - _Requisitos: 1.1, 1.2, 3.2, 3.4_

- [x] 2. Ajustar `renderProyectos()` para filtrar activos e historial
  - Aplicar `esProyectoActivo(p)` al separar activos del historial (reemplazar la lógica inline actual)
  - Asegurar que el filtro `#filtro-estado-proy` con valor `'Completado'` retorne 0 resultados en `#proyectos-lista`
  - Renderizar `#proyectos-historial` con proyectos completados ordenados de más reciente a más antiguo por `fecha`
  - Mostrar `'No hay proyectos activos.'` cuando no hay activos
  - Mostrar `'Sin eventos en el historial.'` cuando no hay completados
  - Actualizar contador `#historial-count` con el número exacto de proyectos en historial
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.1 Escribir test de propiedad para historial de proyectos
    - **Propiedad 2: El historial de proyectos contiene solo completados**
    - **Valida: Requisitos 2.1, 9.1, 9.3**

  - [ ]* 2.2 Escribir test de propiedad para orden del historial de proyectos
    - **Propiedad 5: Historial de proyectos ordenado descendente**
    - **Valida: Requisito 2.2**

  - [ ]* 2.3 Escribir test de propiedad para filtro 'Completado'
    - **Propiedad 8: Filtro 'Completado' vacía el panel activo**
    - **Valida: Requisito 1.4**

- [x] 3. Checkpoint — Verificar que `renderProyectos()` funciona correctamente
  - Asegurar que todos los tests pasen. Consultar al usuario si hay dudas.

- [x] 4. Ajustar `cargarMisTareas()` para excluir tareas históricas
  - Aplicar `!esTareaHistorica(t)` al filtrar las tareas que se muestran en `#mis-tareas-list`
  - Respetar el filtro por usuario según rol (Admin ve todas, Staff/Siervo solo las propias)
  - Mostrar `'Sin tareas activas.'` cuando no hay tareas activas para el usuario
  - _Requisitos: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Ajustar `renderHistorialTareas()` para mostrar solo tareas históricas
  - Aplicar `esTareaHistorica(t)` al filtrar las tareas que se muestran en `#tareas-historial`
  - Ordenar de más reciente a más antigua por `vencimiento`
  - Mostrar `'Sin tareas en el historial.'` cuando no hay tareas históricas
  - Actualizar contador `#historial-tareas-count` con el número exacto
  - Mostrar para cada tarea: título, asignado, fecha de vencimiento, prioridad y estado final
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.1 Escribir test de propiedad para historial de tareas
    - **Propiedad 4: El historial de tareas contiene solo tareas históricas**
    - **Valida: Requisitos 4.1, 9.2, 9.4**

  - [ ]* 5.2 Escribir test de propiedad para orden del historial de tareas
    - **Propiedad 6: Historial de tareas ordenado descendente**
    - **Valida: Requisito 4.2**

- [x] 6. Ajustar `renderDashboardProyectosYTareas()` para filtrar activos en el dashboard
  - Aplicar `esProyectoActivo(p)` antes de renderizar en `#dash-proyectos-list`
  - Aplicar `!esTareaHistorica(t)` antes de renderizar en `#dash-tareas-list`
  - Mostrar `'Sin proyectos activos.'` (o mensaje de bienvenida según rol) cuando no hay proyectos activos
  - Mostrar `'Sin tareas activas.'` cuando no hay tareas activas para el usuario
  - _Requisitos: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_

- [x] 7. Verificar `renderDashTareasStaff()` y garantizar sincronización al cambiar estado
  - Confirmar que `renderDashTareasStaff()` ya aplica `!esTareaHistorica(t)` correctamente; ajustar si no
  - En todos los puntos donde se cambia `estadoTarea` (desde cualquier vista), invocar el conjunto completo: `cargarMisTareas()`, `renderHistorialTareas()`, `renderDashboardProyectosYTareas()`, y `renderDashTareasStaff()` (si es Admin)
  - Asegurar que el panel `#dash-tareas-staff-panel` permanece oculto para roles no-Admin
  - _Requisitos: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

  - [ ]* 7.1 Escribir test de propiedad para sincronización de vistas
    - **Propiedad 7: Cambio de estado sincroniza todas las vistas**
    - **Valida: Requisitos 8.1, 8.2, 8.3**

- [x] 8. Checkpoint final — Verificar aislamiento por segmento y consistencia global
  - Confirmar que `#proyectos-historial` no contiene tareas (Requisito 9.3)
  - Confirmar que `#tareas-historial` no contiene proyectos (Requisito 9.4)
  - Asegurar que todos los tests pasen. Consultar al usuario si hay dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Los tests de propiedad requieren instalar `fast-check` con `npm install fast-check`
- Cada tarea referencia requisitos específicos para trazabilidad
- No se requieren cambios en `dashboard.html` — los contenedores ya existen
