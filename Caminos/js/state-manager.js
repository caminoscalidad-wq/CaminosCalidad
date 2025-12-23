// ============================================
// GESTIÓN DE ESTADO DE LA APLICACIÓN
// ============================================

const AppState = (function() {
    // Estado privado
    let state = {
        puntos: { origen: null, inter: null, dest: null },
        markers: { origen: null, inter: null, dest: null },
        rutasEncontradas: [],
        rutaIndex: 0,
        currentRoute: null,
        modoManual: null,
        modoBloqueo: false,
        gpsActivo: false,
        vozActiva: false,
        blockedHaciendas: [],
        capas: {
            haciendas: true,
            calles: true,
            satelite: false,
            topografico: false,
            trafico: false
        }
    };

    // Listeners para cambios de estado
    const listeners = [];

    // Métodos públicos
    return {
        // Obtener estado completo
        getState() {
            return { ...state };
        },

        // Obtener una propiedad específica
        get(prop) {
            return state[prop];
        },

        // Actualizar estado
        set(newState) {
            const oldState = { ...state };
            state = { ...state, ...newState };
            
            // Notificar a los listeners
            listeners.forEach(listener => listener(state, oldState));
            
            // Actualizar UI si es necesario
            this.updateUI();
        },

        // Suscribirse a cambios
        subscribe(listener) {
            listeners.push(listener);
            return () => {
                const index = listeners.indexOf(listener);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            };
        },

        // Métodos específicos para puntos
        setPunto(tipo, latlng, nombre) {
            state.puntos[tipo] = latlng;
            this.set({ puntos: state.puntos });
        },

        getPunto(tipo) {
            return state.puntos[tipo];
        },

        // Métodos para marcadores
        setMarker(tipo, marker) {
            state.markers[tipo] = marker;
        },

        getMarker(tipo) {
            return state.markers[tipo];
        },

        // Limpiar todo el estado
        limpiarTodo() {
            const confirmacion = confirm('¿Está seguro de que desea borrar toda la información actual?');
            if (!confirmacion) return false;

            // Resetear estado
            state = {
                puntos: { origen: null, inter: null, dest: null },
                markers: { origen: null, inter: null, dest: null },
                rutasEncontradas: [],
                rutaIndex: 0,
                currentRoute: null,
                modoManual: null,
                modoBloqueo: false,
                gpsActivo: false,
                vozActiva: false,
                blockedHaciendas: [],
                capas: {
                    haciendas: true,
                    calles: true,
                    satelite: false,
                    topografico: false,
                    trafico: false
                }
            };

            // Notificar cambios
            listeners.forEach(listener => listener(state, null));
            
            // Actualizar UI
            this.updateUI();
            
            return true;
        },

        // Actualizar UI según estado
        updateUI() {
            // Actualizar estado de la app
            const stateEl = document.getElementById('app-state');
            if (stateEl) {
                const icon = stateEl.querySelector('i');
                const text = stateEl.querySelector('span');
                
                const puntosCompletados = Object.values(state.puntos).filter(p => p !== null).length;
                const totalPuntos = state.puntos.inter ? 3 : 2;
                
                if (puntosCompletados === totalPuntos && state.currentRoute) {
                    icon.style.color = '#4CAF50';
                    text.textContent = 'Ruta calculada';
                } else if (puntosCompletados >= 2) {
                    icon.style.color = '#FFC107';
                    text.textContent = 'Listo para calcular ruta';
                } else {
                    icon.style.color = '#F44336';
                    text.textContent = 'Seleccione ubicaciones';
                }
            }

            // Mostrar/ocultar sección de parada intermedia
            const stopSection = document.getElementById('stopover-section');
            const addBtn = document.getElementById('btn-add-stop');
            
            if (stopSection && addBtn) {
                const tieneInter = state.puntos.inter !== null;
                stopSection.style.display = tieneInter ? 'block' : 'none';
                addBtn.style.display = tieneInter ? 'none' : 'block';
            }

            // Actualizar botones de ruta
            this.updateRouteButtons();
        },

        // Actualizar botones relacionados con rutas
        updateRouteButtons() {
            const btnAlt = document.getElementById('btn-alt');
            const btnInstr = document.getElementById('btn-instr');
            const routeInfo = document.getElementById('route-info');
            
            if (state.currentRoute) {
                // Mostrar botones de ruta
                if (btnInstr) btnInstr.style.display = 'block';
                if (routeInfo) routeInfo.style.display = 'block';
                
                // Actualizar botón de alternativas
                if (btnAlt && state.rutasEncontradas.length > 1) {
                    btnAlt.style.display = 'block';
                    const rutasValidas = state.rutasEncontradas.filter(ruta => 
                        !window.RouteCalculator?.rutaPasaPorBloqueada?.(ruta)
                    );
                    
                    if (rutasValidas.length > 1) {
                        btnAlt.innerHTML = `<i class="fas fa-exchange-alt"></i> Cambiar Ruta (${rutasValidas.length} opciones)`;
                        btnAlt.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';
                    } else if (state.rutasEncontradas.length > 1) {
                        btnAlt.innerHTML = `<i class="fas fa-info-circle"></i> 1 ruta disponible`;
                        btnAlt.style.background = 'linear-gradient(135deg, #95a5a6, #7f8c8d)';
                    }
                }
            } else {
                // Ocultar botones de ruta
                if (btnAlt) btnAlt.style.display = 'none';
                if (btnInstr) btnInstr.style.display = 'none';
                if (routeInfo) routeInfo.style.display = 'none';
            }
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.AppState = AppState;
}