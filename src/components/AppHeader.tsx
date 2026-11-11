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
    <header className="flex-none w-full z-40 bg-[#1E70BA] dark:bg-[#155A96] text-white shadow-[0_2px_12px_rgba(30,112,186,0.25)] transition-colors">
      <div className="h-16 px-4 flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Left: METRIKA Logo & Store Switcher */}
        <button
          type="button"
          onClick={() => setShowBusinessSwitcher(true)}
          title="Toca para cambiar de negocio o crear otro"
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group p-1 -ml-1 rounded-2xl hover:bg-white/10 transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs border border-white/20 group-hover:scale-105 transition-transform overflow-hidden">
            <img
              src="/logo-m.jpg"
              alt="M"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to storefront icon if image not available
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="material-symbols-outlined text-[20px] absolute">storefront</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black tracking-wider text-emerald-300 uppercase truncate">
                {storeInfo.name}
              </span>
              <span className="material-symbols-outlined text-xs text-emerald-300 group-hover:translate-y-0.5 transition-transform">
                expand_more
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-black tracking-wide leading-tight text-white drop-shadow-xs">
                METRIKA
              </span>
              {title !== 'Inicio' && (
                <span className="text-xs font-semibold text-white/80 border-l border-white/30 pl-1.5 truncate">
                  {title}
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Right: Dark Mode Toggle, Tutorial, Notifications & Profile */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Dark Mode Switch Button */}
          <button
            type="button"
            aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            onClick={toggleDarkMode}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer border border-white/15"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Tutorial Help Button */}
          <button
            type="button"
            aria-label="Ver tutorial interactivo"
            title="Ver tutorial de Metrika"
            onClick={() => setShowTutorial(true)}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer border border-white/15"
          >
            <span className="material-symbols-outlined text-[18px]">help_outline</span>
          </button>

          {/* Notifications Button */}
          <button
            type="button"
            aria-label="Notificaciones"
            onClick={() => showToast('Sin notificaciones pendientes. ¡Todo al día!')}
            className="relative w-8.5 h-8.5 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer border border-white/15"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#9EC84A] ring-1 ring-white"></span>
          </button>

          {/* Profile Badge */}
          <div className="w-8.5 h-8.5 rounded-xl bg-[#9EC84A] text-slate-950 flex items-center justify-center font-black text-[11px] shadow-sm ml-0.5 border border-white/20">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};
