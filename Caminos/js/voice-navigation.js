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
            console.log('Voz en español encontrada:', spanishVoice.name);
        } else if (voices.length > 0) {
            spanishVoice = voices[0];
            console.log('Usando voz predeterminada:', spanishVoice.name);
        }
    }

    // Métodos públicos
    return {
        // Inicializar sistema de voz
        init() {
            if (!speechSynthesis) {
                console.warn('Síntesis de voz no disponible en este navegador');
                return;
            }
            initVoices();
        },

        // Leer instrucciones de ruta
        speakInstructions() {
            if (!speechSynthesis) {
                window.UIManager?.mostrarToast?.('Síntesis de voz no disponible en este navegador', 'warning');
                return;
            }

            const currentRoute = AppState.get('currentRoute');
            if (!currentRoute) {
                window.UIManager?.mostrarToast?.('No hay ruta calculada para leer', 'warning');
                return;
            }

            this.stopSpeaking(); // Detener cualquier voz anterior

            const instructions = currentRoute.instructions;
            let instructionText = `Iniciando navegación. Ruta de ${(currentRoute.summary.totalDistance / 1000).toFixed(1)} kilómetros. Duración estimada: ${Math.round(currentRoute.summary.totalTime / 60)} minutos. `;
            
            instructions.forEach((step, index) => {
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
                
                const distancia = step.distance > 1000 ? 
                    `${(step.distance/1000).toFixed(1)} kilómetros` : 
                    `${Math.round(step.distance)} metros`;
                
                instructionText += `Paso ${index + 1}: ${cleanText} en ${distancia}. `;
            });

            instructionText += `Fin de las instrucciones. Ha llegado a su destino.`;

            this.speak(instructionText, {
                onStart: () => {
                    window.UIManager?.mostrarToast?.('Reproduciendo instrucciones de voz', 'info');
                    AppState.set({ vozActiva: true });
                },
                onEnd: () => {
                    window.UIManager?.mostrarToast?.('Instrucciones completadas', 'success');
                    AppState.set({ vozActiva: false });
                },
                onError: (error) => {
                    console.error('Error en síntesis de voz:', error);
                    window.UIManager?.mostrarToast?.('Error al reproducir voz', 'error');
                    AppState.set({ vozActiva: false });
                }
            });
        },

        // Hablar texto genérico
        speak(text, options = {}) {
            if (!speechSynthesis) return null;

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configuración
            utterance.lang = AppConstants.VOICE_CONFIG.lang;
            utterance.rate = options.rate || AppConstants.VOICE_CONFIG.rate;
            utterance.volume = options.volume || AppConstants.VOICE_CONFIG.volume;
            utterance.pitch = options.pitch || 1.0;
            
            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }

            // Eventos
            if (options.onStart) {
                utterance.onstart = options.onStart;
            }

            if (options.onEnd) {
                utterance.onend = options.onEnd;
            }

            if (options.onError) {
                utterance.onerror = (event) => options.onError(event.error);
            }

            utterance.onstart = () => {
                isSpeaking = true;
                currentSpeech = utterance;
                if (options.onStart) options.onStart();
            };

            utterance.onend = () => {
                isSpeaking = false;
                currentSpeech = null;
                this.processQueue();
                if (options.onEnd) options.onEnd();
            };

            utterance.onerror = (event) => {
                isSpeaking = false;
                currentSpeech = null;
                this.processQueue();
                if (options.onError) {
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
            } else {
                isSpeaking = true;
                currentSpeech = utterance;
                speechSynthesis.speak(utterance);
            }

            return utterance;
        },

        // Procesar cola de voz
        processQueue() {
            if (voiceQueue.length > 0 && !isSpeaking) {
                const next = voiceQueue.shift();
                isSpeaking = true;
                currentSpeech = next.utterance;
                speechSynthesis.speak(next.utterance);
            }
        },

        // Detener voz actual
        stopSpeaking() {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                window.UIManager?.mostrarToast?.('Voz detenida', 'info');
            }
            isSpeaking = false;
            currentSpeech = null;
            voiceQueue = [];
            AppState.set({ vozActiva: false });
        },

        // Pausar voz
        pauseSpeaking() {
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
                speechSynthesis.pause();
                window.UIManager?.mostrarToast?.('Voz pausada', 'info');
                return true;
            }
            return false;
        },

        // Reanudar voz
        resumeSpeaking() {
            if (speechSynthesis.speaking && speechSynthesis.paused) {
                speechSynthesis.resume();
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
        },

        // Hablar notificación corta
        speakNotification(message, priority = 'normal') {
            this.speak(message, {
                priority: priority,
                onStart: () => {
                    console.log('Notificación de voz:', message);
                }
            });
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.VoiceNavigation = VoiceNavigation;
}

// Agregar función para instrucciones basadas en progreso
getNextInstructionBasedOnProgress() {
    const currentRoute = AppState.get('currentRoute');
    const traveledDistance = window.GPSTracker?.getTraveledDistance?.();
    
    if (!currentRoute || !traveledDistance) return null;
    
    let accumulatedDist = 0;
    
    for (let i = 0; i < currentRoute.instructions.length; i++) {
        const instruction = currentRoute.instructions[i];
        accumulatedDist += instruction.distance;
        
        // Si la distancia acumulada es mayor que la recorrida,
        // esta es la próxima instrucción
        if (accumulatedDist > traveledDistance) {
            return {
                instruction: instruction,
                index: i,
                distanceToInstruction: accumulatedDist - traveledDistance
            };
        }
    }
    
    return null;
}