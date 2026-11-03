import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { showToast } = useStore();
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<{ hasApiKey: boolean; maskedKey?: string; model?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkKeyStatus();
    }
  }, [isOpen]);

  const checkKeyStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/config/gemini');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Ignorar error de red silencioso
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      showToast('Por favor escribe o pega tu clave de Gemini.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/config/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({
          hasApiKey: true,
          maskedKey: data.maskedKey,
          model: data.model,
        });
        setApiKey('');
        showToast('¡Clave de Gemini API guardada y activada con éxito!', 'success');
        if (onSaved) onSaved();
      } else {
        showToast(data.error || 'Error al guardar la clave API.', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Error de conexión con el servidor.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">neurology</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-stone-900 leading-tight">Configurar Gemini IA</h3>
              <p className="text-xs text-stone-500">Google AI Studio (Gratis)</p>
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

        {/* Estado actual */}
        <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Estado de la IA:</span>
            {isLoading ? (
              <span className="text-xs text-stone-400">Verificando...</span>
            ) : status?.hasApiKey ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Activa ({status.maskedKey || 'Configurada'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <span className="material-symbols-outlined text-sm">warning</span>
                Sin Clave (Modo Local)
              </span>
            )}
          </div>
          {status?.hasApiKey && (
            <p className="text-[11px] text-stone-500 mt-2">
              Modelo en uso: <strong className="text-stone-700">{status.model || 'gemini-2.5-flash'}</strong>. Los reconocimientos de imagen, recibos y voz están potenciados por Gemini.
            </p>
          )}
        </div>

        {/* Formulario para ingresar / actualizar clave */}
        <form onSubmit={handleSaveKey} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {status?.hasApiKey ? 'Actualizar Gemini API Key' : 'Ingresa tu Gemini API Key'}
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <span className="material-symbols-outlined text-lg">
                  {showKey ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Tu clave se guarda localmente en el archivo <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">.env</code> de tu servidor y nunca se comparte públicamente.
            </p>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-stone-300 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">key</span>
                  <span>Guardar Clave</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Guía rápida para obtener clave gratis */}
        <div className="mt-5 p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-purple-700 text-xl shrink-0 mt-0.5">info</span>
            <div className="text-xs text-purple-900 space-y-1">
              <p className="font-bold">¿Cómo obtener tu clave gratis en 1 minuto?</p>
              <ol className="list-decimal list-inside space-y-0.5 text-purple-800">
                <li>Ingresa a Google AI Studio con tu cuenta de Google.</li>
                <li>Haz clic en <strong>Get API key</strong> y crea una clave para nuevo proyecto.</li>
                <li>Cópiala y pégala aquí. ¡Es 100% gratuita!</li>
              </ol>
              <div className="pt-1.5">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-purple-700 hover:text-purple-900 underline text-xs"
                >
                  Abrir Google AI Studio
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
