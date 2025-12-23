// ============================================
// NAVEGACIÓN POR VOZ Y SÍNTESIS DE VOZ
// ============================================

const VoiceNavigation = (function() {
    // Variables privadas
    let speechSynthesis = window.speechSynthesis;
    let currentSpeech = null;
    let isSpeaking = false;
    let voiceQueue = [];
    let spanishVoice = null;

    // Configuración de voz por defecto (en caso de que AppConstants no exista)
    const DEFAULT_VOICE_CONFIG = {
        lang: 'es-ES',
        rate: 1.0,
        volume: 1.0
    };

    // Inicializar voces disponibles
    function initVoices() {
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
        loadVoices();
    }

    // Cargar voces disponibles
    function loadVoices() {
        const voices = speechSynthesis.getVoices();
        spanishVoice = voices.find(voice => 
            voice.lang.startsWith('es') || 
            voice.name.toLowerCase().includes('spanish')
        );
        
        if (spanishVoice) {
            console.log('✅ Voz en español encontrada:', spanishVoice.name);
        } else if (voices.length > 0) {
            spanishVoice = voices[0];
            console.log('⚠️ Usando voz predeterminada:', spanishVoice.name);
        } else {
            console.warn('⚠️ No se encontraron voces disponibles');
        }
    }

    // Obtener configuración de voz (con fallback)
    function getVoiceConfig() {
        if (window.AppConstants && window.AppConstants.VOICE_CONFIG) {
            return window.AppConstants.VOICE_CONFIG;
        }
        return DEFAULT_VOICE_CONFIG;
    }

    // Métodos públicos
    return {
        // Inicializar sistema de voz
        init() {
            if (!speechSynthesis) {
                console.warn('❌ Síntesis de voz no disponible en este navegador');
                return;
            }
            initVoices();
            console.log('✅ Navegación por voz inicializada');
        },

        // Leer instrucciones de ruta
        speakInstructions() {
            if (!speechSynthesis) {
                window.UIManager?.mostrarToast?.('Síntesis de voz no disponible en este navegador', 'warning');
                return;
            }

            const currentRoute = window.AppState?.get?.('currentRoute');
            if (!currentRoute) {
                window.UIManager?.mostrarToast?.('No hay ruta calculada para leer', 'warning');
                return;
            }

            this.stopSpeaking(); // Detener cualquier voz anterior

            const instructions = currentRoute.instructions;
            if (!instructions || instructions.length === 0) {
                window.UIManager?.mostrarToast?.('No hay instrucciones disponibles', 'warning');
                return;
            }

            let instructionText = `Iniciando navegación. `;
            
            // Información general de la ruta
            if (currentRoute.summary) {
                const distanceKm = (currentRoute.summary.totalDistance / 1000).toFixed(1);
                const durationMin = Math.round(currentRoute.summary.totalTime / 60);
                instructionText += `Ruta de ${distanceKm} kilómetros. Duración estimada: ${durationMin} minutos. `;
            }

            // Instrucciones paso a paso
            instructions.forEach((step, index) => {
                if (!step || !step.text) return;
                
                // Limpiar texto de instrucciones
                let cleanText = step.text
                    .replace(/<\/?[^>]+(>|$)/g, "") // Remover HTML
                    .replace(/Continue on/g, "Continúe por")
                    .replace(/Turn left/g, "Gire a la izquierda")
                    .replace(/Turn right/g, "Gire a la derecha")
                    .replace(/sharp left/g, "gire bruscamente a la izquierda")
                    .replace(/sharp right/g, "gire bruscamente a la derecha")
                    .replace(/slight left/g, "gire ligeramente a la izquierda")
                    .replace(/slight right/g, "gire ligeramente a la derecha")
                    .replace(/Destination reached/g, "Ha llegado a su destino");
                
                // Formatear distancia
                let distanciaTexto = '';
                if (step.distance) {
                    distanciaTexto = step.distance > 1000 ? 
                        `${(step.distance/1000).toFixed(1)} kilómetros` : 
                        `${Math.round(step.distance)} metros`;
                }
                
                instructionText += `Paso ${index + 1}: ${cleanText}${distanciaTexto ? ` en ${distanciaTexto}` : ''}. `;
            });

            instructionText += `Fin de las instrucciones. Ha llegado a su destino.`;

            this.speak(instructionText, {
                onStart: () => {
                    window.UIManager?.mostrarToast?.('Reproduciendo instrucciones de voz', 'info');
                    if (window.AppState?.set) {
                        window.AppState.set({ vozActiva: true });
                    }
                },
                onEnd: () => {
                    window.UIManager?.mostrarToast?.('Instrucciones completadas', 'success');
                    if (window.AppState?.set) {
                        window.AppState.set({ vozActiva: false });
                    }
                },
                onError: (error) => {
                    console.error('❌ Error en síntesis de voz:', error);
                    window.UIManager?.mostrarToast?.('Error al reproducir voz', 'error');
                    if (window.AppState?.set) {
                        window.AppState.set({ vozActiva: false });
                    }
                }
            });
        },

        // Hablar texto genérico
        speak(text, options = {}) {
            if (!speechSynthesis || !text) {
                console.warn('❌ No se puede hablar: speechSynthesis no disponible o texto vacío');
                return null;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            const voiceConfig = getVoiceConfig();
            
            // Configuración
            utterance.lang = options.lang || voiceConfig.lang;
            utterance.rate = options.rate || voiceConfig.rate;
            utterance.volume = options.volume || voiceConfig.volume;
            utterance.pitch = options.pitch || 1.0;
            
            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }

            // Configurar eventos
            utterance.onstart = () => {
                isSpeaking = true;
                currentSpeech = utterance;
                if (options.onStart && typeof options.onStart === 'function') {
                    options.onStart();
                }
                console.log('🗣️ Iniciando voz:', text.substring(0, 50) + '...');
            };

            utterance.onend = () => {
                isSpeaking = false;
                currentSpeech = null;
                this.processQueue();
                if (options.onEnd && typeof options.onEnd === 'function') {
                    options.onEnd();
                }
            };

            utterance.onerror = (event) => {
                console.error('❌ Error en utterance:', event);
                isSpeaking = false;
                currentSpeech = null;
                this.processQueue();
                if (options.onError && typeof options.onError === 'function') {
                    options.onError(event.error);
                }
            };

            // Encolar o hablar inmediatamente
            if (isSpeaking || options.priority === 'low') {
                voiceQueue.push({ utterance, options });
                voiceQueue.sort((a, b) => {
                    const priorityOrder = { high: 0, normal: 1, low: 2 };
                    return priorityOrder[a.options.priority || 'normal'] - 
                           priorityOrder[b.options.priority || 'normal'];
                });
                console.log('📝 Voz encolada. En cola:', voiceQueue.length);
            } else {
                isSpeaking = true;
                currentSpeech = utterance;
                try {
                    speechSynthesis.speak(utterance);
                } catch (error) {
                    console.error('❌ Error al iniciar speech:', error);
                    isSpeaking = false;
                }
            }

            return utterance;
        },

        // Procesar cola de voz
        processQueue() {
            if (voiceQueue.length > 0 && !isSpeaking) {
                const next = voiceQueue.shift();
                isSpeaking = true;
                currentSpeech = next.utterance;
                try {
                    speechSynthesis.speak(next.utterance);
                } catch (error) {
                    console.error('❌ Error al procesar cola de voz:', error);
                    isSpeaking = false;
                    this.processQueue(); // Intentar con el siguiente
                }
            }
        },

        // Detener voz actual
        stopSpeaking() {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                console.log('⏹️ Voz detenida');
                window.UIManager?.mostrarToast?.('Voz detenida', 'info');
            }
            isSpeaking = false;
            currentSpeech = null;
            voiceQueue = [];
            if (window.AppState?.set) {
                window.AppState.set({ vozActiva: false });
            }
        },

        // Pausar voz
        pauseSpeaking() {
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
                speechSynthesis.pause();
                console.log('⏸️ Voz pausada');
                window.UIManager?.mostrarToast?.('Voz pausada', 'info');
                return true;
            }
            return false;
        },

        // Reanudar voz
        resumeSpeaking() {
            if (speechSynthesis.speaking && speechSynthesis.paused) {
                speechSynthesis.resume();
                console.log('▶️ Voz reanudada');
                window.UIManager?.mostrarToast?.('Voz reanudada', 'info');
                return true;
            }
            return false;
        },

        // Verificar si está hablando
        isSpeaking() {
            return isSpeaking;
        },

        // Limpiar cola de voz
        clearQueue() {
            voiceQueue = [];
            console.log('🗑️ Cola de voz limpiada');
        },

        // Hablar notificación corta
        speakNotification(message, priority = 'normal') {
            if (!message) return;
            
            this.speak(message, {
                priority: priority,
                onStart: () => {
                    console.log('🔔 Notificación de voz:', message);
                },
                onEnd: () => {
                    console.log('✅ Notificación completada');
                }
            });
        },

        // Obtener estado actual
        getStatus() {
            return {
                isSpeaking: isSpeaking,
                queueLength: voiceQueue.length,
                voiceAvailable: !!spanishVoice,
                speechSynthesisAvailable: !!speechSynthesis
            };
        },

        // Configurar voz específica
        setVoice(voiceName) {
            const voices = speechSynthesis.getVoices();
            const newVoice = voices.find(v => v.name === voiceName || v.lang === voiceName);
            if (newVoice) {
                spanishVoice = newVoice;
                console.log('✅ Voz configurada a:', newVoice.name);
                return true;
            }
            console.warn('⚠️ Voz no encontrada:', voiceName);
            return false;
        },

        // Listar voces disponibles
        listVoices() {
            return speechSynthesis.getVoices().map(voice => ({
                name: voice.name,
                lang: voice.lang,
                default: voice.default
            }));
        }
    };
})(); // <-- ESTO CIERRA LA FUNCIÓN IIFE

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar después de un breve retraso para asegurar que otros módulos estén listos
        setTimeout(() => {
            if (window.VoiceNavigation) {
                window.VoiceNavigation.init();
            }
        }, 1000);
    });
} else {
    // DOM ya está listo
    setTimeout(() => {
        if (window.VoiceNavigation) {
            window.VoiceNavigation.init();
        }
    }, 1000);
}

// Exportar al ámbito global
if (typeof window !== 'undefined') {
    window.VoiceNavigation = VoiceNavigation;
}

console.log('✅ Módulo VoiceNavigation cargado correctamente');
