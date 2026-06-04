import { showNotification } from '../utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnExportar = document.getElementById('btn-exportar-agenda');
    const container = document.getElementById('agenda-dynamic-container');

    if (!btnExportar || !container) return;

    btnExportar.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (typeof html2canvas === 'undefined') {
            showNotification('Cargando módulo de exportación, intenta de nuevo...', 'error');
            return;
        }

        const originalText = btnExportar.innerHTML;
        btnExportar.innerHTML = '📸 Generando...';
        btnExportar.style.pointerEvents = 'none';

        try {
            // Ocultar selects vacíos o elementos que no se ven bien en la captura
            const selects = container.querySelectorAll('select');
            const originalDisplay = [];
            
            selects.forEach((sel, i) => {
                // Guardar display original para restaurarlo después
                originalDisplay[i] = sel.parentElement.style.display || '';
                
                // Si el select no tiene valor (nadie asignado) y no queremos que salga feo, lo podemos ocultar
                // Pero es mejor dejarlo como está o reemplazarlo temporalmente por texto
                // Para este caso, simplemente aplicaremos estilos al contenedor principal
            });

            // Preparar el contenedor para la captura
            const oldStyle = container.style.cssText;
            container.style.padding = '20px';
            container.style.background = '#0a0a1a'; // Fondo oscuro
            container.style.borderRadius = '12px';

            const canvas = await html2canvas(container, {
                backgroundColor: '#0a0a1a',
                scale: 2, // Mayor calidad
                logging: false,
                useCORS: true
            });

            // Restaurar estilos
            container.style.cssText = oldStyle;

            // Descargar
            const enlace = document.createElement('a');
            enlace.download = `Rol_Servicio_${new Date().toLocaleDateString('es').replace(/\//g,'-')}.jpg`;
            enlace.href = canvas.toDataURL('image/jpeg', 0.9);
            enlace.click();

            showNotification('Imagen exportada exitosamente. ¡Lista para enviar por WhatsApp!');
        } catch (error) {
            console.error('Error al exportar:', error);
            showNotification('Error al generar la imagen', 'error');
        } finally {
            btnExportar.innerHTML = originalText;
            btnExportar.style.pointerEvents = 'all';
        }
    });
});
