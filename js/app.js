// ============================================
// APLICACIÓN PRINCIPAL - PUNTO DE ENTRADA
// ============================================

const App = (function() {
    // Métodos públicos
    return {
        // Inicializar aplicación
        async init() {
            console.log('🚀 Inicializando Caminos Calidad Providencia v2.3.0');
            
            try {
                // 1. Inicializar componentes básicos
                this.initBasicComponents();
                
                // 2. Inicializar mapa
                this.initMap();
                
                // 3. Inicializar UI
                this.initUI();
                
                // 4. Cargar datos
                await this.loadData();
                
                // 5. Configurar eventos globales
                this.setupGlobalEvents();
                
                // 6. Mostrar estado inicial
                this.showInitialState();
                
                console.log('✅ Aplicación inicializada correctamente');
                
            } catch (error) {
                console.error('❌ Error al inicializar la aplicación:', error);
                window.UIManager?.mostrarToast?.('Error al inicializar la aplicación', 'error');
            }
        },

        // Inicializar componentes básicos
        initBasicComponents() {
            // Inicializar sistema de voz
            window.VoiceNavigation?.init?.();
            
            // Inicializar gestor de UI
            window.UIManager?.init?.();
            
            // Configurar manejo de errores global
            this.setupErrorHandling();
        },

        // Inicializar mapa
        initMap() {
            const map = window.MapManager?.init?.();
            if (!map) {
                throw new Error('No se pudo inicializar el mapa');
            }
            console.log('🗺️ Mapa inicializado');
        },

        // Inicializar UI
        initUI() {
            // Configurar estado inicial de la UI
            window.AppState?.updateUI?.();
            
            // Configurar tema según preferencias del usuario
            this.setupTheme();
        },

        // Cargar datos
        async loadData() {
            console.log('📊 Cargando datos...');
            
            // Cargar haciendas
            const haciendas = await window.MapManager?.cargarHaciendas?.();
            if (haciendas && haciendas.length > 0) {
                window.SearchManager?.setHaciendasData?.(haciendas);
                console.log(`✅ ${haciendas.length} haciendas cargadas`);
            } else {
                console.warn('⚠️ No se pudieron cargar los datos de haciendas');
            }
        },

        // Configurar eventos globales
        setupGlobalEvents() {
            // Detectar cambios de tamaño de ventana
            this.setupResizeHandler();
            
            // Detectar cambios de conexión
            this.setupOnlineOfflineHandler();
            
            // Prevenir acciones no deseadas
            this.setupPreventDefaults();
            
            // Configurar atajos de teclado
            this.setupKeyboardShortcuts();
            
            // Nueva: Actualizar posición GPS periódicamente para animaciones suaves
            this.setupGPSTrackingLoop();
        },

        // Nueva función para loop de seguimiento GPS
        setupGPSTrackingLoop() {
            // Actualizar UI de progreso cada segundo si el GPS está activo
            setInterval(() => {
                if (window.GPSTracker?.isActive?.()) {
                    // Forzar actualización de la UI
                    const progressPercent = window.GPSTracker?.getCompletionPercentage?.();
                    if (progressPercent > 0) {
                        // Actualizar barra de progreso visualmente
                        const progressFill = document.getElementById('progress-fill');
                        if (progressFill) {
                            progressFill.style.width = progressPercent + '%';
                            
                            // Cambiar color según progreso
                            if (progressPercent < 30) {
                                progressFill.style.background = 'linear-gradient(90deg, #FF5722, #FF9800)';
                            } else if (progressPercent < 70) {
                                progressFill.style.background = 'linear-gradient(90deg, #FF9800, #FFC107)';
                            } else {
                                progressFill.style.background = 'linear-gradient(90deg, #4CAF50, #2E7D32)';
                            }
                        }
                        
                        // Actualizar texto
                        const progressPercentEl = document.getElementById('progress-percent');
                        if (progressPercentEl) {
                            progressPercentEl.textContent = Math.round(progressPercent) + '%';
                            
                            // Mostrar tiempo estimado restante
                            const remainingPercent = 100 - progressPercent;
                            const estimatedMinutes = Math.round((remainingPercent / 100) * 
                                (AppState.get('currentRoute')?.summary?.totalTime || 0) / 60);
                            
                            if (estimatedMinutes > 0) {
                                progressPercentEl.title = `≈ ${estimatedMinutes} min restantes`;
                            }
                        }
                    }
                }
            }, 1000); // Actualizar cada segundo
        },

        // Configurar manejo de errores
        setupErrorHandling() {
            // Capturar errores no manejados
            window.addEventListener('error', (event) => {
                console.error('Error no manejado:', event.error);
                window.UIManager?.mostrarToast?.('Ocurrió un error inesperado', 'error');
            });
            
            // Capturar promesas rechazadas no manejadas
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Promesa rechazada no manejada:', event.reason);
                window.UIManager?.mostrarToast?.('Error en operación asíncrona', 'error');
            });
        },

        // Configurar tema
        setupTheme() {
            // Verificar preferencias del usuario
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            if (prefersDark) {
                document.body.classList.add('dark-mode');
            }
            
            // Escuchar cambios en las preferencias
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (e.matches) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            });
        },

        // Configurar manejo de redimensionamiento
        setupResizeHandler() {
            let resizeTimeout;
            
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // Forzar redibujado del mapa
                    const map = window.MapManager?.getMap?.();
                    if (map) {
                        map.invalidateSize(true);
                    }
                    
                    // Actualizar UI
                    window.AppState?.updateUI?.();
                    
                    // Cerrar controles de capas si están abiertos
                    const layerControls = document.getElementById('layer-controls');
                    const btnLayers = document.getElementById('btn-layers');
                    
                    if (layerControls && layerControls.style.display === 'flex' && btnLayers) {
                        layerControls.style.display = 'none';
                        btnLayers.classList.remove('active');
                    }
                }, 250);
            });
        },

        // Configurar manejo de conexión
        setupOnlineOfflineHandler() {
            window.addEventListener('online', () => {
                window.UIManager?.mostrarToast?.('Conectado a internet', 'success');
            });
            
            window.addEventListener('offline', () => {
                window.UIManager?.mostrarToast?.('Sin conexión a internet. Algunas funciones pueden no estar disponibles.', 'warning');
            });
        },

        // Prevenir acciones no deseadas
        setupPreventDefaults() {
            // Prevenir gestos de zoom con dos dedos en móvil
            if (window.innerWidth <= 768) {
                document.addEventListener('touchmove', (e) => {
                    if (e.touches.length > 1) {
                        e.preventDefault();
                    }
                }, { passive: false });
            }
            
            // Prevenir menú contextual en elementos interactivos
            document.addEventListener('contextmenu', (e) => {
                if (e.target.closest('#map') || e.target.closest('.custom-control-btn')) {
                    e.preventDefault();
                }
            });
        },

        // Configurar atajos de teclado
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + R para recalcular ruta
                if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                    e.preventDefault();
                    window.RouteCalculator?.calcularRuta?.();
                }
                
                // Ctrl/Cmd + L para limpiar todo
                if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                    e.preventDefault();
                    window.AppState?.limpiarTodo?.();
                }
                
                // Escape para salir de modos especiales
                if (e.key === 'Escape') {
                    // Salir del modo manual
                    if (AppState.get('modoManual')) {
                        document.getElementById('map').style.cursor = '';
                        AppState.set({ modoManual: null });
                        window.UIManager?.mostrarToast?.('Modo manual cancelado', 'info');
                    }
                    
                    // Cerrar controles de capas
                    const layerControls = document.getElementById('layer-controls');
                    const btnLayers = document.getElementById('btn-layers');
                    
                    if (layerControls && layerControls.style.display === 'flex' && btnLayers) {
                        layerControls.style.display = 'none';
                        btnLayers.classList.remove('active');
                    }
                    
                    // Cerrar resultados de búsqueda
                    window.SearchManager?.cerrarResultadosBusqueda?.();
                }
            });
        },

        // Mostrar estado inicial
        showInitialState() {
            // Mostrar mensaje de bienvenida
            setTimeout(() => {
                window.UIManager?.mostrarToast?.('Sistema de Optimización de Rutas listo', 'success');
            }, 1000);
            
            // Actualizar estado de la app
            window.AppState?.updateUI?.();
        },

        // Limpiar aplicación (para recargar)
        cleanup() {
            console.log('🧹 Limpiando aplicación...');
            
            // Detener GPS
            window.GPSTracker?.stopGPS?.();
            
            // Detener voz
            window.VoiceNavigation?.stopSpeaking?.();
            
            // Limpiar intervalos
            if (window.progressInterval) {
                clearInterval(window.progressInterval);
            }
            
            // Remover event listeners
            // (Nota: En una aplicación real, se deberían mantener referencias a los listeners para removerlos)
            
            console.log('✅ Aplicación limpiada');
        }
    };
})();

// ============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar aplicación
    App.init();
    
    // Configurar limpieza antes de descargar la página
    window.addEventListener('beforeunload', () => {
        App.cleanup();
    });
});

// ============================================
// EXPORTACIÓN PARA USO GLOBAL
// ============================================

if (typeof window !== 'undefined') {
    window.App = App;
    
    // Mantener compatibilidad con funciones globales del código original
    // (solo para transición, deberían migrarse a los módulos correspondientes)
    window.toggleSidebar = () => window.UIManager?.toggleSidebar?.();
    window.toggleParada = (mostrar) => window.UIManager?.toggleParada?.(mostrar);
    window.toggleInstrucciones = (mostrar) => window.UIManager?.toggleInstrucciones?.(mostrar);
    window.calcularRuta = () => window.RouteCalculator?.calcularRuta?.();
    window.cambiarRutaAlternativa = () => window.RouteCalculator?.cambiarRutaAlternativa?.();
    window.limpiarTodo = () => window.AppState?.limpiarTodo?.();
    window.speakInstructions = () => window.VoiceNavigation?.speakInstructions?.();
    window.stopSpeaking = () => window.VoiceNavigation?.stopSpeaking?.();
    window.locateMe = () => window.GPSTracker?.locateMe?.();
    window.resetNorth = () => window.MapManager?.resetNorth?.();
    window.toggleLayerControls = () => window.UIManager?.toggleLayerControls?.();
    window.toggleTraffic = () => window.UIManager?.toggleTraffic?.();
    window.toggleBlockMode = () => window.UIManager?.toggleBlockMode?.();
}