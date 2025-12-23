// ============================================
// NAVEGACIÓN POR VOZ MEJORADA - CON OFFLINE
// ============================================

const VoiceNavigation = (function() {
    // Variables privadas mejoradas
    let speechSynthesis = window.speechSynthesis;
    let currentSpeech = null;
    let isSpeaking = false;
    let voiceQueue = [];
    let spanishVoice = null;
    let isPaused = false;
    let availableVoices = [];
    let voiceCache = new Map();
    let audioContext = null;
    let isVoiceEnabled = true;
    
    // Inicializar sistema de voz mejorado
    async function init() {
        console.log('🔊 Inicializando VoiceNavigation...');
        
        if (!speechSynthesis) {
            console.warn('Síntesis de voz no disponible');
            isVoiceEnabled = false;
            return false;
        }
        
        try {
            // Cargar voces
            await loadVoices();
            
            // Verificar si hay voces offline
            await checkOfflineVoices();
            
            // Inicializar AudioContext para efectos de sonido
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // Configurar eventos
            setupVoiceEvents();
            
            console.log('✅ VoiceNavigation inicializado');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando VoiceNavigation:', error);
            isVoiceEnabled = false;
            return false;
        }
    }
    
    // Cargar voces disponibles
    async function loadVoices() {
        return new Promise((resolve) => {
            const voices = speechSynthesis.getVoices();
            
            if (voices.length > 0) {
                processVoices(voices);
                resolve();
            } else {
                speechSynthesis.onvoiceschanged = () => {
                    const voices = speechSynthesis.getVoices();
                    processVoices(voices);
                    resolve();
                };
                
                // Timeout por si no hay voces
                setTimeout(() => {
                    if (availableVoices.length === 0) {
                        console.warn('No se encontraron voces después de timeout');
                        resolve();
                    }
                }, 3000);
            }
        });
    }
    
    // Procesar voces disponibles
    function processVoices(voices) {
        availableVoices = voices;
        
        // Buscar voces en español
        spanishVoice = voices.find(voice => 
            voice.lang.startsWith('es') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft'))
        );
        
        // Si no encuentra voces específicas, usar cualquier voz en español
        if (!spanishVoice) {
            spanishVoice = voices.find(voice => 
                voice.lang.startsWith('es')
            );
        }
        
        // Si no hay voces en español, usar la primera disponible
        if (!spanishVoice && voices.length > 0) {
            spanishVoice = voices[0];
            console.warn('Usando voz no española:', spanishVoice.name);
        }
        
        if (spanishVoice) {
            console.log('✅ Voz seleccionada:', spanishVoice.name, spanishVoice.lang);
        }
    }
    
    // Verificar voces offline
    async function checkOfflineVoices() {
        // Verificar si hay voces que funcionen offline
        if (spanishVoice && spanishVoice.localService) {
            console.log('✅ Voz offline disponible:', spanishVoice.name);
        } else {
            console.warn('⚠️ No hay voces offline disponibles');
            
            // Intentar cargar voces TTS alternativas
            await loadFallbackVoices();
        }
    }
    
    // Cargar voces de respaldo
    async function loadFallbackVoices() {
        // Implementación para cargar voces alternativas
        // Podría usar Web Audio API o voces pre-grabadas
        console.log('Cargando voces de respaldo...');
    }
    
    // Configurar eventos de voz
    function setupVoiceEvents() {
        speechSynthesis.addEventListener('voiceschanged', () => {
            const voices = speechSynthesis.getVoices();
            processVoices(voices);
        });
    }
    
    // Métodos públicos mejorados
    return {
        // Inicialización
        init,
        
        // Leer instrucciones de ruta mejorado
        async speakInstructions(route = null) {
            if (!isVoiceEnabled) {
                window.UIManager?.mostrarToast?.('Voz no disponible', 'warning');
                return false;
            }
            
            const currentRoute = route || AppState.get('currentRoute');
            if (!currentRoute) {
                window.UIManager?.mostrarToast?.('No hay ruta calculada', 'warning');
                return false;
            }
            
            this.stopSpeaking(); // Detener cualquier voz anterior
            
            try {
                // Preparar instrucciones
                const instructions = this.prepareInstructions(currentRoute);
                
                // Reproducir sonido de inicio
                this.playSound('start');
                
                // Hablar instrucciones
                for (let i = 0; i < instructions.length; i++) {
                    await this.speakWithDelay(instructions[i], i * 100);
                }
                
                // Reproducir sonido de fin
                this.playSound('complete');
                
                console.log('✅ Instrucciones completadas');
                return true;
            } catch (error) {
                console.error('❌ Error en instrucciones de voz:', error);
                window.UIManager?.mostrarToast?.('Error en voz', 'error');
                return false;
            }
        },
        
        // Preparar instrucciones optimizadas
        prepareInstructions(route) {
            const km = (route.summary.totalDistance / 1000).toFixed(1);
            const min = Math.round(route.summary.totalTime / 60);
            
            const instructions = [
                `Iniciando navegación. Ruta de ${km} kilómetros.`,
                `Duración estimada: ${min} minutos.`,
                `Siga las instrucciones paso a paso.`
            ];
            
            route.instructions.forEach((step, index) => {
                const cleanText = this.cleanInstructionText(step.text);
                const distance = this.formatDistance(step.distance);
                
                let instruction = `En ${distance}`;
                
                // Priorizar instrucciones importantes
                if (step.type.includes('Turn') || step.type.includes('Roundabout')) {
                    instruction = `⚠️ ${cleanText} en ${distance}`;
                } else if (step.type === 'DestinationReached') {
                    instruction = `🎉 ${cleanText}`;
                } else {
                    instruction = `${cleanText} en ${distance}`;
                }
                
                // Agrupar instrucciones menores
                if (step.distance < 50 && index > 0) {
                    const prevInstruction = instructions[instructions.length - 1];
                    instructions[instructions.length - 1] = `${prevInstruction} y ${cleanText.toLowerCase()}`;
                } else {
                    instructions.push(instruction);
                }
            });
            
            instructions.push('Ha llegado a su destino. Buen viaje.');
            
            return instructions;
        },
        
        // Limpiar texto de instrucción
        cleanInstructionText(text) {
            return text
                .replace(/<\/?[^>]+(>|$)/g, "")
                .replace(/Continue on/g, "Continúe por")
                .replace(/Turn left/g, "Gire a la izquierda")
                .replace(/Turn right/g, "Gire a la derecha")
                .replace(/sharp left/g, "gire bruscamente a la izquierda")
                .replace(/sharp right/g, "gire bruscamente a la derecha")
                .replace(/slight left/g, "gire ligeramente a la izquierda")
                .replace(/slight right/g, "gire ligeramente a la derecha")
                .replace(/Keep left/g, "Manténgase a la izquierda")
                .replace(/Keep right/g, "Manténgase a la derecha")
                .replace(/Roundabout/g, "Glorieta")
                .replace(/Take the exit/g, "Tome la salida")
                .replace(/Destination reached/g, "Ha llegado a su destino")
                .replace(/Waypoint reached/g, "Parada alcanzada");
        },
        
        // Formatear distancia
        formatDistance(meters) {
            if (meters > 1000) {
                return `${(meters/1000).toFixed(1)} kilómetros`;
            } else if (meters > 100) {
                return `${Math.round(meters/10)*10} metros`;
            } else {
                return `${Math.round(meters)} metros`;
            }
        },
        
        // Hablar con delay
        speakWithDelay(text, delay = 0) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    this.speak(text, {
                        priority: 'normal',
                        onEnd: resolve
                    });
                }, delay);
            });
        },
        
        // Hablar texto con opciones mejoradas
        speak(text, options = {}) {
            if (!isVoiceEnabled || !speechSynthesis) return null;
            
            // Si hay voz en curso y no es de alta prioridad, encolar
            if (isSpeaking && options.priority !== 'high') {
                voiceQueue.push({ text, options });
                return null;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configuración
            utterance.lang = AppConstants.VOICE_CONFIG.lang;
            utterance.rate = options.rate || AppConstants.VOICE_CONFIG.rate;
            utterance.volume = options.volume || AppConstants.VOICE_CONFIG.volume;
            utterance.pitch = options.pitch || AppConstants.VOICE_CONFIG.pitch;
            
            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }

            // Eventos
            utterance.onstart = () => {
                isSpeaking = true;
                currentSpeech = utterance;
                if (options.onStart) options.onStart();
                
                // Notificar a la UI
                AppState.set({ vozActiva: true });
            };

            utterance.onend = () => {
                isSpeaking = false;
                currentSpeech = null;
                if (options.onEnd) options.onEnd();
                
                // Procesar siguiente en cola
                this.processQueue();
            };

            utterance.onerror = (event) => {
                isSpeaking = false;
                currentSpeech = null;
                console.error('Error en síntesis de voz:', event);
                if (options.onError) options.onError(event.error);
                
                // Procesar siguiente en cola
                this.processQueue();
            };

            // Intentar hablar
            try {
                speechSynthesis.speak(utterance);
                return utterance;
            } catch (error) {
                console.error('Error al iniciar voz:', error);
                return null;
            }
        },
        
        // Procesar cola de voz
        processQueue() {
            if (voiceQueue.length > 0 && !isSpeaking) {
                const next = voiceQueue.shift();
                this.speak(next.text, next.options);
            }
        },
        
        // Reproducir efectos de sonido
        playSound(type) {
            if (!audioContext) return;
            
            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                switch(type) {
                    case 'start':
                        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // Do
                        break;
                    case 'alert':
                        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // Mi
                        break;
                    case 'complete':
                        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime); // Sol
                        break;
                    default:
                        oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // La
                }
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.5);
            } catch (error) {
                console.warn('No se pudo reproducir sonido:', error);
            }
        },
        
        // Detener voz actual
        stopSpeaking() {
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
                isSpeaking = false;
                currentSpeech = null;
                voiceQueue = [];
                AppState.set({ vozActiva: false });
                
                window.UIManager?.mostrarToast?.('Voz detenida', 'info');
            }
        },
        
        // Pausar voz
        pauseSpeaking() {
            if (speechSynthesis.speaking && !speechSynthesis.paused) {
                speechSynthesis.pause();
                isPaused = true;
                window.UIManager?.mostrarToast?.('Voz pausada', 'info');
                return true;
            }
            return false;
        },
        
        // Reanudar voz
        resumeSpeaking() {
            if (speechSynthesis.speaking && speechSynthesis.paused) {
                speechSynthesis.resume();
                isPaused = false;
                window.UIManager?.mostrarToast?.('Voz reanudada', 'info');
                return true;
            }
            return false;
        },
        
        // Hablar notificación corta
        speakNotification(message, priority = 'normal') {
            this.speak(message, {
                priority: priority,
                onStart: () => {
                    console.log('Notificación de voz:', message);
                }
            });
        },
        
        // Verificar si está hablando
        isSpeaking() {
            return isSpeaking;
        },
        
        // Verificar si está pausado
        isPaused() {
            return isPaused;
        },
        
        // Limpiar cola de voz
        clearQueue() {
            voiceQueue = [];
        },
        
        // Obtener información de voz
        getVoiceInfo() {
            return {
                isVoiceEnabled,
                spanishVoice: spanishVoice ? spanishVoice.name : null,
                availableVoices: availableVoices.length,
                isSpeaking,
                isPaused,
                queueLength: voiceQueue.length
            };
        },
        
        // Obtener instrucción basada en progreso (para seguimiento GPS)
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
        },
        
        // Hablar instrucción basada en progreso
        speakNextInstruction() {
            const nextInstruction = this.getNextInstructionBasedOnProgress();
            if (!nextInstruction) return;
            
            const cleanText = this.cleanInstructionText(nextInstruction.instruction.text);
            const distance = this.formatDistance(nextInstruction.distanceToInstruction);
            
            this.speak(`Próxima instrucción: ${cleanText} en ${distance}`, {
                priority: 'high'
            });
        }
    };
})();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.VoiceNavigation = VoiceNavigation;
}
