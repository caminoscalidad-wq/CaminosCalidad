// ============================================
// GESTIÓN DE BÚSQUEDA Y FILTRADO
// ============================================

const SearchManager = (function() {
    // Variables privadas
    let haciendasData = [];

    // Métodos públicos
    return {
        // Establecer datos de haciendas
        setHaciendasData(data) {
            haciendasData = data || [];
        },

        // Obtener datos de haciendas
        getHaciendasData() {
            return haciendasData;
        },

        // Obtener nombre de una feature
        getNombre(feature) {
            if (!feature) return "Sin nombre";
            if (typeof feature === 'object' && feature.feature) {
                feature = feature.feature;
            }
            return feature.properties?.Nombre || 
                   feature.properties?.name || 
                   feature.properties?.NOMBRE || 
                   feature.properties?.Hacienda || 
                   "Ubicación sin nombre";
        },

        // Buscar ubicaciones
        buscar(tipo) {
            const inputId = 'input-' + tipo;
            const listId = 'list-' + tipo;
            const input = document.getElementById(inputId);
            const lista = document.getElementById(listId);
            
            if (!input || !lista) return;
            
            const txt = input.value.trim().toLowerCase();
            lista.innerHTML = "";
            lista.style.display = "none";
            lista.classList.remove('active');
            
            if (txt.length < AppConstants.SEARCH_CONFIG.minChars) return;
            
            // Filtrar haciendas no bloqueadas
            const blockedHaciendas = AppState.get('blockedHaciendas') || [];
            const resultados = haciendasData
                .filter(h => !blockedHaciendas.includes(this.getNombre(h)))
                .map(h => {
                    const nombre = this.getNombre(h);
                    const nombreLower = nombre.toLowerCase();
                    let score = 0;
                    
                    if (nombreLower.startsWith(txt)) score += 100;
                    if (nombreLower.includes(' ' + txt + ' ')) score += 50;
                    if (nombreLower.includes(txt)) score += 30;
                    
                    return { hacienda: h, nombre: nombre, score: score };
                })
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, AppConstants.SEARCH_CONFIG.maxResults)
                .map(item => item.hacienda);
            
            if (resultados.length > 0) {
                resultados.forEach(h => {
                    const li = document.createElement("li");
                    const nombre = this.getNombre(h);
                    
                    li.innerHTML = `
                        <i class="fas fa-map-marker-alt"></i>
                        <div style="flex: 1;">
                            <strong>${nombre}</strong>
                            ${h.properties.Area ? `<br><small>Área: ${h.properties.Area} ha</small>` : ''}
                        </div>
                    `;
                    
                    li.onclick = () => {
                        try {
                            const tempLayer = L.geoJSON(h);
                            const centro = tempLayer.getBounds().getCenter();
                            window.RouteManager?.setPunto?.(tipo, centro, nombre);
                            lista.style.display = "none";
                            lista.classList.remove('active');
                            window.UIManager?.mostrarToast?.(`Ubicación establecida: ${nombre}`, 'success');
                            
                            // En móvil, cerrar el teclado virtual
                            if (window.innerWidth <= 768) {
                                input.blur();
                            }
                        } catch (e) {
                            console.error(e);
                            window.UIManager?.mostrarToast?.('Error al establecer ubicación', 'error');
                        }
                    };
                    
                    lista.appendChild(li);
                });
                
                lista.style.display = "block";
                lista.classList.add('active');
                
                // Ajustar posición en móvil
                if (window.innerWidth <= 768) {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar.classList.contains('active')) {
                        lista.style.bottom = 'var(--mobile-sidebar-height)';
                    } else {
                        lista.style.bottom = '0';
                    }
                    lista.style.transform = 'translateY(0)';
                }
            } else {
                const li = document.createElement("li");
                li.innerHTML = '<i class="fas fa-search"></i> No se encontraron resultados';
                li.style.color = 'var(--prov-gray-medium)';
                li.style.cursor = 'default';
                lista.appendChild(li);
                lista.style.display = "block";
                lista.classList.add('active');
            }
        },

        // Cerrar todos los resultados de búsqueda
        cerrarResultadosBusqueda() {
            document.querySelectorAll('.search-results').forEach(list => {
                list.style.display = 'none';
                list.classList.remove('active');
            });
        },

        // Filtrar haciendas por proximidad
        buscarPorProximidad(latlng, radioKm = 10) {
            if (!haciendasData.length || !latlng) return [];
            
            return haciendasData
                .map(h => {
                    const tempLayer = L.geoJSON(h);
                    const centro = tempLayer.getBounds().getCenter();
                    const distancia = centro.distanceTo(latlng) / 1000; // En km
                    
                    return {
                        hacienda: h,
                        nombre: this.getNombre(h),
                        distancia: distancia,
                        centro: centro
                    };
                })
                .filter(item => item.distancia <= radioKm)
                .sort((a, b) => a.distancia - b.distancia)
                .slice(0, 5);
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SearchManager = SearchManager;
}