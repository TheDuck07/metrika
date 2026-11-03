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
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff]/95 dark:bg-[#1a1412]/95 backdrop-blur-xl border-t border-[#eae1dd] dark:border-stone-800 shadow-[0_-4px_20px_rgba(38,34,32,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)] select-none transition-colors pb-[env(safe-area-inset-bottom,0px)]"
      data-active-classes="text-[#9f3c16] dark:text-[#ff9973] font-bold"
    >
      <div className="flex items-center justify-around h-16 sm:h-20 px-2 max-w-md mx-auto">
        {/* Historial */}
        <a
          href="#historial"
          data-path="historial"
          aria-current={currentScreen === 'historial' ? 'page' : undefined}
          onClick={(e) => handleNav('historial', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'historial'
              ? 'text-[#9f3c16] dark:text-[#ff9973] font-bold'
              : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          <span className="text-[11px] leading-[14px]">Historial</span>
        </a>

        {/* Inventario */}
        <a
          href="#inventario"
          data-path="inventario"
          aria-current={currentScreen === 'inventario' ? 'page' : undefined}
          onClick={(e) => handleNav('inventario', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'inventario'
              ? 'text-[#9f3c16] dark:text-[#ff9973] font-bold'
              : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">inventory_2</span>
          <span className="text-[11px] leading-[14px]">Inventario</span>
        </a>

        {/* Registrar / Inicio (Elevated Central Button) */}
        <a
          href="#inicio"
          data-path="inicio-registrar"
          aria-current={currentScreen === 'inicio' ? 'page' : undefined}
          onClick={(e) => handleNav('inicio', e)}
          className="flex flex-col items-center justify-center min-w-[64px] min-h-[48px] -mt-5 transition-transform active:scale-95 group"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(200,90,50,0.36)] transition-all ${
              currentScreen === 'inicio'
                ? 'bg-[#9f3c16] text-white ring-4 ring-[#ffdbcf] dark:ring-[#4d281a]'
                : 'bg-[#9f3c16] text-white hover:bg-[#bf542c]'
            }`}
          >
            <span className="material-symbols-outlined text-[30px]">point_of_sale</span>
          </div>
          <span
            className="text-[11px] leading-[14px] font-bold mt-1 text-[#9f3c16] dark:text-[#ff9973]"
          >
            Registrar
          </span>
        </a>

        {/* Reportes */}
        <a
          href="#reportes"
          data-path="reportes"
          aria-current={currentScreen === 'reportes' ? 'page' : undefined}
          onClick={(e) => handleNav('reportes', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'reportes'
              ? 'text-[#9f3c16] dark:text-[#ff9973] font-bold'
              : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">bar_chart</span>
          <span className="text-[11px] leading-[14px]">Reportes</span>
        </a>

        {/* Mi Tienda */}
        <a
          href="#mi-tienda"
          data-path="mi-tienda"
          aria-current={currentScreen === 'mi-tienda' ? 'page' : undefined}
          onClick={(e) => handleNav('mi-tienda', e)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all gap-0.5 ${
            currentScreen === 'mi-tienda'
              ? 'text-[#9f3c16] dark:text-[#ff9973] font-bold'
              : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">storefront</span>
          <span className="text-[11px] leading-[14px]">Mi Tienda</span>
        </a>
      </div>
    </nav>
  );
};
