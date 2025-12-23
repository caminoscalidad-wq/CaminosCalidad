// ============================================
// CONSTANTES Y CONFIGURACIONES GLOBALES
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
        gps: '#2196F3'
    },
    
    // Configuración del mapa
    MAP_CONFIG: {
        initialView: [3.62, -76.30],
        initialZoom: 12,
        maxBounds: [[3.0, -77.0], [4.5, -75.5]],
        maxBoundsViscosity: 0.8
    },
    
    // Configuración de búsqueda
    SEARCH_CONFIG: {
        minChars: 2,
        maxResults: 8
    },
    
    // Configuración de GPS
    GPS_CONFIG: {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    },
    
    // Configuración de rutas
    ROUTE_CONFIG: {
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving',
        language: 'es',
        showAlternatives: true
    },
    
    // Configuración de voz
    VOICE_CONFIG: {
        lang: 'es-ES',
        rate: 1.0,
        volume: 0.8
    },
    
    // Rutas de archivos
    DATA_PATHS: {
        haciendas: 'haciendas.geojson'
    },
    
    // Mensajes de la aplicación
    MESSAGES: {
        toast: {
            success: 'Operación completada exitosamente',
            error: 'Ha ocurrido un error',
            warning: 'Advertencia',
            info: 'Información'
        },
        gps: {
            connecting: '📡 Obteniendo ubicación...',
            connected: '📍 Ubicación actual',
            error: '❌ Error de GPS',
            disconnected: 'GPS desconectado'
        },
        estado: {
            ready: 'Sistema listo',
            calculating: 'Calculando ruta...',
            routeCalculated: 'Ruta calculada'
        }
    }
};

// Exportar para uso global (compatibilidad con navegador)
if (typeof window !== 'undefined') {
    window.AppConstants = AppConstants;
}