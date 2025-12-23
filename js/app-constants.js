// map-manager.js - VERSIÓN CORREGIDA
const MapManager = (function() {
    let map = null;
    let geojsonLayer = null;
    
    // Coordenadas por defecto (fallback)
    const DEFAULT_CENTER = [19.4326, -99.1332]; // Ciudad de México
    const DEFAULT_ZOOM = 12;

    // Métodos privados
    function initMap() {
        console.log('🗺️ Inicializando mapa...');
        
        // 1. Verificar que el contenedor del mapa exista
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ No se encontró el elemento #map');
            return;
        }
        
        // 2. Obtener configuración (con fallback)
        let center, zoom, tileLayerUrl;
        
        if (window.AppConstants && window.AppConstants.MAP_CONFIG) {
            center = window.AppConstants.MAP_CONFIG.DEFAULT_CENTER || DEFAULT_CENTER;
            zoom = window.AppConstants.MAP_CONFIG.DEFAULT_ZOOM || DEFAULT_ZOOM;
            tileLayerUrl = window.AppConstants.MAP_CONFIG.TILE_LAYER || 
                          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        } else {
            console.warn('⚠️ AppConstants no encontrado, usando valores por defecto');
            center = DEFAULT_CENTER;
            zoom = DEFAULT_ZOOM;
            tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        }
        
        // 3. Validar coordenadas
        if (!Array.isArray(center) || center.length !== 2 || 
            typeof center[0] !== 'number' || typeof center[1] !== 'number') {
            console.error('❌ Coordenadas inválidas:', center, 'Usando valores por defecto');
            center = DEFAULT_CENTER;
        }
        
        console.log('📍 Centro del mapa:', center);
        console.log('🔍 Zoom:', zoom);
        
        // 4. Crear el mapa
        try {
            map = L.map('map', {
                center: center,
                zoom: zoom,
                zoomControl: false, // Lo añadiremos después
                attributionControl: false
            });
            
            // 5. Añadir capa base
            L.tileLayer(tileLayerUrl, {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
            
            // 6. Añadir controles
            L.control.zoom({ position: 'topright' }).addTo(map);
            L.control.attribution({ position: 'bottomright' }).addTo(map);
            
            // 7. Añadir eventos básicos
            map.on('load', function() {
                console.log('✅ Mapa cargado correctamente');
                // Cargar GeoJSON después de que el mapa esté listo
                loadHaciendasGeoJSON();
            });
            
            map.on('error', function(e) {
                console.error('❌ Error en el mapa:', e.message);
            });
            
            console.log('✅ Mapa inicializado');
            return true;
            
        } catch (error) {
            console.error('❌ Error al inicializar el mapa:', error);
            // Mostrar mensaje de error al usuario
            if (window.UIManager && window.UIManager.mostrarToast) {
                window.UIManager.mostrarToast('Error al cargar el mapa', 'error');
            }
            return false;
        }
    }
    
    function loadHaciendasGeoJSON() {
        console.log('📊 Cargando datos GeoJSON...');
        
        // URL del archivo GeoJSON
        const geojsonUrl = window.AppConstants ? 
            window.AppConstants.FILE_PATHS.GEOJSON || 'data/haciendas.geojson' : 
            'data/haciendas.geojson';
        
        console.log('📁 URL GeoJSON:', geojsonUrl);
        
        // Verificar si ya existe una capa
        if (geojsonLayer) {
            map.removeLayer(geojsonLayer);
        }
        
        // Cargar GeoJSON con fetch
        fetch(geojsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('📈 Datos GeoJSON cargados:', data);
                
                if (!data.features || !Array.isArray(data.features)) {
                    throw new Error('Formato GeoJSON inválido: no hay features');
                }
                
                // Crear capa GeoJSON
                geojsonLayer = L.geoJSON(data, {
                    pointToLayer: function(feature, latlng) {
                        // Crear marcadores personalizados
                        return L.marker(latlng, {
                            icon: L.divIcon({
                                className: 'hacienda-marker',
                                html: '<div class="marker-icon">🏛️</div>',
                                iconSize: [30, 30],
                                iconAnchor: [15, 30]
                            })
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        // Añadir popup
                        if (feature.properties) {
                            let popupContent = `<div class="hacienda-popup">`;
                            
                            if (feature.properties.name) {
                                popupContent += `<h3>${feature.properties.name}</h3>`;
                            }
                            
                            if (feature.properties.descripcion) {
                                popupContent += `<p>${feature.properties.descripcion}</p>`;
                            }
                            
                            if (feature.properties.estado) {
                                popupContent += `<p><strong>Estado:</strong> ${feature.properties.estado}</p>`;
                            }
                            
                            if (feature.properties.municipio) {
                                popupContent += `<p><strong>Municipio:</strong> ${feature.properties.municipio}</p>`;
                            }
                            
                            popupContent += `</div>`;
                            
                            layer.bindPopup(popupContent);
                        }
                        
                        // Evento de clic
                        layer.on('click', function(e) {
                            if (window.searchManager) {
                                window.searchManager.selectHacienda(feature);
                            }
                        });
                    }
                }).addTo(map);
                
                // Ajustar vista a los datos
                if (geojsonLayer.getBounds().isValid()) {
                    map.fitBounds(geojsonLayer.getBounds().pad(0.1));
                }
                
                console.log(`✅ ${data.features.length} haciendas cargadas`);
                
                // Almacenar datos globalmente
                window.haciendasData = data;
                
                // Notificar que los datos están listos
                if (window.AppState && window.AppState.set) {
                    window.AppState.set({ 
                        dataLoaded: true,
                        haciendasCount: data.features.length 
                    });
                }
                
                if (window.UIManager && window.UIManager.mostrarToast) {
                    window.UIManager.mostrarToast(`${data.features.length} haciendas cargadas`, 'success');
                }
                
            })
            .catch(error => {
                console.error('❌ Error cargando GeoJSON:', error);
                
                // Mostrar error al usuario
                if (window.UIManager && window.UIManager.mostrarToast) {
                    window.UIManager.mostrarToast(`Error cargando datos: ${error.message}`, 'error');
                }
                
                // Crear capa vacía para evitar más errores
                geojsonLayer = L.geoJSON({ type: 'FeatureCollection', features: [] }).addTo(map);
            });
    }
    
    // Métodos públicos
    return {
        init: function() {
            return initMap();
        },
        
        getMap: function() {
            return map;
        },
        
        getHaciendasData: function() {
            return window.haciendasData || { features: [] };
        },
        
        searchHaciendas: function(query) {
            if (!window.haciendasData || !window.haciendasData.features) {
                return [];
            }
            
            const searchTerm = query.toLowerCase().trim();
            return window.haciendasData.features.filter(feature => {
                const props = feature.properties || {};
                return (
                    (props.name && props.name.toLowerCase().includes(searchTerm)) ||
                    (props.descripcion && props.descripcion.toLowerCase().includes(searchTerm)) ||
                    (props.municipio && props.municipio.toLowerCase().includes(searchTerm)) ||
                    (props.estado && props.estado.toLowerCase().includes(searchTerm))
                );
            });
        },
        
        focusOnHacienda: function(hacienda) {
            if (!map || !hacienda || !hacienda.geometry) return;
            
            // Centrar en la hacienda
            const coords = hacienda.geometry.coordinates;
            const latlng = [coords[1], coords[0]];
            
            map.setView(latlng, 15, {
                animate: true,
                duration: 1
            });
            
            // Abrir popup si existe un layer
            if (geojsonLayer) {
                geojsonLayer.eachLayer(function(layer) {
                    if (layer.feature === hacienda) {
                        layer.openPopup();
                    }
                });
            }
        },
        
        // Métodos adicionales...
        setView: function(latlng, zoom) {
            if (map) {
                map.setView(latlng, zoom || map.getZoom());
            }
        },
        
        getCenter: function() {
            return map ? map.getCenter() : null;
        }
    };
})();

// Inicialización automática cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            MapManager.init();
        }, 500);
    });
} else {
    setTimeout(function() {
        MapManager.init();
    }, 500);
}

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.MapManager = MapManager;
}

console.log('✅ MapManager cargado');
