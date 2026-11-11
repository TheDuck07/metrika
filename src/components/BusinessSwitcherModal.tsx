import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

interface BusinessSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewStoreModal?: () => void;
}

export const BusinessSwitcherModal: React.FC<BusinessSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenNewStoreModal,
}) => {
  const { user, availableStores, switchStore, showToast } = useStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectStore = async (storeId: string) => {
    if (storeId === user?.id) {
      onClose();
      return;
    }

    setSwitchingId(storeId);
    const ok = await switchStore(storeId);
    setSwitchingId(null);
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1e1714] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[88dvh] overflow-y-auto overscroll-contain modal-bottom-sheet"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">store</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base text-stone-900 dark:text-stone-100 leading-tight">
                Mis Negocios
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Cuentas y finanzas 100% separadas
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

        {/* Info Note */}
        <div className="mt-3 p-3 rounded-2xl bg-stone-50 dark:bg-[#251e1b] border border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
          Cada negocio tiene sus propias ventas, gastos, productos y balance independiente. Los datos nunca se mezclan.
        </div>

        {/* Store List */}
        <div className="mt-3 space-y-2 flex-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block px-1">
            Negocios registrados ({availableStores.length}):
          </span>

          {availableStores.map((s) => {
            const isCurrent = s.id === user?.id;
            return (
              <div
                key={s.id}
                onClick={() => handleSelectStore(s.id)}
                className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isCurrent
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-600/80 shadow-xs ring-1 ring-emerald-400/40'
                    : 'bg-white dark:bg-[#271f1b] border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:bg-stone-50 dark:hover:bg-[#2e2521]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm shadow-xs ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#ffddb8] dark:bg-[#4a2e1d] text-[#855300] dark:text-amber-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isCurrent ? 'check_circle' : 'storefront'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-black text-stone-900 dark:text-stone-100 truncate block">
                        {s.storeName}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded-full bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {s.name} {s.phone ? `• Cel: ${s.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {switchingId === s.id ? (
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : isCurrent ? (
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">
                      done
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-stone-400 group-hover:translate-x-0.5 transition-transform text-xl">
                      chevron_right
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action: Create New Store */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenNewStoreModal) {
                onOpenNewStoreModal();
              }
            }}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#bd532b] to-[#9f3c16] hover:from-[#c85a31] hover:to-[#a9431b] active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add_business</span>
            <span>+ Registrar Otro Negocio Nuevo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

