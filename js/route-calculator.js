// ============================================
// CÁLCULO Y GESTIÓN DE RUTAS
// ============================================

const RouteCalculator = (function() {
    // Variables privadas
    let controlRuta = null;
    let routeLayer = null;

    // Métodos públicos
    return {
        // Calcular ruta óptima
        calcularRuta() {
            const puntos = AppState.get('puntos');
            
            // Validaciones
            if (!puntos.origen) {
                window.UIManager?.mostrarToast?.('Seleccione un punto de origen', 'warning');
                document.getElementById('input-origen')?.focus();
                return;
            }
            
            if (!puntos.dest) {
                window.UIManager?.mostrarToast?.('Seleccione un punto de destino', 'warning');
                document.getElementById('input-dest')?.focus();
                return;
            }
            
            // Verificar si origen o destino están en zonas bloqueadas
            const bloqueoValido = this.validarBloqueoOrigenDestino(puntos);
            if (!bloqueoValido) return;
            
            // Limpiar ruta anterior
            this.limpiarRutaAnterior();
            
            // Mostrar loading
            this.mostrarLoading(true);
            
            // Preparar waypoints
            const waypoints = [puntos.origen];
            if (puntos.inter) waypoints.push(puntos.inter);
            waypoints.push(puntos.dest);
            
            // Ocultar panel de instrucciones
            window.UIManager?.toggleInstrucciones?.(false);
            
            // Cerrar sidebar en móvil
            if (window.innerWidth <= 768) {
                window.UIManager?.toggleSidebar?.();
            }
            
            // Configurar y calcular ruta
            const map = window.MapManager?.getMap();
            if (!map) return;
            
            controlRuta = L.Routing.control({
                waypoints: waypoints,
                language: AppConstants.ROUTE_CONFIG.language,
                router: L.Routing.osrmv1({
                    serviceUrl: AppConstants.ROUTE_CONFIG.serviceUrl,
                    profile: AppConstants.ROUTE_CONFIG.profile
                }),
                formatter: new L.Routing.Formatter({ language: AppConstants.ROUTE_CONFIG.language }),
                showAlternatives: AppConstants.ROUTE_CONFIG.showAlternatives,
                lineOptions: {
                    styles: [{color: AppConstants.COLORS.route, opacity: 0.9, weight: 8}],
                    addWaypoints: false,
                    extendToWaypoints: true,
                    missingRouteTolerance: 10
                },
                altLineOptions: {
                    styles: [
                        {color: AppConstants.COLORS.altRoute, opacity: 0.7, weight: 6, dashArray: '15, 10'},
                        {color: '#f39c12', opacity: 0.7, weight: 6, dashArray: '20, 15'},
                        {color: '#2ecc71', opacity: 0.7, weight: 6, dashArray: '25, 20'}
                    ]
                },
                createMarker: () => null,
                routeWhileDragging: false,
                show: false
            }).addTo(map);
            
            // Configurar eventos
            controlRuta.on('routesfound', (e) => this.onRoutesFound(e));
            controlRuta.on('routingerror', (e) => this.onRouteError(e));
        },

        // Validar que origen y destino no estén en zonas bloqueadas
        validarBloqueoOrigenDestino(puntos) {
            const haciendasLayer = window.MapManager?.getHaciendasLayer?.();
            const blockedHaciendas = AppState.get('blockedHaciendas') || [];
            
            if (!haciendasLayer || blockedHaciendas.length === 0) return true;
            
            let origenBloqueado = false;
            let destinoBloqueado = false;
            let haciendaOrigen = null;
            let haciendaDestino = null;
            
            haciendasLayer.eachLayer(function(layer) {
                const nombre = window.SearchManager?.getNombre?.(layer.feature);
                
                if (blockedHaciendas.includes(nombre)) {
                    if (layer.getBounds().contains(puntos.origen)) {
                        origenBloqueado = true;
                        haciendaOrigen = nombre;
                    }
                    if (layer.getBounds().contains(puntos.dest)) {
                        destinoBloqueado = true;
                        haciendaDestino = nombre;
                    }
                }
            });
            
            if (origenBloqueado || destinoBloqueado) {
                let mensaje = 'No se puede calcular ruta: ';
                if (origenBloqueado && destinoBloqueado) {
                    mensaje += `origen (${haciendaOrigen}) y destino (${haciendaDestino}) en zonas bloqueadas`;
                } else if (origenBloqueado) {
                    mensaje += `origen (${haciendaOrigen}) en zona bloqueada`;
                } else {
                    mensaje += `destino (${haciendaDestino}) en zona bloqueada`;
                }
                
                window.UIManager?.mostrarToast?.(mensaje, 'error');
                return false;
            }
            
            return true;
        },

        // Manejar rutas encontradas
        onRoutesFound(e) {
    const rutasEncontradas = e.routes;
    const rutasValidas = rutasEncontradas.filter(ruta => !this.rutaPasaPorBloqueada(ruta));
    
    if (rutasValidas.length === 0) {
        window.UIManager?.mostrarToast?.(
            'Todas las rutas pasan por zonas bloqueadas. Por favor, desbloquee algunas zonas o ajuste los puntos.', 
            'error'
        );
        
        this.mostrarLoading(false);
        return;
    }
    
    // Actualizar estado
    AppState.set({ 
        rutasEncontradas: rutasEncontradas,
        rutaIndex: rutasEncontradas.indexOf(rutasValidas[0]),
        currentRoute: rutasValidas[0]
    });
    
    // Inicializar seguimiento GPS para esta ruta
    window.GPSTracker?.initRouteTracking?.(rutasValidas[0]);
        
            
            // Mostrar datos de la ruta principal
            window.UIManager?.mostrarDatosRuta?.(rutasValidas[0]);
            
            // Ajustar vista del mapa a la ruta
            if (rutasEncontradas.length > 0) {
                const bounds = L.latLngBounds(rutasEncontradas[0].coordinates);
                const map = window.MapManager?.getMap();
                map?.fitBounds(bounds, { 
                    padding: [100, 100],
                    maxZoom: 16
                });
            }
            
            // Actualizar UI
            this.mostrarLoading(false);
            
            // Mostrar notificación
            window.UIManager?.mostrarToast?.(`Ruta calculada: ${rutasValidas.length} opciones válidas`, 'success');
            
            // Mostrar instrucciones
            setTimeout(() => {
                if (window.innerWidth > 768) {
                    window.UIManager?.toggleInstrucciones?.(true);
                } else {
                    document.getElementById('mobile-instructions').style.display = 'block';
                }
            }, 500);
        },

        // Manejar error en cálculo de ruta
        onRouteError(e) {
            this.mostrarLoading(false);
            window.UIManager?.mostrarToast?.('No se pudo calcular la ruta. Verifique las ubicaciones', 'error');
            document.getElementById('route-info').style.display = 'none';
        },

        // Mostrar/ocultar loading
        mostrarLoading(mostrar) {
            const routeBtn = document.querySelector('.btn-primary');
            const routeLoading = document.getElementById('route-loading');
            const routeIcon = document.getElementById('route-icon');
            const routeText = document.getElementById('route-text');
            
            if (mostrar) {
                routeLoading.style.display = 'inline-block';
                routeIcon.style.display = 'none';
                routeText.textContent = 'CALCULANDO...';
                if (routeBtn) routeBtn.disabled = true;
            } else {
                routeLoading.style.display = 'none';
                routeIcon.style.display = 'inline-block';
                routeText.textContent = 'RUTA CALCULADA';
                if (routeBtn) routeBtn.disabled = false;
            }
        },

        // Limpiar ruta anterior
        limpiarRutaAnterior() {
            const map = window.MapManager?.getMap();
            if (controlRuta && map) {
                map.removeControl(controlRuta);
                controlRuta = null;
            }
            
            if (routeLayer && map) {
                map.removeLayer(routeLayer);
                routeLayer = null;
            }
        },

        // Cambiar a ruta alternativa
        cambiarRutaAlternativa() {
            const rutasEncontradas = AppState.get('rutasEncontradas');
            if (!rutasEncontradas || rutasEncontradas.length < 2) return;
            
            // Obtener solo rutas válidas (no bloqueadas)
            const rutasValidas = rutasEncontradas.filter(ruta => !this.rutaPasaPorBloqueada(ruta));
            
            if (rutasValidas.length < 2) {
                window.UIManager?.mostrarToast?.('No hay más rutas alternativas disponibles', 'info');
                return;
            }
            
            // Encontrar el índice de la siguiente ruta válida
            let currentIndex = AppState.get('rutaIndex');
            let nuevoIndex = -1;
            
            for (let i = 0; i < rutasEncontradas.length; i++) {
                if (i > currentIndex && !this.rutaPasaPorBloqueada(rutasEncontradas[i])) {
                    nuevoIndex = i;
                    break;
                }
            }
            
            // Si no hay siguiente, volver a la primera
            if (nuevoIndex === -1) {
                for (let i = 0; i < rutasEncontradas.length; i++) {
                    if (!this.rutaPasaPorBloqueada(rutasEncontradas[i])) {
                        nuevoIndex = i;
                        break;
                    }
                }
            }
            
            if (nuevoIndex === -1 || nuevoIndex === currentIndex) return;
            
            // Actualizar estado
            AppState.set({ 
                rutaIndex: nuevoIndex,
                currentRoute: rutasEncontradas[nuevoIndex]
            });
            
            // Mostrar datos de la nueva ruta
            window.UIManager?.mostrarDatosRuta?.(rutasEncontradas[nuevoIndex]);
            
            // Ajustar vista del mapa
            const bounds = L.latLngBounds(rutasEncontradas[nuevoIndex].coordinates);
            const map = window.MapManager?.getMap();
            map?.fitBounds(bounds, { 
                padding: [100, 100],
                maxZoom: 16
            });
            
            // Actualizar texto del botón
            const btnAlt = document.getElementById('btn-alt');
            const currentValidIndex = rutasValidas.indexOf(rutasEncontradas[nuevoIndex]) + 1;
            
            if (btnAlt) {
                btnAlt.innerHTML = `<i class="fas fa-route"></i> Ruta ${currentValidIndex} de ${rutasValidas.length}`;
            }
            
            window.UIManager?.mostrarToast?.(`Cambiada a ruta alternativa ${currentValidIndex}`, 'info');
        },

        // Verificar si una ruta pasa por zonas bloqueadas
        rutaPasaPorBloqueada(ruta) {
            const haciendasLayer = window.MapManager?.getHaciendasLayer?.();
            const blockedHaciendas = AppState.get('blockedHaciendas') || [];
            
            if (!haciendasLayer || blockedHaciendas.length === 0) return false;
            
            // Verificar si la ruta pasa por alguna hacienda bloqueada
            for (let i = 0; i < ruta.coordinates.length; i += 5) { // Muestrear cada 5 puntos
                const point = ruta.coordinates[i];
                if (point) {
                    const latlng = L.latLng(point);
                    
                    // Verificar si este punto está dentro de una hacienda bloqueada
                    let pasaPorBloqueada = false;
                    haciendasLayer.eachLayer(function(layer) {
                        if (blockedHaciendas.includes(window.SearchManager?.getNombre?.(layer.feature))) {
                            if (layer.getBounds().contains(latlng)) {
                                pasaPorBloqueada = true;
                            }
                        }
                    });
                    
                    if (pasaPorBloqueada) return true;
                }
            }
            return false;
        },

        // Recalcular ruta
        recalcularRuta() {
            const puntos = AppState.get('puntos');
            if (puntos.origen && puntos.dest) {
                this.calcularRuta();
            }
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RouteCalculator = RouteCalculator;
    // Mantener compatibilidad con el código existente
    window.RouteManager = {
        setPunto: function(tipo, latlng, nombre) {
            window.UIManager?.setPunto?.(tipo, latlng, nombre);
        }
    };
}