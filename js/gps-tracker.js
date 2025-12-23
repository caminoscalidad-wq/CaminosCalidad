// ============================================
// SEGUIMIENTO GPS Y GEOLOCALIZACIÓN
// ============================================

const GPSTracker = (function() {
    // Variables privadas
    let locMarker = null;
    let locCircle = null;
    let locWatchId = null;
    let gpsCentered = false;
    let isActive = false;
    let breadcrumbLayer = null; // Nueva: capa para el rastro de migas
    let remainingRouteLayer = null; // Nueva: ruta restante
    let breadcrumbs = []; // Nueva: puntos de seguimiento
    let lastPosition = null;
    let totalRouteDistance = 0;
    let traveledDistance = 0;

    // Métodos públicos
    return {
        // Activar seguimiento GPS
        locateMe() {
            if (!navigator.geolocation) {
                window.UIManager?.mostrarToast?.('Geolocalización no soportada por este navegador', 'error');
                this.updateGPSStatus('⚠️ GPS no disponible', '#FF9800');
                return;
            }

            // Si ya estamos siguiendo, solo centrar
            if (isActive && locMarker) {
                window.MapManager?.getMap()?.setView(locMarker.getLatLng(), 16);
                window.UIManager?.mostrarToast?.('Centrando en ubicación actual', 'info');
                return;
            }

            this.updateGPSStatus('📡 Obteniendo ubicación...', '#2196F3');
            AppState.set({ gpsActivo: true });

            // Obtener posición
            navigator.geolocation.getCurrentPosition(
                (pos) => this.handleLocationSuccess(pos, true),
                (err) => this.handleLocationError(err),
                AppConstants.GPS_CONFIG
            );
        },

        // Manejar éxito de geolocalización
        handleLocationSuccess(pos, initial = false) {
            const { latitude, longitude, accuracy } = pos.coords;
            const latlng = L.latLng(latitude, longitude);
            const map = window.MapManager?.getMap();

            if (!map) return;

            // Guardar posición actual
            lastPosition = latlng;

            // Crear o actualizar marcador
            if (!locMarker) {
                locMarker = L.marker(latlng, {
                    icon: L.divIcon({
                        className: 'gps-marker',
                        html: `<div style="background: #2196F3; border-radius: 50%; width: 20px; height: 20px; border: 3px solid white; box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    zIndexOffset: 2000
                }).addTo(map);
                
                locMarker.bindPopup(`
                    <div style="text-align: center; padding: 5px;">
                        <strong style="color: #2196F3">
                            <i class="fas fa-crosshairs"></i> SU UBICACIÓN
                        </strong><br>
                        <small>Precisión: ${Math.round(accuracy)} metros</small><br>
                        <small>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
                    </div>
                `);
            } else {
                locMarker.setLatLng(latlng);
            }

            // Círculo de precisión
            if (!locCircle) {
                locCircle = L.circle(latlng, {
                    radius: accuracy,
                    weight: 1,
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.15
                }).addTo(map);
            } else {
                locCircle.setLatLng(latlng);
                locCircle.setRadius(accuracy);
            }

            // Solo centrar la primera vez
            if (!gpsCentered) {
                map.setView(latlng, 16);
                gpsCentered = true;
            }

            // Inicializar seguimiento continuo si es la primera vez
            if (initial && !locWatchId) {
                locWatchId = navigator.geolocation.watchPosition(
                    (pos) => this.handleLocationSuccess(pos, false),
                    (err) => this.handleLocationError(err),
                    AppConstants.GPS_CONFIG
                );
            }

            // Actualizar estado
            this.updateGPSStatus(`📍 Ubicación actual (±${Math.round(accuracy)} m)`, '#4CAF50');
            isActive = true;

            // Si es la primera vez, establecer como origen si no hay uno seleccionado
            if (initial && !AppState.getPunto('origen')) {
                window.RouteManager?.setPunto?.('origen', latlng, "Mi Ubicación GPS");
            }

            // Actualizar breadcrumbs y ruta restante
            this.updateBreadcrumbs(latlng);
            
            // Calcular distancia recorrida
            this.calculateTraveledDistance(latlng);
            
            // Actualizar progreso en la UI
            this.updateProgressUI();

            // Mostrar notificación solo la primera vez
            if (initial) {
                window.UIManager?.mostrarToast?.('Seguimiento GPS activado', 'success');
            }
        },

        // Actualizar breadcrumbs (rastro de migas)
        updateBreadcrumbs(latlng) {
            const map = window.MapManager?.getMap();
            if (!map) return;

            // Agregar punto al historial (limitar a 100 puntos para rendimiento)
            breadcrumbs.push(latlng);
            if (breadcrumbs.length > 100) {
                breadcrumbs.shift();
            }

            // Crear o actualizar capa de breadcrumbs
            if (breadcrumbs.length > 1) {
                if (!breadcrumbLayer) {
                    breadcrumbLayer = L.polyline(breadcrumbs, {
                        color: '#FF5722',
                        weight: 3,
                        opacity: 0.7,
                        lineCap: 'round',
                        lineJoin: 'round',
                        dashArray: '5, 10',
                        className: 'breadcrumb-trail'
                    }).addTo(map);
                } else {
                    breadcrumbLayer.setLatLngs(breadcrumbs);
                }
            }
        },

        // Calcular distancia recorrida
        calculateTraveledDistance(newPosition) {
            const currentRoute = AppState.get('currentRoute');
            if (!currentRoute) return;

            // Obtener coordenadas de la ruta
            const routeCoordinates = currentRoute.coordinates;
            if (!routeCoordinates || routeCoordinates.length === 0) return;

            // Calcular distancia total si no está calculada
            if (totalRouteDistance === 0) {
                totalRouteDistance = currentRoute.summary.totalDistance;
            }

            // Encontrar el punto más cercano en la ruta
            let closestPoint = null;
            let minDistance = Infinity;
            let closestIndex = -1;

            for (let i = 0; i < routeCoordinates.length; i++) {
                const point = routeCoordinates[i];
                if (point) {
                    const routeLatLng = L.latLng(point);
                    const distance = routeLatLng.distanceTo(newPosition);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = routeLatLng;
                        closestIndex = i;
                    }
                }
            }

            // Si encontramos un punto cercano, calcular distancia recorrida
            if (closestPoint && closestIndex > 0) {
                // Calcular distancia desde el inicio hasta el punto más cercano
                let accumulatedDistance = 0;
                
                for (let i = 1; i <= closestIndex; i++) {
                    const prevPoint = routeCoordinates[i - 1];
                    const currPoint = routeCoordinates[i];
                    
                    if (prevPoint && currPoint) {
                        const prevLatLng = L.latLng(prevPoint);
                        const currLatLng = L.latLng(currPoint);
                        accumulatedDistance += prevLatLng.distanceTo(currLatLng);
                    }
                }
                
                traveledDistance = accumulatedDistance;
                
                // Actualizar ruta restante
                this.updateRemainingRoute(closestIndex);
            }
        },

        // Actualizar ruta restante
        updateRemainingRoute(startIndex) {
            const currentRoute = AppState.get('currentRoute');
            const map = window.MapManager?.getMap();
            
            if (!currentRoute || !map || !currentRoute.coordinates || startIndex < 0) return;

            // Obtener coordenadas desde el punto actual hasta el final
            const remainingCoordinates = currentRoute.coordinates.slice(startIndex);

            // Crear o actualizar capa de ruta restante
            if (!remainingRouteLayer) {
                remainingRouteLayer = L.polyline(remainingCoordinates, {
                    color: '#4CAF50',
                    weight: 6,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round',
                    className: 'remaining-route'
                }).addTo(map);
            } else {
                remainingRouteLayer.setLatLngs(remainingCoordinates);
            }

            // Opcional: Ocultar la ruta original completa
            // Podemos mantener ambas o reemplazar la original
        },

        // Actualizar UI de progreso
        updateProgressUI() {
            if (totalRouteDistance > 0) {
                const progressPercent = Math.min(100, (traveledDistance / totalRouteDistance * 100));
                
                // Actualizar barra de progreso
                const progressFill = document.getElementById('progress-fill');
                const progressPercentEl = document.getElementById('progress-percent');
                
                if (progressFill) {
                    progressFill.style.width = progressPercent + '%';
                    progressFill.style.background = `linear-gradient(90deg, #4CAF50 ${progressPercent}%, #2196F3 100%)`;
                }
                
                if (progressPercentEl) {
                    progressPercentEl.textContent = Math.round(progressPercent) + '%';
                    
                    // Actualizar texto con distancia restante
                    const remainingDistance = totalRouteDistance - traveledDistance;
                    const remainingKm = (remainingDistance / 1000).toFixed(1);
                    progressPercentEl.title = `${remainingKm} km restantes`;
                }

                // Actualizar instrucciones según progreso
                this.updateInstructionsByProgress();
            }
        },

        // Actualizar instrucciones según progreso
        updateInstructionsByProgress() {
            const currentRoute = AppState.get('currentRoute');
            if (!currentRoute || !currentRoute.instructions) return;

            // Encontrar la instrucción actual basada en la distancia recorrida
            let accumulatedDist = 0;
            let currentInstructionIndex = -1;

            for (let i = 0; i < currentRoute.instructions.length; i++) {
                const instruction = currentRoute.instructions[i];
                accumulatedDist += instruction.distance;
                
                if (accumulatedDist >= traveledDistance) {
                    currentInstructionIndex = i;
                    break;
                }
            }

            // Si encontramos una instrucción, resaltarla
            if (currentInstructionIndex >= 0) {
                this.highlightCurrentInstruction(currentInstructionIndex);
                
                // Opcional: Leer la instrucción actual
                this.readCurrentInstruction(currentRoute.instructions[currentInstructionIndex]);
            }
        },

        // Resaltar instrucción actual
        highlightCurrentInstruction(index) {
            const instructionSteps = document.querySelectorAll('.instruction-step');
            
            // Remover resaltado anterior
            instructionSteps.forEach(step => {
                step.style.background = '';
                step.style.borderLeft = '';
            });
            
            // Resaltar instrucción actual
            if (instructionSteps[index]) {
                instructionSteps[index].style.background = 'var(--prov-green-light)';
                instructionSteps[index].style.borderLeft = '4px solid var(--prov-green-main)';
                
                // Desplazar para que sea visible
                instructionSteps[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        },

        // Leer instrucción actual
        readCurrentInstruction(instruction) {
            // Solo leer si la voz está activa
            if (!AppState.get('vozActiva')) return;

            // Limpiar texto
            let cleanText = instruction.text
                .replace(/<\/?[^>]+(>|$)/g, "")
                .replace(/Continue on/g, "Continúe por")
                .replace(/Turn left/g, "Gire a la izquierda")
                .replace(/Turn right/g, "Gire a la derecha")
                .replace(/sharp left/g, "gire bruscamente a la izquierda")
                .replace(/sharp right/g, "gire bruscamente a la derecha")
                .replace(/slight left/g, "gire ligeramente a la izquierda")
                .replace(/slight right/g, "gire ligeramente a la derecha")
                .replace(/Destination reached/g, "Ha llegado a su destino");

            const distancia = instruction.distance > 1000 ? 
                `${(instruction.distance/1000).toFixed(1)} kilómetros` : 
                `${Math.round(instruction.distance)} metros`;

            const textoCompleto = `Próxima instrucción: ${cleanText} en ${distancia}`;
            
            // Usar prioridad alta para instrucciones críticas
            window.VoiceNavigation?.speak?.(textoCompleto, {
                priority: 'high',
                onStart: () => {
                    console.log('Leyendo instrucción actual:', cleanText);
                }
            });
        },

        // Manejar error de geolocalización
        handleLocationError(err) {
            console.error("Error GPS:", err);
            let msg = "No se pudo obtener la ubicación";
            
            switch(err.code) {
                case 1:
                    msg = "Permiso de ubicación denegado";
                    break;
                case 2:
                    msg = "Ubicación no disponible";
                    break;
                case 3:
                    msg = "Tiempo de espera agotado";
                    break;
            }
            
            this.updateGPSStatus(`❌ ${msg}`, '#F44336');
            AppState.set({ gpsActivo: false });
            window.UIManager?.mostrarToast?.(msg, 'error');
        },

        // Detener seguimiento GPS
        stopGPS() {
            if (locWatchId !== null) {
                navigator.geolocation.clearWatch(locWatchId);
                locWatchId = null;
            }
            
            const map = window.MapManager?.getMap();
            if (map) {
                if (locMarker) {
                    map.removeLayer(locMarker);
                    locMarker = null;
                }
                
                if (locCircle) {
                    map.removeLayer(locCircle);
                    locCircle = null;
                }
                
                if (breadcrumbLayer) {
                    map.removeLayer(breadcrumbLayer);
                    breadcrumbLayer = null;
                }
                
                if (remainingRouteLayer) {
                    map.removeLayer(remainingRouteLayer);
                    remainingRouteLayer = null;
                }
            }
            
            // Resetear variables
            gpsCentered = false;
            isActive = false;
            breadcrumbs = [];
            lastPosition = null;
            totalRouteDistance = 0;
            traveledDistance = 0;
            
            AppState.set({ gpsActivo: false });
            this.updateGPSStatus('GPS desconectado', '#9E9E9E');
        },

        // Inicializar seguimiento de ruta
        initRouteTracking(route) {
            if (!route) return;
            
            // Resetear variables
            totalRouteDistance = route.summary.totalDistance;
            traveledDistance = 0;
            breadcrumbs = [];
            
            // Limpiar capas anteriores
            const map = window.MapManager?.getMap();
            if (map) {
                if (breadcrumbLayer) {
                    map.removeLayer(breadcrumbLayer);
                    breadcrumbLayer = null;
                }
                
                if (remainingRouteLayer) {
                    map.removeLayer(remainingRouteLayer);
                    remainingRouteLayer = null;
                }
            }
            
            console.log('Inicializado seguimiento de ruta:', totalRouteDistance, 'metros');
        },

        // Actualizar estado GPS en UI
        updateGPSStatus(text, color) {
            const statusEl = document.getElementById('gps-status');
            const textEl = document.getElementById('gps-status-text');
            
            if (statusEl && textEl) {
                textEl.textContent = text;
                statusEl.style.display = 'flex';
                statusEl.style.background = color ? `rgba(${this.hexToRgb(color)}, 0.8)` : 'rgba(0, 0, 0, 0.7)';
                
                // Agregar distancia recorrida si hay
                if (traveledDistance > 0) {
                    const traveledKm = (traveledDistance / 1000).toFixed(1);
                    const remainingKm = ((totalRouteDistance - traveledDistance) / 1000).toFixed(1);
                    
                    const distanceInfo = document.createElement('div');
                    distanceInfo.style.fontSize = '0.7rem';
                    distanceInfo.style.marginTop = '4px';
                    distanceInfo.innerHTML = `📏 ${traveledKm}km recorridos · ${remainingKm}km restantes`;
                    
                    // Actualizar o agregar información de distancia
                    let existingInfo = statusEl.querySelector('.distance-info');
                    if (existingInfo) {
                        existingInfo.innerHTML = distanceInfo.innerHTML;
                    } else {
                        distanceInfo.className = 'distance-info';
                        statusEl.appendChild(distanceInfo);
                    }
                }
            }
        },

        // Convertir hex a RGB
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
                : '0, 0, 0';
        },

        // Verificar si GPS está activo
        isActive() {
            return isActive;
        },

        // Obtener distancia recorrida
        getTraveledDistance() {
            return traveledDistance;
        },

        // Obtener distancia total
        getTotalDistance() {
            return totalRouteDistance;
        },

        // Obtener porcentaje completado
        getCompletionPercentage() {
            if (totalRouteDistance === 0) return 0;
            return Math.min(100, (traveledDistance / totalRouteDistance * 100));
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.GPSTracker = GPSTracker;
}