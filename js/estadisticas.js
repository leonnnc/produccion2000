// js/estadisticas.js

let chartBar = null;
let chartDoughnut = null;

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const filterArea = document.getElementById('stats-area-filter');
    
    // Solo cargamos los gráficos cuando el usuario entra a la vista
    navLinks.forEach(link => {
        if (link.getAttribute('data-target') === 'asistencia-view') {
            link.addEventListener('click', () => {
                setTimeout(initMetricas, 100); // Dar tiempo a que la vista se muestre
            });
        }
    });

    if (filterArea) {
        filterArea.addEventListener('change', () => {
            renderCharts(filterArea.value);
        });
    }
});

function getSesion() {
    const s = sessionStorage.getItem('sesion_activa');
    return s ? JSON.parse(s) : null;
}

function initMetricas() {
    const sesion = getSesion();
    if (!sesion) return;

    const filterArea = document.getElementById('stats-area-filter');
    const equipoContainer = document.getElementById('stats-equipo-container');

    // Configuración de vista según el Rol
    let areaFiltroInicial = '';

    if (sesion.rol === 'Admin' || sesion.rol === 'SuperLider') {
        if (filterArea) {
            filterArea.style.display = 'inline-block';
            if (filterArea.options.length <= 1) {
                const AREAS = ['Visuales','Filmakers','Fotografía','Coordinación','Técnica','Streaming','Luces','Diseño','Edición','Protocolos'];
                AREAS.forEach(a => {
                    const opt = document.createElement('option');
                    opt.value = a; opt.textContent = a;
                    filterArea.appendChild(opt);
                });
            }
            areaFiltroInicial = filterArea.value;
        }
        equipoContainer.style.display = 'block';
    } else if (sesion.rol === 'Lider') {
        if (filterArea) filterArea.style.display = 'none';
        areaFiltroInicial = sesion.area; // Lider solo ve su área
        equipoContainer.style.display = 'block';
    } else {
        // Siervos normales
        if (filterArea) filterArea.style.display = 'none';
        areaFiltroInicial = 'me'; // Ver solo sus datos
        equipoContainer.style.display = 'none';
    }

    renderCharts(areaFiltroInicial);
}

function renderCharts(areaFilter) {
    const sesion = getSesion();
    const proyectos = JSON.parse(localStorage.getItem('proyectos_creados') || '[]');
    const asistencias = JSON.parse(localStorage.getItem('asistencias_proyectos') || '{}');
    const usuarios = JSON.parse(localStorage.getItem('usuarios_registrados') || '[]');
    
    // Filtrar usuarios objetivo
    let usuariosTarget = [];
    if (areaFilter === 'me') {
        usuariosTarget = usuarios.filter(u => u.nombre === sesion.nombre);
    } else if (areaFilter) {
        usuariosTarget = usuarios.filter(u => (u.area || '').toLowerCase() === areaFilter.toLowerCase());
    } else {
        usuariosTarget = usuarios; // Todos (Admin)
    }
    const correosTarget = usuariosTarget.map(u => u.correo.toLowerCase());

    // Procesar Datos Unificados (Proyectos Especiales + Servicios Semanales)
    const servicios = JSON.parse(localStorage.getItem('servicios_reservados') || '[]');
    const nombresTarget = usuariosTarget.map(u => u.nombre);
    
    let totalConfirmados = 0;
    let totalAusencias = 0;
    let totalRespuestasProyectos = 0;

    const listaUnificada = [];

    // 1. Añadir Proyectos Especiales
    proyectos.forEach(proy => {
        let conf = 0;
        let aus = 0;
        correosTarget.forEach(correo => {
            const res = asistencias[`${proy.fecha_registro}_${correo}`];
            if (res === 'confirma') conf++;
            else if (res === 'no-puedo') aus++;
        });
        totalRespuestasProyectos += (conf + aus);
        listaUnificada.push({ nombre: proy.nombre, conf, aus });
    });

    // 2. Añadir Servicios Semanales (Agrupados)
    const mapServicios = {};
    servicios.forEach(s => {
        if (nombresTarget.includes(s.usuario)) {
            if (!mapServicios[s.servicio]) mapServicios[s.servicio] = { conf: 0, aus: 0 };
            if (s.ausente) mapServicios[s.servicio].aus++;
            else mapServicios[s.servicio].conf++;
        }
    });

    Object.keys(mapServicios).forEach(nombreServicio => {
        const stats = mapServicios[nombreServicio];
        listaUnificada.push({ nombre: nombreServicio, conf: stats.conf, aus: stats.aus });
    });

    // Sumar totales
    listaUnificada.forEach(item => {
        totalConfirmados += item.conf;
        totalAusencias += item.aus;
    });

    const eventosEvaluados = listaUnificada.length;

    // Para gráfico de Barras: Asistencia por Evento (Últimos 5 combinados)
    const eventosRecientes = listaUnificada.slice(-5);
    const labelsEventos = [];
    const dataConfirmados = [];
    const dataAusencias = [];

    eventosRecientes.forEach(item => {
        labelsEventos.push(item.nombre.length > 15 ? item.nombre.substring(0,15)+'...' : item.nombre);
        dataConfirmados.push(item.conf);
        dataAusencias.push(item.aus);
    });

    // Actualizar KPIs
    document.getElementById('kpi-confirmados').textContent = totalConfirmados;
    document.getElementById('kpi-ausencias').textContent = totalAusencias;
    document.getElementById('kpi-eventos').textContent = eventosEvaluados;

    // --- CHART BARRAS ---
    const ctxBar = document.getElementById('chartBarAsistencia');
    if (ctxBar) {
        if (chartBar) chartBar.destroy();
        Chart.defaults.color = 'rgba(255, 255, 255, 0.7)';
        chartBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labelsEventos,
                datasets: [
                    {
                        label: 'Confirmados',
                        data: dataConfirmados,
                        backgroundColor: 'rgba(46, 213, 115, 0.8)',
                        borderRadius: 4
                    },
                    {
                        label: 'Ausencias',
                        data: dataAusencias,
                        backgroundColor: 'rgba(255, 71, 87, 0.8)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // --- CHART DOUGHNUT ---
    const ctxDoughnut = document.getElementById('chartDoughnutEstado');
    if (ctxDoughnut) {
        if (chartDoughnut) chartDoughnut.destroy();
        // "Sin Respuesta" solo aplica matemáticamente a Proyectos Especiales
        const sinRespuesta = Math.max(0, (proyectos.length * correosTarget.length) - totalRespuestasProyectos);
        chartDoughnut = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Confirmaron', 'No Pudieron', 'Sin Respuesta'],
                datasets: [{
                    data: [totalConfirmados, totalAusencias, Math.max(0, sinRespuesta)],
                    backgroundColor: ['#2ed573', '#ff4757', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // --- RENDER LISTA EQUIPO (Si aplica) ---
    const equipoList = document.getElementById('stats-equipo-list');
    if (equipoList && (sesion.rol === 'Lider' || sesion.rol === 'Admin' || sesion.rol === 'SuperLider')) {
        equipoList.innerHTML = '';
        
        // Filtrar Admin y SuperLider
        let equipoTarget = usuariosTarget.filter(u => u.rol !== 'Admin' && u.rol !== 'SuperLider');
        
        // Ordenar: Líderes primero, luego Siervos
        equipoTarget.sort((a, b) => {
            if (a.rol === 'Lider' && b.rol !== 'Lider') return -1;
            if (b.rol === 'Lider' && a.rol !== 'Lider') return 1;
            return a.nombre.localeCompare(b.nombre);
        });

        if (equipoTarget.length === 0) {
            equipoList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">No hay usuarios para mostrar.</p>';
        } else {
            equipoTarget.forEach(u => {
                // Calcular tasa de asistencia del usuario
                let uConf = 0; let uAus = 0;
                proyectos.forEach(p => {
                    const r = asistencias[`${p.fecha_registro}_${u.correo.toLowerCase()}`];
                    if (r === 'confirma') uConf++;
                    else if (r === 'no-puedo') uAus++;
                });
                const total = uConf + uAus;
                const porcentaje = total === 0 ? 0 : Math.round((uConf / total) * 100);
                
                const areaDisplay = (u.area === 'T\u00e9cnica' && u.subarea) ? u.subarea : u.area;

                const el = document.createElement('div');
                el.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;margin-bottom:8px;';
                el.innerHTML = `
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;overflow:hidden;">
                            ${u.fotoUrl ? `<img src="${u.fotoUrl}" style="width:100%;height:100%;object-fit:cover;">` : u.nombre.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;">${u.nombre}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);">${u.rol} ${areaDisplay ? '· '+areaDisplay : ''}</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.1rem;font-weight:700;color:${porcentaje >= 70 ? '#2ed573' : porcentaje >= 40 ? '#ffa500' : '#ff4757'};">${porcentaje}%</div>
                        <div style="font-size:0.7rem;color:var(--text-muted);">Asistencia</div>
                    </div>
                `;
                equipoList.appendChild(el);
            });
        }
    }
}
