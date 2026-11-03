import React from 'react';
import { useStore } from '../context/StoreContext';

interface AppHeaderProps {
  title: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const {
    storeInfo,
    showToast,
    isDarkMode,
    toggleDarkMode,
    setShowTutorial,
    setShowBusinessSwitcher,
  } = useStore();

  const initials = storeInfo.name
    ? storeInfo.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MT';

  return (
    <header className="flex-none w-full z-40 bg-[#fff8f5]/90 dark:bg-[#1a1412]/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.3)] border-b border-[#eae1dd]/60 dark:border-stone-800 transition-colors">
      <div className="h-18 px-4 flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Left: Logo & Store Name (Click to switch business) */}
        <button
          type="button"
          onClick={() => setShowBusinessSwitcher(true)}
          title="Toca para cambiar de negocio o crear otro"
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group p-1 -ml-1 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-full bg-[#fceede] dark:bg-[#33221b] flex items-center justify-center text-[#bd532b] dark:text-[#ff9973] shrink-0 shadow-sm border border-[#dec0b7]/40 dark:border-stone-700 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">storefront</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-[#9f3c16] dark:text-[#ff9973] uppercase tracking-wider truncate">
                {storeInfo.name}
              </span>
              <span className="material-symbols-outlined text-xs text-[#9f3c16] dark:text-[#ff9973] group-hover:translate-y-0.5 transition-transform">
                expand_more
              </span>
            </div>
            <h1 className="text-[17px] font-bold text-[#1f1b19] dark:text-stone-100 truncate leading-tight">
              {title}
            </h1>
          </div>
        </button>

        {/* Right: Dark Mode Toggle, Tutorial, Notifications & Profile */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dark Mode Switch Button */}
          <button
            type="button"
            aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            onClick={toggleDarkMode}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f5ece8] dark:bg-[#2c221e] text-[#57423b] dark:text-amber-300 hover:text-[#9f3c16] transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[19px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Tutorial Help Button */}
          <button
            type="button"
            aria-label="Ver tutorial interactivo"
            title="Ver tutorial de Metrika"
            onClick={() => setShowTutorial(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f5ece8] dark:bg-[#2c221e] text-[#57423b] dark:text-stone-300 hover:text-[#9f3c16] dark:hover:text-[#ff9973] transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[19px]">help_outline</span>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            aria-label="Notificaciones"
            onClick={() => showToast('Sin notificaciones pendientes. ¡Todo al día!')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f5ece8] dark:bg-[#2c221e] text-[#57423b] dark:text-stone-300 hover:text-[#9f3c16] dark:hover:text-[#ff9973] transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[19px]">notifications</span>
          </button>

          {/* Profile Badge */}
          <div className="w-9 h-9 rounded-full p-0.5 flex items-center justify-center border border-[#dec0b7]/60 dark:border-stone-700">
            <div className="w-7 h-7 rounded-full bg-[#bd532b] text-white flex items-center justify-center font-black text-[11px] shadow-sm">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
