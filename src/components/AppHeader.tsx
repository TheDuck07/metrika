import React from 'react';
import { useStore } from '../context/StoreContext';

interface AppHeaderProps {
  title: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title }) => {
  const {
    user,
    storeInfo,
    setShowBusinessSwitcher,
    setShowAccountModal,
  } = useStore();

  const userAvatar = user?.avatarUrl || storeInfo.logoUrl || storeInfo.avatarUrl;
  const initials = (user?.name || storeInfo.owner || storeInfo.name || 'MT')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

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
          {/* Official Metrika Logo - Clean, without white background or icon clash */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
            <img
              src="/logo-m.jpg"
              alt="Metrika Logo"
              className="w-full h-full object-contain rounded-xl"
            />
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

        {/* Right: Functional Profile Photo Avatar Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            aria-label="Abrir mi cuenta, perfil y configuración"
            title={`Perfil de ${user?.name || storeInfo.owner || 'Comerciante'} - Toca para ver cuenta y tema`}
            className="relative w-10 h-10 rounded-2xl bg-[#9EC84A] text-slate-950 flex items-center justify-center font-black text-xs shadow-md border-2 border-white/40 hover:border-white active:scale-95 transition-all cursor-pointer overflow-hidden group"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={user?.name || 'Perfil'}
                className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform"
              />
            ) : (
              <span className="text-sm font-black tracking-wider text-slate-950">{initials}</span>
            )}
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
};
