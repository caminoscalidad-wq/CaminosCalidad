// ============================================
// CONSTANTES Y CONFIGURACIONES GLOBALES - OFFLINE
// ============================================

const AppConstants = {
    // Colores del tema Providencia
    COLORS: {
        origin: '#2e7d32',
        inter: '#fbc02d',
        dest: '#d32f2f',
        route: '#d32f2f',
        altRoute: '#1976d2',
        selectedPolygon: '#ff5722',
        blockedPolygon: '#9e9e9e',
        gps: '#2196F3',
        online: '#4CAF50',
        offline: '#F44336'
    },
    
    // Configuración del mapa
    MAP_CONFIG: {
        initialView: [3.62, -76.30],  // [lat, lng] CORRECTO
        initialZoom: 12,
        maxBounds: [[3.0, -77.0], [4.5, -75.5]],
        maxBoundsViscosity: 0.8,
        tileCacheSize: 50  // MB para caché de mapas
    },
    
    // Configuración de búsqueda
    SEARCH_CONFIG: {
        minChars: 2,
        maxResults: 8,
        cacheTimeout: 300000,  // 5 minutos en caché
        searchRadius: 10000    // 10km radio de búsqueda
    },
    
    // Configuración de GPS mejorada
    GPS_CONFIG: {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
        updateInterval: 1000,  // Actualización cada segundo
        fallbackToCellular: true
    },
    
    // Configuración de rutas offline
    ROUTE_CONFIG: {
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        offlineServiceUrl: '/api/route/offline',
        profile: 'driving',
        language: 'es',
        showAlternatives: true,
        useOfflineRouting: false,
        cacheRoutes: true,
        maxCacheAge: 86400000  // 24 horas en caché
    },
    
    // Configuración de voz mejorada
    VOICE_CONFIG: {
        lang: 'es-ES',
        rate: 1.0,
        volume: 0.8,
        pitch: 1.0,
        offlineVoices: true,
        preload: true
    },
    
    // Rutas de archivos
    DATA_PATHS: {
        haciendas: 'haciendas.geojson',
        offlineTiles: 'offline-tiles/',
        cacheDir: 'cache/',
        voiceCache: 'cache/voice/'
    },
    
    // Configuración offline
    OFFLINE_CONFIG: {
        enableServiceWorker: true,
        cacheVersion: 'v2.4.1',
        resourcesToCache: [
            '/',
            '/index.html',
            '/css/styles.css',
            '/css/responsive.css',
            '/css/dark-mode.css',
            '/js/constants.js',
            '/js/state-manager.js',
            '/js/layer-manager.js',
            '/js/map-manager.js',
            '/js/gps-tracker.js',
            '/js/search-manager.js',
            '/js/route-calculator.js',
            '/js/voice-navigation.js',
            '/js/ui-manager.js',
            '/js/offline-manager.js',  // Nuevo
            '/js/app.js',
            '/haciendas.geojson'
        ],
        maxCacheSize: 100  // MB máximo para caché
    },
    
    // Mensajes de la aplicación
    MESSAGES: {
        toast: {
            success: 'Operación completada exitosamente',
            error: 'Ha ocurrido un error',
            warning: 'Advertencia',
            info: 'Información',
            offline: 'Modo offline activado',
            online: 'Conectado nuevamente'
        },
        gps: {
            connecting: '📡 Obteniendo ubicación...',
            connected: '📍 Ubicación actual',
            error: '❌ Error de GPS',
            disconnected: 'GPS desconectado',
            noSignal: '📶 GPS sin señal, usando última posición conocida',
            accuracyLow: '⚠️ Precisión baja (±50m)'
        },
        estado: {
            ready: 'Sistema listo',
            calculating: 'Calculando ruta...',
            routeCalculated: 'Ruta calculada',
            offlineMode: '⚡ Modo offline',
            routeCached: 'Ruta en caché disponible'
        },
        voice: {
            ready: 'Voz lista',
            speaking: 'Hablando instrucciones',
            paused: 'Voz pausada',
            stopped: 'Voz detenida',
            offline: 'Voz offline disponible'
        }
    },
    
    // Umbrales y límites
    THRESHOLDS: {
        gpsAccuracy: 50,      // metros
        gpsTimeout: 30,       // segundos
        routeDeviation: 50,   // metros para recálculo
        voiceAlertDistance: 500, // metros para alerta de voz
        batteryWarning: 20    // % para advertencia de batería
    }
};

// Exportar para uso global (compatibilidad con navegador)
if (typeof window !== 'undefined') {
    window.AppConstants = AppConstants;
}