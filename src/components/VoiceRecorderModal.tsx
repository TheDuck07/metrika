import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { parseVoiceCommandLocally } from '../utils/voiceParser';
import { ProductCategory } from '../types';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTransaction {
  tipo: 'venta' | 'compra' | 'gasto';
  concepto: string;
  categoria: string;
  monto: number;
  cantidad: number;
  unidad: string;
  matchedProductId?: string | null;
  metodoPago: 'efectivo' | 'qr';
  esFiado: boolean;
  clienteFiado?: string | null;
  confidence?: number;
}

const SAMPLE_COMMANDS = [
  'Venta de 2 Coca-Cola 2L',
  'Gasto de 45 bolivianos de luz',
  'Compré 10 kilos de arroz por 70 Bs',
  'Venta fiada de aceite a Don Pedro',
  'Cobré 15 Bs con QR por galletas',
];

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({ isOpen, onClose }) => {
  const { products, recordSale, recordDirectSale, recordExpense, recordPurchase, showToast } = useStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedTx, setParsedTx] = useState<ParsedTransaction | null>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);
  const [engineUsed, setEngineUsed] = useState<'gemini' | 'local'>('local');

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechApiSupported(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTranscript('');
      setInterimText('');
      setParsedTx(null);
      setIsProcessing(false);
      // Automatically prompt to listen if supported
      if (speechApiSupported) {
        startListening();
      }
    } else {
      stopListening();
    }
    return () => {
      stopListening();
    };
  }, [isOpen, speechApiSupported]);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechApiSupported(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'es-BO'; // Spanish - Bolivia
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (final) {
          const clean = final.trim();
          setTranscript(clean);
          setInterimText('');
          processVoiceText(clean);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          showToast('Permiso de micrófono denegado. Puedes escribir o tocar los ejemplos abajo.', 'info');
        } else if (event.error === 'network') {
          showToast('Reconocimiento por voz offline: Escribe o toca los ejemplos rápidos abajo.', 'info');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const speakFeedback = (text: string) => {
    if (!audioFeedbackEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Process text using Gemini endpoint first (if online), fallback to local NLP
  const processVoiceText = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setIsProcessing(true);

    // 1. Try Gemini endpoint ONLY if device is online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout max

        const response = await fetch('/api/parse-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: textToProcess,
            inventory: products.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              unit: p.unit,
              category: p.category,
            })),
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            const d = json.data;
            setEngineUsed('gemini');
            setParsedTx({
              tipo: d.tipo || 'venta',
              concepto: d.concepto || textToProcess,
              categoria: d.categoria || 'Venta Rápida',
              monto: Number(d.monto) || 0,
              cantidad: Number(d.cantidad) || 1,
              unidad: d.unidad || 'ud',
              matchedProductId: d.matchedProductId || null,
              metodoPago: d.metodoPago === 'qr' ? 'qr' : 'efectivo',
              esFiado: Boolean(d.esFiado),
              clienteFiado: d.clienteFiado || null,
              confidence: d.confidence || 0.9,
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch {
        // Network timeout / offline: proceed seamlessly to 100% offline local parser
      }
    }

    // 2. 100% Offline Local Fallback NLP Parser (Zero tokens, Zero billing, Instant)
    setEngineUsed('local');
    const localResult = parseVoiceCommandLocally(textToProcess, products);
    const isFiadoLocal = textToProcess.toLowerCase().includes('fiado') || textToProcess.toLowerCase().includes('fía');
    let clienteFiadoName: string | null = null;
    if (isFiadoLocal) {
      const matchCliente = textToProcess.match(/(?:a|de)\s+(don|doña|sr\.|sra\.)?\s*([a-záéíóúñ]+)/i);
      if (matchCliente) {
        clienteFiadoName = `${matchCliente[1] ? matchCliente[1] + ' ' : ''}${matchCliente[2]}`.trim();
      }
    }

    const isQr = textToProcess.toLowerCase().includes('qr') || textToProcess.toLowerCase().includes('transferencia');

    setParsedTx({
      tipo: localResult.type,
      concepto: localResult.title,
      categoria: localResult.category,
      monto: localResult.amount,
      cantidad: localResult.qty,
      unidad: localResult.unit,
      matchedProductId: localResult.matchedProductId || null,
      metodoPago: isQr ? 'qr' : 'efectivo',
      esFiado: isFiadoLocal,
      clienteFiado: clienteFiadoName,
      confidence: localResult.confidence === 'high' ? 0.9 : 0.7,
    });
    setIsProcessing(false);
  };

  const handleConfirmTransaction = () => {
    if (!parsedTx) return;

    const { tipo, concepto, monto, matchedProductId, cantidad, esFiado, clienteFiado, categoria } = parsedTx;

    if (monto <= 0) {
      showToast('Por favor verifica que el monto sea mayor a 0 Bs.', 'warning');
      return;
    }

    const displayTitle = esFiado && clienteFiado ? `${concepto} (Fiado a ${clienteFiado})` : concepto;

    if (tipo === 'venta') {
      if (matchedProductId) {
        const prod = products.find((p) => p.id === matchedProductId);
        if (prod) {
          recordSale(prod.id, cantidad, displayTitle, monto);
        } else {
          recordDirectSale(displayTitle, monto, categoria);
        }
      } else {
        recordDirectSale(displayTitle, monto, categoria);
      }
      speakFeedback(`Venta de ${concepto} por ${monto.toFixed(0)} bolivianos registrada`);
      showToast(`¡Venta anotada por voz! +Bs. ${monto.toFixed(2)}`, 'success');
    } else if (tipo === 'gasto') {
      recordExpense(concepto, monto, categoria);
      speakFeedback(`Gasto de ${concepto} por ${monto.toFixed(0)} bolivianos registrado`);
      showToast(`¡Gasto anotado por voz! -Bs. ${monto.toFixed(2)}`, 'info');
    } else if (tipo === 'compra') {
      recordPurchase(concepto, monto, categoria);
      speakFeedback(`Compra de ${concepto} por ${monto.toFixed(0)} bolivianos registrada`);
      showToast(`¡Compra anotada por voz! -Bs. ${monto.toFixed(2)}`, 'info');
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">mic</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-stone-900 leading-tight">Anotar por Voz</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {engineUsed === 'gemini' ? 'Gemini IA' : 'IA Local'}
                </span>
              </div>
              <p className="text-xs text-stone-500">Dicta ventas, compras o gastos fácilmente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Microphone Recording Visualizer */}
        <div className="mt-4 p-5 rounded-3xl bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 text-white text-center relative overflow-hidden shadow-inner">
          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Mic Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg relative ${
                isListening
                  ? 'bg-rose-500 text-white scale-110 shadow-rose-500/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 shadow-emerald-500/30'
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-75"></span>
              )}
              <span className="material-symbols-outlined text-4xl relative z-10">
                {isListening ? 'mic' : 'mic_none'}
              </span>
            </button>

            <span className="mt-3 text-xs font-bold tracking-wide uppercase text-stone-300">
              {isListening ? '🔴 Escuchando... Habla ahora' : 'Toca el micrófono para hablar'}
            </span>

            {/* Live Transcript / Feedback */}
            <div className="mt-3 min-h-[44px] w-full max-w-sm px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-center flex items-center justify-center">
              {isListening ? (
                <p className="text-sm font-medium text-emerald-300 italic animate-pulse">
                  "{interimText || transcript || 'Esperando tu voz...'}"
                </p>
              ) : transcript ? (
                <p className="text-sm font-semibold text-white">
                  "{transcript}"
                </p>
              ) : (
                <p className="text-xs text-stone-400">
                  Ejemplo: "Venta de 2 Coca-Colas" o "Gasto 40 Bs de luz"
                </p>
              )}
            </div>

            {isProcessing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-300">
                <span className="w-3.5 h-3.5 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></span>
                <span>Analizando frase con IA...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input manual alternative / edit transcript */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>O escribe la frase si prefieres:</span>
            <button
              type="button"
              onClick={() => setAudioFeedbackEnabled(!audioFeedbackEnabled)}
              className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                {audioFeedbackEnabled ? 'volume_up' : 'volume_off'}
              </span>
              Voz de respuesta: {audioFeedbackEnabled ? 'Sí' : 'No'}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  processVoiceText(transcript);
                }
              }}
              placeholder="Ej: Anotar 3 paquetes de galletas por 15 Bs"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => processVoiceText(transcript)}
              disabled={!transcript.trim() || isProcessing}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 disabled:bg-stone-200 text-white disabled:text-stone-400 font-bold text-xs transition-colors cursor-pointer"
            >
              Interpretar
            </button>
          </div>
        </div>

        {/* Sample voice command chips */}
        <div className="mt-3">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
            Prueba rápida con un clic:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_COMMANDS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTranscript(sample);
                  processVoiceText(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* Parsed Result Card */}
        {parsedTx && (
          <div className="mt-4 p-4 rounded-2xl bg-stone-50 border-2 border-emerald-500/30 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Operación detectada por la IA:
              </span>
              <div className="flex gap-1">
                {(['venta', 'compra', 'gasto'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setParsedTx({ ...parsedTx, tipo: t })}
                    className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      parsedTx.tipo === t
                        ? t === 'venta'
                          ? 'bg-emerald-600 text-white'
                          : t === 'compra'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                        : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* Concepto */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-0.5">
                  Concepto / Detalle
                </label>
                <input
                  type="text"
                  value={parsedTx.concepto}
                  onChange={(e) => setParsedTx({ ...parsedTx, concepto: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Grid: Monto + Cantidad */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-0.5">
                    Monto Total (Bs.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                      Bs.
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={parsedTx.monto || ''}
                      onChange={(e) =>
                        setParsedTx({ ...parsedTx, monto: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full pl-8 pr-2.5 py-1.5 text-sm font-black text-stone-900 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-0.5">
                    Cantidad ({parsedTx.unidad})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={parsedTx.cantidad}
                    onChange={(e) =>
                      setParsedTx({ ...parsedTx, cantidad: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-1.5 text-sm font-semibold rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Método de Pago y Fiado */}
              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-600">Pago:</span>
                  <button
                    type="button"
                    onClick={() => setParsedTx({ ...parsedTx, metodoPago: 'efectivo' })}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      parsedTx.metodoPago === 'efectivo'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setParsedTx({ ...parsedTx, metodoPago: 'qr' })}
                    className={`text-xs px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      parsedTx.metodoPago === 'qr'
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    📱 QR
                  </button>
                </div>

                {parsedTx.tipo === 'venta' && (
                  <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={parsedTx.esFiado}
                      onChange={(e) => setParsedTx({ ...parsedTx, esFiado: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>¿Venta Fiada (Crédito)?</span>
                  </label>
                )}
              </div>

              {/* Nombre cliente fiado si aplica */}
              {parsedTx.tipo === 'venta' && parsedTx.esFiado && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-0.5">
                    Nombre del Cliente Fiado
                  </label>
                  <input
                    type="text"
                    value={parsedTx.clienteFiado || ''}
                    onChange={(e) => setParsedTx({ ...parsedTx, clienteFiado: e.target.value })}
                    placeholder="Ej: Don Pedro, Sra. Carmen"
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-amber-300 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-stone-200 flex gap-2">
              <button
                type="button"
                onClick={startListening}
                className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">mic</span>
                <span>Hablar de nuevo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmTransaction}
                disabled={parsedTx.monto <= 0}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span>
                  Confirmar y Anotar {parsedTx.tipo === 'venta' ? '+Bs.' : '-Bs.'} {parsedTx.monto.toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
