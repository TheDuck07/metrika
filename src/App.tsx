import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { IngresoScreen } from './screens/IngresoScreen';
import { InicioScreen } from './screens/InicioScreen';
import { HistorialScreen } from './screens/HistorialScreen';
import { InventarioScreen } from './screens/InventarioScreen';
import { MiTiendaScreen } from './screens/MiTiendaScreen';
import { ReportesScreen } from './screens/ReportesScreen';
import { OnboardingTutorialModal } from './components/OnboardingTutorialModal';
import { BusinessSwitcherModal } from './components/BusinessSwitcherModal';
import { CreateBusinessModal } from './components/CreateBusinessModal';

const MainAppContent: React.FC = () => {
  const {
    currentScreen,
    toastMessage,
    toastType,
    showTutorial,
    setShowTutorial,
    showBusinessSwitcher,
    setShowBusinessSwitcher,
    showCreateBusinessModal,
    setShowCreateBusinessModal,
  } = useStore();

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#13171D] text-[#252524] dark:text-stone-100 font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      {/* Global floating toast notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[90%] max-w-[370px] z-70 bg-[#1E70BA] text-white backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-white/20 flex items-center gap-3 animate-bounce">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              toastType === 'success'
                ? 'bg-[#9EC84A] text-slate-900'
                : toastType === 'warning'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-white text-[#1E70BA]'
            }`}
          >
            <span className="material-symbols-outlined text-2xl font-bold">
              {toastType === 'success' ? 'check_circle' : toastType === 'warning' ? 'warning' : 'info'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm leading-tight text-white">Metrika</h4>
            <p className="text-xs text-white/90 mt-0.5 truncate">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* Screen Router */}
      {currentScreen === 'ingreso' && <IngresoScreen />}
      {currentScreen === 'inicio' && <InicioScreen />}
      {currentScreen === 'historial' && <HistorialScreen />}
      {currentScreen === 'inventario' && <InventarioScreen />}
      {currentScreen === 'mi-tienda' && <MiTiendaScreen />}
      {currentScreen === 'reportes' && <ReportesScreen />}

      {/* Interactive Onboarding Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Business Switcher Modal */}
      <BusinessSwitcherModal
        isOpen={showBusinessSwitcher}
        onClose={() => setShowBusinessSwitcher(false)}
        onOpenNewStoreModal={() => setShowCreateBusinessModal(true)}
      />

      {/* Create New Business Modal */}
      <CreateBusinessModal
        isOpen={showCreateBusinessModal}
        onClose={() => setShowCreateBusinessModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}
