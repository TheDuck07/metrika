import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    storeInfo,
    updateUserProfile,
    logout,
    isDarkMode,
    setThemeMode,
    setCurrentScreen,
    setShowBusinessSwitcher,
    setShowTutorial,
    showToast,
  } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || storeInfo.owner || '');
  const [storeName, setStoreName] = useState(user?.storeName || storeInfo.name || '');
  const [phone, setPhone] = useState(user?.phone || storeInfo.phone || '');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentAvatar = user?.avatarUrl || storeInfo.logoUrl || storeInfo.avatarUrl;
  const initials = (name || storeInfo.owner || 'Comerciante')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          updateUserProfile({ avatarUrl: compressed });
          showToast('¡Foto de perfil actualizada!', 'success');
        }
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemovePhoto = () => {
    updateUserProfile({ avatarUrl: '' });
    showToast('Foto de perfil eliminada', 'info');
  };

  const handleSaveData = () => {
    if (!name.trim()) {
      showToast('Por favor escribe tu nombre', 'warning');
      return;
    }
    updateUserProfile({
      name: name.trim(),
      storeName: storeName.trim() || 'Mi Negocio',
      phone: phone.trim(),
    });
    setIsEditing(false);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    onClose();
    await logout();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[88dvh] overflow-y-auto overscroll-contain modal-bottom-sheet flex flex-col"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="p-4 bg-[#1E70BA] text-white rounded-t-3xl sm:rounded-t-3xl flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Mi Cuenta y Perfil</h3>
              <p className="text-[11px] text-white/80">Configuración general y tema</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* 1. Profile Picture & Identity Card */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[#F6F8FA] dark:bg-[#20252D] border border-slate-200 dark:border-slate-700/60 shadow-2xs relative">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Avatar Circle with Camera badge */}
            <div className="relative group mb-3">
              <div className="w-24 h-24 rounded-full bg-[#1E70BA] text-white font-black text-2xl flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={user?.name || 'Perfil'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials || 'ME'}</span>
                )}
              </div>

              {/* Upload photo button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Tomar o cambiar foto"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#9EC84A] hover:bg-[#88b038] text-slate-950 flex items-center justify-center shadow-md border-2 border-white dark:border-slate-800 cursor-pointer active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </button>
            </div>

            {/* User display info */}
            {!isEditing ? (
              <div className="space-y-1 w-full">
                <div className="flex items-center justify-center gap-1.5">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {user?.name || storeInfo.owner || 'Comerciante'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setName(user?.name || storeInfo.owner || '');
                      setStoreName(user?.storeName || storeInfo.name || '');
                      setPhone(user?.phone || storeInfo.phone || '');
                      setIsEditing(true);
                    }}
                    className="text-[#1E70BA] dark:text-[#60A5FA] hover:underline text-xs font-bold p-1 cursor-pointer"
                    title="Editar información"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                </div>

                <p className="text-xs font-bold text-[#1E70BA] dark:text-[#60A5FA]">
                  🏪 {user?.storeName || storeInfo.name || 'Mi Negocio'}
                </p>

                {/* Email / Google Badge */}
                {user?.authProvider === 'google' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{user.email || 'Cuenta de Google'}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    📱 {user?.phone || storeInfo.phone || 'Sin teléfono registrado'}
                  </p>
                )}

                {/* Quick actions for photo */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1A1F26] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#1E70BA] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm text-[#1E70BA]">add_a_photo</span>
                    Cambiar foto
                  </button>
                  {currentAvatar && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Inline Edit Mode */
              <div className="space-y-3 w-full text-left pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A1F26] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                    placeholder="Ej: Doña María Mendoza"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Nombre de tu tienda
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A1F26] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                    placeholder="Ej: Abarrotes Don Lucho"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A1F26] text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                    placeholder="Ej: 77012345"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveData}
                    className="flex-1 h-10 rounded-xl bg-[#1E70BA] text-white text-xs font-black hover:bg-[#165A98] cursor-pointer shadow-xs"
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Theme Configuration (Light vs Dark Mode) */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tema y Apariencia
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Light Mode Button */}
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                  !isDarkMode
                    ? 'border-[#1E70BA] bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-[#1E70BA]/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#20252D] hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !isDarkMode
                      ? 'bg-[#1E70BA] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">light_mode</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    Modo Claro
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Día / Fondo claro
                  </div>
                </div>
              </button>

              {/* Dark Mode Button */}
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`p-3 rounded-2xl border-2 flex items-center gap-3 transition-all cursor-pointer text-left ${
                  isDarkMode
                    ? 'border-[#9EC84A] bg-lime-50/30 dark:bg-lime-950/30 ring-2 ring-[#9EC84A]/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#20252D] hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isDarkMode
                      ? 'bg-[#9EC84A] text-slate-950 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    Modo Oscuro
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Noche / Ahorro
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Quick Business Tools */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Opciones de Negocio
            </label>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentScreen('mi-tienda');
                }}
                className="w-full h-12 px-3.5 rounded-2xl bg-white dark:bg-[#20252D] border border-slate-200 dark:border-slate-700/80 hover:border-[#1E70BA] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#1E70BA] dark:text-[#60A5FA] text-xl">
                    store
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ver configuración completa de la tienda
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-0.5 transition-transform text-lg">
                  chevron_right
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setShowBusinessSwitcher(true);
                }}
                className="w-full h-12 px-3.5 rounded-2xl bg-white dark:bg-[#20252D] border border-slate-200 dark:border-slate-700/80 hover:border-[#1E70BA] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#9EC84A] text-xl">
                    swap_horiz
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Cambiar de negocio o sucursal
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-0.5 transition-transform text-lg">
                  chevron_right
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  setShowTutorial(true);
                }}
                className="w-full h-12 px-3.5 rounded-2xl bg-white dark:bg-[#20252D] border border-slate-200 dark:border-slate-700/80 hover:border-[#1E70BA] transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-amber-500 text-xl">
                    help_outline
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Ver tutorial de cómo usar Metrika
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-0.5 transition-transform text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          {/* 4. Logout Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {!showLogoutConfirm ? (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full h-12 rounded-2xl bg-[#FDEFEA] hover:bg-[#fad8ce] dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-[#EE6B4D]/40 text-[#EE6B4D] dark:text-rose-400 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-xl">logout</span>
                Cerrar sesión
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-[#FDEFEA] dark:bg-rose-950/60 border border-[#EE6B4D] space-y-2.5 animate-in fade-in duration-100">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-200 text-center">
                  ¿Seguro que deseas salir de tu cuenta?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="h-10 rounded-xl bg-[#EE6B4D] hover:bg-[#d6573a] text-white text-xs font-black cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    Sí, cerrar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="h-10 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

