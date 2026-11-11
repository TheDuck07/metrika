import React from 'react';
import { useStore } from '../context/StoreContext';
import { ScreenId } from '../types';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useStore();

  const handleNav = (screen: ScreenId, e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentScreen(screen);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1A1F26]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] select-none transition-colors pb-[env(safe-area-inset-bottom,0px)]"
      data-active-classes="text-[#1E70BA] dark:text-[#60A5FA] font-bold"
    >
      <div className="flex items-center justify-around h-16 sm:h-20 px-2 max-w-md mx-auto">
        {/* 1. Inicio */}
        <a
          href="#inicio"
          data-path="inicio"
          aria-current={currentScreen === 'inicio' ? 'page' : undefined}
          onClick={(e) => handleNav('inicio', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'inicio'
              ? 'text-[#1E70BA] dark:text-[#60A5FA] font-black'
              : 'text-[#64748B] dark:text-stone-400 hover:text-[#1E70BA]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span className="text-[11px] leading-[14px]">Inicio</span>
        </a>

        {/* 2. Inventario */}
        <a
          href="#inventario"
          data-path="inventario"
          aria-current={currentScreen === 'inventario' ? 'page' : undefined}
          onClick={(e) => handleNav('inventario', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'inventario'
              ? 'text-[#1E70BA] dark:text-[#60A5FA] font-black'
              : 'text-[#64748B] dark:text-stone-400 hover:text-[#1E70BA]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <span className="text-[11px] leading-[14px]">Inventario</span>
        </a>

        {/* 3. Central (+) Blue Action Button */}
        <a
          href="#inicio-registrar"
          data-path="inicio-registrar"
          aria-current={currentScreen === 'inicio' ? 'page' : undefined}
          onClick={(e) => handleNav('inicio', e)}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] -mt-6 transition-transform active:scale-95 group"
          title="Registrar venta rápida"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_6px_18px_rgba(30,112,186,0.35)] transition-all bg-[#1E70BA] text-white ring-4 ring-[#EAF3FA] dark:ring-[#1E293B] group-hover:scale-105 group-hover:bg-[#165A98]`}
          >
            <span className="material-symbols-outlined text-[32px] font-bold">add</span>
          </div>
        </a>

        {/* 4. Ventas / Historial */}
        <a
          href="#historial"
          data-path="historial"
          aria-current={currentScreen === 'historial' ? 'page' : undefined}
          onClick={(e) => handleNav('historial', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'historial'
              ? 'text-[#1E70BA] dark:text-[#60A5FA] font-black'
              : 'text-[#64748B] dark:text-stone-400 hover:text-[#1E70BA]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
          <span className="text-[11px] leading-[14px]">Ventas</span>
        </a>

        {/* 5. Reportes */}
        <a
          href="#reportes"
          data-path="reportes"
          aria-current={currentScreen === 'reportes' ? 'page' : undefined}
          onClick={(e) => handleNav('reportes', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'reportes'
              ? 'text-[#1E70BA] dark:text-[#60A5FA] font-black'
              : 'text-[#64748B] dark:text-stone-400 hover:text-[#1E70BA]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          <span className="text-[11px] leading-[14px]">Reportes</span>
        </a>
      </div>
    </nav>
  );
};
