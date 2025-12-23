// ============================================
// GESTOR DE FUNCIONALIDAD OFFLINE - CORREGIDO
// ============================================

// offline-manager.js - Agrega al inicio del archivo
class OfflineManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.registerServiceWorker();
        this.checkConnectivity();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado con éxito:', registration);
                
                // Manejar actualizaciones
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('Nueva versión disponible');
                            this.showUpdateNotification();
                        }
                    });
                });
            } catch (error) {
                console.error('Error registrando Service Worker:', error);
            }
        }
    }

    // ... resto del código existente ...
}

const OfflineManager = (function() {
    // Variables privadas
    let isOnline = navigator.onLine;
    let serviceWorkerRegistered = false;
    let cacheAvailable = false;
    let gpsCache = [];
    let routeCache = new Map();
    
    // Inicializar
    async function init() {
        console.log('🔄 Inicializando OfflineManager');
        
        // Detectar estado de conexión
        setupConnectivityListeners();
        
        // Registrar Service Worker si está disponible
        if ('serviceWorker' in navigator) {
            await registerServiceWorker();
        }
        
        // Inicializar caché
        await initCache();
        
        // Configurar sincronización en segundo plano
        setupBackgroundSync();
        
        console.log('✅ OfflineManager inicializado');
        return true;
    }
    
    // Registrar Service Worker
    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'all'
            });
            
            serviceWorkerRegistered = true;
            console.log('✅ Service Worker registrado:', registration.scope);
            
            // Verificar actualizaciones
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nuevo Service Worker encontrado:', newWorker.state);
            });
            
            return registration;
        } catch (error) {
            console.warn('⚠️ Service Worker no registrado:', error);
            serviceWorkerRegistered = false;
            return null;
        }
    }
    
    // Inicializar caché
    async function initCache() {
        if ('caches' in window) {
            try {
                const cache = await caches.open(AppConstants.OFFLINE_CONFIG.cacheVersion);
                cacheAvailable = true;
                console.log('✅ Caché disponible');
                return cache;
            } catch (error) {
                console.warn('⚠️ Error inicializando caché:', error);
                cacheAvailable = false;
            }
        }
        return null;
    }
    
    // Configurar listeners de conectividad
    function setupConnectivityListeners() {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Verificar periodicamente
        setInterval(checkConnectivity, 30000);
    }
    
    // Manejar conexión online
    function handleOnline() {
        isOnline = true;
        console.log('🌐 Conexión restablecida');
        
        // Notificar a la UI
        window.UIManager?.mostrarToast?.(
            AppConstants.MESSAGES.toast.online, 
            'success'
        );
        
        // Actualizar estado
        updateOnlineStatus(true);
        
        // Sincronizar datos pendientes
        syncPendingData();
    }
    
    // Manejar conexión offline
    function handleOffline() {
        isOnline = false;
        console.log('📴 Sin conexión');
        
        // Notificar a la UI
        window.UIManager?.mostrarToast?.(
            AppConstants.MESSAGES.toast.offline, 
            'warning'
        );
        
        // Actualizar estado
        updateOnlineStatus(false);
        
        // Usar datos cacheados
        loadCachedData();
    }
    
    // Verificar conectividad
    async function checkConnectivity() {
        try {
            const response = await fetch('https://httpbin.org/status/200', {
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-store'
            });
            isOnline = true;
        } catch (error) {
            isOnline = navigator.onLine;
        }
        
        updateOnlineStatus(isOnline);
        return isOnline;
    }
    
    // Actualizar estado en UI
    function updateOnlineStatus(online) {
        const statusElement = document.getElementById('online-status');
        if (!statusElement) return;
        
        if (online) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Online';
            statusElement.style.color = AppConstants.COLORS.online;
            statusElement.title = 'Conectado a internet';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            statusElement.style.color = AppConstants.COLORS.offline;
            statusElement.title = 'Modo offline - Funciones limitadas';
        }
    }
    
    // Configurar sincronización en segundo plano
    function setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-data');
                console.log('✅ Sincronización en segundo plano registrada');
            });
        }
    }
    
    // Almacenar ruta en caché
    function cacheRoute(key, routeData) {
        if (!cacheAvailable) return false;
        
        try {
            const cacheKey = `route_${key}`;
            const cacheItem = {
                data: routeData,
                timestamp: Date.now(),
                expires: Date.now() + AppConstants.ROUTE_CONFIG.maxCacheAge
            };
            
            routeCache.set(cacheKey, cacheItem);
            localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
            
            console.log(`💾 Ruta almacenada en caché: ${key}`);
            return true;
        } catch (error) {
            console.warn('⚠️ Error almacenando ruta en caché:', error);
            return false;
        }
    }
    
    // Obtener ruta desde caché
    function getCachedRoute(key) {
        const cacheKey = `route_${key}`;
        
        // Buscar en memoria primero
        if (routeCache.has(cacheKey)) {
            const cached = routeCache.get(cacheKey);
            if (cached.expires > Date.now()) {
                return cached.data;
            }
            routeCache.delete(cacheKey);
        }
        
        // Buscar en localStorage
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const cached = JSON.parse(stored);
                if (cached.expires > Date.now()) {
                    routeCache.set(cacheKey, cached);
                    return cached.data;
                }
                localStorage.removeItem(cacheKey);
            }
        } catch (error) {
            console.warn('⚠️ Error leyendo ruta de caché:', error);
        }
        
        return null;
    }
    
    // Almacenar posición GPS en caché
    function cacheGPSPosition(position) {
        try {
            gpsCache.push({
                coords: {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                },
                timestamp: position.timestamp || Date.now()
            });
            
            // Limitar tamaño del caché (últimas 100 posiciones)
            if (gpsCache.length > 100) {
                gpsCache = gpsCache.slice(-100);
            }
            
            // Guardar en localStorage
            localStorage.setItem('gps_trail', JSON.stringify(gpsCache));
            
            return true;
        } catch (error) {
            console.warn('⚠️ Error almacenando posición GPS:', error);
            return false;
        }
    }
    
    // Obtener última posición GPS conocida
    function getLastKnownPosition() {
        if (gpsCache.length > 0) {
            return gpsCache[gpsCache.length - 1];
        }
        
        // Intentar obtener de localStorage
        try {
            const stored = localStorage.getItem('gps_trail');
            if (stored) {
                gpsCache = JSON.parse(stored);
                if (gpsCache.length > 0) {
                    return gpsCache[gpsCache.length - 1];
                }
            }
        } catch (error) {
            console.warn('⚠️ Error leyendo GPS desde localStorage:', error);
        }
        
        return null;
    }
    
    // Sincronizar datos pendientes
    async function syncPendingData() {
        if (!isOnline) return;
        
        console.log('🔄 Sincronizando datos pendientes...');
        
        // Aquí iría la lógica para sincronizar datos pendientes
        // como rutas calculadas, historial, etc.
        
        // Limpiar caché expirado
        cleanupExpiredCache();
    }
    
    // Limpiar caché expirado
    function cleanupExpiredCache() {
        const now = Date.now();
        
        // Limpiar localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('route_')) {
                try {
                    const cached = JSON.parse(localStorage.getItem(key));
                    if (cached.expires < now) {
                        localStorage.removeItem(key);
                        routeCache.delete(key);
                    }
                } catch (error) {
                    // Ignorar errores de parseo
                }
            }
        }
        
        console.log('🧹 Caché limpiado');
    }
    
    // Cargar datos cacheados
    function loadCachedData() {
        console.log('📂 Cargando datos cacheados...');
        
        // Cargar rutas cacheadas
        const cachedRoutes = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('route_')) {
                try {
                    const value = localStorage.getItem(key);
                    const cached = JSON.parse(value);
                    if (cached.expires > Date.now()) {
                        routeCache.set(key, cached);
                        cachedRoutes.push(key.replace('route_', ''));
                    }
                } catch (error) {
                    // Ignorar errores de parseo
                }
            }
        }
        
        if (cachedRoutes.length > 0) {
            console.log(`📊 ${cachedRoutes.length} rutas cacheadas disponibles`);
            window.UIManager?.mostrarToast?.(`${cachedRoutes.length} rutas en caché disponibles`, 'info');
        }
        
        return cachedRoutes;
    }
    
    // Métodos públicos
    return {
        // Inicialización
        init,
        registerServiceWorker,
        
        // Estado de conexión
        isOnline: () => isOnline,
        checkConnectivity,
        
        // Gestión de caché
        cacheRoute,
        getCachedRoute,
        cacheGPSPosition,
        getLastKnownPosition,
        
        // Sincronización
        syncPendingData,
        cleanupExpiredCache,
        
        // Cargar datos cacheados (¡ESTE ES EL MÉTODO QUE FALTABA!)
        loadCachedData,
        
        // Utilidades
        getCacheInfo: () => {
            return {
                routesCached: routeCache.size,
                gpsPoints: gpsCache.length,
                cacheAvailable,
                serviceWorkerRegistered
            };
        },
        
        // Limpiar todo el caché
        clearAllCache: async () => {
            try {
                routeCache.clear();
                gpsCache = [];
                
                // Limpiar localStorage
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('route_') || key === 'gps_trail') {
                        keysToRemove.push(key);
                    }
                }
                
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Limpiar caché del Service Worker
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                }
                
                console.log('🧹 Todo el caché limpiado');
                return true;
            } catch (error) {
                console.error('❌ Error limpiando caché:', error);
                return false;
            }
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.OfflineManager = OfflineManager;
}