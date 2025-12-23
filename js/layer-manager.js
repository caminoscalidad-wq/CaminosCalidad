// ============================================
// GESTIÓN DE CAPAS Y MAPAS BASE
// ============================================

const LayerManager = (function() {
    // Variables privadas
    let map = null;
    let currentBaseLayer = null;
    let baseLayers = {};
    
    // Capas de mapa configuradas
    const layerConfigs = {
        calles: {
            name: "Mapa Carreteras",
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '© OpenStreetMap',
            maxZoom: 19,
            isMobileDefault: false
        },
        satelite: {
            name: "Vista Satélite",
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attribution: '© Esri',
            maxZoom: 19,
            isMobileDefault: true
        },
        topografico: {
            name: "Mapa Topográfico",
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '© OpenTopoMap',
            maxZoom: 17,
            isMobileDefault: false
        }
    };

    // Métodos públicos
    return {
        // Inicializar con mapa
        init(mapInstance) {
            map = mapInstance;
            this.createBaseLayers();
            this.setDefaultLayer();
        },

        // Crear capas base
        createBaseLayers() {
            for (const [key, config] of Object.entries(layerConfigs)) {
                baseLayers[key] = L.tileLayer(config.url, {
                    attribution: config.attribution,
                    maxZoom: config.maxZoom
                });
            }
        },

        // Establecer capa por defecto según dispositivo
        setDefaultLayer() {
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile && baseLayers.satelite) {
                this.switchToLayer('satelite');
            } else if (baseLayers.calles) {
                this.switchToLayer('calles');
            }
            
            // Actualizar controles de UI
            this.updateLayerSwitches();
        },

        // Cambiar a capa específica
        switchToLayer(layerName) {
            if (!map || !baseLayers[layerName]) return false;
            
            // Remover capa actual
            if (currentBaseLayer) {
                map.removeLayer(currentBaseLayer);
            }
            
            // Añadir nueva capa
            baseLayers[layerName].addTo(map);
            currentBaseLayer = baseLayers[layerName];
            
            // Actualizar estado
            const capas = AppState.get('capas') || {};
            const newCapas = { ...capas };
            
            // Resetear todas las capas base
            Object.keys(baseLayers).forEach(key => {
                newCapas[key] = (key === layerName);
            });
            
            AppState.set({ capas: newCapas });
            
            return true;
        },

        // Actualizar switches en UI
        updateLayerSwitches() {
            const capas = AppState.get('capas') || {};
            
            Object.keys(baseLayers).forEach(key => {
                const toggle = document.getElementById(`toggle-${key}`);
                if (toggle) {
                    toggle.checked = capas[key] || false;
                }
            });
        },

        // Obtener capa actual
        getCurrentLayer() {
            return currentBaseLayer;
        },

        // Obtener todas las capas base
        getBaseLayers() {
            return baseLayers;
        },

        // Manejar cambio de tamaño de ventana
        handleResize() {
            const isMobile = window.innerWidth <= 768;
            const capas = AppState.get('capas') || {};
            
            // Si estamos en móvil y no está activo satélite, cambiarlo
            if (isMobile && !capas.satelite) {
                this.switchToLayer('satelite');
            } 
            // Si estamos en escritorio y no hay capa activa, usar calles
            else if (!isMobile && !capas.calles && !capas.satelite && !capas.topografico) {
                this.switchToLayer('calles');
            }
        },

        // Configurar controles de capas para Leaflet
        setupLeafletLayerControl() {
            if (!map) return;
            
            // Crear objeto de capas para el control
            const layerControl = {};
            Object.entries(layerConfigs).forEach(([key, config]) => {
                if (baseLayers[key]) {
                    layerControl[config.name] = baseLayers[key];
                }
            });
            
            // Añadir control al mapa
            L.control.layers(layerControl, null, { 
                position: 'topright',
                collapsed: false
            }).addTo(map);
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LayerManager = LayerManager;
}