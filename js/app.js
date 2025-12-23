// ============================================
// APLICACIÓN PRINCIPAL - PUNTO DE ENTRADA MEJORADO
// ============================================

const App = (function() {
    // Métodos públicos
    return {
        // Inicializar aplicación mejorada
        async init() {
            console.log('🚀 Inicializando Caminos Calidad Providencia v2.5.0 - Offline Capable');
            
            try {
                // 1. Mostrar splash screen inicial
                this.showSplashScreen();
                
                // 2. Inicializar gestor offline primero
                await this.initOfflineManager();
                
                // 3. Verificar conectividad
                await this.checkConnectivity();
                
                // 4. Inicializar componentes básicos
                this.initBasicComponents();
                
                // 5. Inicializar mapa
                this.initMap();
                
                // 6. Inicializar UI
                this.initUI();
                
                // 7. Cargar datos (con fallback offline)
                await this.loadData();
                
                // 8. Configurar eventos globales
                this.setupGlobalEvents();
                
                // 9. Configurar para móvil
                this.setupMobileFeatures();
                
                // 10. Ocultar splash screen
                this.hideSplashScreen();
                
                console.log('✅ Aplicación inicializada correctamente');
                
                // 11. Mostrar mensaje de bienvenida
                setTimeout(() => {
                    window.UIManager?.mostrarToast?.('Sistema listo. Modo: ' + 
                        (window.OfflineManager?.isOnline?.() ? 'Online' : 'Offline'), 'success');
                }, 1000);
                
            } catch (error) {
                console.error('❌ Error al inicializar la aplicación:', error);
                window.UIManager?.mostrarToast?.('Error al inicializar: ' + error.message, 'error');
                this.hideSplashScreen();
            }
        },
        
        // Mostrar splash screen
        showSplashScreen() {
            const splash = document.createElement('div');
            splash.id = 'splash-screen';
            splash.innerHTML = `
                <div style="
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, var(--prov-green-dark), var(--prov-green-main));
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    color: white;
                ">
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">
                            <i class="fas fa-tractor"></i>
                        </div>
                        <h1 style="margin: 0; font-size: 1.8rem;">Caminos Calidad Providencia</h1>
                        <p style="opacity: 0.8; margin-top: 10px;">Sistema de Optimización de Rutas</p>
                        <div id="splash-status" style="margin-top: 30px; font-size: 0.9rem;">
                            Inicializando...
                        </div>
                        <div style="
                            width: 200px;
                            height: 4px;
                            background: rgba(255,255,255,0.2);
                            margin: 30px auto;
                            border-radius: 2px;
                            overflow: hidden;
                        ">
                            <div id="splash-progress" style="
                                height: 100%;
                                background: white;
                                width: 0%;
                                transition: width 0.3s;
                            "></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(splash);
        },
        
        // Actualizar splash screen
        updateSplashStatus(text, progress) {
            const statusEl = document.getElementById('splash-status');
            const progressEl = document.getElementById('splash-progress');
            
            if (statusEl) statusEl.textContent = text;
            if (progressEl) progressEl.style.width = progress + '%';
        },
        
        // Ocultar splash screen
        hideSplashScreen() {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.style.opacity = '0';
                splash.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (splash.parentNode) {
                        splash.parentNode.removeChild(splash);
                    }
                }, 500);
            }
        },
        
        // Inicializar gestor offline
        async initOfflineManager() {
            this.updateSplashStatus('Configurando modo offline...', 10);
            
            if (window.OfflineManager) {
                try {
                    await window.OfflineManager.init();
                    console.log('✅ OfflineManager inicializado');
                    
                    // Verificar caché disponible
                    const cacheInfo = window.OfflineManager.getCacheInfo();
                    console.log('📊 Información de caché:', cacheInfo);
                    
                } catch (error) {
                    console.warn('⚠️ Error inicializando OfflineManager:', error);
                }
            }
        },
        
        // Verificar conectividad
        async checkConnectivity() {
            this.updateSplashStatus('Verificando conexión...', 20);
            
            const isOnline = await window.OfflineManager?.checkConnectivity?.();
            
            if (!isOnline) {
                console.log('📴 Aplicación iniciada en modo offline');
                window.UIManager?.mostrarToast?.(
                    'Modo offline activado. Funciones limitadas disponibles.',
                    'warning'
                );
            }
            
            return isOnline;
        },
        
        // Inicializar componentes básicos
        initBasicComponents() {
            this.updateSplashStatus('Inicializando componentes...', 30);
            
            // Inicializar sistema de voz
            window.VoiceNavigation?.init?.().then(success => {
                if (success) {
                    console.log('✅ VoiceNavigation inicializado');
                }
            });
            
            // Inicializar gestor de UI
            window.UIManager?.init?.();
            
            // Configurar manejo de errores global
            this.setupErrorHandling();
        },
        
        // Inicializar mapa
        initMap() {
            this.updateSplashStatus('Inicializando mapa...', 50);
            
            const map = window.MapManager?.init?.();
            if (!map) {
                throw new Error('No se pudo inicializar el mapa');
            }
            console.log('🗺️ Mapa inicializado');
        },
        
        // Inicializar UI
        initUI() {
            this.updateSplashStatus('Configurando interfaz...', 60);
            
            // Configurar estado inicial de la UI
            window.AppState?.updateUI?.();
            
            // Configurar tema según preferencias del usuario
            this.setupTheme();
            
            // Configurar indicador de estado online/offline
            this.setupOnlineStatusIndicator();
        },
        
        // Configurar indicador de estado online
        setupOnlineStatusIndicator() {
            const appStateEl = document.getElementById('app-state');
            if (!appStateEl) return;
            
            // Crear elemento de estado online
            const onlineStatus = document.createElement('div');
            onlineStatus.id = 'online-status';
            onlineStatus.style.cssText = `
                display: inline-block;
                margin-left: 10px;
                font-size: 0.8rem;
                padding: 2px 8px;
                border-radius: 10px;
                background: rgba(0,0,0,0.1);
            `;
            appStateEl.appendChild(onlineStatus);
            
            // Actualizar estado inicial
            window.OfflineManager?.updateOnlineStatus?.(window.OfflineManager?.isOnline?.());
        },
        
        // Cargar datos con fallback offline
        async loadData() {
            this.updateSplashStatus('Cargando datos...', 70);
            console.log('📊 Cargando datos...');
            
            // Cargar haciendas
            try {
                const haciendas = await window.MapManager?.cargarHaciendas?.();
                if (haciendas && haciendas.length > 0) {
                    window.SearchManager?.setHaciendasData?.(haciendas);
                    console.log(`✅ ${haciendas.length} haciendas cargadas`);
                } else {
                    console.warn('⚠️ No se pudieron cargar los datos de haciendas');
                    window.UIManager?.mostrarToast?.('Usando datos de ejemplo', 'warning');
                }
            } catch (error) {
                console.error('❌ Error cargando haciendas:', error);
                window.UIManager?.mostrarToast?.('Error cargando datos geográficos', 'error');
            }
            
            // Cargar rutas cacheadas
            if (window.OfflineManager) {
                const cachedRoutes = window.OfflineManager.loadCachedData();
                if (cachedRoutes.length > 0) {
                    console.log(`📂 ${cachedRoutes.length} rutas en caché cargadas`);
                }
            }
        },
        
        // Configurar eventos globales mejorados
        setupGlobalEvents() {
            this.updateSplashStatus('Configurando eventos...', 80);
            
            // Detectar cambios de tamaño de ventana
            this.setupResizeHandler();
            
            // Detectar cambios de conexión (ya manejado por OfflineManager)
            
            // Prevenir acciones no deseadas
            this.setupPreventDefaults();
            
            // Configurar atajos de teclado
            this.setupKeyboardShortcuts();
            
            // Configurar seguimiento GPS periódico
            this.setupGPSTrackingLoop();
            
            // Configurar gestión de batería
            this.setupBatteryManagement();
            
            // Configurar modo avión/offline detection
            this.setupAirplaneModeDetection();
        },
        
        // Configurar loop de seguimiento GPS
        setupGPSTrackingLoop() {
            // Actualizar UI de progreso cada segundo si el GPS está activo
            setInterval(() => {
                if (window.GPSTracker?.isActive?.()) {
                    // Forzar actualización de la UI
                    const progressPercent = window.GPSTracker?.getCompletionPercentage?.();
                    if (progressPercent > 0) {
                        this.updateProgressUI(progressPercent);
                    }
                    
                    // Verificar si es hora de dar instrucción de voz
                    this.checkVoiceInstruction();
                }
            }, 1000);
        },
        
        // Actualizar UI de progreso
        updateProgressUI(progressPercent) {
            const progressFill = document.getElementById('progress-fill');
            const progressPercentEl = document.getElementById('progress-percent');
            
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
        },
        
        // Verificar si es hora de dar instrucción de voz
        checkVoiceInstruction() {
            if (!AppState.get('vozActiva')) return;
            
            const nextInstruction = window.VoiceNavigation?.getNextInstructionBasedOnProgress?.();
            if (!nextInstruction) return;
            
            // Si la instrucción está a menos de 500 metros, hablarla
            if (nextInstruction.distanceToInstruction < 500) {
                window.VoiceNavigation?.speakNextInstruction?.();
            }
        },
        
        // Configurar gestión de batería
        setupBatteryManagement() {
            if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                    battery.addEventListener('levelchange', () => {
                        if (battery.level * 100 < 20) {
                            window.UIManager?.mostrarToast?.(`⚠️ Batería baja: ${Math.round(battery.level * 100)}%`, 'warning');
                            
                            // Reducir frecuencia de actualización GPS para ahorrar batería
                            if (window.GPSTracker?.isActive?.()) {
                                console.log('🔋 Batería baja - Reduciendo frecuencia GPS');
                            }
                        }
                        
                        if (battery.level * 100 < 10) {
                            window.UIManager?.mostrarToast?.(`🔋 Batería crítica: ${Math.round(battery.level * 100)}% - Conecte el cargador`, 'error');
                            
                            // Detener funciones no críticas
                            window.VoiceNavigation?.stopSpeaking?.();
                        }
                    });
                });
            }
        },
        
        // Detectar modo avión
        setupAirplaneModeDetection() {
            // Intentar detectar modo avión mediante múltiples métodos
            setInterval(() => {
                if (navigator.onLine === false && 
                    window.OfflineManager?.isOnline?.() === false &&
                    !window.navigator.connection) {
                    
                    // Posible modo avión activado
                    console.log('✈️ Modo avión posiblemente activado');
                    
                    if (!document.hidden) {
                        window.UIManager?.mostrarToast?.(
                            'Modo avión detectado. Funciones limitadas disponibles.',
                            'warning'
                        );
                    }
                }
            }, 30000); // Verificar cada 30 segundos
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
                    
                    // Notificar a LayerManager del cambio de tamaño
                    window.LayerManager?.handleResize?.();
                    
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
                
                // Sincronizar datos pendientes
                window.OfflineManager?.syncPendingData?.();
            });
            
            window.addEventListener('offline', () => {
                window.UIManager?.mostrarToast?.(
                    'Sin conexión a internet. Algunas funciones pueden no estar disponibles.',
                    'warning'
                );
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
                
                // Espacio para activar/desactivar voz
                if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if (AppState.get('vozActiva')) {
                        window.VoiceNavigation?.stopSpeaking?.();
                    } else {
                        window.VoiceNavigation?.speakInstructions?.();
                    }
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
        
        // Configurar para características móviles
        setupMobileFeatures() {
            this.updateSplashStatus('Configurando para móvil...', 90);
            
            if (window.innerWidth <= 768) {
                console.log('📱 Configurando para dispositivo móvil');
                
                // Forzar redibujado del mapa
                setTimeout(() => {
                    const map = window.MapManager?.getMap();
                    if (map) {
                        map.invalidateSize(true);
                        map._onResize();
                    }
                    
                    // Mostrar instrucciones iniciales
                    setTimeout(() => {
                        window.UIManager?.mostrarToast?.(
                            'Para buscar haciendas: toque el campo de búsqueda y escriba el nombre',
                            'info'
                        );
                    }, 2000);
                }, 1000);
                
                // Configurar para evitar zoom en inputs
                document.querySelectorAll('input, select, textarea').forEach(element => {
                    element.addEventListener('focus', () => {
                        setTimeout(() => {
                            window.scrollTo(0, 0);
                        }, 100);
                    });
                });
            }
        },
        
        // Configurar manejo de errores
        setupErrorHandling() {
            // Capturar errores no manejados
            window.addEventListener('error', (event) => {
                console.error('Error no manejado:', event.error);
                window.UIManager?.mostrarToast?.('Ocurrió un error inesperado', 'error');
                
                // Intentar recuperación
                this.attemptRecovery(event.error);
            });
            
            // Capturar promesas rechazadas no manejadas
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Promesa rechazada no manejada:', event.reason);
                window.UIManager?.mostrarToast?.('Error en operación asíncrona', 'error');
            });
        },
        
        // Intentar recuperación de errores
        attemptRecovery(error) {
            console.log('🔄 Intentando recuperación de error...');
            
            // Si es error de red, activar modo offline
            if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
                window.OfflineManager?.handleOffline?.();
            }
            
            // Si es error de GPS, intentar usar posición cacheadas
            if (error.message.includes('GPS') || error.message.includes('geolocation')) {
                window.GPSTracker?.useLastKnownPosition?.();
            }
            
            // Si es error de mapa, reintentar inicialización
            if (error.message.includes('map') || error.message.includes('leaflet')) {
                setTimeout(() => {
                    window.MapManager?.init?.();
                }, 1000);
            }
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
            
            // Guardar estado actual
            this.saveCurrentState();
            
            // Sincronizar datos pendientes si hay conexión
            if (window.OfflineManager?.isOnline?.()) {
                window.OfflineManager?.syncPendingData?.();
            }
            
            console.log('✅ Aplicación limpiada');
        },
        
        // Guardar estado actual
        saveCurrentState() {
            try {
                const state = {
                    puntos: AppState.get('puntos'),
                    currentRoute: AppState.get('currentRoute'),
                    blockedHaciendas: AppState.get('blockedHaciendas'),
                    timestamp: Date.now()
                };
                
                localStorage.setItem('app_last_state', JSON.stringify(state));
                console.log('💾 Estado guardado');
            } catch (error) {
                console.warn('⚠️ No se pudo guardar el estado:', error);
            }
        },
        
        // Restaurar estado anterior
        restorePreviousState() {
            try {
                const savedState = localStorage.getItem('app_last_state');
                if (savedState) {
                    const state = JSON.parse(savedState);
                    
                    // Verificar si no es muy antiguo (menos de 1 día)
                    if (Date.now() - state.timestamp < 86400000) {
                        AppState.set({ 
                            puntos: state.puntos,
                            currentRoute: state.currentRoute,
                            blockedHaciendas: state.blockedHaciendas 
                        });
                        
                        console.log('📂 Estado anterior restaurado');
                        return true;
                    }
                }
            } catch (error) {
                console.warn('⚠️ No se pudo restaurar el estado:', error);
            }
            return false;
        }
    };
})();

// ============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Mostrar mensaje de carga inicial
    console.log('📱 Aplicación cargando...');
    
    // Inicializar aplicación
    App.init();
    
    // Configurar limpieza antes de descargar la página
    window.addEventListener('beforeunload', () => {
        App.cleanup();
    });
    
    // Configurar para instalar como PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // El Service Worker ya está registrado por OfflineManager
            // Aquí podemos agregar lógica para instalar como PWA
            if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('📲 Aplicación ejecutándose como PWA');
            }
        });
    }
});

// ============================================
// EXPORTACIÓN PARA USO GLOBAL
// ============================================

if (typeof window !== 'undefined') {
    window.App = App;
    
    // Mantener compatibilidad con funciones globales del código original
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