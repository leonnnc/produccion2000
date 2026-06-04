# ProDUC 🎬✨

**ProDUC** es una Aplicación Web Progresiva (PWA) de código abierto diseñada para la gestión integral de equipos de producción audiovisual, técnicos y creativos en iglesias, ministerios y organizaciones orientadas a eventos (originalmente desarrollado para la *Catedral de Fe Lima Norte*).

El sistema facilita la organización, programación de equipos, control de asistencia, y la comunicación en tiempo real, resolviendo el problema de administrar grupos numerosos de voluntarios o "siervos" distribuidos en diferentes áreas.

---

## 🚀 Características Principales

*   **👥 Gestión de Usuarios y Roles:** Control de acceso basado en jerarquías (Administrador, Super Líder, Líder de Área, Siervo).
*   **🎯 Áreas y Especialidades:** Soporte nativo para áreas específicas de producción como *Visuales, Filmakers, Fotografía, Técnica (Switchers / Cámaras), Streaming, Luces, Diseño, Edición y Protocolos*.
*   **📅 Agenda y Reservas de Servicios:** Sistema de turnos donde los usuarios pueden apuntarse para servir en servicios específicos (Domingos, Miércoles, etc.).
*   **📆 Eventos Especiales (Proyectos):** Creación de eventos especiales con metas de reclutamiento por área (ej. "Necesitamos 3 cámaras y 1 switcher para el Aniversario").
*   **💬 Chat y Presencia en Tiempo Real:** Chat global integrado y widget flotante que muestra qué usuarios están conectados en vivo.
*   **📂 Gestión de Recursos:** Repositorio integrado para compartir manuales, guías en PDF y tutoriales en video.
*   **⚡ PWA de Carga Instantánea:** Estrategia avanzada de Service Worker (`Stale-While-Revalidate`) y pre-caché de librerías de Firebase que permite abrir la aplicación instantáneamente, incluso con conexiones inestables.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto fue construido con un enfoque minimalista y de alto rendimiento, sin depender de pesados frameworks frontend de Node.js, lo que lo hace sumamente fácil de entender, mantener y alojar:

*   **Frontend:** HTML5, Vanilla JavaScript (ES6+), y CSS3 puro (Diseño Glassmorphism moderno y responsive).
*   **Backend / BaaS:** [Firebase](https://firebase.google.com/)
    *   *Firebase Authentication* (Login y Registro)
    *   *Firebase Realtime Database* (Sincronización en tiempo real, chat, roles)
    *   *Firebase Storage* (Fotos de perfil y archivos PDF/Video)
*   **PWA:** Service Worker propio con manifest para instalación en móviles (Android/iOS) y PC.

---

## 💻 Instalación y Desarrollo Local

Dado que el frontend es completamente estático (Vanilla JS), configurarlo localmente toma solo un par de minutos:

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/leonnnc/produccion2000.git
    cd produccion2000
    ```

2.  **Inicia un servidor local:**
    Puedes usar cualquier servidor HTTP simple. Por ejemplo, con Python:
    ```bash
    python -m http.server 5888
    ```
    O usando Node.js (con `http-server` o `live-server`):
    ```bash
    npx http-server -p 5888
    ```

3.  **Abre tu navegador:**
    Ve a `http://localhost:5888`

*(Nota: El proyecto ya incluye una configuración de Firebase en `firebase.js` conectada a un entorno de pruebas/producción. Si deseas hacer tu propia variante, deberás crear tu proyecto en Firebase Console y reemplazar las variables de entorno en `firebase.js`)*.

---

## 🤝 Cómo Contribuir

¡Toda ayuda es bienvenida! Ya sea corrigiendo bugs, mejorando el diseño UI/UX, o añadiendo nuevas funcionalidades. Si te interesa apoyar el proyecto:

1.  Haz un **Fork** del repositorio.
2.  Crea una rama con tu nueva funcionalidad o arreglo: `git checkout -b mi-nueva-funcion`
3.  Realiza tus cambios y haz commit: `git commit -m "Agregada mi nueva funcion"`
4.  Sube tus cambios a tu rama: `git push origin mi-nueva-funcion`
5.  Abre un **Pull Request (PR)** hacia la rama `main` explicando detalladamente tus cambios.

### Áreas de oportunidad (To-Do's)
*   [ ] Refactorización del código monolítico en `dashboard.js` hacia Web Components modulares.
*   [ ] Integración de notificaciones Push (FCM).
*   [ ] Gráficas de asistencia mensuales.
*   [ ] Exportación de reportes a PDF/Excel.

---

## 📄 Licencia

Este proyecto es abierto y está diseñado para bendecir y facilitar el trabajo técnico a iglesias y organizaciones sin fines de lucro. Siéntete libre de adaptarlo a tus necesidades.
