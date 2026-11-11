import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

export const IngresoScreen: React.FC = () => {
  const { login, loginWithGoogle, registerUser, showToast } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Standard login fields
  const [identity, setIdentity] = useState('77012345');
  const [password, setPassword] = useState('1234');

  // Modal register fields
  const [regShopName, setRegShopName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    await loginWithGoogle();
    setLoading(false);
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    await login('demo', '1234');
    setLoading(false);
  };

  const handleStandardLogin = async () => {
    if (!identity.trim()) {
      showToast('Por favor introduce tu teléfono o correo', 'warning');
      return;
    }
    setLoading(true);
    await login(identity.trim(), password.trim());
    setLoading(false);
  };

  const handleSubmitRegister = async () => {
    const shopName = regShopName.trim() || 'Mi Tiendita';
    const ownerName = regOwnerName.trim();
    const phone = regPhone.trim();
    const pin = regPin.trim() || '1234';

    if (!ownerName || !phone) {
      showToast('Por favor completa tu nombre y número de celular', 'warning');
      return;
    }

    setLoading(true);
    const ok = await registerUser({
      storeName: shopName,
      ownerName,
      phone,
      pin,
    });
    setLoading(false);
    if (ok) {
      setShowModal(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#EDF2F7] dark:bg-[#13171D] flex justify-center items-center p-0 sm:p-4 select-none">
      <div
        className="relative w-full max-w-[420px] min-h-[100dvh] sm:min-h-[780px] sm:max-h-[920px] bg-white dark:bg-[#1A1F26] flex flex-col justify-between overflow-y-auto shadow-2xl sm:rounded-[40px] border-0 sm:border sm:border-slate-200 dark:border-slate-800"
        data-purpose="mobile-viewport"
      >
        {/* Top Blue Hero with Logo M (Matches Mockup Screen 1) */}
        <section className="relative w-full bg-[#1E70BA] pt-12 pb-14 px-6 rounded-b-[40px] shadow-lg flex flex-col items-center text-center overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#9EC84A]/20 blur-lg pointer-events-none"></div>

          {/* White Card holding the METRIKA Cut-Out M Logo */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-3xl p-3 shadow-xl flex items-center justify-center mb-4 transition-transform hover:scale-105 border-4 border-white">
            <img
              src="/logo-m.jpg"
              alt="Metrika M Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback icon
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h1 className="text-3xl font-black text-white tracking-wide drop-shadow-sm">
            METRIKA
          </h1>

          {/* Dotted decorative green line like in mockup */}
          <div className="flex items-center gap-1.5 my-2.5">
            <span className="w-2.5 h-1 rounded-full bg-[#9EC84A]"></span>
            <span className="w-2.5 h-1 rounded-full bg-[#9EC84A]"></span>
            <span className="w-2.5 h-1 rounded-full bg-[#9EC84A]"></span>
            <span className="w-2.5 h-1 rounded-full bg-[#9EC84A]"></span>
            <span className="w-2.5 h-1 rounded-full bg-[#9EC84A]"></span>
          </div>

          <p className="text-white/95 text-xs sm:text-sm font-semibold max-w-[260px] leading-snug">
            Control de stock y ventas para tu negocio
          </p>
        </section>

        {/* Form and actions */}
        <main className="w-full flex-1 flex flex-col justify-between px-6 pt-5 pb-6">
          <div className="space-y-3">
            {/* 1-Tap Google Login */}
            <button
              id="btn-google-login"
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full h-12 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-[#252524] rounded-2xl px-4 shadow-sm border border-slate-300 flex items-center justify-between cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Continuar con Google
                  </span>
                </div>
              </div>
              <span className="bg-[#1E70BA]/10 text-[#1E70BA] text-[10px] font-black px-2 py-0.5 rounded-full">
                Rápido
              </span>
            </button>

            {/* Quick Demo Login (Special for senior/adult users) */}
            <button
              id="btn-quick-login"
              type="button"
              disabled={loading}
              onClick={handleQuickLogin}
              className="w-full bg-[#EAF3FA] hover:bg-[#DEECF8] active:scale-[0.98] transition-all text-[#1E70BA] rounded-2xl p-3 border border-[#1E70BA]/20 flex items-center justify-between text-left cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E70BA] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-[#1E70BA] tracking-wider block">
                    Modo Demostración
                  </span>
                  <p className="text-xs font-bold text-slate-800">Abrir tienda de prueba Don Lucho</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-lg text-[#1E70BA]">arrow_forward</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">o con tu teléfono</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Credentials Inputs */}
            <div className="space-y-2">
              <div className="flex items-center bg-[#F6F8FA] dark:bg-[#20252D] border-2 border-slate-200 dark:border-slate-700 rounded-2xl h-12 px-3.5 focus-within:border-[#1E70BA] focus-within:bg-white dark:focus-within:bg-[#252D37] transition-all">
                <span className="material-symbols-outlined text-slate-400 text-lg mr-2">phone_android</span>
                <input
                  id="user-identity"
                  name="identity"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="Teléfono o email (ej. 77012345)"
                  className="w-full bg-transparent border-none text-[#252524] dark:text-white placeholder-slate-400 text-sm font-semibold focus:ring-0 focus:outline-none"
                  type="text"
                />
              </div>

              <div className="flex items-center bg-[#F6F8FA] dark:bg-[#20252D] border-2 border-slate-200 dark:border-slate-700 rounded-2xl h-12 px-3.5 focus-within:border-[#1E70BA] focus-within:bg-white dark:focus-within:bg-[#252D37] transition-all">
                <span className="material-symbols-outlined text-slate-400 text-lg mr-2">lock</span>
                <input
                  id="password-input"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="PIN o contraseña (ej. 1234)"
                  className="w-full bg-transparent border-none text-[#252524] dark:text-white placeholder-slate-400 text-sm font-semibold focus:ring-0 focus:outline-none"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  aria-label="Ver u ocultar contraseña"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 space-y-2.5 text-center">
            {/* Primary Action Button (Matches Mockup Screen 1) */}
            <button
              id="btn-login"
              type="button"
              disabled={loading}
              onClick={handleStandardLogin}
              className="w-full h-12 bg-[#1E70BA] hover:bg-[#165A98] active:scale-[0.98] text-white text-base font-bold rounded-2xl flex items-center justify-center shadow-lg shadow-[#1E70BA]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>

            <button
              id="btn-open-register"
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full h-12 bg-white border-2 border-slate-200 hover:border-[#1E70BA] hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-sm font-bold rounded-2xl flex items-center justify-center transition-all cursor-pointer"
            >
              Crear cuenta
            </button>

            <button
              type="button"
              onClick={() => showToast('Para recuperar tu PIN, contacta soporte o usa la entrada rápida.', 'info')}
              className="text-xs font-semibold text-slate-500 hover:text-[#1E70BA] transition-colors py-1 cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </main>

        {/* Modal: Registro de Tienda */}
        <div
          id="modal-register"
          className={`fixed sm:absolute inset-0 z-50 flex items-end sm:items-center justify-center transition-opacity duration-200 ${
            showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none hidden'
          }`}
        >
          <div
            id="modal-backdrop"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full max-w-[414px] bg-white rounded-t-[2.5rem] sm:rounded-3xl p-6 shadow-2xl z-10 border-t border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden"></div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EAF3FA] flex items-center justify-center text-[#1E70BA]">
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#252524] leading-tight">
                    Crear cuenta en Metrika
                  </h3>
                  <p className="text-xs text-slate-500">Registra tu tienda en 1 minuto</p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-modal"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form
              id="form-register"
              className="space-y-3.5"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitRegister();
              }}
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="reg-shop-name">
                  Nombre de la tienda
                </label>
                <div className="flex items-center bg-[#F6F8FA] rounded-2xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#1E70BA] focus-within:bg-white">
                  <span className="material-symbols-outlined text-slate-400 text-lg mr-2">store</span>
                  <input
                    id="reg-shop-name"
                    type="text"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="Ej: Tienda Don Lucho / Abarrotes Mary"
                    className="w-full bg-transparent text-sm text-[#252524] placeholder-slate-400 border-none p-0 focus:ring-0 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="reg-owner-name">
                  Nombre del dueño / comerciante
                </label>
                <div className="flex items-center bg-[#F6F8FA] rounded-2xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#1E70BA] focus-within:bg-white">
                  <span className="material-symbols-outlined text-slate-400 text-lg mr-2">person</span>
                  <input
                    id="reg-owner-name"
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="Ej: Doña María Mendoza"
                    className="w-full bg-transparent text-sm text-[#252524] placeholder-slate-400 border-none p-0 focus:ring-0 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="reg-phone">
                  Celular / WhatsApp (Bolivia)
                </label>
                <div className="flex items-center bg-[#F6F8FA] rounded-2xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#1E70BA] focus-within:bg-white">
                  <span className="text-xs font-bold text-[#1E70BA] mr-2">🇧🇴 +591</span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="77012345"
                    className="w-full bg-transparent text-sm text-[#252524] placeholder-slate-400 border-none p-0 focus:ring-0 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="reg-pin">
                  Crear PIN fácil de 4 números
                </label>
                <div className="flex items-center bg-[#F6F8FA] rounded-2xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#1E70BA] focus-within:bg-white">
                  <span className="material-symbols-outlined text-slate-400 text-lg mr-2">pin</span>
                  <input
                    id="reg-pin"
                    type="password"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="Ej: 1234"
                    className="w-full bg-transparent text-sm text-[#252524] placeholder-slate-400 border-none p-0 focus:ring-0 focus:outline-none font-bold tracking-widest"
                  />
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Con este PIN podrás ingresar rápido sin recordar contraseñas largas.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  id="btn-submit-register"
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitRegister}
                  className="w-full h-12 bg-[#1E70BA] hover:bg-[#165A98] active:scale-[0.98] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#1E70BA]/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  {loading ? 'Creando cuenta...' : 'Registrar mi tienda gratis'}
                </button>
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full h-10 bg-transparent text-slate-500 hover:text-slate-800 text-xs font-bold rounded-2xl flex items-center justify-center transition-colors cursor-pointer"
                >
                  Ya tengo cuenta / Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};