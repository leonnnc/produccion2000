# Documento de Requisitos

## Introducción

Esta funcionalidad limpia la visualización del dashboard ERP separando el contenido activo del histórico. Los proyectos completados (cuya fecha de evento ya pasó) y las tareas vencidas o finalizadas deben desaparecer de las vistas principales y moverse a secciones de historial específicas por segmento. Cada sección del dashboard muestra únicamente su propio historial: la sección "Proyectos" muestra solo el historial de proyectos completados, y la sección "Staff/Tareas" muestra solo el historial de tareas vencidas o completadas.

El sistema ya cuenta con la función `calcularEstadoProyecto(p)` que retorna `'Planificado'`, `'En curso'` o `'Completado'`, y con los contenedores HTML `#proyectos-historial` y `#tareas-historial`. La lógica de separación activos/historial existe parcialmente y debe completarse y aplicarse de forma consistente en todas las vistas.

---

## Glosario

- **Dashboard**: Vista principal del ERP (`#dashboard-view`) que muestra resúmenes de proyectos y tareas.
- **Vista Proyectos**: Sección del ERP (`#proyectos-view`) dedicada a la gestión de proyectos/eventos.
- **Vista Staff**: Sección del ERP (`#staff-view`) dedicada a la gestión de tareas internas del equipo.
- **Proyecto_Activo**: Proyecto cuyo estado calculado es `'Planificado'` o `'En curso'` según `calcularEstadoProyecto()`.
- **Proyecto_Completado**: Proyecto cuyo estado calculado es `'Completado'` (la fecha del evento ya pasó al día siguiente).
- **Tarea_Activa**: Tarea cuya fecha de vencimiento es igual o posterior a hoy, y cuyo `estadoTarea` no es `'completada'` ni `'no-efectuado'`.
- **Tarea_Historica**: Tarea cuya fecha de vencimiento ya pasó (vencida), o cuyo `estadoTarea` es `'completada'` o `'no-efectuado'`.
- **Panel_Activo**: Contenedor HTML que muestra únicamente elementos activos/pendientes.
- **Panel_Historial**: Contenedor HTML que muestra únicamente elementos históricos del mismo segmento.
- **Dashboard_Panel_Proyectos**: Panel `#dash-proyectos-panel` dentro de `#dashboard-view`.
- **Dashboard_Panel_Tareas**: Panel `#dash-tareas-panel` dentro de `#dashboard-view`.
- **Dashboard_Panel_TareasStaff**: Panel `#dash-tareas-staff-panel` dentro de `#dashboard-view` (solo Admin).
- **renderProyectos**: Función JS que renderiza la vista de proyectos.
- **renderDashboardProyectosYTareas**: Función JS que renderiza los paneles de resumen en el dashboard.
- **renderDashTareasStaff**: Función JS que renderiza el panel de tareas staff en el dashboard (solo Admin).
- **cargarMisTareas**: Función JS que renderiza la lista de tareas activas en la vista Staff.
- **renderHistorialTareas**: Función JS que renderiza el historial de tareas en la vista Staff.

---

## Requisitos

### Requisito 1: Filtrado de proyectos activos en la Vista Proyectos

**User Story:** Como usuario del ERP, quiero que la lista principal de proyectos muestre únicamente los proyectos activos (Planificado o En curso), para que la vista no se llene de eventos ya realizados.

#### Criterios de Aceptación

1. WHEN `renderProyectos()` es invocada, THE `Panel_Activo` (`#proyectos-lista`) SHALL mostrar únicamente los proyectos cuyo estado calculado por `calcularEstadoProyecto()` sea `'Planificado'` o `'En curso'`.
2. WHEN `renderProyectos()` es invocada, THE `Panel_Activo` (`#proyectos-lista`) SHALL excluir todos los proyectos cuyo estado calculado sea `'Completado'`.
3. WHEN no existen proyectos activos, THE `Panel_Activo` SHALL mostrar el mensaje `'No hay proyectos activos.'`.
4. WHEN el usuario Admin aplica el filtro de estado `'Completado'` en el selector `#filtro-estado-proy`, THE `Panel_Activo` SHALL mostrar cero resultados (los completados solo aparecen en el historial).

---

### Requisito 2: Historial de proyectos completados en la Vista Proyectos

**User Story:** Como usuario del ERP, quiero ver los proyectos completados en una sección de historial separada dentro de la vista de Proyectos, para poder consultar eventos pasados sin que contaminen la vista activa.

#### Criterios de Aceptación

1. WHEN `renderProyectos()` es invocada, THE `Panel_Historial` (`#proyectos-historial`) SHALL mostrar únicamente los proyectos cuyo estado calculado sea `'Completado'`.
2. WHEN `renderProyectos()` es invocada, THE `Panel_Historial` SHALL ordenar los proyectos completados de más reciente a más antiguo según su fecha de evento.
3. WHEN no existen proyectos completados, THE `Panel_Historial` SHALL mostrar el mensaje `'Sin eventos en el historial.'`.
4. THE `Panel_Historial` SHALL mostrar para cada proyecto completado: nombre del evento, fecha, áreas involucradas y el badge de estado `'Completado'`.
5. WHEN el contador `#historial-count` es actualizado, THE `renderProyectos` SHALL reflejar el número exacto de proyectos en el historial.

---

### Requisito 3: Filtrado de tareas activas en la Vista Staff

**User Story:** Como usuario Staff o Admin, quiero que la lista principal de tareas muestre únicamente las tareas activas (no vencidas y no finalizadas), para mantener el foco en el trabajo pendiente.

#### Criterios de Aceptación

1. WHEN `cargarMisTareas()` es invocada, THE `Panel_Activo` (`#mis-tareas-list`) SHALL mostrar únicamente las `Tarea_Activa` correspondientes al usuario en sesión (o todas si es Admin).
2. WHEN `cargarMisTareas()` es invocada, THE `Panel_Activo` SHALL excluir todas las `Tarea_Historica` (vencidas, completadas o no-efectuadas).
3. WHEN no existen tareas activas para el usuario, THE `Panel_Activo` SHALL mostrar el mensaje `'Sin tareas activas.'`.
4. WHILE una tarea tiene `estadoTarea` igual a `'completada'`, THE `Panel_Activo` SHALL no mostrar dicha tarea en la lista activa.

---

### Requisito 4: Historial de tareas en la Vista Staff

**User Story:** Como usuario Staff o Admin, quiero ver las tareas vencidas y completadas en una sección de historial separada dentro de la vista Staff, para poder consultar el trabajo pasado sin que interfiera con las tareas pendientes.

#### Criterios de Aceptación

1. WHEN `renderHistorialTareas()` es invocada, THE `Panel_Historial` (`#tareas-historial`) SHALL mostrar únicamente las `Tarea_Historica` correspondientes al usuario en sesión (o todas si es Admin).
2. WHEN `renderHistorialTareas()` es invocada, THE `Panel_Historial` SHALL ordenar las tareas históricas de más reciente a más antigua según su fecha de vencimiento.
3. WHEN no existen tareas históricas, THE `Panel_Historial` SHALL mostrar el mensaje `'Sin tareas en el historial.'`.
4. THE `Panel_Historial` SHALL mostrar para cada tarea histórica: título, asignado, fecha de vencimiento, prioridad y estado final.
5. WHEN el contador `#historial-tareas-count` es actualizado, THE `renderHistorialTareas` SHALL reflejar el número exacto de tareas en el historial.

---

### Requisito 5: Filtrado de proyectos activos en el Dashboard principal

**User Story:** Como usuario del ERP, quiero que el panel de resumen de proyectos en el dashboard principal muestre únicamente proyectos activos, para tener una vista limpia del trabajo en curso.

#### Criterios de Aceptación

1. WHEN `renderDashboardProyectosYTareas()` es invocada, THE `Dashboard_Panel_Proyectos` SHALL mostrar únicamente los `Proyecto_Activo` relevantes para el rol del usuario en sesión.
2. WHEN `renderDashboardProyectosYTareas()` es invocada, THE `Dashboard_Panel_Proyectos` SHALL excluir todos los `Proyecto_Completado`.
3. IF no existen proyectos activos para el usuario, THEN THE `Dashboard_Panel_Proyectos` SHALL mostrar el mensaje de bienvenida o el mensaje `'Sin proyectos activos.'` según el rol.

---

### Requisito 6: Filtrado de tareas activas en el Dashboard principal

**User Story:** Como usuario del ERP, quiero que el panel de resumen de tareas en el dashboard principal muestre únicamente tareas activas, para no ver tareas ya finalizadas o vencidas en la vista de inicio.

#### Criterios de Aceptación

1. WHEN `renderDashboardProyectosYTareas()` es invocada, THE `Dashboard_Panel_Tareas` SHALL mostrar únicamente las `Tarea_Activa` relevantes para el rol del usuario en sesión.
2. WHEN `renderDashboardProyectosYTareas()` es invocada, THE `Dashboard_Panel_Tareas` SHALL excluir todas las `Tarea_Historica`.
3. IF no existen tareas activas para el usuario, THEN THE `Dashboard_Panel_Tareas` SHALL mostrar el mensaje `'Sin tareas activas.'`.

---

### Requisito 7: Filtrado de tareas activas en el panel Staff del Dashboard (solo Admin)

**User Story:** Como Admin, quiero que el panel "Tareas Staff" del dashboard muestre únicamente tareas activas agrupadas por área, para tener una visión operativa limpia del equipo.

#### Criterios de Aceptación

1. WHEN `renderDashTareasStaff()` es invocada, THE `Dashboard_Panel_TareasStaff` SHALL mostrar únicamente las `Tarea_Activa` de todos los usuarios.
2. WHEN `renderDashTareasStaff()` es invocada, THE `Dashboard_Panel_TareasStaff` SHALL excluir todas las `Tarea_Historica`.
3. WHILE el usuario en sesión no tiene rol `'Admin'`, THE `Dashboard_Panel_TareasStaff` SHALL permanecer oculto.

---

### Requisito 8: Consistencia al cambiar el estado de una tarea

**User Story:** Como usuario del ERP, quiero que al marcar una tarea como completada esta desaparezca inmediatamente de la vista activa y aparezca en el historial, para que la separación sea en tiempo real sin necesidad de recargar la página.

#### Criterios de Aceptación

1. WHEN el usuario cambia el estado de una tarea a `'completada'` desde cualquier vista, THE `Sistema` SHALL mover la tarea al historial correspondiente sin recargar la página.
2. WHEN el estado de una tarea es actualizado, THE `Sistema` SHALL invocar tanto `cargarMisTareas()` como `renderHistorialTareas()` y `renderDashboardProyectosYTareas()` para mantener todas las vistas sincronizadas.
3. IF una tarea es marcada como `'completada'` en el dashboard, THEN THE `Sistema` SHALL también actualizar la vista Staff (`cargarMisTareas()` y `renderHistorialTareas()`).

---

### Requisito 9: Aislamiento del historial por segmento

**User Story:** Como usuario del ERP, quiero que el historial de la sección Proyectos muestre solo proyectos completados y el historial de la sección Staff muestre solo tareas históricas, para que cada sección sea autónoma y no mezcle tipos de datos.

#### Criterios de Aceptación

1. THE `Panel_Historial` de `#proyectos-view` SHALL contener únicamente registros de tipo proyecto con estado `'Completado'`.
2. THE `Panel_Historial` de `#staff-view` SHALL contener únicamente registros de tipo tarea con estado `Tarea_Historica`.
3. THE `Panel_Historial` de `#proyectos-view` SHALL no mostrar ningún registro de tipo tarea.
4. THE `Panel_Historial` de `#staff-view` SHALL no mostrar ningún registro de tipo proyecto.
