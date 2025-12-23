// ============================================
// GESTIÓN DEL MAPA Y CAPAS
// ============================================

const MapManager = (function() {
    // Variables privadas
    let map = null;
    let controlRuta = null;
    let highlightLayer = null;
    let haciendasLayer = null;
    let trafficLayer = null;
    let capasBase = {};
    
    // Capas de mapa predefinidas
    const capasConfig = {
        calles: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }),
        
        satelite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        }),
        
        topografico: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap',
            maxZoom: 17
        })
    };

    // Métodos públicos
    return {
        // Inicializar mapa
        init() {
            map = L.map('map', {
                zoomControl: false,
                maxBounds: AppConstants.MAP_CONFIG.maxBounds,
                maxBoundsViscosity: AppConstants.MAP_CONFIG.maxBoundsViscosity,
                preferCanvas: true,
                inertia: true,
                fadeAnimation: true,
                zoomAnimation: true,
                tap: false
            }).setView(
                AppConstants.MAP_CONFIG.initialView,
                AppConstants.MAP_CONFIG.initialZoom
            );

            // Añadir capa por defecto
            capasConfig.calles.addTo(map);
            
            // Configurar controles
            L.control.zoom({ position: 'topright' }).addTo(map);
            L.control.fullscreen({ position: 'topright' }).addTo(map);
            
            // Configurar control de capas
            const baseLayers = {
                "Mapa Carreteras": capasConfig.calles,
                "Vista Satélite": capasConfig.satelite,
                "Mapa Topográfico": capasConfig.topografico
            };
            
            L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);
            
            // Configurar eventos del mapa
            this.setupMapEvents();
            
            return map;
        },

        // Obtener instancia del mapa
        getMap() {
            return map;
        },

        // Configurar eventos del mapa
        setupMapEvents() {
            map.on('click', function(e) {
                const modoManual = AppState.get('modoManual');
                if (modoManual) {
                    const tipoNombre = modoManual === 'origen' ? 'Origen' : 
                                    modoManual === 'inter' ? 'Parada Intermedia' : 'Destino';
                    window.RouteManager?.setPunto?.(modoManual, e.latlng, `${tipoNombre} Manual`);
                }
            });

            // Forzar redibujado al cambiar tamaño
            let resizeTimeout;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    if (map) {
                        map.invalidateSize(true);
                        map._onResize();
                    }
                }, 250);
            });
        },

        // Reorientar al norte
        resetNorth() {
            if (!map) return;
            
            map.setView(map.getCenter(), map.getZoom(), {
                reset: true,
                animate: true
            });
            
            // Animación del botón
            const btn = document.getElementById('btn-north');
            if (btn) {
                btn.style.transform = 'rotate(360deg)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 500);
            }
            
            window.UIManager?.mostrarToast?.('Mapa orientado al norte', 'info');
        },

        // Activar modo manual de selección
        activarManual(tipo) {
            AppState.set({ modoManual: tipo });
            document.getElementById('map').style.cursor = 'crosshair';
            
            window.UIManager?.mostrarToast?.(`Haga clic en el mapa para seleccionar ${
                tipo === 'origen' ? 'origen' : 
                tipo === 'dest' ? 'destino' : 'parada'
            }`, 'info');
            
            // Cerrar sidebar en móvil para ver mejor el mapa
            if (window.innerWidth <= 768) {
                window.UIManager?.toggleSidebar?.();
            }
        },

        // Cargar capa de haciendas
        async cargarHaciendas() {
            try {
                const response = await fetch(AppConstants.DATA_PATHS.haciendas);
                if (!response.ok) {
                    throw new Error("Error cargando datos geográficos");
                }
                
                const data = await response.json();
                window.SearchManager?.setHaciendasData?.(data.features);
                
                // Crear capa de haciendas
                haciendasLayer = L.geoJSON(data, {
                    style: this.getHaciendaStyle,
                    onEachFeature: this.onEachHaciendaFeature
                }).addTo(map);
                
                // Ajustar vista a las haciendas
                if (data.features.length > 0) {
                    const bounds = haciendasLayer.getBounds();
                    map.fitBounds(bounds, { padding: [50, 50] });
                }
                
                window.UIManager?.mostrarToast?.('Datos geográficos cargados correctamente', 'success');
                return data.features;
                
            } catch (error) {
                console.warn("Advertencia: No se pudieron cargar los datos de haciendas", error);
                window.UIManager?.mostrarToast?.('Cargando datos locales...', 'warning');
                return this.crearDatosEjemplo();
            }
        },

        // Obtener estilo para haciendas
        getHaciendaStyle(feature) {
            const isBlocked = AppState.get('blockedHaciendas').includes(
                window.SearchManager?.getNombre?.(feature)
            );
            
            return {
                fillColor: isBlocked ? AppConstants.COLORS.blockedPolygon : '#81c784',
                weight: isBlocked ? 3 : 2,
                opacity: 0.8,
                color: isBlocked ? '#616161' : '#4caf50',
                fillOpacity: isBlocked ? 0.2 : 0.3,
                dashArray: isBlocked ? '5, 5' : null,
                className: isBlocked ? 'blocked-hacienda' : ''
            };
        },

        // Configurar eventos para cada hacienda
        onEachHaciendaFeature(feature, layer) {
            const nombre = window.SearchManager?.getNombre?.(feature);
            const area = feature.properties.Area ? `Área: ${feature.properties.Area} ha` : '';
            const isBlocked = AppState.get('blockedHaciendas').includes(nombre);
            
            // Tooltip
            layer.bindTooltip(`
                <div style="font-weight: bold; color: ${isBlocked ? '#616161' : '#1b5e20'}; margin-bottom: 5px;">
                    <i class="fas fa-${isBlocked ? 'lock' : 'tractor'}"></i> ${nombre}
                    ${isBlocked ? '<span style="color: #f44336; font-size: 0.8em;"> (BLOQUEADA)</span>' : ''}
                </div>
                ${area ? `<div style="font-size: 0.9em;">${area}</div>` : ''}
                <div style="font-size: 0.8em; color: #666; margin-top: 3px;">
                    ${isBlocked ? 'Haga clic para desbloquear' : 'Haga clic para seleccionar'}
                </div>
            `, {
                direction: 'top',
                sticky: true,
                className: 'custom-tooltip'
            });
            
            // Evento click
            layer.on('click', function() {
                if (AppState.get('modoBloqueo')) {
                    // Modo bloqueo/desbloqueo
                    window.UIManager?.toggleBlockHacienda?.(nombre);
                } else {
                    // Modo selección normal
                    if (isBlocked) {
                        window.UIManager?.mostrarToast?.('Esta hacienda está bloqueada. Active el modo bloqueo para desbloquearla.', 'warning');
                        return;
                    }
                    
                    const centro = layer.getBounds().getCenter();
                    
                    // Resaltar polígono seleccionado
                    if (highlightLayer) {
                        map.removeLayer(highlightLayer);
                    }
                    
                    highlightLayer = L.geoJSON(feature, {
                        style: {
                            fillColor: AppConstants.COLORS.selectedPolygon,
                            weight: 4,
                            opacity: 0.9,
                            color: AppConstants.COLORS.selectedPolygon,
                            fillOpacity: 0.4
                        }
                    }).addTo(map);
                    
                    const tipoDestino = confirm("¿Establecer como destino? (Cancelar para origen)")
                        ? 'dest' : 'origen';
                    
                    window.RouteManager?.setPunto?.(tipoDestino, centro, nombre);
                }
            });
            
            // Eventos hover
            layer.on('mouseover', function() {
                if (!isBlocked) {
                    layer.setStyle({
                        fillOpacity: 0.6,
                        weight: 3,
                        color: '#2e7d32'
                    });
                }
            });
            
            layer.on('mouseout', function() {
                const currentIsBlocked = AppState.get('blockedHaciendas').includes(nombre);
                layer.setStyle({
                    fillOpacity: currentIsBlocked ? 0.2 : 0.3,
                    weight: currentIsBlocked ? 3 : 2,
                    color: currentIsBlocked ? '#616161' : '#4caf50'
                });
            });
        },

        // Actualizar estilos de haciendas
        updateHaciendasStyle() {
            if (!haciendasLayer) return;
            
            haciendasLayer.eachLayer(function(layer) {
                const nombre = window.SearchManager?.getNombre?.(layer.feature);
                const isBlocked = AppState.get('blockedHaciendas').includes(nombre);
                
                layer.setStyle(MapManager.getHaciendaStyle(layer.feature));
                
                // Actualizar tooltip
                const area = layer.feature.properties.Area ? `Área: ${layer.feature.properties.Area} ha` : '';
                layer.getTooltip().setContent(`
                    <div style="font-weight: bold; color: ${isBlocked ? '#616161' : '#1b5e20'}; margin-bottom: 5px;">
                        <i class="fas fa-${isBlocked ? 'lock' : 'tractor'}"></i> ${nombre}
                        ${isBlocked ? '<span style="color: #f44336; font-size: 0.8em;"> (BLOQUEADA)</span>' : ''}
                    </div>
                    ${area ? `<div style="font-size: 0.9em;">${area}</div>` : ''}
                    <div style="font-size: 0.8em; color: #666; margin-top: 3px;">
                        ${isBlocked ? 'Haga clic para desbloquear' : 'Haga clic para seleccionar'}
                    </div>
                `);
            });
        },

        // Crear datos de ejemplo
        crearDatosEjemplo() {
            return [
                {
                    "type": "Feature",
                    "properties": {
                        "Nombre": "Hacienda Providencia",
                        "Area": "120"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-76.31, 3.62], [-76.30, 3.62], 
                            [-76.30, 3.63], [-76.31, 3.63], 
                            [-76.31, 3.62]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "Nombre": "Hacienda San José",
                        "Area": "85"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-76.28, 3.60], [-76.27, 3.60], 
                            [-76.27, 3.61], [-76.28, 3.61], 
                            [-76.28, 3.60]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "Nombre": "Hacienda La Esperanza",
                        "Area": "150"
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-76.25, 3.65], [-76.24, 3.65], 
                            [-76.24, 3.66], [-76.25, 3.66], 
                            [-76.25, 3.65]
                        ]]
                    }
                }
            ];
        },

        // Obtener capa de haciendas
        getHaciendasLayer() {
            return haciendasLayer;
        },

        // Crear icono personalizado
        createCustomIcon(type) {
            return L.divIcon({
                className: `custom-marker marker-${type}`,
                html: `<i class="fas fa-${type === 'origen' ? 'play' : type === 'inter' ? 'pause' : 'flag'}"></i>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -15]
            });
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.MapManager = MapManager;
}