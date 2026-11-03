import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';

export const IngresoScreen: React.FC = () => {
  const { login, registerUser, showToast } = useStore();
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
    <div className="min-h-[100dvh] bg-[#241a16] flex justify-center items-center p-0 sm:p-4 select-none">
      <div
        className="relative w-full max-w-[414px] min-h-[100dvh] sm:min-h-[780px] sm:max-h-[920px] bg-[#bd532b] flex flex-col justify-between overflow-y-auto shadow-2xl sm:rounded-[46px] border-0 sm:border-[8px] sm:border-stone-800 pt-4 pb-2"
        data-purpose="mobile-viewport"
      >
        {/* Brand Hero */}
        <section aria-label="Identidad de marca" className="flex flex-col items-center justify-center pt-4 pb-3 px-6 text-center z-10">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#fceede] flex items-center justify-center shadow-lg mb-3">
            <svg aria-label="Icono de tiendita de barrio Metrika" className="w-22 h-22 sm:w-26 sm:h-26 fill-[#bd532b]" role="img" viewBox="0 0 100 100">
              <path d="M 28 20 C 24 20 22 25 21 29 L 16 38 C 14 43 17 48 22 48 C 26 48 28 44 31 40 C 34 44 38 48 43 48 C 47 48 50 44 53 40 C 56 44 60 48 65 48 C 69 48 72 44 75 40 C 78 44 82 48 87 48 C 91 48 94 43 92 38 L 87 29 C 86 25 84 20 80 20 Z" />
              <path d="M 24 45 L 24 74 L 84 74 L 84 45 C 81 47 77 48 74 48 C 69 48 65 45 63 43 C 60 45 56 48 51 48 C 46 48 43 45 40 43 C 37 45 33 48 29 48 C 27 48 25 47 24 45 Z M 31 54 L 77 54 L 77 68 L 31 68 Z" />
              <rect height="6.5" rx="3.25" width="78" x="15" y="74" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-display mb-1 drop-shadow-sm">
            Metrika
          </h1>
          <p className="text-white/95 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase mb-2">
            HOLA AL CONTROL TOTAL
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-black/15 backdrop-blur-sm rounded-full text-white/90 text-[11px] font-medium border border-white/10">
            <span>🇧🇴 Hecho para tienditas y almacenes de Bolivia</span>
          </div>
        </section>

        {/* Form and actions */}
        <main className="w-full flex flex-col justify-end">
          {/* Quick Login button (sin clave / demo) */}
          <div className="px-7 mb-3">
            <button
              id="btn-quick-login"
              type="button"
              disabled={loading}
              onClick={handleQuickLogin}
              className="group relative w-full bg-gradient-to-r from-[#ffe4cb] to-[#fceede] hover:from-[#ffeedf] hover:to-[#fff5ea] active:scale-[0.98] transition-all text-[#2c1e19] rounded-2xl p-3 shadow-lg border border-white/40 flex items-center justify-between text-left cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#bd532b] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl font-bold">bolt</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#bd532b] uppercase tracking-wider">
                      Entrada Rápida
                    </span>
                    <span className="bg-[#bd532b]/15 text-[#bd532b] text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                      Demo Don Lucho
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#3d271e]">Abrir tienda Don Lucho (1 clic)</p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center text-[#bd532b] group-hover:translate-x-0.5 transition-transform">
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </div>
            </button>
          </div>

          {/* Credentials Inputs */}
          <div className="px-7 space-y-2.5 mb-4" data-purpose="credentials-form">
            <div className="relative flex items-center bg-transparent border-2 border-white/90 rounded-full h-12 py-2 px-4 shadow-sm focus-within:ring-2 focus-within:ring-white">
              <div className="flex items-center pl-1 pr-2 text-white/90">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" fillRule="evenodd" />
                </svg>
              </div>
              <input
                id="user-identity"
                name="identity"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Teléfono o email (ej. 77012345)"
                className="w-full bg-transparent border-none text-white placeholder-white/75 text-sm font-normal focus:ring-0 focus:outline-none px-2"
                type="text"
              />
            </div>

            <div className="relative flex items-center bg-transparent border-2 border-white/90 rounded-full h-12 py-2 px-4 shadow-sm focus-within:ring-2 focus-within:ring-white">
              <div className="flex items-center pl-1 pr-2 text-white/90">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  <path clipRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" fillRule="evenodd" />
                </svg>
              </div>
              <input
                id="password-input"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="PIN o contraseña (ej. 1234)"
                className="w-full bg-transparent border-none text-white placeholder-white/75 text-sm font-normal focus:ring-0 focus:outline-none px-2"
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/80 hover:text-white p-1.5 focus:outline-none cursor-pointer"
                aria-label="Ver u ocultar contraseña"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Sheet Card */}
          <section
            aria-label="Acciones de cuenta"
            className="bg-[#fceede] rounded-t-[2.5rem] pt-5 pb-5 px-7 flex flex-col items-center shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.15)] text-center"
          >
            <button
              id="btn-login"
              type="button"
              disabled={loading}
              onClick={handleStandardLogin}
              className="w-full h-12 py-3 bg-[#bd532b] hover:bg-[#a94822] active:scale-[0.98] text-white text-base font-bold rounded-full flex items-center justify-center shadow-md shadow-[#bd532b]/30 transition-all mb-2.5 tracking-wide cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            <button
              id="btn-open-register"
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full h-12 py-3 bg-transparent border-2 border-[#df9d83] hover:border-[#bd532b] hover:bg-[#fae7d4] active:scale-[0.98] text-[#2c1d17] text-sm sm:text-base font-bold rounded-full flex items-center justify-center transition-all cursor-pointer"
            >
              Crear cuenta para mi tienda
            </button>
          </section>
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

          <div className="relative w-full max-w-[414px] bg-[#fff8f5] rounded-t-[2.5rem] sm:rounded-3xl p-6 shadow-2xl z-10 border-t border-amber-100 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-[#dec0b7] rounded-full mx-auto mb-4 sm:hidden"></div>

            <div className="flex items-center justify-between pb-3 border-b border-[#dec0b7]/40 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#fceede] flex items-center justify-center text-[#bd532b]">
                  <span className="material-symbols-outlined text-xl">storefront</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#2c1e19] leading-tight">
                    Crear cuenta en Metrika
                  </h3>
                  <p className="text-xs text-[#8e6858]">Registra tu tiendita en 1 minuto</p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-modal"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-[#eae1dd]/60 hover:bg-[#eae1dd] text-[#57423b] flex items-center justify-center transition-colors cursor-pointer"
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
                <label className="block text-xs font-bold text-[#57423b] mb-1" htmlFor="reg-shop-name">
                  Nombre de la tienda
                </label>
                <div className="flex items-center bg-[#f5ece8] rounded-2xl px-3.5 py-2.5 border border-[#dec0b7] focus-within:border-[#bd532b]">
                  <span className="material-symbols-outlined text-[#8a726a] text-lg mr-2">store</span>
                  <input
                    id="reg-shop-name"
                    type="text"
                    value={regShopName}
                    onChange={(e) => setRegShopName(e.target.value)}
                    placeholder="Ej: Tienda Don Lucho / Abarrotes Mary"
                    className="w-full bg-transparent text-sm text-[#1f1b19] placeholder-[#8a726a]/70 border-none p-0 focus:ring-0 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#57423b] mb-1" htmlFor="reg-owner-name">
                  Nombre del dueño / comerciante
                </label>
                <div className="flex items-center bg-[#f5ece8] rounded-2xl px-3.5 py-2.5 border border-[#dec0b7] focus-within:border-[#bd532b]">
                  <span className="material-symbols-outlined text-[#8a726a] text-lg mr-2">person</span>
                  <input
                    id="reg-owner-name"
                    type="text"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    placeholder="Ej: Doña María Mendoza"
                    className="w-full bg-transparent text-sm text-[#1f1b19] placeholder-[#8a726a]/70 border-none p-0 focus:ring-0 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#57423b] mb-1" htmlFor="reg-phone">
                  Celular / WhatsApp (Bolivia)
                </label>
                <div className="flex items-center bg-[#f5ece8] rounded-2xl px-3.5 py-2.5 border border-[#dec0b7] focus-within:border-[#bd532b]">
                  <span className="text-xs font-bold text-[#bd532b] mr-2">🇧🇴 +591</span>
                  <input
                    id="reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="77012345"
                    className="w-full bg-transparent text-sm text-[#1f1b19] placeholder-[#8a726a]/70 border-none p-0 focus:ring-0 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#57423b] mb-1" htmlFor="reg-pin">
                  Crear PIN fácil de 4 números
                </label>
                <div className="flex items-center bg-[#f5ece8] rounded-2xl px-3.5 py-2.5 border border-[#dec0b7] focus-within:border-[#bd532b]">
                  <span className="material-symbols-outlined text-[#8a726a] text-lg mr-2">pin</span>
                  <input
                    id="reg-pin"
                    type="password"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="Ej: 1234"
                    className="w-full bg-transparent text-sm text-[#1f1b19] placeholder-[#8a726a]/70 border-none p-0 focus:ring-0 focus:outline-none font-medium tracking-widest"
                  />
                </div>
                <p className="text-[10.5px] text-[#8e6858] mt-1">
                  Con este PIN podrás ingresar rápido sin recordar contraseñas largas.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  id="btn-submit-register"
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitRegister}
                  className="w-full h-12 bg-[#bd532b] hover:bg-[#a3421e] active:scale-[0.98] text-white font-bold text-sm rounded-full flex items-center justify-center gap-2 shadow-md shadow-[#bd532b]/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  {loading ? 'Creando cuenta...' : 'Registrar mi tienda gratis'}
                </button>
                <button
                  id="btn-cancel-modal"
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full h-10 bg-transparent text-[#8e6858] hover:text-[#2c1e19] text-xs font-bold rounded-full flex items-center justify-center transition-colors cursor-pointer"
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
