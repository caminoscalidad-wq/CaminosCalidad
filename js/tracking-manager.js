// ============================================
// GESTOR DE SEGUIMIENTO EN TIEMPO REAL
// ============================================

const TrackingManager = (function() {
    // Variables privada
    let trackingInterval = null;
    let startTime = null;
    let estimatedTotalTime = 0;

    // Métodos públicos
    return {
        // Iniciar seguimiento
        startTracking(route) {
            if (!route) return;
            
            // Resetear variables
            startTime = Date.now();
            estimatedTotalTime = route.summary.totalTime * 1000; // Convertir a milisegundos
            
            // Mostrar panel
            this.showTrackingPanel(true);
            
            // Iniciar actualización periódica
            this.startUpdateInterval();
            
            // Configurar eventos
            this.setupTrackingEvents();
            
            console.log('Seguimiento iniciado. Tiempo estimado:', estimatedTotalTime / 1000, 'segundos');
        },

        // Detener seguimiento
        stopTracking() {
            // Detener intervalo
            if (trackingInterval) {
                clearInterval(trackingInterval);
                trackingInterval = null;
            }
            
            // Ocultar panel
            this.showTrackingPanel(false);
            
            // Resetear variables
            startTime = null;
            estimatedTotalTime = 0;
            
            console.log('Seguimiento detenido');
        },

        // Iniciar intervalo de actualización
        startUpdateInterval() {
            if (trackingInterval) clearInterval(trackingInterval);
            
            trackingInterval = setInterval(() => {
                this.updateTrackingDisplay();
            }, 1000); // Actualizar cada segundo
        },

        // Actualizar display de seguimiento
        updateTrackingDisplay() {
            if (!startTime) return;
            
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
            
            // Obtener progreso del GPS
            const traveledDistance = window.GPSTracker?.getTraveledDistance?.() || 0;
            const totalDistance = window.GPSTracker?.getTotalDistance?.() || 1;
            const progressPercent = window.GPSTracker?.getCompletionPercentage?.() || 0;
            
            // Actualizar UI
            this.updateTrackingUI({
                traveledDistance,
                totalDistance,
                progressPercent,
                remainingTime
            });
        },

        // Actualizar UI de seguimiento
        updateTrackingUI(data) {
            // Distancia
            const traveledKm = (data.traveledDistance / 1000).toFixed(1);
            const totalKm = (data.totalDistance / 1000).toFixed(1);
            const distanceEl = document.getElementById('tracking-distance');
            if (distanceEl) {
                distanceEl.textContent = `${traveledKm} / ${totalKm} km`;
            }
            
            // Tiempo restante
            const remainingMinutes = Math.round(data.remainingTime / 60000);
            const timeEl = document.getElementById('tracking-time');
            if (timeEl) {
                if (remainingMinutes > 60) {
                    const hours = Math.floor(remainingMinutes / 60);
                    const mins = remainingMinutes % 60;
                    timeEl.textContent = `${hours}h ${mins}m`;
                } else {
                    timeEl.textContent = `${remainingMinutes}m`;
                }
            }
            
            // Círculo de progreso
            const circleFill = document.getElementById('progress-circle-fill');
            const circleText = document.getElementById('progress-circle-text');
            
            if (circleFill && circleText) {
                const circumference = 2 * Math.PI * 20;
                const offset = circumference - (data.progressPercent / 100) * circumference;
                
                circleFill.style.strokeDasharray = `${circumference} ${circumference}`;
                circleFill.style.strokeDashoffset = offset;
                circleFill.style.transform = 'rotate(-90deg)';
                circleFill.style.transformOrigin = 'center';
                
                circleText.textContent = `${Math.round(data.progressPercent)}%`;
                
                // Cambiar color según progreso
                if (data.progressPercent < 30) {
                    circleFill.style.stroke = '#FF5722';
                } else if (data.progressPercent < 70) {
                    circleFill.style.stroke = '#FF9800';
                } else {
                    circleFill.style.stroke = '#4CAF50';
                }
            }
            
            // Mostrar/ocultar panel según progreso
            if (data.progressPercent >= 100) {
                // Ruta completada
                this.showTrackingPanel(false);
                window.UIManager?.mostrarToast?.('¡Ruta completada!', 'success');
                
                // Detener seguimiento
                this.stopTracking();
            }
        },

        // Mostrar/ocultar panel de seguimiento
        showTrackingPanel(show) {
            const panel = document.getElementById('tracking-panel');
            if (panel) {
                panel.style.display = show ? 'flex' : 'none';
            }
        },

        // Configurar eventos de seguimiento
        setupTrackingEvents() {
            // Cerrar panel al hacer clic
            const panel = document.getElementById('tracking-panel');
            if (panel) {
                panel.addEventListener('click', () => {
                    this.showTrackingPanel(false);
                });
            }
        },

        // Actualizar tiempo estimado basado en velocidad actual
        updateEstimatedTime(currentSpeed) {
            if (!estimatedTotalTime || currentSpeed <= 0) return;
            
            // Recalcular tiempo basado en velocidad actual
            const remainingDistance = window.GPSTracker?.getTotalDistance?.() - 
                                    window.GPSTracker?.getTraveledDistance?.();
            
            if (remainingDistance > 0) {
                // Tiempo en segundos = distancia (metros) / velocidad (m/s)
                const newRemainingTime = (remainingDistance / currentSpeed) * 1000;
                estimatedTotalTime = (Date.now() - startTime) + newRemainingTime;
            }
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.TrackingManager = TrackingManager;
}