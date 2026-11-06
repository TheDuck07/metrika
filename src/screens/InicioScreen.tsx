import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { ProductScanModal } from '../components/ProductScanModal';
import { VoiceRecorderModal } from '../components/VoiceRecorderModal';
import { getTodayDateStr } from '../utils/dateUtils';

export const InicioScreen: React.FC = () => {
  const {
    user,
    products,
    transactions,
    recordSale,
    recordDirectSale,
    recordPurchase,
    recordExpense,
    deleteTransaction,
    showToast,
    setShowTutorial,
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
  const [salePaymentMethod, setSalePaymentMethod] = useState<'efectivo' | 'qr'>('efectivo');
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

  // Daily Dynamic Balance
  const todayDate = getTodayDateStr();
  const todayTxs = transactions.filter((t) => t.date === todayDate);
  const todayVentas = todayTxs
    .filter((t) => t.type === 'venta')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayCompras = todayTxs
    .filter((t) => t.type === 'compra')
    .reduce((sum, t) => sum + t.amount, 0);
  const todayGastos = todayTxs
    .filter((t) => t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const balanceHoy = todayVentas - todayCompras - todayGastos;
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
      { name: '2 Coca-Cola 2L', amount: 26, category: 'Bebidas' },
      { name: '1 Kilo de Arroz y Aceite', amount: 20, category: 'Abarrotes' },
      { name: '3 Paquetes de Galletas', amount: 15, category: 'Abarrotes' },
    ];
    const pick = sampleItems[Math.floor(Math.random() * sampleItems.length)];
    recordDirectSale(`[Ejemplo] ${pick.name}`, pick.amount, pick.category);
    showToast(`¡Ejemplo registrado! +Bs. ${pick.amount.toFixed(2)} añadidos a tu caja.`, 'success');

    // Speech synthesis feedback if available
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance(`Venta de ejemplo registrada por ${pick.amount} bolivianos`);
        u.lang = 'es-ES';
        window.speechSynthesis.speak(u);
      } catch {
        // Ignored
      }
    }
  };

  return (
    <div className="bg-[#fff8f5] dark:bg-[#120d0b] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Inicio" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-4">
        {/* 1. HERO BALANCE CARD (Bolivian Terracotta Brand Colors) */}
        <section className="bg-gradient-to-br from-[#bd532b] via-[#a8441f] to-[#8f3614] rounded-3xl p-5 text-white shadow-xl relative overflow-hidden border border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/90 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Dinero en Caja Hoy
            </span>
            <button
              type="button"
              onClick={() => {
                setCashInput(String(initialCashRegister));
                setShowCashModal(true);
              }}
              className="text-[11px] bg-black/25 hover:bg-black/35 backdrop-blur-sm text-white font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer border border-white/15"
              title="Ajustar fondo inicial de caja"
            >
              <span>Base: Bs. {initialCashRegister}</span>
              <span className="material-symbols-outlined text-[13px]">tune</span>
            </button>
          </div>

          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-sm block">
              Bs. {efectivoEnCaja >= 0 ? efectivoEnCaja.toFixed(2) : `(${Math.abs(efectivoEnCaja).toFixed(2)})`}
            </span>
            <span className="text-[11px] text-white/80 font-medium">
              Efectivo disponible para dar cambio y pagar
            </span>
          </div>

          {/* Sub-metrics pill row: Ventas, Compras, Gastos */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                + Ventas
              </span>
              <span className="text-xs sm:text-sm font-black text-white block mt-0.5">
                Bs. {todayVentas.toFixed(0)}
              </span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-xl py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-300 block">
                - Compras
              </span>
              <span className="text-xs sm:text-sm font-black text-white block mt-0.5">
                Bs. {todayCompras.toFixed(0)}
              </span>
            </div>
            <div className="bg-black/20 backdrop-blur-sm rounded-xl py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-300 block">
                - Gastos
              </span>
              <span className="text-xs sm:text-sm font-black text-white block mt-0.5">
                Bs. {todayGastos.toFixed(0)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. HERO PRINCIPALES: CÁMARA, VOZ Y VENTA RÁPIDA (Grandes, Sencillos y con 1 Toque) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-[#57423b] dark:text-stone-300 uppercase tracking-wider">
              ¿Cómo deseas registrar?
            </h2>
            <span className="text-[11px] font-bold text-[#bd532b] dark:text-[#ff9973]">
              1 Toque para iniciar
            </span>
          </div>

          {/* 3 HERO ACTION CARDS (Cámara, Voz, 2 Pasos) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* OPCIÓN 1: CÁMARA CON IA (Mostrador) */}
            <button
              type="button"
              onClick={() => {
                setProductScanMode('venta');
                setShowProductScanModal(true);
              }}
              className="bg-gradient-to-b from-[#1c1917] to-[#2c1e19] dark:from-[#261d19] dark:to-[#171210] hover:scale-[1.02] active:scale-95 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg border-2 border-[#fea619]/40 hover:border-[#fea619] transition-all cursor-pointer min-h-[140px] group"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#fea619] to-[#bd532b] text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[30px]">photo_camera</span>
              </div>
              <span className="text-xs sm:text-sm font-black leading-tight text-white">
                Con Cámara
              </span>
              <span className="text-[10px] text-[#dec0b7] dark:text-stone-300 mt-0.5">
                Foto mostrador
              </span>
              <span className="mt-1.5 text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                IA Rápida
              </span>
            </button>

            {/* OPCIÓN 2: POR VOZ (Dictado Inteligente) */}
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="bg-gradient-to-b from-[#0f4030] to-[#16503d] dark:from-[#113a2d] dark:to-[#0d2820] hover:scale-[1.02] active:scale-95 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg border-2 border-emerald-400/40 hover:border-emerald-400 transition-all cursor-pointer min-h-[140px] group"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[30px]">mic</span>
              </div>
              <span className="text-xs sm:text-sm font-black leading-tight text-white">
                Por Voz
              </span>
              <span className="text-[10px] text-emerald-100 dark:text-emerald-200 mt-0.5">
                Di lo que vendes
              </span>
              <span className="mt-1.5 text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-emerald-300/25 text-emerald-200 border border-emerald-400/40">
                Automático
              </span>
            </button>

            {/* OPCIÓN 3: VENTA EN 2 PASOS (Cobro Rápido en Tienda) */}
            <button
              type="button"
              onClick={() => {
                setSaleStep(1);
                setSaleType('producto');
                setSaleQty(1);
                setCustomSaleAmount('');
                setShowSaleModal(true);
              }}
              className="bg-gradient-to-b from-[#bd532b] to-[#9f3c16] dark:from-[#a9441f] dark:to-[#7e290b] hover:scale-[1.02] active:scale-95 text-white p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg border-2 border-white/20 hover:border-white transition-all cursor-pointer min-h-[140px] group"
            >
              <div className="w-13 h-13 rounded-2xl bg-white/25 text-white flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[30px]">point_of_sale</span>
              </div>
              <span className="text-xs sm:text-sm font-black leading-tight text-white">
                Venta 2 Pasos
              </span>
              <span className="text-[10px] text-white/85 mt-0.5">
                Toca y cobra
              </span>
              <span className="mt-1.5 text-[8.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                Manual
              </span>
            </button>
          </div>

          {/* SECUNDARIOS: COMPRA MERCADERÍA Y GASTOS (Pills discretas) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowPurchaseModal(true)}
              className="py-2.5 px-3 bg-white dark:bg-[#201814] hover:bg-[#fff5ea] dark:hover:bg-[#2b1f1a] border border-[#dec0b7] dark:border-stone-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#2c1e19] dark:text-stone-100 shadow-xs cursor-pointer active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">local_shipping</span>
              <span>+ Anotar Compra</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="py-2.5 px-3 bg-white dark:bg-[#201814] hover:bg-[#fff5ea] dark:hover:bg-[#2b1f1a] border border-[#dec0b7] dark:border-stone-700 rounded-2xl flex items-center justify-center gap-2 text-xs font-black text-[#2c1e19] dark:text-stone-100 shadow-xs cursor-pointer active:scale-98 transition-all"
            >
              <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">receipt_long</span>
              <span>- Anotar Gasto (Luz)</span>
            </button>
          </div>
        </section>

        {/* 3. MODO PRUEBA / EJEMPLO RÁPIDO (Accessible Demonstration for Adult Users) */}
        <section className="bg-gradient-to-r from-[#fcedde] to-[#fff3e6] dark:from-[#2a1e19] dark:to-[#221713] rounded-2xl p-3.5 border border-[#fea619]/50 dark:border-amber-700/50 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#fea619] text-[#2c1e19] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl font-bold">play_arrow</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black text-[#2c1e19] dark:text-stone-100 truncate">
                ¿Quieres probar cómo funciona?
              </h3>
              <p className="text-[11px] text-[#57423b] dark:text-stone-300 truncate">
                Simula una venta de ejemplo y mira cómo sube tu caja
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunQuickDemo}
            className="px-3 py-2 bg-[#bd532b] hover:bg-[#a9441f] active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            Probar
          </button>
        </section>

        {/* 4. ÚLTIMOS MOVIMIENTOS DEL DÍA (Minimalist List) */}
        <section className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-[#57423b] dark:text-stone-300 uppercase tracking-wider">
              Movimientos de Hoy ({todayTxs.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="text-[11px] font-bold text-[#bd532b] dark:text-[#ff9973] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">help</span>
              <span>Ayuda</span>
            </button>
          </div>

          {todayTxs.length === 0 ? (
            <div className="bg-white dark:bg-[#1f1815] rounded-2xl p-6 text-center border border-[#dec0b7]/40 dark:border-stone-800 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-[#fcedde] dark:bg-[#2b1f1a] text-[#bd532b] dark:text-[#ff9973] flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-2xl">point_of_sale</span>
              </div>
              <h3 className="text-xs font-black text-[#1f1b19] dark:text-stone-200">
                Aún no tienes ventas registradas hoy
              </h3>
              <p className="text-[11px] text-[#57423b] dark:text-stone-400 mt-1">
                Toca <strong>Cámara</strong>, <strong>Voz</strong> o <strong>Venta 2 Pasos</strong> arriba para anotar tu primer cobro.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTxs.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white dark:bg-[#1f1815] border border-[#dec0b7]/40 dark:border-stone-800 rounded-2xl p-3 flex items-center justify-between shadow-xs transition-colors"
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
                      <h4 className="text-xs font-black text-[#1f1b19] dark:text-stone-100 truncate">
                        {tx.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          {tx.time || 'Hoy'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
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
                      className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
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

      {/* ================= MODAL: VENTA EN 2 PASOS SENCILLOS ================= */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#fff8f5] dark:bg-[#1a1412] text-[#1f1b19] dark:text-stone-100 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#2a6651] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">point_of_sale</span>
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">
                    Registrar Venta
                  </h3>
                  <span className="text-[11px] font-bold text-[#bd532b] dark:text-[#ff9973]">
                    Paso {saleStep} de 2: {saleStep === 1 ? '¿Qué vendiste?' : '¿Cómo te pagan?'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* PASO 1: SELECCIONAR QUÉ SE VENDIÓ */}
            {saleStep === 1 && (
              <div className="space-y-4">
                {/* Tabs: Producto de tienda vs Monto directo */}
                <div className="grid grid-cols-2 p-1 bg-stone-200 dark:bg-stone-800 rounded-xl text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setSaleType('producto')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      saleType === 'producto'
                        ? 'bg-[#2a6651] text-white shadow-xs'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Productos de Tienda
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleType('monto')}
                    className={`py-2 rounded-lg transition-all cursor-pointer ${
                      saleType === 'monto'
                        ? 'bg-[#2a6651] text-white shadow-xs'
                        : 'text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    Monto Directo (Bs.)
                  </button>
                </div>

                {saleType === 'producto' ? (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 block">
                      Toca un producto para seleccionarlo:
                    </span>

                    {/* Grid de productos rápidos con precios grandes */}
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
                                ? 'bg-[#ffeedf] dark:bg-[#3b241a] border-[#bd532b] dark:border-[#ff9973] shadow-md scale-[1.02]'
                                : 'bg-white dark:bg-[#241c19] border-stone-200 dark:border-stone-700 hover:border-stone-400'
                            }`}
                          >
                            <span className="font-extrabold text-xs text-[#1f1b19] dark:text-stone-100 truncate block">
                              {p.name}
                            </span>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-sm font-black text-[#9f3c16] dark:text-[#ff9973]">
                                Bs. {p.price.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-stone-500 dark:text-stone-400">
                                /{p.unit}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepper de cantidad para el producto seleccionado */}
                    {selectedProduct && (
                      <div className="bg-white dark:bg-[#241c19] p-3 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-500 dark:text-stone-400 block">
                            Cantidad ({selectedProduct.unit}):
                          </span>
                          <span className="text-xs font-black text-[#1f1b19] dark:text-stone-100">
                            {selectedProduct.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                            className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-black text-lg active:scale-95 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black text-base">
                            {saleQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSaleQty(saleQty + 1)}
                            className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-black text-lg active:scale-95 cursor-pointer"
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
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        ¿Qué se vendió? (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Pan dulce, recarga, refrescos..."
                        value={customSaleTitle}
                        onChange={(e) => setCustomSaleTitle(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-sm font-bold text-[#1f1b19] dark:text-stone-100 focus:outline-none focus:border-[#2a6651]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                        Monto a Cobrar (Bs.)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                          Bs.
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={customSaleAmount}
                          onChange={(e) => setCustomSaleAmount(e.target.value)}
                          className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-xl font-black text-[#9f3c16] dark:text-[#ff9973] focus:outline-none focus:border-[#2a6651]"
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
                          className="flex-1 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-[#ffeedf] text-xs font-extrabold rounded-lg text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
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
                  className="w-full h-13 mt-2 bg-[#2a6651] hover:bg-[#205140] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
                >
                  <span>Siguiente: Método de Pago (Bs. {currentSaleSubtotal.toFixed(2)})</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              </div>
            )}

            {/* PASO 2: MÉTODO DE PAGO Y CONFIRMACIÓN */}
            {saleStep === 2 && (
              <div className="space-y-4">
                {/* Resumen del cobro */}
                <div className="bg-[#ffeedf] dark:bg-[#33221b] border-2 border-[#bd532b]/40 rounded-2xl p-4 text-center">
                  <span className="text-xs uppercase font-bold text-[#9f3c16] dark:text-[#ff9973] block">
                    Total a Cobrar
                  </span>
                  <span className="text-3xl font-black text-[#1f1b19] dark:text-stone-100 block my-1">
                    Bs. {currentSaleSubtotal.toFixed(2)}
                  </span>
                  <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                    {saleType === 'producto' ? `${saleQty}x ${selectedProduct.name}` : (customSaleTitle || 'Venta rápida')}
                  </span>
                </div>

                {/* Selector de Pago: Efectivo vs QR */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    ¿Cómo pagó el cliente?
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSalePaymentMethod('efectivo');
                        setSaleIsFiado(false);
                      }}
                      className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        salePaymentMethod === 'efectivo' && !saleIsFiado
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm'
                          : 'bg-white dark:bg-[#241c19] border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <span className="text-2xl">💵</span>
                      <span className="font-black text-xs">Efectivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSalePaymentMethod('qr');
                        setSaleIsFiado(false);
                      }}
                      className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        salePaymentMethod === 'qr' && !saleIsFiado
                          ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-500 text-purple-900 dark:text-purple-100 shadow-sm'
                          : 'bg-white dark:bg-[#241c19] border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      <span className="text-2xl">📱</span>
                      <span className="font-black text-xs">Pago QR</span>
                    </button>
                  </div>
                </div>

                {/* Venta Fiada / Crédito */}
                <div className="p-3 bg-stone-100 dark:bg-[#241c19] rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saleIsFiado}
                      onChange={(e) => setSaleIsFiado(e.target.checked)}
                      className="w-4 h-4 text-[#bd532b] rounded focus:ring-[#bd532b]"
                    />
                    <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      ¿Es venta fiada (a crédito)?
                    </span>
                  </label>

                  {saleIsFiado && (
                    <input
                      type="text"
                      placeholder="Nombre del cliente (ej: Don Pedro, Sra. María)"
                      value={saleFiadoClient}
                      onChange={(e) => setSaleFiadoClient(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1a1412] text-xs font-bold text-stone-800 dark:text-stone-100"
                    />
                  )}
                </div>

                {/* Botones de acción final */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmStreamlinedSale}
                    className="w-full h-13 bg-[#2a6651] hover:bg-[#205140] text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-2xl">check_circle</span>
                    <span>¡Confirmar Venta! • Bs. {currentSaleSubtotal.toFixed(2)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaleStep(1)}
                    className="w-full h-10 text-xs font-bold text-stone-600 dark:text-stone-300 hover:underline cursor-pointer"
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
          <div className="bg-[#fff8f5] dark:bg-[#1a1412] text-[#1f1b19] dark:text-stone-100 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                </div>
                <h3 className="font-black text-base">Compra de Mercadería</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                ¿Qué compraste?
              </label>
              <input
                type="text"
                placeholder="Ej: 1 caja aceite, 10 bolsas arroz"
                value={purchaseTitle}
                onChange={(e) => setPurchaseTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-sm font-bold text-stone-800 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Total Pagado al Proveedor (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  Bs.
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-lg font-black text-amber-700 dark:text-amber-400"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="w-full h-12 bg-[#fea619] hover:bg-[#e69414] text-[#2c1e19] font-black text-sm rounded-xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span>Guardar Compra</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="w-full h-9 text-xs font-bold text-stone-600 dark:text-stone-400 hover:underline cursor-pointer"
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
          <div className="bg-[#fff8f5] dark:bg-[#1a1412] text-[#1f1b19] dark:text-stone-100 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                </div>
                <h3 className="font-black text-base">Registrar Gasto de Caja</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Motivo del Gasto
              </label>
              <input
                type="text"
                placeholder="Ej: Pago de luz, bolsas, flete taxi"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-sm font-bold text-stone-800 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Monto Retirado de Caja (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  Bs.
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-lg font-black text-rose-600 dark:text-rose-400"
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
                className="w-full h-9 text-xs font-bold text-stone-600 dark:text-stone-400 hover:underline cursor-pointer"
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
          <div className="bg-[#fff8f5] dark:bg-[#1a1412] text-[#1f1b19] dark:text-stone-100 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#fceede] dark:bg-[#33221b] text-[#bd532b] dark:text-[#ff9973] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
                <h3 className="font-black text-base">Fondo de Caja Inicial</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Define con cuánto dinero en efectivo comenzaste tu día en el mostrador para dar cambio.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1">
                Monto en Efectivo Base (Bs.)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">
                  Bs.
                </span>
                <input
                  type="number"
                  step="any"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  className="w-full h-12 pl-11 pr-3 rounded-xl border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-[#241c19] text-lg font-black text-[#1f1b19] dark:text-stone-100"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveInitialCash}
                className="w-full h-11 bg-[#bd532b] hover:bg-[#a94822] text-white font-black text-xs rounded-xl shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">check</span>
                <span>Guardar Fondo de Caja</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-full h-9 text-xs font-bold text-stone-600 dark:text-stone-400 hover:underline cursor-pointer"
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
