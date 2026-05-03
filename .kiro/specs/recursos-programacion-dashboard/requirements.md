# Documento de Requisitos

## Introducción

Esta funcionalidad extiende el panel de Programación del dashboard para que los archivos PDF subidos por el Admin en la sección Recursos sean visibles para **todos** los roles (Admin, Staff y Siervo). Cada archivo debe mostrar su tema y el horario del servicio al que pertenece. Al hacer clic, el archivo se abre como modal. Cuando la fecha/hora del servicio asociado ya haya pasado, el archivo desaparece del panel activo y se mueve a una lista de historial dentro del mismo panel.

## Glosario

- **Dashboard**: Vista principal del sistema ERP accesible por todos los roles.
- **Panel_Programacion**: Sección del dashboard identificada por `#dash-programacion-panel` que muestra los PDFs de programación activos.
- **Panel_Historial**: Subsección colapsable dentro del `Panel_Programacion` que muestra los PDFs cuyo servicio ya expiró.
- **PDF**: Archivo de programación almacenado en `localStorage` bajo la clave `recursos_pdfs`, con campos `{ titulo, url, esLocal, nombreArchivo, servicio, fecha }`.
- **Servicio_Key**: Identificador del servicio al que está asociado un PDF. Valores posibles: `dom-1`, `dom-2`, `dom-3`, `dom-4`, `mie-1`, o `''` (General).
- **Horario_Servicio**: Fecha y hora calculada del próximo servicio correspondiente a un `Servicio_Key`, obtenida mediante `getFechasServicio(servicioKey)`.
- **PDF_Activo**: PDF cuyo servicio asociado aún no ha ocurrido, o PDF de tipo General.
- **PDF_Expirado**: PDF cuyo servicio asociado ya ocurrió (la fecha/hora del servicio es anterior al momento actual).
- **Modal_Preview**: Ventana modal que muestra el contenido del PDF, activada por `abrirDocPreview(p)`.
- **Admin**: Rol con acceso completo al sistema.
- **Staff**: Rol con acceso a dashboard, staff, agenda y recursos.
- **Siervo**: Rol con acceso a dashboard, agenda y recursos.

---

## Requisitos

### Requisito 1: Visibilidad universal del Panel de Programación

**User Story:** Como usuario del sistema (Admin, Staff o Siervo), quiero ver los archivos de programación en mi dashboard, para conocer los materiales disponibles para los próximos servicios.

#### Criterios de Aceptación

1. THE `Panel_Programacion` SHALL mostrarse en el dashboard para los roles Admin, Staff y Siervo.
2. WHEN el usuario tiene rol Admin, THE `Panel_Programacion` SHALL mostrarse con todos los PDFs activos disponibles, sin filtrar por servicios reservados.
3. WHEN el usuario tiene rol Staff o Siervo, THE `Panel_Programacion` SHALL mostrarse con los PDFs activos correspondientes a sus servicios reservados más los PDFs de tipo General.
4. IF no existen `PDF_Activo` para mostrar al usuario, THEN THE `Panel_Programacion` SHALL ocultarse completamente.

---

### Requisito 2: Visualización del tema y horario de cada PDF

**User Story:** Como usuario del sistema, quiero ver el tema y el horario programado de cada archivo de programación, para saber a qué servicio corresponde antes de abrirlo.

#### Criterios de Aceptación

1. THE `Panel_Programacion` SHALL mostrar el título (`titulo`) de cada PDF como texto principal de la tarjeta.
2. WHEN un PDF tiene un `Servicio_Key` distinto de `''`, THE `Panel_Programacion` SHALL mostrar el `Horario_Servicio` correspondiente como subtítulo de la tarjeta.
3. WHEN un PDF tiene `Servicio_Key` igual a `''`, THE `Panel_Programacion` SHALL mostrar la etiqueta "General" como subtítulo de la tarjeta.
4. THE `Panel_Programacion` SHALL agrupar los PDFs por `Servicio_Key`, mostrando un separador con el nombre y horario del servicio antes de cada grupo.

---

### Requisito 3: Apertura de PDF como modal

**User Story:** Como usuario del sistema, quiero abrir un archivo de programación directamente desde el dashboard, para consultarlo sin abandonar la vista actual.

#### Criterios de Aceptación

1. WHEN el usuario hace clic en la tarjeta de un PDF en el `Panel_Programacion`, THE `Dashboard` SHALL invocar `abrirDocPreview(p)` con el objeto PDF correspondiente.
2. THE `Modal_Preview` SHALL abrirse mostrando el contenido del PDF seleccionado.
3. THE `Modal_Preview` SHALL poder cerrarse mediante el botón de cierre o haciendo clic fuera del modal.

---

### Requisito 4: Expiración automática de PDFs activos

**User Story:** Como usuario del sistema, quiero que los archivos de programación desaparezcan del panel activo una vez que el servicio haya pasado, para que el panel solo muestre contenido relevante.

#### Criterios de Aceptación

1. WHEN la fecha y hora del servicio asociado a un PDF ha pasado, THE `Panel_Programacion` SHALL excluir ese PDF de la lista de PDFs activos.
2. THE `Dashboard` SHALL evaluar la expiración de PDFs al cargar la vista del dashboard.
3. THE `Dashboard` SHALL evaluar la expiración de PDFs periódicamente cada 60 segundos mientras la sesión esté activa.
4. WHEN un PDF tiene `Servicio_Key` igual a `''` (General), THE `Panel_Programacion` SHALL mantener ese PDF en la lista activa indefinidamente.
5. IF todos los PDFs de un grupo de servicio han expirado, THEN THE `Panel_Programacion` SHALL omitir el separador de ese grupo en la lista activa.

---

### Requisito 5: Historial de PDFs expirados

**User Story:** Como usuario del sistema, quiero acceder a los archivos de programación de servicios pasados, para consultar materiales anteriores cuando lo necesite.

#### Criterios de Aceptación

1. THE `Panel_Historial` SHALL mostrarse dentro del `Panel_Programacion` cuando exista al menos un `PDF_Expirado` relevante para el usuario.
2. THE `Panel_Historial` SHALL listar todos los `PDF_Expirado` relevantes para el usuario, agrupados por `Servicio_Key`.
3. WHEN el usuario hace clic en un PDF del `Panel_Historial`, THE `Dashboard` SHALL invocar `abrirDocPreview(p)` con el objeto PDF correspondiente.
4. THE `Panel_Historial` SHALL ser colapsable, mostrándose contraído por defecto.
5. IF no existen `PDF_Expirado` relevantes para el usuario, THEN THE `Panel_Historial` SHALL ocultarse completamente.

---

### Requisito 7: Posición del Panel de Programación en el Dashboard

**User Story:** Como usuario del sistema, quiero que el panel de Programación aparezca al final del dashboard, debajo de los demás paneles, para no interrumpir la visualización de proyectos y tareas.

#### Criterios de Aceptación

1. THE `Panel_Programacion` SHALL renderizarse siempre al final del contenido del `#dashboard-view`, después de los paneles de proyectos, tareas y tareas staff.
2. THE `Panel_Programacion` SHALL nunca aparecer por encima de los paneles `#dash-proyectos-panel`, `#dash-tareas-panel` ni `#dash-tareas-staff-panel`.

---

### Requisito 6: Determinación de expiración de un PDF

**User Story:** Como sistema, quiero calcular correctamente si un PDF ha expirado, para clasificarlo como activo o histórico de forma precisa.

#### Criterios de Aceptación

1. WHEN un PDF tiene `Servicio_Key` en `['dom-1', 'dom-2', 'dom-3', 'dom-4', 'mie-1']`, THE `Dashboard` SHALL calcular la fecha de expiración como la fecha del próximo domingo u miércoles correspondiente a ese `Servicio_Key` más el offset de expiración de 45 minutos (`EXPIRY_OFFSET_MS`).
2. WHEN la fecha actual supera la fecha de expiración calculada para un PDF, THE `Dashboard` SHALL clasificar ese PDF como `PDF_Expirado`.
3. WHEN la fecha actual no supera la fecha de expiración calculada para un PDF, THE `Dashboard` SHALL clasificar ese PDF como `PDF_Activo`.
4. THE `Dashboard` SHALL reutilizar la función `getFechasServicio(servicioKey)` para obtener la referencia de fecha del próximo servicio al calcular la expiración de PDFs.
