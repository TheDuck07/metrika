import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBusinessModal: React.FC<CreateBusinessModalProps> = ({ isOpen, onClose }) => {
  const { registerUser, showToast } = useStore();
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !ownerName.trim() || !phone.trim()) {
      showToast('Por favor completa todos los campos del nuevo negocio', 'warning');
      return;
    }

    setIsLoading(true);
    const ok = await registerUser({
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      pin: pin.trim() || '1234',
    });
    setIsLoading(false);

    if (ok) {
      setStoreName('');
      setOwnerName('');
      setPhone('');
      setPin('1234');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1e1714] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[88dvh] overflow-y-auto overscroll-contain modal-bottom-sheet"
        style={{ touchAction: 'pan-y' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ffdbcf] text-[#822801] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">add_business</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 leading-tight">
                Crear Nuevo Negocio
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Iniciará con 0 ventas y finanzas separadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Nombre del Negocio
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ej: Restaurante Mantecado, Tienda El Sol"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251e1b] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#9f3c16]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Nombre del Propietario / Responsable
            </label>
            <input
              type="text"
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ej: Carlos Mamani"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251e1b] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#9f3c16]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Teléfono / Celular (identificador único)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs font-bold text-stone-400">+591</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="70012345"
                className="w-full pl-12 pr-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251e1b] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#9f3c16]/30 font-semibold"
              />
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              Usa un número o añade un sufijo para distinguir negocios (ej: 70355237-1).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              PIN de Acceso (4 dígitos)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="1234"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#251e1b] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#9f3c16]/30 font-mono text-center tracking-widest text-base"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#bd532b] to-[#9f3c16] hover:from-[#c85a31] hover:to-[#a9431b] active:scale-98 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-stone-400"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Registrando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Crear e Ingresar a este Negocio</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

