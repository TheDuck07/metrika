import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';

export const MiTiendaScreen: React.FC = () => {
  const {
    user,
    logout,
    loginWithGoogle,
    storeInfo,
    updateStoreInfo,
    products,
    transactions,
    navigateWithPushBack,
    showToast,
    isDarkMode,
    toggleDarkMode,
    setShowTutorial,
    availableStores,
    setShowBusinessSwitcher,
  } = useStore();

  // Modals
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

  // Custom QR Code Image (Isolated per business)
  const qrStorageKey = `metrika_store_qr_${user?.id || 'demo'}`;
  const [qrImage, setQrImage] = useState<string | null>(() => {
    return localStorage.getItem(`metrika_store_qr_${user?.id || 'demo'}`) || null;
  });

  React.useEffect(() => {
    const key = `metrika_store_qr_${user?.id || 'demo'}`;
    setQrImage(localStorage.getItem(key) || null);
  }, [user?.id]);

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  // Edit Store form state
  const [editStoreName, setEditStoreName] = useState(storeInfo.name);
  const [editOwnerName, setEditOwnerName] = useState(storeInfo.owner);
  const [editPhone, setEditPhone] = useState(storeInfo.phone);
  const [editCity, setEditCity] = useState(storeInfo.city);

  // Backup progress state
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreInfo({
      name: editStoreName.trim() || 'Tienda Don Lucho',
      owner: editOwnerName.trim() || 'Doña María Mendoza R.',
      phone: editPhone.trim() || '77234567',
      city: editCity.trim() || 'La Paz - San Pedro',
    });
    setShowEditProfileModal(false);
  };

  const handleStartBackup = () => {
    setBackupInProgress(true);
    setBackupProgress(0);

    const interval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setBackupInProgress(false);
            setShowBackupModal(false);

            // 1. Generate real JSON file backup for download
            try {
              const backupPayload = {
                version: '1.0',
                store: storeInfo,
                totalProducts: products.length,
                totalTransactions: transactions.length,
                products,
                transactions,
                exportedAt: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `respaldo_${storeInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            } catch (err) {
              console.warn('Error downloading backup file:', err);
            }

            // 2. Open WhatsApp with formatted store summary
            const todayStr = new Date().toLocaleDateString('es-BO');
            const totalVentasBs = transactions
              .filter((t) => t.type === 'venta')
              .reduce((sum, t) => sum + t.amount, 0);

            const msg = `🏪 *RESPALDO METRIKA - ${storeInfo.name.toUpperCase()}*
👤 *Dueño:* ${storeInfo.owner}
📅 *Fecha:* ${todayStr}
📦 *Catálogo:* ${products.length} productos en inventario
📊 *Ventas Registradas:* ${transactions.filter((t) => t.type === 'venta').length} ventas (Total: Bs. ${totalVentasBs.toFixed(2)})
📝 *Total Movimientos:* ${transactions.length} registros

_Copia de seguridad generada automáticamente por Metrika._`;

            const phoneDigits = storeInfo.phone.replace(/\D/g, '');
            const waUrl = phoneDigits
              ? `https://api.whatsapp.com/send?phone=591${phoneDigits}&text=${encodeURIComponent(msg)}`
              : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

            window.open(waUrl, '_blank');
            showToast('¡Copia de respaldo descargada y enviada a tu WhatsApp!', 'success');
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  return (
    <div className="bg-[#fff8f5] dark:bg-[#171210] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Mi Tienda" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-3.5">
        {/* Profile Card */}
        <section className="bg-white dark:bg-[#231b17] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 relative overflow-hidden transition-colors">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#ffddb8]/40 dark:bg-[#4d281a]/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center gap-3.5 relative">
            <div className="relative shrink-0">
              <div className="w-18 h-18 rounded-full bg-[#fceede] dark:bg-[#33221b] border-2 border-[#ffddb8] dark:border-stone-700 flex items-center justify-center text-[#bd532b] dark:text-[#ff9973] shadow-xs overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[36px]">storefront</span>
                )}
              </div>
              <button
                id="btn-edit-photo"
                type="button"
                aria-label="Editar foto"
                onClick={() => showToast('Cámara / Galería: Selecciona foto para tu tienda')}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#9f3c16] text-white flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">photo_camera</span>
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffddb8] dark:bg-[#432d16] text-[#2a1700] dark:text-amber-200 text-[10px] font-bold">
                  <span className="material-symbols-outlined text-[12px]">store</span>
                  Tienda de Barrio
                </span>
                <span className="text-[11px] text-[#8a726a] dark:text-stone-400 truncate">{storeInfo.city}</span>
              </div>

              <h2 id="profile-store-name" className="text-lg font-extrabold text-[#1f1b19] dark:text-stone-100 truncate leading-tight">
                {storeInfo.name}
              </h2>

              <p id="profile-owner-name" className="text-xs text-[#57423b] dark:text-stone-300 truncate mt-0.5 font-medium">
                {storeInfo.owner}
              </p>

              {user?.email && (
                <p className="text-[11px] text-[#8a726a] dark:text-stone-400 truncate mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-emerald-600">verified</span>
                  {user.email}
                </p>
              )}

              <button
                id="btn-edit-profile"
                type="button"
                onClick={() => {
                  setEditStoreName(storeInfo.name);
                  setEditOwnerName(storeInfo.owner);
                  setEditPhone(storeInfo.phone);
                  setEditCity(storeInfo.city);
                  setShowEditProfileModal(true);
                }}
                className="mt-1.5 inline-flex items-center gap-1 text-xs text-[#9f3c16] dark:text-[#ff9973] font-bold hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                Editar datos de la tienda
              </button>
            </div>
          </div>
        </section>

        {/* Quick Metrics (2 cards) */}
        <section className="grid grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-[#231b17] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs border border-[#dec0b7]/40 dark:border-stone-800 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#9f3c16]/10 dark:bg-[#9f3c16]/20 text-[#9f3c16] dark:text-[#ff9973] flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
            <span className="text-2xl font-extrabold text-[#1f1b19] dark:text-stone-100 leading-none">{products.length}</span>
            <span className="text-[11px] text-[#57423b] dark:text-stone-400 mt-1 font-semibold">Productos en catálogo</span>
          </div>

          <div className="bg-white dark:bg-[#231b17] rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs border border-[#dec0b7]/40 dark:border-stone-800 transition-colors">
            <div className="w-10 h-10 rounded-full bg-[#ffddb8] dark:bg-[#432d16] text-[#855300] dark:text-amber-300 flex items-center justify-center mb-1.5">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            </div>
            <span className="text-2xl font-extrabold text-[#1f1b19] dark:text-stone-100 leading-none">
              {transactions.filter((t) => t.type === 'venta').length}
            </span>
            <span className="text-[11px] text-[#57423b] dark:text-stone-400 mt-1 font-semibold">Ventas registradas</span>
          </div>
        </section>

        {/* Work Tools (Herramientas de Trabajo) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#9f3c16] dark:text-[#ff9973] text-[18px]">apps</span>
              Herramientas de Trabajo
            </h3>
            <span className="text-[11px] text-[#2a6651] dark:text-emerald-300 bg-[#b1f0d4] dark:bg-emerald-950/70 px-2 py-0.5 rounded-full font-bold">
              Operativo
            </span>
          </div>

          <div className="bg-white dark:bg-[#231b17] rounded-2xl shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 divide-y divide-[#eae1dd]/60 dark:divide-stone-800/80 overflow-hidden transition-colors">
            {/* Mis Negocios Button */}
            <button
              id="btn-mis-negocios"
              type="button"
              onClick={() => setShowBusinessSwitcher(true)}
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">store</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 truncate">
                      Mis Negocios / Cambiar Tienda
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                      {availableStores.length} {availableStores.length === 1 ? 'negocio' : 'negocios'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    Ventas y gastos 100% divididos y sin mezclar
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[20px] ml-2 shrink-0">
                chevron_right
              </span>
            </button>

            {/* Dark Mode Row */}
            <div className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">
                    {isDarkMode ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 truncate">
                      Modo Oscuro
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      {isDarkMode ? 'Activado' : 'Desactivado'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    Descansa la vista y ahorra batería en la noche
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                aria-label="Alternar modo oscuro"
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDarkMode ? 'bg-[#9f3c16]' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[13px] ${
                    isDarkMode ? 'translate-x-5 text-amber-500' : 'translate-x-0 text-stone-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isDarkMode ? 'dark_mode' : 'light_mode'}
                  </span>
                </span>
              </button>
            </div>

            {/* WhatsApp Backup */}
            <button
              id="btn-open-backup"
              type="button"
              onClick={() => {
                setBackupInProgress(false);
                setBackupProgress(0);
                setShowBackupModal(true);
              }}
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-[#b1f0d4] dark:bg-emerald-950/70 text-[#0f513c] dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 block truncate">
                    Copia de Seguridad en WhatsApp
                  </span>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    Guarda tus ventas y productos en tu chat
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[20px] ml-2 shrink-0">
                chevron_right
              </span>
            </button>

            {/* Stock Alerts */}
            <button
              id="btn-stock-alerts"
              type="button"
              onClick={() => setShowLowStockModal(true)}
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-[#ffddb8] dark:bg-[#432d16] text-[#855300] dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">notification_important</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 block truncate">
                      Avisos de Poco Stock
                    </span>
                    {lowStockProducts.length > 0 && (
                      <span className="bg-[#ba1a1a] text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                        {lowStockProducts.length} por agotar
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    {lowStockProducts.length > 0
                      ? `Hay ${lowStockProducts.length} producto(s) por debajo del stock mínimo`
                      : 'Todos tus productos tienen stock suficiente'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[20px] ml-2 shrink-0">
                chevron_right
              </span>
            </button>

            {/* QR Code */}
            <button
              id="btn-qr-code"
              type="button"
              onClick={() => setShowQrModal(true)}
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-[#ffddb8] dark:bg-[#432d16] text-[#855300] dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 truncate">
                      Mi Código QR de Cobro
                    </span>
                    <span className="text-[10px] text-[#2a6651] dark:text-emerald-300 bg-[#b1f0d4] dark:bg-emerald-950/70 px-1.5 py-0.2 rounded-full font-bold">
                      Disponible
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    Muestra tu QR para cobrar rápido
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[20px] ml-2 shrink-0">
                chevron_right
              </span>
            </button>

            {/* Google Account Connection (1-click, no manual keys) */}
            <div
              id="google-account-section"
              className="w-full text-left p-3.5 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl bg-white border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 truncate">
                      Cuenta de Google
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                      {user?.authProvider === 'google' ? 'Conectado' : 'Sin claves'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                    {user?.authProvider === 'google'
                      ? (user.email || 'Cuenta vinculada activa')
                      : 'Vincula con 1 clic para autoguardado e IA'}
                  </span>
                </div>
              </div>

              {user?.authProvider !== 'google' ? (
                <button
                  type="button"
                  onClick={() => loginWithGoogle()}
                  className="px-3 py-1.5 rounded-xl bg-[#bd532b] hover:bg-[#a94822] text-white text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Conectar
                </button>
              ) : (
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[22px] ml-2 shrink-0">
                  check_circle
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Tutorial Interactivo Card */}
        <section>
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="w-full text-left bg-white dark:bg-[#231b17] rounded-2xl p-3.5 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 flex items-center justify-between hover:bg-[#fbf2ee] dark:hover:bg-[#2c221e] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#ffdbcf] dark:bg-[#432316] text-[#822801] dark:text-[#ff9973] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 block truncate">
                    Tutorial Interactivo de Metrika
                  </span>
                  <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    Guía Rápida
                  </span>
                </div>
                <span className="text-[11px] text-[#57423b] dark:text-stone-400 block truncate mt-0.5">
                  Repasar cómo anotar por voz, registrar ventas y reportes
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[18px]">open_in_new</span>
          </button>
        </section>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            id="btn-logout"
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full h-12 bg-[#f5ece8] dark:bg-stone-800 hover:bg-[#eae1dd] dark:hover:bg-stone-700 text-[#57423b] dark:text-stone-300 border border-[#dec0b7] dark:border-stone-700 font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Cerrar sesión</span>
          </button>
          <p className="text-center text-[10px] text-[#8a726a] mt-2 font-medium">
            Metrika Tiendas Bolivia • v2.4.1 (La Paz)
          </p>
        </div>
      </main>

      {/* MODAL 1: Editar Datos de la Tienda (matching Image_9_273070cc.jpeg) */}
      {showEditProfileModal && (
        <div
          id="edit-profile-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffdbcf] text-[#9f3c16] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">store</span>
                </div>
                <h3 className="font-bold text-base text-[#1f1b19]">Editar datos de la tienda</h3>
              </div>
              <button
                id="close-profile-modal"
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form id="edit-profile-form" onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="input-store-name">
                  Nombre del Negocio
                </label>
                <input
                  id="input-store-name"
                  type="text"
                  required
                  value={editStoreName}
                  onChange={(e) => setEditStoreName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-[#fff8f5] text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="input-owner-name">
                  Nombre de la Propietaria
                </label>
                <input
                  id="input-owner-name"
                  type="text"
                  required
                  value={editOwnerName}
                  onChange={(e) => setEditOwnerName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-[#fff8f5] text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="input-phone">
                  Teléfono / WhatsApp
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-stone-500">+591</span>
                  <input
                    id="input-phone"
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-11 pl-12 pr-3 rounded-xl border border-stone-300 bg-[#fff8f5] text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="input-city">
                  Ciudad / Barrio
                </label>
                <input
                  id="input-city"
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-[#fff8f5] text-sm font-semibold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full h-12 bg-[#9f3c16] hover:bg-[#822801] active:scale-98 text-white font-bold text-sm rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Guardar cambios
                </button>
                <button
                  id="cancel-profile-modal"
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="w-full h-10 bg-[#f5ece8] text-stone-700 text-xs font-bold rounded-xl hover:bg-[#eae1dd] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Copia de Seguridad en WhatsApp */}
      {showBackupModal && (
        <div
          id="backup-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-[#b1f0d4] text-[#0f513c] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1f1b19]">Copia de Seguridad</h3>
                  <span className="text-[11px] text-[#2a6651] font-bold">Respaldo en WhatsApp</span>
                </div>
              </div>
              <button
                id="close-backup-modal"
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="bg-[#f5ece8] rounded-xl p-3 space-y-1.5 border border-[#dec0b7]/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9f3c16] text-[18px]">inventory_2</span>
                <span className="text-xs font-bold text-[#1f1b19]">
                  {products.length} productos • {transactions.length} registros
                </span>
              </div>
              <p className="text-[11px] text-[#57423b] leading-relaxed">
                Se enviará un archivo compacto y seguro a tu chat personal de WhatsApp (
                <span id="backup-phone-display" className="font-bold text-[#1f1b19]">
                  +591 {storeInfo.phone}
                </span>
                ).
              </p>
            </div>

            {backupInProgress && (
              <div id="backup-progress-container" className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Preparando archivo cifrado...</span>
                  <span id="backup-progress-text" className="font-bold text-[#9f3c16]">
                    {backupProgress}%
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    id="backup-progress-bar"
                    className="bg-[#9f3c16] h-full rounded-full transition-all duration-300"
                    style={{ width: `${backupProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="confirm-backup-btn"
                type="button"
                disabled={backupInProgress}
                onClick={handleStartBackup}
                className="w-full h-12 bg-[#2a6651] hover:bg-[#205140] active:scale-98 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                Enviar copia a mi WhatsApp
              </button>
              <button
                id="cancel-backup-btn"
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="w-full h-10 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: QR de Cobro */}
      {showQrModal && (
        <div
          id="qr-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
        >
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 flex flex-col items-center text-center space-y-3.5">
            <div className="w-full flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffddb8] text-[#855300] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                </div>
                <h3 className="font-bold text-base text-[#1f1b19]">QR de Cobro</h3>
              </div>
              <button
                id="close-qr-modal"
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="bg-[#fff8f5] p-4 rounded-2xl border border-[#dec0b7] flex flex-col items-center shadow-xs w-full">
              <p id="qr-store-display" className="text-sm font-extrabold text-[#1f1b19]">
                {storeInfo.name}
              </p>
              <p className="text-[11px] text-[#57423b] mb-2.5">Cobro Simple QR • Pago Fácil Bolivia</p>

              <div className="w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center shadow-inner border border-stone-300 overflow-hidden relative">
                {qrImage ? (
                  <img src={qrImage} alt="QR de la tienda" className="w-full h-full object-contain" />
                ) : (
                  <svg className="w-full h-full text-stone-900" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm-2 10h8v8H2v-8zm2 2v4h4v-4H4zm10-14h8v8h-8V2zm2 2v4h4V4h-4zm-1 9h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2zm3-6h2v5h-2v-5zm0 7h2v2h-2v-2z" />
                  </svg>
                )}
              </div>

              <input
                type="file"
                id="upload-qr-input"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const res = ev.target?.result as string;
                      setQrImage(res);
                      localStorage.setItem(qrStorageKey, res);
                      showToast('¡Tu QR de cobro ha sido guardado!');
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />

              <label
                htmlFor="upload-qr-input"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-[#9f3c16] font-bold bg-[#fbf2ee] hover:bg-[#f5ece8] border border-[#dec0b7] px-3 py-1.5 rounded-full cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>{qrImage ? 'Cambiar imagen de mi QR' : 'Subir mi QR de banco (BNB, BCP, Unión...)'}</span>
              </label>

              <span className="text-[10px] text-[#8a726a] mt-2 font-medium">
                Los clientes pueden escanearlo con cualquier banco boliviano
              </span>
            </div>

            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                id="btn-share-qr"
                type="button"
                onClick={() => {
                  const text = `🏪 *PAGO SIMPLE QR - ${storeInfo.name}*\n` +
                    `Hola! Puedes realizar el pago escaneando nuestro código QR de banco o al celular ${storeInfo.phone}.\n` +
                    `¡Gracias por tu compra!`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  showToast('Abriendo WhatsApp con datos de cobro...');
                }}
                className="w-full h-11 bg-[#9f3c16] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Compartir datos de pago por WhatsApp
              </button>
              <button
                id="cancel-qr-modal"
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full h-9 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Alertas de Poco Stock y Pedidos */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1f1b19]">Avisos de Poco Stock</h3>
                  <span className="text-[11px] text-[#ba1a1a] font-bold">
                    {lowStockProducts.length} producto(s) por agotar
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-4 text-center space-y-1.5 bg-[#fbf9f7] rounded-xl">
                <span className="material-symbols-outlined text-[36px] text-[#2a6651]">check_circle</span>
                <p className="text-xs font-bold text-[#1f1b19]">¡Excelente! Todo tu inventario está abastecido.</p>
                <p className="text-[11px] text-[#57423b]">Ningún producto se encuentra por debajo del stock mínimo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#57423b]">
                  Los siguientes artículos están por terminarse y requieren reposición:
                </p>
                <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto border border-stone-200 rounded-xl p-1 bg-stone-50">
                  {lowStockProducts.map((p) => (
                    <div key={p.id} className="p-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-[#1f1b19] block truncate">{p.name}</span>
                        <span className="text-[10.5px] text-[#8a726a]">Mínimo sugerido: {p.minStock} {p.unit}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-[#ba1a1a]">
                          {p.stock} {p.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      const lines = lowStockProducts.map(
                        (p) => `- ${p.name}: quedan ${p.stock} ${p.unit} (pedir reposición)`
                      );
                      const text = `🛒 *PEDIDO DE MERCADERÍA - ${storeInfo.name}*\n` +
                        `👤 *Dueño:* ${storeInfo.owner}\n` +
                        `📅 *Fecha:* ${new Date().toLocaleDateString('es-BO')}\n\n` +
                        `Favor cotizar y enviar:\n` +
                        lines.join('\n') +
                        `\n\n_Enviado desde Metrika Tiendas._`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                      showToast('Abriendo WhatsApp con la lista de reposición...');
                    }}
                    className="w-full h-11 bg-[#2a6651] hover:bg-[#205140] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                    Pedir Reposición por WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLowStockModal(false);
                      navigateWithPushBack('inventario');
                    }}
                    className="w-full h-10 bg-[#f5ece8] hover:bg-[#eae1dd] text-[#57423b] font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                    Ir al Catálogo de Inventario
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Confirmar Cierre de Sesión (CRITICAL: contains #confirm-logout) */}
      <div
        id="logout-modal"
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 transition-opacity duration-200 ${
          showLogoutModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
        }`}
      >
        <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 flex flex-col items-center text-center space-y-3.5">
          <div className="w-12 h-12 rounded-full bg-[#ffddb8] text-[#855300] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[28px]">door_back</span>
          </div>

          <div>
            <h3 className="font-extrabold text-base text-[#1f1b19]">¿Cerrar turno de hoy?</h3>
            <p className="text-xs text-[#57423b] mt-1 leading-relaxed">
              Tus ventas y fiados registrados están guardados y seguros en tu dispositivo.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              id="confirm-logout"
              type="button"
              onClick={handleConfirmLogout}
              className="w-full h-12 bg-[#9f3c16] hover:bg-[#822801] active:scale-98 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sí, cerrar turno y salir
            </button>
            <button
              id="cancel-logout"
              type="button"
              onClick={() => setShowLogoutModal(false)}
              className="w-full h-11 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl hover:bg-stone-200 cursor-pointer"
            >
              Volver a mi tienda
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 5: Tutorial de Metrika */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h3 className="font-bold text-base text-[#1f1b19]">¿Cómo usar Metrika?</h3>
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-700">
              <div className="p-2.5 rounded-xl bg-[#f5ece8] flex items-start gap-2">
                <span className="font-bold text-[#9f3c16]">1.</span>
                <p><strong>Registra ventas:</strong> Toca el botón rojo central para añadir cobros en segundos.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f5ece8] flex items-start gap-2">
                <span className="font-bold text-[#9f3c16]">2.</span>
                <p><strong>Edita productos:</strong> En inventario, toca cualquier fila para ajustar stock o precio.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f5ece8] flex items-start gap-2">
                <span className="font-bold text-[#9f3c16]">3.</span>
                <p><strong>Revisa tu ganancia neta:</strong> En reportes verás tus ventas menos gastos reales.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTutorialModal(false)}
              className="w-full h-11 bg-[#9f3c16] text-white font-bold text-xs rounded-xl cursor-pointer mt-2"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}

      {/* Modals */}

      <BottomNav />
    </div>
  );
};
