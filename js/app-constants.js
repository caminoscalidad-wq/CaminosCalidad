// app-constants.js
const AppConstants = {
    VERSION: '2.3.0',
    APP_NAME: 'Caminos Calidad Providencia',
    
    // Configuración del mapa
    MAP_CONFIG: {
        DEFAULT_ZOOM: 12,
        DEFAULT_CENTER: [19.4326, -99.1332], // Ciudad de México
        MIN_ZOOM: 8,
        MAX_ZOOM: 18,
        TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    },
    
    // Configuración de voz
    VOICE_CONFIG: {
        lang: 'es-ES',
        rate: 1.0,
        volume: 1.0,
        pitch: 1.0
    },
    
    // API endpoints
    API_ENDPOINTS: {
        GEOCODING: 'https://nominatim.openstreetmap.org/search',
        ROUTING: 'https://router.project-osrm.org/route/v1'
    },
    
    // Storage keys
    STORAGE_KEYS: {
        THEME: 'ccp_theme',
        RECENT_SEARCHES: 'ccp_recent_searches',
        FAVORITES: 'ccp_favorites',
        SETTINGS: 'ccp_settings'
    },
    
    // Rutas de archivos
    FILE_PATHS: {
        GEOJSON: 'data/haciendas.geojson',
        CSS: {
            MAIN: 'css/styles.css',
            DARK: 'css/dark-mode.css',
            RESPONSIVE: 'css/responsive.css'
        }
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.AppConstants = AppConstants;
}

console.log('✅ AppConstants cargado:', AppConstants.VERSION);
