// ============================================
// GESTIÓN DE INTERFAZ DE USUARIO
// ============================================

const UIManager = (function() {
    // Variables privadas
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;

    // Métodos públicos
    return {
        // Inicializar UI
        init() {
            this.setupEventListeners();
            this.setupDragAndDrop();
            this.setupSearchResultsClose();
        },

        // Configurar event listeners
        setupEventListeners() {
            // Cerrar resultados de búsqueda al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.input-wrapper') && !e.target.closest('.search-results')) {
                    window.SearchManager?.cerrarResultadosBusqueda?.();
                }
            });

            // Configurar controles de capas
            this.setupLayerControls();

            // Configurar gestos táctiles en móvil
            if ('ontouchstart' in window) {
                this.setupTouchGestures();
            }
        },

        // Configurar controles de capas
        setupLayerControls() {
            // Toggle haciendas
            const toggleHaciendas = document.getElementById('toggle-haciendas');
            if (toggleHaciendas) {
                toggleHaciendas.addEventListener('change', (e) => {
                    const capas = AppState.get('capas');
                    AppState.set({ 
                        capas: { ...capas, haciendas: e.target.checked }
                    });
                });
            }

            // Toggle calles
            const toggleCalles = document.getElementById('toggle-calles');
            if (toggleCalles) {
                toggleCalles.addEventListener('change', (e) => {
                    const capas = AppState.get('capas');
                    AppState.set({ 
                        capas: { ...capas, calles: e.target.checked }
                    });
                });
            }

            // Toggle satélite
            const toggleSatelite = document.getElementById('toggle-satelite');
            if (toggleSatelite) {
                toggleSatelite.addEventListener('change', (e) => {
                    const capas = AppState.get('capas');
                    AppState.set({ 
                        capas: { ...capas, satelite: e.target.checked }
                    });
                });
            }

            // Toggle topográfico
            const toggleTopografico = document.getElementById('toggle-topografico');
            if (toggleTopografico) {
                toggleTopografico.addEventListener('change', (e) => {
                    const capas = AppState.get('capas');
                    AppState.set({ 
                        capas: { ...capas, topografico: e.target.checked }
                    });
                });
            }

            // Escuchar cambios en las capas
            AppState.subscribe((newState, oldState) => {
                if (newState.capas !== oldState?.capas) {
                    this.updateMapLayers(newState.capas);
                }
            });
        },

        // Actualizar capas del mapa
        updateMapLayers(capas) {
            const map = window.MapManager?.getMap();
            if (!map) return;

            // Implementar lógica para mostrar/ocultar capas según el estado
            // Esto dependerá de cómo se manejan las capas en MapManager
            console.log('Actualizando capas:', capas);
        },

        // Configurar gestos táctiles
        setupTouchGestures() {
            const mapContainer = document.getElementById('map');
            if (!mapContainer) return;

            let startX, startY;

            mapContainer.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                }
            }, { passive: true });

            mapContainer.addEventListener('touchend', (e) => {
                if (!startX || !startY || e.changedTouches.length !== 1) return;

                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = startX - endX;
                const diffY = startY - endY;

                // Detectar swipe horizontal
                if (Math.abs(diffX) > 50 && Math.abs(diffY) < 30) {
                    if (diffX > 0) {
                        // Swipe izquierda - mostrar sidebar
                        this.toggleSidebar(true);
                    } else {
                        // Swipe derecha - ocultar sidebar
                        this.toggleSidebar(false);
                    }
                }

                startX = null;
                startY = null;
            }, { passive: true });
        },

        // Configurar arrastre del panel de instrucciones
        setupDragAndDrop() {
            const dragItem = document.getElementById('floating-directions');
            const dragHandle = document.getElementById('drag-handle');
            
            if (!dragItem || !dragHandle) return;

            let active = false;
            let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

            dragHandle.addEventListener("touchstart", dragStart, false);
            dragHandle.addEventListener("touchend", dragEnd, false);
            dragHandle.addEventListener("touchmove", drag, false);
            dragHandle.addEventListener("mousedown", dragStart, false);
            document.addEventListener("mouseup", dragEnd, false);
            document.addEventListener("mousemove", drag, false);

            function dragStart(e) {
                if (e.target.id === 'close-float-btn') return;
                
                if (e.type === "touchstart") {
                    initialX = e.touches[0].clientX - xOffset;
                    initialY = e.touches[0].clientY - yOffset;
                } else {
                    initialX = e.clientX - xOffset;
                    initialY = e.clientY - yOffset;
                }
                
                if (e.target === dragHandle || dragHandle.contains(e.target)) {
                    active = true;
                }
            }

            function dragEnd() {
                initialX = currentX;
                initialY = currentY;
                active = false;
            }

            function drag(e) {
                if (active) {
                    e.preventDefault();
                    
                    if (e.type === "touchmove") {
                        currentX = e.touches[0].clientX - initialX;
                        currentY = e.touches[0].clientY - initialY;
                    } else {
                        currentX = e.clientX - initialX;
                        currentY = e.clientY - initialY;
                    }
                    
                    xOffset = currentX;
                    yOffset = currentY;
                    
                    setTranslate(currentX, currentY, dragItem);
                }
            }

            function setTranslate(xPos, yPos, el) {
                el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
            }
        },

        // Configurar cierre de resultados de búsqueda
        setupSearchResultsClose() {
            // Cerrar al presionar Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    window.SearchManager?.cerrarResultadosBusqueda?.();
                }
            });
        },

        // Mostrar/ocultar sidebar
        toggleSidebar(show) {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebar-toggle');
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                if (show === undefined) {
                    sidebar.classList.toggle('active');
                } else {
                    if (show) {
                        sidebar.classList.add('active');
                    } else {
                        sidebar.classList.remove('active');
                    }
                }
                
                document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
                
                // Ocultar resultados de búsqueda al abrir sidebar
                if (sidebar.classList.contains('active')) {
                    window.SearchManager?.cerrarResultadosBusqueda?.();
                }
                
                // Ajustar el mapa
                setTimeout(() => {
                    const map = window.MapManager?.getMap();
                    if (map) {
                        map.invalidateSize(true);
                        map._onResize();
                    }
                    
                    if (sidebar.classList.contains('active')) {
                        if (toggleBtn) toggleBtn.style.display = 'none';
                    } else if (toggleBtn) {
                        toggleBtn.style.display = 'flex';
                    }
                }, 350);
            } else {
                if (show === undefined) {
                    sidebar.classList.toggle('collapsed');
                } else {
                    if (show) {
                        sidebar.classList.remove('collapsed');
                    } else {
                        sidebar.classList.add('collapsed');
                    }
                }
                
                setTimeout(() => {
                    const map = window.MapManager?.getMap();
                    if (map) {
                        map.invalidateSize(true);
                        map._onResize();
                    }
                }, 300);
            }
        },

        // Mostrar/ocultar parada intermedia
        toggleParada(mostrar) {
            const stopSection = document.getElementById('stopover-section');
            const addBtn = document.getElementById('btn-add-stop');
            
            if (stopSection && addBtn) {
                stopSection.style.display = mostrar ? 'block' : 'none';
                addBtn.style.display = mostrar ? 'none' : 'block';
                
                if (!mostrar) {
                    // Eliminar punto intermedio
                    const puntos = AppState.get('puntos');
                    const nuevosPuntos = { ...puntos, inter: null };
                    AppState.set({ puntos: nuevosPuntos });
                    
                    // Eliminar marcador
                    const markers = AppState.get('markers');
                    const map = window.MapManager?.getMap();
                    if (markers.inter && map) {
                        map.removeLayer(markers.inter);
                        const nuevosMarkers = { ...markers, inter: null };
                        AppState.set({ markers: nuevosMarkers });
                    }
                    
                    // Limpiar input
                    document.getElementById('input-inter').value = "";
                    
                    // Recalcular ruta si existe
                    if (AppState.get('currentRoute')) {
                        setTimeout(() => {
                            window.RouteCalculator?.recalcularRuta?.();
                        }, 500);
                    }
                }
            }
        },

        // Mostrar/ocultar instrucciones
        toggleInstrucciones(mostrar) {
            const panel = document.getElementById('floating-directions');
            const btnInstr = document.getElementById('btn-instr');
            const mobileInstructions = document.getElementById('mobile-instructions');
            
            if (window.innerWidth <= 768) {
                // En móvil, usar el panel dentro del sidebar
                if (mostrar === true) {
                    if (mobileInstructions) mobileInstructions.style.display = 'block';
                    if (btnInstr) {
                        btnInstr.innerHTML = '<i class="fas fa-times"></i> Cerrar Instrucciones';
                        btnInstr.onclick = () => this.toggleInstrucciones(false);
                    }
                    
                    // Asegurarse de que el sidebar esté abierto en móvil
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar && !sidebar.classList.contains('active')) {
                        this.toggleSidebar(true);
                    }
                } else if (mostrar === false) {
                    if (mobileInstructions) mobileInstructions.style.display = 'none';
                    if (btnInstr) {
                        btnInstr.innerHTML = '<i class="fas fa-directions"></i> Ver Instrucciones';
                        btnInstr.onclick = () => this.toggleInstrucciones(true);
                    }
                } else {
                    if (mobileInstructions && mobileInstructions.style.display === 'block') {
                        this.toggleInstrucciones(false);
                    } else {
                        this.toggleInstrucciones(true);
                    }
                }
            } else {
                // En escritorio, usar el panel flotante
                if (mostrar === true) {
                    if (panel) panel.style.display = 'flex';
                    if (btnInstr) {
                        btnInstr.innerHTML = '<i class="fas fa-times"></i> Cerrar Instrucciones';
                        btnInstr.onclick = () => this.toggleInstrucciones(false);
                    }
                } else if (mostrar === false) {
                    if (panel) panel.style.display = 'none';
                    if (btnInstr) {
                        btnInstr.innerHTML = '<i class="fas fa-directions"></i> Ver Instrucciones Detalladas';
                        btnInstr.onclick = () => this.toggleInstrucciones(true);
                    }
                } else {
                    if (panel && panel.style.display === 'flex') {
                        this.toggleInstrucciones(false);
                    } else {
                        this.toggleInstrucciones(true);
                    }
                }
            }
        },

        // Mostrar/ocultar controles de capas
        toggleLayerControls() {
            const controls = document.getElementById('layer-controls');
            const btn = document.getElementById('btn-layers');
            
            if (controls && btn) {
                if (controls.style.display === 'flex') {
                    controls.style.display = 'none';
                    btn.classList.remove('active');
                } else {
                    controls.style.display = 'flex';
                    btn.classList.add('active');
                }
            }
        },

        // Mostrar/ocultar tráfico
        toggleTraffic() {
            const btn = document.getElementById('btn-traffic');
            const capas = AppState.get('capas');
            
            // Cambiar estado
            const nuevoEstado = !capas.trafico;
            AppState.set({ 
                capas: { ...capas, trafico: nuevoEstado }
            });
            
            if (btn) {
                if (nuevoEstado) {
                    btn.classList.add('active');
                    this.mostrarToast('Capa de tráfico activada', 'info');
                } else {
                    btn.classList.remove('active');
                    this.mostrarToast('Capa de tráfico desactivada', 'info');
                }
            }
        },

        // Mostrar/ocultar modo bloqueo
        toggleBlockMode() {
            const btn = document.getElementById('btn-block');
            const modoBloqueo = !AppState.get('modoBloqueo');
            
            AppState.set({ modoBloqueo: modoBloqueo });
            
            if (btn) {
                if (modoBloqueo) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="fas fa-unlock"></i>';
                    this.mostrarToast('Modo bloqueo activado. Haga clic en haciendas para bloquear/desbloquear.', 'warning');
                } else {
                    btn.classList.remove('active');
                    btn.innerHTML = '<i class="fas fa-lock"></i>';
                    this.mostrarToast('Modo bloqueo desactivado', 'info');
                }
            }
        },

        // Bloquear/desbloquear hacienda
        toggleBlockHacienda(nombre) {
            const blockedHaciendas = [...AppState.get('blockedHaciendas')];
            const index = blockedHaciendas.indexOf(nombre);
            
            if (index > -1) {
                // Desbloquear
                blockedHaciendas.splice(index, 1);
                AppState.set({ blockedHaciendas: blockedHaciendas });
                this.mostrarToast(`Hacienda ${nombre} desbloqueada`, 'success');
                this.showBlockNotification(`Hacienda ${nombre} desbloqueada. Las rutas ahora pueden pasar por aquí.`);
            } else {
                // Bloquear
                blockedHaciendas.push(nombre);
                AppState.set({ blockedHaciendas: blockedHaciendas });
                this.mostrarToast(`Hacienda ${nombre} bloqueada`, 'warning');
                this.showBlockNotification(`Hacienda ${nombre} bloqueada. Se buscarán rutas alternativas.`);
                
                // Si hay una ruta actual, recalcular para evitar esta hacienda
                if (AppState.get('currentRoute')) {
                    setTimeout(() => {
                        window.RouteCalculator?.recalcularRuta?.();
                    }, 500);
                }
            }
            
            // Actualizar estilo de haciendas
            window.MapManager?.updateHaciendasStyle?.();
        },

        // Mostrar notificación de bloqueo
        showBlockNotification(message) {
            const notification = document.getElementById('block-notification');
            const text = document.getElementById('block-notification-text');
            
            if (notification && text) {
                text.textContent = message;
                notification.style.display = 'flex';
                
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 3000);
            }
        },

        // Mostrar toast
        mostrarToast(mensaje, tipo = 'info') {
            const toast = document.getElementById('toast');
            const toastMsg = document.getElementById('toast-message');
            const icon = toast?.querySelector('i');
            
            if (!toast || !toastMsg || !icon) return;
            
            // Configurar icono según tipo
            switch(tipo) {
                case 'success':
                    icon.className = 'fas fa-check-circle';
                    toast.style.background = 'linear-gradient(135deg, #2e7d32, #1b5e20)';
                    break;
                case 'warning':
                    icon.className = 'fas fa-exclamation-triangle';
                    toast.style.background = 'linear-gradient(135deg, #fbc02d, #f57c00)';
                    break;
                case 'error':
                    icon.className = 'fas fa-times-circle';
                    toast.style.background = 'linear-gradient(135deg, #d32f2f, #b71c1c)';
                    break;
                default:
                    icon.className = 'fas fa-info-circle';
                    toast.style.background = 'linear-gradient(135deg, #1976d2, #0d47a1)';
            }
            
            toastMsg.textContent = mensaje;
            toast.style.display = 'flex';
            
            // Ocultar automáticamente
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        },

        // Establecer punto en el mapa
        setPunto(tipo, latlng, nombre) {
            const map = window.MapManager?.getMap();
            if (!map) return;
            
            // Verificar si la ubicación está en hacienda bloqueada
            const haciendasLayer = window.MapManager?.getHaciendasLayer?.();
            const blockedHaciendas = AppState.get('blockedHaciendas') || [];
            
            if (haciendasLayer) {
                let isBlocked = false;
                let haciendaBloqueada = null;
                
                haciendasLayer.eachLayer(function(layer) {
                    if (layer.getBounds().contains(latlng) && 
                        blockedHaciendas.includes(window.SearchManager?.getNombre?.(layer.feature))) {
                        isBlocked = true;
                        haciendaBloqueada = window.SearchManager?.getNombre?.(layer.feature);
                    }
                });
                
                if (isBlocked) {
                    this.mostrarToast(`No se puede seleccionar "${haciendaBloqueada}" porque está bloqueada`, 'error');
                    return;
                }
            }
            
            // Eliminar marcador anterior si existe
            const markers = AppState.get('markers');
            if (markers[tipo]) {
                map.removeLayer(markers[tipo]);
            }
            
            // Crear nuevo marcador
            const icon = window.MapManager?.createCustomIcon?.(tipo);
            const newMarker = L.marker(latlng, {
                icon: icon,
                zIndexOffset: 1000
            })
            .addTo(map)
            .bindPopup(`
                <div style="text-align: center; padding: 5px;">
                    <strong style="color: ${AppConstants.COLORS[tipo]}">
                        <i class="fas fa-${tipo === 'origen' ? 'play' : tipo === 'inter' ? 'pause' : 'flag'}"></i>
                        ${tipo.toUpperCase()}
                    </strong><br>
                    ${nombre}<br>
                    <small>${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</small>
                </div>
            `)
            .openPopup();
            
            // Actualizar estado
            const nuevosPuntos = { ...AppState.get('puntos') };
            nuevosPuntos[tipo] = latlng;
            
            const nuevosMarkers = { ...markers };
            nuevosMarkers[tipo] = newMarker;
            
            AppState.set({ 
                puntos: nuevosPuntos,
                markers: nuevosMarkers
            });
            
            // Actualizar input
            document.getElementById('input-' + tipo).value = nombre;
            
            // Centrar mapa
            map.setView(latlng, 14);
            
            // Salir del modo manual
            if (AppState.get('modoManual') === tipo) {
                document.getElementById('map').style.cursor = '';
                AppState.set({ modoManual: null });
                this.mostrarToast('Ubicación seleccionada en el mapa', 'success');
            }
            
            // Cerrar resultados de búsqueda
            window.SearchManager?.cerrarResultadosBusqueda?.();
            
            // Si ya hay una ruta, recalcular
            if (AppState.get('currentRoute')) {
                setTimeout(() => {
                    window.RouteCalculator?.recalcularRuta?.();
                }, 500);
            }
        },

        // Mostrar datos de ruta
        mostrarDatosRuta(ruta) {
            const km = (ruta.summary.totalDistance / 1000).toFixed(1);
            const min = Math.round(ruta.summary.totalTime / 60);
            
            // Actualizar información en sidebar
            const routeInfo = document.getElementById('route-info');
            const routeDetails = document.getElementById('route-details');
            
            if (routeInfo && routeDetails) {
                routeInfo.style.display = 'block';
                routeDetails.innerHTML = `
                    <div style="text-align: center; padding: 15px;">
                        <div style="font-size: 2rem; font-weight: bold; color: ${AppConstants.COLORS.route}; margin-bottom: 5px;">
                            ${km} <small style="font-size: 1rem;">km</small>
                        </div>
                        <div style="font-size: 1.2rem; color: var(--prov-gray-medium); margin-bottom: 15px;">
                            <i class="fas fa-clock"></i> ${min} minutos estimados
                        </div>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: var(--border-radius); font-size: 0.9rem;">
                            <div style="margin-bottom: 8px;">
                                <i class="fas fa-play" style="color: ${AppConstants.COLORS.origin};"></i>
                                <strong>Origen:</strong> ${document.getElementById('input-origen').value}
                            </div>
                            ${AppState.getPunto('inter') ? `
                            <div style="margin-bottom: 8px;">
                                <i class="fas fa-pause" style="color: ${AppConstants.COLORS.inter};"></i>
                                <strong>Parada:</strong> ${document.getElementById('input-inter').value}
                            </div>` : ''}
                            <div>
                                <i class="fas fa-flag" style="color: ${AppConstants.COLORS.dest};"></i>
                                <strong>Destino:</strong> ${document.getElementById('input-dest').value}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Actualizar panel de instrucciones
            this.updateInstructionsPanel(ruta);
            
            // Calcular y mostrar progreso
            this.actualizarProgresoRuta(ruta);
        },

        // Actualizar panel de instrucciones
        updateInstructionsPanel(ruta) {
            const summaryPanel = document.getElementById('route-summary');
            const contentPanel = document.getElementById('directions-content');
            const mobileContentPanel = document.getElementById('mobile-directions-content');
            
            const km = (ruta.summary.totalDistance / 1000).toFixed(1);
            const min = Math.round(ruta.summary.totalTime / 60);
            
            // Actualizar resumen
            if (summaryPanel) {
                summaryPanel.innerHTML = `
                    <h3><i class="fas fa-info-circle"></i> Resumen de Ruta</h3>
                    <div class="route-stats">
                        <div class="stat-item">
                            <span class="stat-value">${km}</span>
                            <span class="stat-label">Distancia</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${min}</span>
                            <span class="stat-label">Tiempo</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${ruta.instructions.length}</span>
                            <span class="stat-label">Pasos</span>
                        </div>
                    </div>
                `;
            }
            
            // Limpiar contenido anterior
            if (contentPanel) contentPanel.innerHTML = "";
            if (mobileContentPanel) mobileContentPanel.innerHTML = "";
            
            // Agregar instrucciones paso a paso
            ruta.instructions.forEach((step, index) => {
                const iconClass = this.getIconoInstruccion(step.type, step.modifier);
                const dist = step.distance > 1000 ? 
                    (step.distance/1000).toFixed(1) + ' km' : 
                    Math.round(step.distance) + ' m';
                
                // Limpiar texto para español
                const cleanText = step.text
                    .replace(/Continue on/g, "Continúe por")
                    .replace(/Turn left/g, "Gire a la izquierda")
                    .replace(/Turn right/g, "Gire a la derecha")
                    .replace(/sharp left/g, "gire bruscamente a la izquierda")
                    .replace(/sharp right/g, "gire bruscamente a la derecha")
                    .replace(/slight left/g, "gire ligeramente a la izquierda")
                    .replace(/slight right/g, "gire ligeramente a la derecha")
                    .replace(/Destination reached/g, "Ha llegado a su destino");
                
                const div = document.createElement('div');
                div.className = 'instruction-step';
                div.innerHTML = `
                    <div class="step-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="step-content">
                        <div class="step-text">${cleanText}</div>
                    </div>
                    <div class="step-dist">${dist}</div>
                `;
                
                if (contentPanel) contentPanel.appendChild(div);
                
                // También agregar al panel móvil
                if (mobileContentPanel) {
                    const mobileDiv = div.cloneNode(true);
                    mobileContentPanel.appendChild(mobileDiv);
                }
            });
        },

        // Obtener icono para instrucción
        getIconoInstruccion(type, mod) {
            switch(type) {
                case 'Head':
                    return 'fas fa-road';
                case 'Continue':
                    return 'fas fa-long-arrow-alt-right';
                case 'TurnLeft':
                    return 'fas fa-arrow-left';
                case 'TurnRight':
                    return 'fas fa-arrow-right';
                case 'SharpLeft':
                    return 'fas fa-arrow-circle-left';
                case 'SharpRight':
                    return 'fas fa-arrow-circle-right';
                case 'SlightLeft':
                    return 'fas fa-arrow-left rotate-45';
                case 'SlightRight':
                    return 'fas fa-arrow-right rotate-45';
                case 'Roundabout':
                    return 'fas fa-sync';
                case 'DestinationReached':
                    return 'fas fa-flag-checkered';
                case 'WaypointReached':
                    return 'fas fa-map-pin';
                default:
                    if (mod && mod.includes('Left')) return 'fas fa-arrow-left';
                    if (mod && mod.includes('Right')) return 'fas fa-arrow-right';
                    return 'fas fa-arrow-up';
            }
        },

        // Actualizar progreso de ruta
        actualizarProgresoRuta(ruta) {
            const totalDist = ruta.summary.totalDistance;
            let acumulado = 0;
            
            // Limpiar intervalo anterior
            if (window.progressInterval) {
                clearInterval(window.progressInterval);
            }
            
            // Simular progreso
            window.progressInterval = setInterval(() => {
                acumulado += totalDist / 100;
                if (acumulado > totalDist) {
                    acumulado = totalDist;
                    clearInterval(window.progressInterval);
                }
                
                const percent = Math.min(100, (acumulado / totalDist * 100));
                const progressFill = document.getElementById('progress-fill');
                const progressPercent = document.getElementById('progress-percent');
                
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressPercent) progressPercent.textContent = Math.round(percent) + '%';
            }, 50);
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}