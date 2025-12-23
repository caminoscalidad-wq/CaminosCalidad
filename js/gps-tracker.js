// ============================================
// SEGUIMIENTO GPS MEJORADO - CON OFFLINE
// ============================================

const GPSTracker = (function() {
    // Variables privadas mejoradas
    let locMarker = null;
    let locCircle = null;
    let locWatchId = null;
    let gpsCentered = false;
    let isActive = false;
    let breadcrumbLayer = null;
    let remainingRouteLayer = null;
    let breadcrumbs = [];
    let lastPosition = null;
    let totalRouteDistance = 0;
    let traveledDistance = 0;
    let currentSpeed = 0;
    let heading = 0;
    let batteryLevel = null;
    let gpsSignalStrength = 1;
    let lastUpdateTime = Date.now();
    
    // Configuración por defecto (reemplaza AppConstants)
    const DEFAULT_CONFIG = {
        GPS_CONFIG: {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 10000
        },
        THRESHOLDS: {
            routeDeviation: 100, // metros
            batteryWarning: 20 // porcentaje
        }
    };
    
    // Estado del GPS
    let gpsState = {
        accuracy: 0,
        altitude: null,
        altitudeAccuracy: null,
        speed: 0,
        heading: null,
        timestamp: Date.now(),
        satellites: null,
        provider: 'unknown'
    };
    
    // Método updateGPSStatus - ¡CORREGIDO!
    function updateGPSStatus(message, color = '#666') {
        const statusElement = document.getElementById('gps-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.color = color;
        }
        console.log('GPS Status:', message);
        
        // También actualizar el botón de GPS si existe
        const gpsBtn = document.querySelector('[data-action="gps-track"]');
        if (gpsBtn) {
            gpsBtn.title = message;
        }
    }
    
    // Método handleLocationError - ¡CORREGIDO!
    function handleLocationError(error) {
        let message = 'Error desconocido';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message = 'Permiso de ubicación denegado';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Información de ubicación no disponible';
                break;
            case error.TIMEOUT:
                message = 'Tiempo de espera agotado';
                break;
        }
        
        updateGPSStatus('❌ ' + message, '#F44336');
        if (window.UIManager && window.UIManager.mostrarToast) {
            window.UIManager.mostrarToast(message, 'error');
        }
    }
    
    // Métodos públicos mejorados
    return {
        // Activar seguimiento GPS con fallback offline
        async locateMe() {
            if (!navigator.geolocation) {
                console.warn('Geolocalización no soportada');
                return this.useLastKnownPosition();
            }
            
            // Verificar permisos
            const permission = await this.checkGeolocationPermission();
            if (permission !== 'granted') {
                this.requestGeolocationPermission();
                return;
            }
            
            // Verificar batería
            await this.checkBattery();
            
            // Configurar según conectividad
            const config = this.getOptimizedConfig();
            
            // ¡CORREGIDO! Usar la función directamente, no this.updateGPSStatus
            updateGPSStatus('📡 Obteniendo ubicación...', '#2196F3');
            
            // Actualizar estado de la aplicación
            if (window.AppState && window.AppState.set) {
                window.AppState.set({ gpsActivo: true });
            }
            
            // Intentar obtener posición
            return new Promise((resolve, reject) => {
                let successCallback = (pos) => {
                    this.handleLocationSuccess(pos, true);
                    resolve(pos);
                };
                
                let errorCallback = async (err) => {
                    console.warn('GPS error:', err);
                    
                    // Intentar fallback offline
                    const fallbackPos = await this.tryFallbackMethods();
                    if (fallbackPos) {
                        this.handleLocationSuccess(fallbackPos, true);
                        resolve(fallbackPos);
                    } else {
                        handleLocationError(err);
                        reject(err);
                    }
                };
                
                navigator.geolocation.getCurrentPosition(
                    successCallback,
                    errorCallback,
                    config
                );
            });
        },
        
        // Obtener configuración optimizada
        getOptimizedConfig() {
            const isOnline = window.OfflineManager && window.OfflineManager.isOnline ? 
                window.OfflineManager.isOnline() : true;
            const isMobile = window.innerWidth <= 768;
            
            return {
                enableHighAccuracy: isOnline && !isMobile,
                timeout: isOnline ? 15000 : 30000,
                maximumAge: isOnline ? 10000 : 60000,
                ...DEFAULT_CONFIG.GPS_CONFIG
            };
        },
        
        // Verificar permisos
        async checkGeolocationPermission() {
            if (!navigator.permissions) return 'unknown';
            
            try {
                const result = await navigator.permissions.query({ name: 'geolocation' });
                return result.state;
            } catch (error) {
                return 'unknown';
            }
        },
        
        // Solicitar permisos
        requestGeolocationPermission() {
            if (window.UIManager && window.UIManager.mostrarToast) {
                window.UIManager.mostrarToast(
                    'Se necesitan permisos de ubicación para el seguimiento GPS',
                    'warning'
                );
            }
            
            // Intentar obtener ubicación para trigger el diálogo
            navigator.geolocation.getCurrentPosition(
                () => console.log('Permiso concedido'),
                () => console.log('Permiso denegado'),
                { enableHighAccuracy: false, timeout: 5000 }
            );
        },
        
        // Verificar estado de batería
        async checkBattery() {
            if ('getBattery' in navigator) {
                try {
                    const battery = await navigator.getBattery();
                    batteryLevel = battery.level * 100;
                    
                    battery.addEventListener('levelchange', () => {
                        batteryLevel = battery.level * 100;
                        this.updateBatteryWarning();
                    });
                    
                    this.updateBatteryWarning();
                } catch (error) {
                    console.warn('No se pudo obtener información de batería:', error);
                }
            }
        },
        
        // Actualizar advertencia de batería
        updateBatteryWarning() {
            if (batteryLevel !== null && batteryLevel < DEFAULT_CONFIG.THRESHOLDS.batteryWarning) {
                if (window.UIManager && window.UIManager.mostrarToast) {
                    window.UIManager.mostrarToast(
                        `⚠️ Batería baja: ${Math.round(batteryLevel)}%`,
                        'warning'
                    );
                }
            }
        },
        
        // Métodos de fallback offline
        async tryFallbackMethods() {
            console.log('🔍 Intentando métodos de fallback...');
            
            // 1. Última posición conocida
            const lastKnown = window.OfflineManager && window.OfflineManager.getLastKnownPosition ? 
                window.OfflineManager.getLastKnownPosition() : null;
            if (lastKnown) {
                console.log('📌 Usando última posición conocida');
                return {
                    coords: lastKnown.coords,
                    timestamp: lastKnown.timestamp
                };
            }
            
            // 2. IP geolocation (requiere conexión)
            const isOnline = window.OfflineManager && window.OfflineManager.isOnline ? 
                window.OfflineManager.isOnline() : true;
            
            if (isOnline) {
                try {
                    const ipPos = await this.getLocationByIP();
                    if (ipPos) {
                        console.log('🌐 Usando geolocalización por IP');
                        return ipPos;
                    }
                } catch (error) {
                    console.warn('Error en geolocalización por IP:', error);
                }
            }
            
            // 3. Posición por WiFi (simulada)
            const wifiPos = this.estimatePositionByWifi();
            if (wifiPos) {
                console.log('📶 Estimando posición por WiFi');
                return wifiPos;
            }
            
            return null;
        },
        
        // Obtener ubicación por IP
        async getLocationByIP() {
            try {
                const response = await fetch('https://ipapi.co/json/', {
                    timeout: 5000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        coords: {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            accuracy: 50000, // Baja precisión
                            altitude: null,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    };
                }
            } catch (error) {
                console.warn('Geolocalización por IP falló:', error);
            }
            return null;
        },
        
        // Estimar posición por WiFi (simulación)
        estimatePositionByWifi() {
            // Usar la posición inicial del mapa de constants.js
            const defaultLat = AppConstants.MAP_CONFIG.initialView[0];
            const defaultLng = AppConstants.MAP_CONFIG.initialView[1];
            
            return {
                coords: {
                    latitude: defaultLat,
                    longitude: defaultLng,
                    accuracy: 1000, // 1km de precisión
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                },
                timestamp: Date.now()
            };
        },
        
        // Usar última posición conocida
        useLastKnownPosition() {
            const lastKnown = window.OfflineManager && window.OfflineManager.getLastKnownPosition ? 
                window.OfflineManager.getLastKnownPosition() : null;
            
            if (lastKnown) {
                if (window.UIManager && window.UIManager.mostrarToast) {
                    window.UIManager.mostrarToast('GPS sin señal. Usando última posición conocida.', 'warning');
                }
                
                this.handleLocationSuccess({
                    coords: lastKnown.coords,
                    timestamp: lastKnown.timestamp
                }, true);
                
                return true;
            }
            
            if (window.UIManager && window.UIManager.mostrarToast) {
                window.UIManager.mostrarToast('No hay posición GPS disponible', 'error');
            }
            
            return false;
        },
        
        // Manejar éxito de geolocalización mejorado
        handleLocationSuccess(pos, initial = false) {
            const { latitude, longitude, accuracy, altitude, speed, heading } = pos.coords;
            const latlng = L.latLng(latitude, longitude);
            const map = window.MapManager && window.MapManager.getMap ? 
                window.MapManager.getMap() : null;
            
            if (!map) return;
            
            // Actualizar estado del GPS
            gpsState = {
                accuracy: accuracy || 0,
                altitude: altitude || null,
                altitudeAccuracy: pos.coords.altitudeAccuracy || null,
                speed: speed || 0,
                heading: heading || null,
                timestamp: pos.timestamp || Date.now(),
                satellites: null,
                provider: pos.coords.provider || 'gps'
            };
            
            // Calcular fuerza de señal
            this.calculateSignalStrength(accuracy);
            
            // Almacenar en caché offline
            if (window.OfflineManager && window.OfflineManager.cacheGPSPosition) {
                window.OfflineManager.cacheGPSPosition(pos);
            }
            
            // Guardar posición actual
            lastPosition = latlng;
            lastUpdateTime = Date.now();
            
            // Crear o actualizar marcador
            this.updateGPSTracker(latlng, accuracy);
            
            // Actualizar círculo de precisión
            this.updateAccuracyCircle(latlng, accuracy);
            
            // Solo centrar la primera vez
            if (!gpsCentered) {
                map.setView(latlng, 16);
                gpsCentered = true;
            }
            
            // Inicializar seguimiento continuo
            if (initial && !locWatchId) {
                this.startContinuousTracking();
            }
            
            // Actualizar estado
            updateGPSStatus(
                `📍 Ubicación (±${Math.round(accuracy)} m)`,
                accuracy < 50 ? '#4CAF50' : '#FF9800'
            );
            
            isActive = true;
            
            // Establecer como origen si no hay uno seleccionado
            if (initial && window.AppState && window.AppState.getPunto) {
                if (!window.AppState.getPunto('origen')) {
                    if (window.RouteManager && window.RouteManager.setPunto) {
                        window.RouteManager.setPunto('origen', latlng, "Mi Ubicación GPS");
                    }
                }
            }
            
            // Actualizar seguimiento de ruta
            this.updateRouteTracking(latlng);
            
            // Mostrar notificación solo la primera vez
            if (initial && window.UIManager && window.UIManager.mostrarToast) {
                window.UIManager.mostrarToast('Seguimiento GPS activado', 'success');
            }
        },
        
        // Calcular fuerza de señal
        calculateSignalStrength(accuracy) {
            if (accuracy < 10) gpsSignalStrength = 5; // Excelente
            else if (accuracy < 25) gpsSignalStrength = 4; // Muy buena
            else if (accuracy < 50) gpsSignalStrength = 3; // Buena
            else if (accuracy < 100) gpsSignalStrength = 2; // Regular
            else gpsSignalStrength = 1; // Mala
            
            return gpsSignalStrength;
        },
        
        // Actualizar marcador GPS
        updateGPSTracker(latlng, accuracy) {
            const map = window.MapManager && window.MapManager.getMap ? 
                window.MapManager.getMap() : null;
            if (!map) return;
            
            if (!locMarker) {
                locMarker = L.marker(latlng, {
                    icon: this.createGPSIcon(),
                    zIndexOffset: 2000,
                    rotationAngle: gpsState.heading || 0,
                    rotationOrigin: 'center'
                }).addTo(map);
                
                this.updateGPSPopup();
            } else {
                // Animación suave del movimiento
                locMarker.setLatLng(latlng);
                if (gpsState.heading !== null) {
                    locMarker.setRotationAngle(gpsState.heading);
                }
            }
        },
        
        // Crear icono GPS dinámico
        createGPSIcon() {
            const signalBars = '▁▂▃▄▅'.slice(0, gpsSignalStrength);
            const headingArrow = gpsState.heading !== null ? 
                `↗${Math.round(gpsState.heading)}°` : '';
            
            return L.divIcon({
                className: 'gps-marker',
                html: `
                    <div style="
                        background: #2196F3;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        border: 3px solid white;
                        box-shadow: 0 0 10px rgba(33, 150, 243, 0.8);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    ">
                        <div style="
                            color: white;
                            font-size: 10px;
                            font-weight: bold;
                        ">
                            ${headingArrow}
                        </div>
                        <div style="
                            position: absolute;
                            bottom: -15px;
                            color: #2196F3;
                            font-size: 8px;
                            white-space: nowrap;
                        ">
                            ${signalBars}
                        </div>
                    </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        },
        
        // Actualizar popup GPS
        updateGPSPopup() {
            if (!locMarker) return;
            
            const speedText = gpsState.speed > 0 ? 
                `${(gpsState.speed * 3.6).toFixed(1)} km/h` : '0 km/h';
            
            const altitudeText = gpsState.altitude ? 
                `${gpsState.altitude.toFixed(0)} m` : 'N/A';
            
            const headingText = gpsState.heading !== null ? 
                `${Math.round(gpsState.heading)}°` : 'N/A';
            
            locMarker.bindPopup(`
                <div style="text-align: center; padding: 10px; min-width: 200px;">
                    <strong style="color: #2196F3; font-size: 1.1em;">
                        <i class="fas fa-crosshairs"></i> SU UBICACIÓN
                    </strong>
                    <div style="margin: 8px 0; font-size: 0.9em;">
                        <div><strong>Precisión:</strong> ±${Math.round(gpsState.accuracy)} m</div>
                        <div><strong>Velocidad:</strong> ${speedText}</div>
                        <div><strong>Altitud:</strong> ${altitudeText}</div>
                        <div><strong>Rumbo:</strong> ${headingText}</div>
                    </div>
                    <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                        ${lastPosition ? `${lastPosition.lat.toFixed(5)}, ${lastPosition.lng.toFixed(5)}` : 'N/A'}<br>
                        <small>Actualizado: ${new Date(gpsState.timestamp).toLocaleTimeString()}</small>
                    </div>
                </div>
            `);
        },
        
        // Actualizar círculo de precisión
        updateAccuracyCircle(latlng, accuracy) {
            const map = window.MapManager && window.MapManager.getMap ? 
                window.MapManager.getMap() : null;
            if (!map) return;
            
            if (!locCircle) {
                locCircle = L.circle(latlng, {
                    radius: accuracy,
                    weight: 1,
                    color: '#2196F3',
                    fillColor: '#2196F3',
                    fillOpacity: 0.15,
                    interactive: false
                }).addTo(map);
            } else {
                locCircle.setLatLng(latlng);
                locCircle.setRadius(accuracy);
            }
        },
        
        // Iniciar seguimiento continuo
        startContinuousTracking() {
            const config = this.getOptimizedConfig();
            
            locWatchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const now = Date.now();
                    // Limitar actualizaciones a 1Hz
                    if (now - lastUpdateTime > 1000) {
                        lastUpdateTime = now;
                        this.handleLocationSuccess(pos, false);
                    }
                },
                (err) => {
                    console.warn('Error en seguimiento continuo:', err);
                    // Intentar reconectar después de 5 segundos
                    setTimeout(() => {
                        if (isActive && !locWatchId) {
                            this.startContinuousTracking();
                        }
                    }, 5000);
                },
                config
            );
        },
        
        // Actualizar seguimiento de ruta mejorado
        updateRouteTracking(currentPosition) {
            // Verificar si existe AppState
            if (!window.AppState || !window.AppState.get) return;
            
            const currentRoute = window.AppState.get('currentRoute');
            if (!currentRoute) return;
            
            // Actualizar breadcrumbs
            this.updateBreadcrumbs(currentPosition);
            
            // Calcular distancia recorrida
            this.calculateTraveledDistance(currentPosition);
            
            // Actualizar ruta restante
            this.updateRemainingRoute();
            
            // Actualizar UI de progreso
            this.updateProgressUI();
            
            // Verificar desviación de ruta
            this.checkRouteDeviation(currentPosition);
        },
        
        // Verificar desviación de ruta
        checkRouteDeviation(currentPosition) {
            if (!window.AppState || !window.AppState.get) return;
            
            const currentRoute = window.AppState.get('currentRoute');
            if (!currentRoute || !currentRoute.coordinates) return;
            
            // Encontrar distancia a la ruta más cercana
            let minDistance = Infinity;
            
            for (let i = 0; i < currentRoute.coordinates.length; i += 5) {
                const point = currentRoute.coordinates[i];
                if (point) {
                    const routePoint = L.latLng(point);
                    const distance = routePoint.distanceTo(currentPosition);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }
            
            // Si la desviación es mayor al umbral, alertar
            const routeDeviationThreshold = DEFAULT_CONFIG.THRESHOLDS.routeDeviation || 100;
            
            if (minDistance > routeDeviationThreshold) {
                if (window.UIManager && window.UIManager.mostrarToast) {
                    window.UIManager.mostrarToast(
                        `⚠️ Desviado ${Math.round(minDistance)}m de la ruta`,
                        'warning'
                    );
                }
                
                if (window.AppState && window.AppState.get) {
                    const vozActiva = window.AppState.get('vozActiva');
                    if (vozActiva && window.VoiceNavigation && window.VoiceNavigation.speakNotification) {
                        window.VoiceNavigation.speakNotification(
                            `Está desviado ${Math.round(minDistance)} metros de la ruta`,
                            'high'
                        );
                    }
                }
            }
        },
        
        // Métodos de ruta (simplificados - solo la estructura)
        updateBreadcrumbs: function(position) {
            // Implementación básica
            breadcrumbs.push(position);
            if (breadcrumbs.length > 100) breadcrumbs.shift(); // Limitar a 100 puntos
        },
        
        calculateTraveledDistance: function(currentPosition) {
            // Implementación básica
            if (breadcrumbs.length > 1) {
                const lastPoint = breadcrumbs[breadcrumbs.length - 2];
                traveledDistance += currentPosition.distanceTo(lastPoint);
            }
        },
        
        updateRemainingRoute: function() {
            // Implementación básica - mostrar ruta restante
        },
        
        updateProgressUI: function() {
            // Implementación básica - actualizar UI de progreso
            if (window.UIManager && window.UIManager.actualizarProgresoRuta) {
                window.UIManager.actualizarProgresoRuta(traveledDistance, totalRouteDistance);
            }
        },
        
        // Obtener información completa del GPS
        getGPSInfo() {
            return {
                ...gpsState,
                signalStrength: gpsSignalStrength,
                batteryLevel,
                isActive,
                lastUpdate: lastUpdateTime,
                breadcrumbsCount: breadcrumbs.length,
                traveledDistance,
                currentSpeed: gpsState.speed * 3.6 // Convertir a km/h
            };
        },
        
        // Detener seguimiento GPS mejorado
        stopGPS() {
            if (locWatchId !== null) {
                navigator.geolocation.clearWatch(locWatchId);
                locWatchId = null;
            }
            
            const map = window.MapManager && window.MapManager.getMap ? 
                window.MapManager.getMap() : null;
            
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
            
            // Guardar trail antes de resetear
            if (breadcrumbs.length > 0 && window.OfflineManager && window.OfflineManager.cacheGPSPosition) {
                window.OfflineManager.cacheGPSPosition({
                    coords: {
                        latitude: breadcrumbs[breadcrumbs.length - 1].lat,
                        longitude: breadcrumbs[breadcrumbs.length - 1].lng,
                        accuracy: gpsState.accuracy
                    },
                    timestamp: Date.now()
                });
            }
            
            // Resetear variables
            gpsCentered = false;
            isActive = false;
            breadcrumbs = [];
            lastPosition = null;
            totalRouteDistance = 0;
            traveledDistance = 0;
            gpsSignalStrength = 1;
            
            if (window.AppState && window.AppState.set) {
                window.AppState.set({ gpsActivo: false });
            }
            
            updateGPSStatus('GPS desconectado', '#9E9E9E');
        },
        
        // Métodos públicos adicionales
        isActive: () => isActive,
        
        getTraveledDistance: () => traveledDistance,
        
        getTotalDistance: () => totalRouteDistance,
        
        getCompletionPercentage: () => {
            if (totalRouteDistance === 0) return 0;
            return (traveledDistance / totalRouteDistance) * 100;
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.GPSTracker = GPSTracker;
}