import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { ProductScanModal } from '../components/ProductScanModal';
import { VoiceRecorderModal } from '../components/VoiceRecorderModal';
import { getTodayDateStr, getYesterdayDateStr } from '../utils/dateUtils';

export const InicioScreen: React.FC = () => {
  const {
    user,
    storeInfo,
    products,
    transactions,
    recordSale,
    recordDirectSale,
    recordPurchase,
    recordExpense,
    deleteTransaction,
    showToast,
    setShowTutorial,
    setCurrentScreen,
    setShowAccountModal,
  } = useStore();

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showProductScanModal, setShowProductScanModal] = useState(false);
  const [productScanMode, setProductScanMode] = useState<'venta' | 'inventario'>('venta');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Streamlined 2-Step Sale State
  const [saleStep, setSaleStep] = useState<1 | 2>(1);
  const [saleType, setSaleType] = useState<'producto' | 'monto'>('producto');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [saleQty, setSaleQty] = useState(1);
  const [customSaleAmount, setCustomSaleAmount] = useState('');
  const [customSaleTitle, setCustomSaleTitle] = useState('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo');
  const [saleIsFiado, setSaleIsFiado] = useState(false);
  const [saleFiadoClient, setSaleFiadoClient] = useState('');

  // Quick Purchase State
  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('Abarrotes');

  // Quick Expense State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Servicios (Luz/Agua)');

  // Daily Dynamic Balance (Real-time synced with saved transactions)
  const todayDate = getTodayDateStr();
  const yesterdayDate = getYesterdayDateStr();

  const todayTxs = transactions.filter((t) => t.date === todayDate);
  const yesterdayTxs = transactions.filter((t) => t.date === yesterdayDate);

  const todayVentas = todayTxs
    .filter((t) => t.type === 'venta')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayCompras = todayTxs
    .filter((t) => t.type === 'compra')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayGastosDirectos = todayTxs
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSalidasHoy = todayCompras + todayGastosDirectos;

  const yesterdayVentas = yesterdayTxs
    .filter((t) => t.type === 'venta')
    .reduce((sum, t) => sum + t.amount, 0);
  const yesterdaySalidas = yesterdayTxs
    .filter((t) => t.type === 'gasto' || t.type === 'compra')
    .reduce((sum, t) => sum + t.amount, 0);

  const balanceHoy = todayVentas - totalSalidasHoy;
  const balanceAyer = yesterdayVentas - yesterdaySalidas;

  // Real Percentage Comparisons vs Yesterday
  const calcTrend = (todayVal: number, yesterdayVal: number) => {
    if (yesterdayVal === 0 && todayVal === 0) return '0% vs. ayer';
    if (yesterdayVal === 0) return '+100% vs. ayer';
    const diff = ((todayVal - yesterdayVal) / Math.abs(yesterdayVal)) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs. ayer`;
  };

  const ventasTrend = calcTrend(todayVentas, yesterdayVentas);
  const gastosTrend = calcTrend(totalSalidasHoy, yesterdaySalidas);
  const ingresosTrend = calcTrend(balanceHoy, balanceAyer);

  // Cash Register State
  const cashStorageKey = `metrika_initial_cash_${user?.id || 'demo'}`;
  const [initialCashRegister, setInitialCashRegister] = useState<number>(() => {
    const saved = localStorage.getItem(cashStorageKey);
    if (saved !== null) return parseFloat(saved) || 0;
    return user?.id === 'user-demo' ? 350 : 0;
  });
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashInput, setCashInput] = useState(String(initialCashRegister));

  useEffect(() => {
    const key = `metrika_initial_cash_${user?.id || 'demo'}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      const parsed = parseFloat(saved) || 0;
      setInitialCashRegister(parsed);
      setCashInput(String(parsed));
    } else {
      const def = user?.id === 'user-demo' ? 350 : 0;
      setInitialCashRegister(def);
      setCashInput(String(def));
    }
  }, [user?.id]);

  const efectivoEnCaja = initialCashRegister + balanceHoy;

  const handleSaveInitialCash = () => {
    const val = parseFloat(cashInput);
    if (!isNaN(val) && val >= 0) {
      setInitialCashRegister(val);
      localStorage.setItem(`metrika_initial_cash_${user?.id || 'demo'}`, String(val));
      setShowCashModal(false);
      showToast(`Fondo de caja actualizado: Bs. ${val.toFixed(2)}`, 'success');
    } else {
      showToast('Introduce un monto válido', 'warning');
    }
  };

  // Helper for chosen product in step 1
  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Calculated current sale subtotal
  const currentSaleSubtotal =
    saleType === 'monto'
      ? parseFloat(customSaleAmount) || 0
      : (selectedProduct?.price || 10) * saleQty;

  // Confirm streamlined sale (Step 2 -> Confirm)
  const handleConfirmStreamlinedSale = () => {
    if (saleType === 'monto') {
      const amt = parseFloat(customSaleAmount);
      if (isNaN(amt) || amt <= 0) {
        showToast('Por favor introduce un monto válido mayor a 0 Bs.', 'warning');
        return;
      }
      const title = customSaleTitle.trim() || 'Venta rápida de mostrador';
      const finalTitle = saleIsFiado && saleFiadoClient.trim() ? `${title} (Fiado a ${saleFiadoClient.trim()})` : title;
      recordDirectSale(finalTitle, amt, 'Venta Rápida');
    } else {
      if (!selectedProduct) {
        showToast('Por favor selecciona un producto', 'warning');
        return;
      }
      const title = saleIsFiado && saleFiadoClient.trim()
        ? `${selectedProduct.name} (Fiado a ${saleFiadoClient.trim()})`
        : selectedProduct.name;
      recordSale(selectedProduct.id, saleQty, title, selectedProduct.price * saleQty);
    }

    showToast(`¡Venta registrada con éxito! +Bs. ${currentSaleSubtotal.toFixed(2)}`, 'success');
    setShowSaleModal(false);
    // Reset state
    setSaleStep(1);
    setSaleQty(1);
    setCustomSaleAmount('');
    setCustomSaleTitle('');
    setSaleIsFiado(false);
    setSaleFiadoClient('');
  };

  // Confirm Quick Purchase
  const handleConfirmPurchase = () => {
    const amt = parseFloat(purchaseAmount);
    if (!purchaseTitle.trim() || isNaN(amt) || amt <= 0) {
      showToast('Completa el concepto y un monto válido en Bs.', 'warning');
      return;
    }
    recordPurchase(purchaseTitle.trim(), amt, purchaseCategory);
    setShowPurchaseModal(false);
    setPurchaseTitle('');
    setPurchaseAmount('');
    showToast(`Compra guardada: -Bs. ${amt.toFixed(2)}`, 'info');
  };

  // Confirm Quick Expense
  const handleConfirmExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) {
      showToast('Completa el motivo y un monto válido en Bs.', 'warning');
      return;
    }
    recordExpense(expenseTitle.trim(), amt, expenseCategory);
    setShowExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount('');
    showToast(`Gasto registrado: -Bs. ${amt.toFixed(2)}`, 'info');
  };

  // Interactive Quick Demo Test Runner
  const handleRunQuickDemo = () => {
    const sampleItems = [
      { name: '2 Coca-Cola 2L', amount: 26, category: 'Refrescos' },
      { name: '1 Kilo de Arroz y Aceite', amount: 20, category: 'Abarrotes' },
      { name: '3 Paquetes de Galletas', amount: 15, category: 'Abarrotes' },
    ];
    const pick = sampleItems[Math.floor(Math.random() * sampleItems.length)];
    recordDirectSale(`[Ejemplo] ${pick.name}`, pick.amount, pick.category);
    showToast(`¡Ejemplo registrado! +Bs. ${pick.amount.toFixed(2)} añadidos a tu caja.`, 'success');
  };

  // Friendly Bolivian Greeting Name
  const ownerGreetingName = storeInfo.owner
    ? (storeInfo.owner.startsWith('Doña ') || storeInfo.owner.startsWith('Don ')
        ? storeInfo.owner.split(' ').slice(0, 2).join(' ')
        : storeInfo.owner.split(' ')[0])
    : (user?.name || 'Comerciante');

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const userAvatar = user?.avatarUrl || storeInfo.logoUrl || storeInfo.avatarUrl;

  return (
    <div className="bg-[#F6F8FA] dark:bg-[#13171D] text-[#252524] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Inicio" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-4">
        {/* Top Greeting with User Profile Avatar */}
        <section className="pt-1 px-1 flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#252524] dark:text-white leading-tight">
              ¡Hola, {ownerGreetingName}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              Así va tu negocio hoy
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2B7BBE] to-[#1D649D] p-0.5 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 transition-transform shrink-0"
            title="Mi perfil y tema"
          >
            <div className="w-full h-full rounded-[14px] overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={user?.name || 'Perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-[#2B7BBE] dark:text-[#60A5FA] text-2xl">
                  account_circle
                </span>
              )}
            </div>
          </button>
        </section>

        {/* 1. HERO CASH CARD: DINERO EN CAJA HOY (Paleta Oficial Metrika: Azul #2B7BBE, Verde #B0CC5D, Coral #EE754C) */}
        <section className="bg-gradient-to-br from-[#2B7BBE] via-[#2470AE] to-[#1C5B8F] text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-blue-400/20 relative overflow-hidden">
          {/* Top row inside card: Status + Base button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B0CC5D] animate-pulse shadow-[0_0_8px_rgba(176,204,93,0.9)] shrink-0"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-white/95 truncate">
                DINERO EN CAJA HOY
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCashInput(String(initialCashRegister));
                setShowCashModal(true);
              }}
              title="Toca para ajustar el fondo de caja inicial"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white backdrop-blur-sm transition-all cursor-pointer active:scale-95 border border-white/20 shrink-0"
            >
              <span>Base: Bs. {initialCashRegister.toFixed(0)}</span>
              <span className="material-symbols-outlined text-xs">tune</span>
            </button>
          </div>

          {/* Big Amount */}
          <div className="mt-3 mb-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Bs. {efectivoEnCaja >= 0 ? efectivoEnCaja.toFixed(2) : `(${Math.abs(efectivoEnCaja).toFixed(2)})`}
            </h1>
            <p className="text-xs text-white/90 font-medium mt-0.5">
              Efectivo disponible para dar cambio y pagar
            </p>
          </div>

          {/* Divider */}
          <div className="my-3 border-t border-white/20"></div>

          {/* 3 Summary Columns inside Card: + VENTAS, - COMPRAS, - GASTOS */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs flex flex-col justify-center border border-white/10">
              <span className="text-[10px] font-black uppercase text-[#B0CC5D] tracking-wider truncate">
                + VENTAS
              </span>
              <span className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                Bs. {todayVentas.toFixed(0)}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs flex flex-col justify-center border border-white/10">
              <span className="text-[10px] font-black uppercase text-amber-200 tracking-wider truncate">
                - COMPRAS
              </span>
              <span className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                Bs. {todayCompras.toFixed(0)}
              </span>
            </div>

            <div className="p-2 rounded-2xl bg-white/10 backdrop-blur-xs flex flex-col justify-center border border-white/10">
              <span className="text-[10px] font-black uppercase text-[#EE754C] tracking-wider truncate">
                - GASTOS
              </span>
              <span className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                Bs. {todayGastosDirectos.toFixed(0)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. ¿CÓMO DESEAS REGISTRAR? (Diseño limpio, sin elementos cortados y con paleta de marca) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-[#252524] dark:text-slate-200 uppercase tracking-wider">
              ¿CÓMO DESEAS REGISTRAR?
            </h3>
            <span className="text-[11px] font-bold text-[#EE754C] dark:text-orange-400">
              1 Toque para iniciar
            </span>
          </div>

          {/* 3 HERO ACTION CARDS - Cada tarjeta con su color de marca completo para identificarla al instante */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* OPCIÓN 1: CON CÁMARA (100% Naranja / Coral de acción) */}
            <button
              type="button"
              onClick={() => {
                setProductScanMode('venta');
                setShowProductScanModal(true);
              }}
              className="bg-gradient-to-br from-[#EE754C] via-[#EE754C] to-[#DC592E] hover:brightness-105 active:scale-95 text-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-between text-center shadow-md shadow-orange-600/25 border border-orange-300/40 transition-all cursor-pointer min-h-[142px] sm:min-h-[152px] overflow-hidden group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs shadow-xs group-hover:scale-105 transition-transform mt-0.5 shrink-0 border border-white/25">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">photo_camera</span>
              </div>
              <div className="my-1 w-full px-0.5">
                <span className="text-[12px] sm:text-xs font-black text-white leading-tight block truncate drop-shadow-xs">
                  Con Cámara
                </span>
                <span className="text-[10px] text-white/90 font-semibold block mt-0.5 truncate">
                  Foto mostrador
                </span>
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/35 backdrop-blur-xs leading-tight">
                IA RÁPIDA
              </span>
            </button>

            {/* OPCIÓN 2: POR VOZ (100% Verde Limón oficial de marca) */}
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="bg-gradient-to-br from-[#8EA838] via-[#859E30] to-[#728A25] hover:brightness-105 active:scale-95 text-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-between text-center shadow-md shadow-lime-900/25 border border-lime-300/40 transition-all cursor-pointer min-h-[142px] sm:min-h-[152px] overflow-hidden group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs shadow-xs group-hover:scale-105 transition-transform mt-0.5 shrink-0 border border-white/25">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">mic</span>
              </div>
              <div className="my-1 w-full px-0.5">
                <span className="text-[12px] sm:text-xs font-black text-white leading-tight block truncate drop-shadow-xs">
                  Por Voz
                </span>
                <span className="text-[10px] text-white/90 font-semibold block mt-0.5 truncate">
                  Di lo que vendes
                </span>
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/35 backdrop-blur-xs leading-tight">
                AUTOMÁTICO
              </span>
            </button>

            {/* OPCIÓN 3: VENTA 2 PASOS (100% Azul Metrika oficial de marca) */}
            <button
              type="button"
              onClick={() => {
                setSaleStep(1);
                setSaleType('producto');
                setSaleQty(1);
                setCustomSaleAmount('');
                setShowSaleModal(true);
              }}
              className="bg-gradient-to-br from-[#2B7BBE] via-[#2470AE] to-[#1C5B8F] hover:brightness-105 active:scale-95 text-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-between text-center shadow-md shadow-blue-600/25 border border-blue-300/40 transition-all cursor-pointer min-h-[142px] sm:min-h-[152px] overflow-hidden group"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center backdrop-blur-xs shadow-xs group-hover:scale-105 transition-transform mt-0.5 shrink-0 border border-white/25">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">point_of_sale</span>
              </div>
              <div className="my-1 w-full px-0.5">
                <span className="text-[12px] sm:text-xs font-black text-white leading-tight block truncate drop-shadow-xs">
                  Venta 2 Pasos
                </span>
                <span className="text-[10px] text-white/90 font-semibold block mt-0.5 truncate">
                  Toca y cobra
                </span>
              </div>
              <span className="text-[8px] sm:text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/35 backdrop-blur-xs leading-tight">
                MANUAL
              </span>
            </button>
          </div>

          {/* TWO QUICK ACTION BUTTONS: + Anotar Compra / - Anotar Gasto (Luz) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => setShowPurchaseModal(true)}
              className="h-12 px-3 bg-white dark:bg-[#1A1F26] hover:bg-orange-50/40 dark:hover:bg-slate-800 text-[#252524] dark:text-white rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-[#EE754C] text-xl group-hover:scale-110 transition-transform">
                local_shipping
              </span>
              <span className="text-xs font-black truncate">
                + Anotar Compra
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="h-12 px-3 bg-white dark:bg-[#1A1F26] hover:bg-rose-50/40 dark:hover:bg-slate-800 text-[#252524] dark:text-white rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all group"
            >
              <span className="material-symbols-outlined text-rose-500 text-xl group-hover:scale-110 transition-transform">
                receipt_long
              </span>
              <span className="text-xs font-black truncate">
                - Anotar Gasto (Luz)
              </span>
            </button>
          </div>
        </section>

        {/* 3. SIMULADOR DE PRUEBA RÁPIDO */}
        <section className="bg-gradient-to-r from-[#EAF3FA] to-[#F4F8E8] dark:from-[#1E293B] dark:to-[#1B2F23] rounded-2xl p-3.5 border border-blue-200/60 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#2B7BBE] text-white flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl font-bold">play_arrow</span>
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-[#252524] dark:text-white truncate">
                ¿Quieres probar cómo funciona?
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                Simula una venta de ejemplo y mira cómo sube tu caja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunQuickDemo}
            className="px-3 py-2 bg-[#2B7BBE] hover:bg-[#1D649D] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            Probar
          </button>
        </section>

        {/* 4. MOVIMIENTOS DE HOY */}
        <section className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Movimientos de Hoy ({todayTxs.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="text-[11px] font-bold text-[#1E70BA] dark:text-[#60A5FA] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">help</span>
              <span>Ayuda</span>
            </button>
          </div>

          {todayTxs.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1F26] rounded-2xl p-6 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#EAF2F9] dark:bg-[#1E293B] text-[#1E70BA] dark:text-[#60A5FA] flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                Aún no tienes ventas registradas hoy
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Toca <strong>Cámara</strong>, <strong>Voz</strong> o <strong>Registrar Venta</strong> arriba para anotar tu primer cobro.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-[#1A1F26] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        tx.type === 'venta'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : tx.type === 'compra'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {tx.type === 'venta' ? 'point_of_sale' : tx.type === 'compra' ? 'local_shipping' : 'receipt'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {tx.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {tx.time || 'Hoy'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tx.paymentMethod === 'qr' ? '📱 QR' : '💵 Efectivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-black ${
                        tx.type === 'venta'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'venta' ? '+' : '-'}Bs. {tx.amount.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTransaction(tx.id);
                        showToast('Movimiento eliminado', 'info');
                      }}
                      className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                      title="Eliminar registro"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ================= MODAL: REGISTRAR VENTA ================= */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            {/* Modal Header in Brand Blue */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#1E70BA] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">
                    Registrar venta
                  </h3>
                  <span className="text-[11px] font-bold text-[#EE6B4D]">
                    {saleStep === 1 ? 'Paso 1: Producto y cantidad' : 'Paso 2: Total y método de pago'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-black flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* PASO 1: SELECCIONAR QUÉ SE VENDIÓ */}
            {saleStep === 1 && (
              <div className="space-y-4">
                {/* Tabs: Producto de tienda vs Monto directo */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setSaleType('producto')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      saleType === 'producto'
                        ? 'bg-[#1E70BA] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Productos de Tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleType('monto')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      saleType === 'monto'
                        ? 'bg-[#1E70BA] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Monto Directo (Bs.)
                  </button>
                </div>

                {saleType === 'producto' ? (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      Producto *
                    </span>

                    {/* Selector de producto con fotos/iconos */}
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {products.map((p) => {
                        const isSelected = p.id === selectedProductId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProductId(p.id)}
                            className={`p-3 rounded-2xl text-left border-2 transition-all cursor-pointer active:scale-95 flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#EAF2F9] dark:bg-[#1E293B] border-[#1E70BA] shadow-md scale-[1.02]'
                                : 'bg-white dark:bg-[#20252D] border-slate-200 dark:border-slate-700 hover:border-slate-400'
                            }`}
                          >
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate block">
                              {p.name}
                            </span>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-sm font-black text-[#EE6B4D]">
                                Bs. {p.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                /{p.unit}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepper de cantidad para el producto seleccionado */}
                    {selectedProduct && (
                      <div className="bg-[#F6F8FA] dark:bg-[#20252D] p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Cantidad:
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            {selectedProduct.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-black text-lg active:scale-95 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black text-base text-slate-900 dark:text-white">
                            {saleQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSaleQty(saleQty + 1)}
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-black text-lg active:scale-95 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-600"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Monto Directo */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        ¿Qué se vendió? (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Pan dulce, recarga, refrescos..."
                        value={customSaleTitle}
                        onChange={(e) => setCustomSaleTitle(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Monto a Cobrar (Bs.) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                          Bs.
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={customSaleAmount}
                          onChange={(e) => setCustomSaleAmount(e.target.value)}
                          className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-xl font-black text-[#EE6B4D] focus:outline-none focus:border-[#1E70BA]"
                        />
                      </div>
                    </div>

                    {/* Atajos de montos rápidos */}
                    <div className="flex gap-1.5 pt-1">
                      {[5, 10, 15, 20, 50].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomSaleAmount(String(amt))}
                          className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-[#EAF2F9] text-xs font-extrabold rounded-lg text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        >
                          {amt}Bs
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón para avanzar a Paso 2 */}
                <button
                  type="button"
                  onClick={() => {
                    if (saleType === 'monto' && (!customSaleAmount || parseFloat(customSaleAmount) <= 0)) {
                      showToast('Ingresa un monto válido en Bs.', 'warning');
                      return;
                    }
                    setSaleStep(2);
                  }}
                  className="w-full h-13 mt-2 bg-[#1E70BA] hover:bg-[#165A98] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <span>Siguiente: Método de Pago (Bs. {currentSaleSubtotal.toFixed(2)})</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            )}

            {/* PASO 2: MÉTODO DE PAGO Y CONFIRMACIÓN */}
            {saleStep === 2 && (
              <div className="space-y-4">
                {/* Banner Total de la venta */}
                <div className="bg-[#FBF6E9] dark:bg-[#2C3119] border-2 border-[#9EC84A]/60 rounded-2xl p-4 text-center">
                  <span className="text-xs uppercase font-bold text-[#86A334] dark:text-[#A7CC44] block">
                    Total de la venta
                  </span>
                  <span className="text-3xl font-black text-slate-900 dark:text-white block my-1">
                    Bs. {currentSaleSubtotal.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {saleType === 'producto' ? `${saleQty}x ${selectedProduct.name}` : (customSaleTitle || 'Venta rápida')}
                  </span>
                </div>

                {/* Selector de Método de pago */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Método de pago *
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSalePaymentMethod('efectivo');
                        setSaleIsFiado(false);
                      }}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        salePaymentMethod === 'efectivo' && !saleIsFiado
                          ? 'bg-[#EBF5EC] dark:bg-[#1B2F23] border-[#2D8A4E] text-[#2D8A4E] dark:text-emerald-300 shadow-xs ring-2 ring-[#9EC84A]/30'
                          : 'bg-white dark:bg-[#20252D] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">payments</span>
                      <span className="font-bold text-[11px]">Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSalePaymentMethod('tarjeta');
                        setSaleIsFiado(false);
                      }}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        salePaymentMethod === 'tarjeta' && !saleIsFiado
                          ? 'bg-[#EAF2F9] dark:bg-[#162738] border-[#1E70BA] text-[#1E70BA] dark:text-[#60A5FA] shadow-xs'
                          : 'bg-white dark:bg-[#20252D] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">credit_card</span>
                      <span className="font-bold text-[11px]">Tarjeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSalePaymentMethod('transferencia');
                        setSaleIsFiado(false);
                      }}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        salePaymentMethod === 'transferencia' && !saleIsFiado
                          ? 'bg-[#EAF2F9] dark:bg-[#162738] border-[#1E70BA] text-[#1E70BA] dark:text-[#60A5FA] shadow-xs'
                          : 'bg-white dark:bg-[#20252D] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
                      <span className="font-bold text-[11px]">QR / Transf.</span>
                    </button>
                  </div>
                </div>

                {/* Venta Fiada / Crédito */}
                <div className="p-3 bg-slate-50 dark:bg-[#20252D] rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saleIsFiado}
                      onChange={(e) => setSaleIsFiado(e.target.checked)}
                      className="w-4 h-4 text-[#EE6B4D] rounded focus:ring-[#EE6B4D]"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      ¿Es venta fiada (a crédito)?
                    </span>
                  </label>

                  {saleIsFiado && (
                    <input
                      type="text"
                      placeholder="Nombre del cliente (ej: Don Pedro, Sra. María)"
                      value={saleFiadoClient}
                      onChange={(e) => setSaleFiadoClient(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1A1F26] text-xs font-bold text-slate-900 dark:text-white"
                    />
                  )}
                </div>

                {/* Primary CTA Button in Brand Coral */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmStreamlinedSale}
                    className="w-full h-13 bg-[#EE6B4D] hover:bg-[#D65538] text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#EE6B4D]/30 active:scale-98 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                    <span>Registrar venta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleStep(1)}
                    className="w-full h-10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                  >
                    ← Volver a cambiar producto o monto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: COMPRA MERCADERÍA ================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                </div>
                <h3 className="font-black text-base">Compra de Mercadería</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ¿Qué compraste?
              </label>
              <input
                type="text"
                placeholder="Ej: 1 caja aceite, 10 bolsas arroz"
                value={purchaseTitle}
                onChange={(e) => setPurchaseTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Pagado al Proveedor (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs.
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-lg font-black text-amber-700 dark:text-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="w-full h-12 bg-[#1E70BA] hover:bg-[#165A98] text-white font-black text-sm rounded-xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span>Guardar Compra</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="w-full h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GASTO DE CAJA ================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                </div>
                <h3 className="font-black text-base">Registrar Gasto de Caja</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo del Gasto
              </label>
              <input
                type="text"
                placeholder="Ej: Pago de luz, bolsas, flete taxi"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monto Retirado de Caja (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs.
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-lg font-black text-rose-600 dark:text-rose-400"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmExpense}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">remove_circle</span>
                <span>Restar Gasto de Caja</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-full h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AJUSTAR FONDO DE CAJA ================= */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EAF2F9] dark:bg-[#1E293B] text-[#1E70BA] dark:text-[#60A5FA] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
                <h3 className="font-black text-base">Fondo de Caja Inicial</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Define con cuánto dinero en efectivo comenzaste tu día en el mostrador para dar cambio.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Monto en Efectivo Base (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  Bs.
                </span>
                <input
                  type="number"
                  step="any"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-lg font-black text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveInitialCash}
                className="w-full h-11 bg-[#1E70BA] hover:bg-[#165A98] text-white font-black text-xs rounded-xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>Guardar Fondo de Caja</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-full h-9 text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECONOCIMIENTO CON CÁMARA */}
      <ProductScanModal
        isOpen={showProductScanModal}
        onClose={() => setShowProductScanModal(false)}
        initialMode={productScanMode}
      />

      {/* MODAL RECONOCIMIENTO POR VOZ */}
      <VoiceRecorderModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />

      <BottomNav />
    </div>
  );
};