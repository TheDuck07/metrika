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
    showToast,
  } = useStore();

  // Modals
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showProductScanModal, setShowProductScanModal] = useState(false);
  const [productScanMode, setProductScanMode] = useState<'venta' | 'inventario'>('venta');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Quick Sale State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [saleSearch, setSaleSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [saleMode, setSaleMode] = useState<'producto' | 'monto'>('producto');
  const [saleQty, setSaleQty] = useState(1);
  const [customSaleAmount, setCustomSaleAmount] = useState('');
  const [customSaleTitle, setCustomSaleTitle] = useState('');

  // Quick Purchase State
  const [purchaseTitle, setPurchaseTitle] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState('Abarrotes');

  // Quick Expense State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Servicios');

  // Calculate today's real-time dynamic balance
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
    const saved = localStorage.getItem(`metrika_initial_cash_${user?.id || 'demo'}`);
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
      showToast(`Fondo de caja de ${user?.storeName || 'tu tienda'} actualizado: Bs. ${val.toFixed(2)}`);
    } else {
      showToast('Introduce un monto válido', 'warning');
    }
  };

  const handleConfirmSale = () => {
    if (customSaleAmount) {
      const amt = parseFloat(customSaleAmount);
      if (isNaN(amt) || amt <= 0) {
        showToast('Introduce un monto válido', 'warning');
        return;
      }
      recordDirectSale(customSaleTitle.trim() || 'Venta rápida de mostrador', amt);
    } else {
      recordSale(selectedProductId, saleQty);
    }
    setShowSaleModal(false);
    setCustomSaleAmount('');
    setCustomSaleTitle('');
    setSaleQty(1);
  };

  const handleConfirmPurchase = () => {
    const amt = parseFloat(purchaseAmount);
    if (!purchaseTitle.trim() || isNaN(amt) || amt <= 0) {
      showToast('Completa el concepto y un monto válido', 'warning');
      return;
    }
    recordPurchase(purchaseTitle.trim(), amt, purchaseCategory);
    setShowPurchaseModal(false);
    setPurchaseTitle('');
    setPurchaseAmount('');
  };

  const handleConfirmExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) {
      showToast('Completa el concepto y un monto válido', 'warning');
      return;
    }
    recordExpense(expenseTitle.trim(), amt, expenseCategory);
    setShowExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount('');
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="bg-[#fff8f5] dark:bg-[#171210] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Inicio" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-4">
        {/* Real-time Dynamic Balance Card */}
        <section className="bg-gradient-to-br from-[#bd532b] to-[#9f3c16] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Balance Diario en Tiempo Real
            </span>
            <span className="text-[11px] bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full font-bold">
              Hoy • {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/85 font-medium">Efectivo en Caja Total</span>
              <button
                type="button"
                onClick={() => {
                  setCashInput(String(initialCashRegister));
                  setShowCashModal(true);
                }}
                className="text-[10px] bg-white/20 hover:bg-white/30 text-white font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Caja inicial: Bs. {initialCashRegister}</span>
                <span className="material-symbols-outlined text-[11px]">edit</span>
              </button>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Bs. {efectivoEnCaja >= 0 ? efectivoEnCaja.toFixed(2) : `(${Math.abs(efectivoEnCaja).toFixed(2)})`}
              </span>
            </div>
          </div>

          {/* Three sub-metrics: Ventas, Compras, Gastos */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20">
            <div className="bg-black/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">
                + Ventas
              </span>
              <span className="text-sm font-extrabold text-emerald-300 block mt-0.5">
                +Bs. {todayVentas.toFixed(0)}
              </span>
            </div>
            <div className="bg-black/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">
                - Compras
              </span>
              <span className="text-sm font-extrabold text-amber-200 block mt-0.5">
                -Bs. {todayCompras.toFixed(0)}
              </span>
            </div>
            <div className="bg-black/15 backdrop-blur-sm rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">
                - Gastos
              </span>
              <span className="text-sm font-extrabold text-rose-200 block mt-0.5">
                -Bs. {todayGastos.toFixed(0)}
              </span>
            </div>
          </div>
        </section>

        {/* Quick Action Buttons Hub */}
        <section className="space-y-2 pt-1">
          <div className="grid grid-cols-3 gap-3">
            {/* Venta Rápida */}
            <button
              type="button"
              onClick={() => {
                setShowSaleModal(true);
                setSaleSearch('');
                setSelectedProductId(products[0]?.id || '');
                setSaleQty(1);
                setCustomSaleAmount('');
                setCustomSaleTitle('');
              }}
              className="bg-[#2a6651] hover:bg-[#235342] text-white p-2 rounded-2xl flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer min-h-[148px] group"
            >
              <div className="w-[74px] h-[74px] rounded-2xl bg-white/25 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[62px] leading-none select-none" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>point_of_sale</span>
              </div>
              <span className="text-base font-extrabold leading-tight">+ Venta</span>
              <span className="text-[11px] text-white/85 mt-0.5">Cobro rápido</span>
            </button>

            {/* Compra Proveedor */}
            <button
              type="button"
              onClick={() => setShowPurchaseModal(true)}
              className="bg-[#fea619] hover:bg-[#e89613] text-[#2c1e19] p-2 rounded-2xl flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer min-h-[148px] group"
            >
              <div className="w-[74px] h-[74px] rounded-2xl bg-black/10 flex items-center justify-center mb-1.5 text-[#2c1e19] group-hover:scale-105 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[62px] leading-none select-none" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>local_shipping</span>
              </div>
              <span className="text-base font-black leading-tight">- Compra</span>
              <span className="text-[11px] text-[#2c1e19]/85 mt-0.5">Mercadería</span>
            </button>

            {/* Registrar Gasto */}
            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="bg-[#eae1dd] hover:bg-[#dfd4ce] text-[#1f1b19] p-2 rounded-2xl flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer min-h-[148px] border border-[#dec0b7] group"
            >
              <div className="w-[74px] h-[74px] rounded-2xl bg-[#bd532b]/15 text-[#bd532b] flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform shadow-xs">
                <span className="material-symbols-outlined text-[62px] leading-none select-none" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}>receipt</span>
              </div>
              <span className="text-base font-extrabold leading-tight text-[#1f1b19]">- Gasto</span>
              <span className="text-[11px] text-[#57423b] mt-0.5">Luz / Flete</span>
            </button>
          </div>

          {/* Smart AI Actions: Voice Recognition + Visual Scanner */}
          <div className="pt-2 space-y-2">
            {/* Voice Recognition Button */}
            <button
              type="button"
              onClick={() => setShowVoiceModal(true)}
              className="w-full bg-gradient-to-r from-[#0f4030] via-[#1a5b46] to-[#0f4030] text-white p-3.5 rounded-2xl shadow-lg border border-emerald-400/40 hover:border-emerald-400 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">mic</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-[#e6fbf3] leading-tight">
                      Anotar por Voz con IA
                    </h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-300/25 text-emerald-200 border border-emerald-400/40 animate-pulse">
                      Nuevo
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-100/85 mt-0.5 truncate">
                    Di "2 Coca Colas" o "Gasto 40 Bs de luz" y se anota al instante
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors ml-2">
                <span className="material-symbols-outlined text-emerald-300 text-xl group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>

            {/* Smart AI Counter & Multi-Product Visual Sales Scanner Banner */}
            <button
              type="button"
              onClick={() => {
                setProductScanMode('venta');
                setShowProductScanModal(true);
              }}
              className="w-full bg-gradient-to-r from-[#1c1917] via-[#2c1e19] to-[#1c1917] text-white p-3.5 rounded-2xl shadow-lg border border-[#fea619]/40 hover:border-[#fea619] flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fea619] to-[#bd532b] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-[#fceede] leading-tight">
                      Foto-Venta con IA: Escanear Mostrador
                    </h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                      100% Gratis
                    </span>
                  </div>
                  <p className="text-[11px] text-[#dec0b7] mt-0.5 truncate">
                    Toma foto al mostrador: la IA reconoce qué vendes, cuántos son y calcula el total
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors ml-2">
                <span className="material-symbols-outlined text-[#fea619] text-xl group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>
          </div>
        </section>


      </main>

      {/* Modal 1: Registrar Venta Rápida */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#b1f0d4] text-[#0f513c] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">point_of_sale</span>
                </div>
                <h3 className="font-bold text-base text-[#1f1b19]">Registrar Venta</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5">
            {/* AI Vision Fast Capture Banner inside Sale Modal */}
            <button
              type="button"
              onClick={() => {
                setShowSaleModal(false);
                setProductScanMode('venta');
                setShowProductScanModal(true);
              }}
              className="w-full mb-1 p-2.5 bg-gradient-to-r from-[#fcedde] to-[#ffe5cf] hover:from-[#fbe2cd] hover:to-[#ffdabb] border border-[#fea619]/50 rounded-xl flex items-center justify-between text-left cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#bd532b] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#bd532b]">¿Cobro con foto en mostrador?</span>
                    <span className="text-[9px] font-extrabold bg-[#bd532b]/15 text-[#bd532b] px-1.5 py-0.5 rounded-full">IA Gratis</span>
                  </div>
                  <p className="text-[10px] text-[#57423b]">Detecta varios artículos sobre el mesón y calcula el total</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#bd532b] text-base">chevron_right</span>
            </button>

            {/* Quick Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-[#f5ece8] rounded-xl text-xs font-bold mb-3">
              <button
                type="button"
                onClick={() => {
                  setSaleMode('producto');
                  setCustomSaleAmount('');
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  saleMode === 'producto'
                    ? 'bg-[#9f3c16] text-white shadow-xs'
                    : 'text-[#57423b] hover:text-[#1f1b19]'
                }`}
              >
                Buscar Producto
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaleMode('monto');
                  setIsDropdownOpen(false);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  saleMode === 'monto'
                    ? 'bg-[#9f3c16] text-white shadow-xs'
                    : 'text-[#57423b] hover:text-[#1f1b19]'
                }`}
              >
                Monto Directo
              </button>
            </div>

            {saleMode === 'producto' ? (
              <div className="space-y-3.5">
                {/* Searchable Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#9f3c16]">search</span>
                      Escribir para buscar producto
                    </label>
                    {saleSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSaleSearch('');
                          setIsDropdownOpen(true);
                        }}
                        className="text-[11px] text-[#9f3c16] font-bold hover:underline cursor-pointer"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[#8a726a] flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px]">manage_search</span>
                    </span>
                    <input
                      type="text"
                      placeholder="Escribe (ej: C, Coca, Pil, Aceite)..."
                      value={saleSearch}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setSaleSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      className="w-full h-12 pl-10 pr-9 rounded-xl border-2 border-[#dec0b7] focus:border-[#9f3c16] bg-[#fff8f5] text-sm font-bold text-[#1f1b19] placeholder-[#8a726a] focus:outline-none transition-colors shadow-xs"
                    />
                    {saleSearch && (
                      <button
                        type="button"
                        onClick={() => setSaleSearch('')}
                        className="absolute right-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Autocomplete Dropdown List with Visual Product Representation */}
                {isDropdownOpen && (
                  <div className="bg-[#fff8f5] border border-[#dec0b7] rounded-2xl p-2 max-h-[220px] overflow-y-auto space-y-1.5 shadow-inner">
                    <div className="px-2 py-0.5 flex items-center justify-between text-[10.5px] text-[#8a726a] font-bold uppercase tracking-wider">
                      <span>Coincidencias encontradas</span>
                      <span>Toca para elegir</span>
                    </div>

                    {products
                      .filter(
                        (p) =>
                          !saleSearch.trim() ||
                          p.name.toLowerCase().includes(saleSearch.toLowerCase()) ||
                          p.category.toLowerCase().includes(saleSearch.toLowerCase())
                      )
                      .map((p) => {
                        const isSelected = p.id === selectedProductId;
                        const isLow = p.stock <= p.minStock;

                        // Visual styling helper per category
                        let bgStyle = 'bg-stone-700 text-white';
                        if (p.name.toLowerCase().includes('coca')) bgStyle = 'bg-[#b91c1c] text-white';
                        else if (p.category === 'Lácteos' || p.name.toLowerCase().includes('pil'))
                          bgStyle = 'bg-[#1d4ed8] text-white';
                        else if (p.name.toLowerCase().includes('aceite')) bgStyle = 'bg-[#b45309] text-white';
                        else if (p.category === 'Verduras / Frutas') bgStyle = 'bg-[#be123c] text-white';
                        else if (p.category === 'Carnes') bgStyle = 'bg-[#881337] text-white';
                        else if (p.category === 'Abarrotes') bgStyle = 'bg-[#a16207] text-white';

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedProductId(p.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer active:scale-[0.99] border ${
                              isSelected
                                ? 'bg-[#ffeedf] border-[#9f3c16] shadow-xs'
                                : 'bg-white hover:bg-[#fceede] border-stone-200'
                            }`}
                          >
                            {/* Product Visual Avatar / Image */}
                            <div className="relative shrink-0">
                              <div
                                className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs overflow-hidden ${bgStyle}`}
                              >
                                {p.imageUrl ? (
                                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-[26px]">
                                    {p.icon || 'inventory_2'}
                                  </span>
                                )}
                              </div>
                              <span className="absolute -bottom-1 -right-1 text-[9px] font-black uppercase bg-white border border-stone-300 px-1 rounded text-stone-700 shadow-2xs">
                                {p.unit}
                              </span>
                            </div>

                            {/* Prominent Name and Details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[14px] font-extrabold text-[#1f1b19] truncate leading-tight">
                                {p.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-bold text-[#7a5a4e] uppercase bg-[#f5ece8] px-1.5 py-0.2 rounded">
                                  {p.category}
                                </span>
                                {isLow ? (
                                  <span className="text-[10px] font-extrabold text-[#ba1a1a] bg-[#ffdad6] px-1.5 py-0.2 rounded-full">
                                    ⚠️ Quedan: {p.stock}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-emerald-700">
                                    Stock: {p.stock}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price Badge */}
                            <div className="text-right shrink-0">
                              <span className="text-sm font-black text-[#9f3c16] block">
                                Bs. {p.price.toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium">/{p.unit}</span>
                            </div>
                          </div>
                        );
                      })}

                    {products.filter(
                      (p) =>
                        !saleSearch.trim() ||
                        p.name.toLowerCase().includes(saleSearch.toLowerCase()) ||
                        p.category.toLowerCase().includes(saleSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-xs text-stone-500 font-medium">
                        No hay productos que coincidan con &quot;{saleSearch}&quot;
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Product Summary & Quantity Controller */}
                {selectedProduct && (
                  <div className="bg-gradient-to-br from-[#fceede] to-[#fff8f5] rounded-2xl p-3.5 border-2 border-[#9f3c16]/30 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#9f3c16] text-white flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                          {selectedProduct.imageUrl ? (
                            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[22px]">
                              {selectedProduct.icon || 'shopping_cart'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-[#9f3c16] tracking-wider block">
                            Producto Elegido
                          </span>
                          <h4 className="text-[14px] font-black text-[#1f1b19] truncate leading-tight">
                            {selectedProduct.name}
                          </h4>
                          <span className="text-[11px] font-bold text-[#57423b]">
                            Bs. {selectedProduct.price.toFixed(2)} por {selectedProduct.unit}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="px-2.5 py-1 text-xs font-bold text-[#9f3c16] bg-white border border-[#dec0b7] rounded-lg hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
                      >
                        {isDropdownOpen ? 'Ocultar' : 'Cambiar'}
                      </button>
                    </div>

                    {/* Quantity Stepper & Quick Multipliers */}
                    <div className="space-y-2 pt-1 border-t border-[#dec0b7]/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700">
                          Cantidad a vender ({selectedProduct.unit}):
                        </span>
                        <span className="text-xs font-black text-[#9f3c16]">
                          Subtotal: Bs. {(selectedProduct.price * saleQty).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                          className="w-11 h-11 rounded-xl bg-white border border-stone-300 text-stone-800 font-extrabold text-xl active:scale-95 transition-transform cursor-pointer shadow-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={saleQty}
                          onChange={(e) => setSaleQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="flex-1 h-11 text-center font-black text-lg rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#9f3c16]"
                        />
                        <button
                          type="button"
                          onClick={() => setSaleQty(saleQty + 1)}
                          className="w-11 h-11 rounded-xl bg-white border border-stone-300 text-stone-800 font-extrabold text-xl active:scale-95 transition-transform cursor-pointer shadow-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Presets for Caseras: +1, +2, +5, +10 */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-stone-500 font-bold uppercase">Atajos:</span>
                        {[1, 2, 3, 5, 10].map((qtyVal) => (
                          <button
                            key={qtyVal}
                            type="button"
                            onClick={() => setSaleQty(qtyVal)}
                            className={`flex-1 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                              saleQty === qtyVal
                                ? 'bg-[#9f3c16] text-white shadow-xs'
                                : 'bg-white text-stone-700 border border-stone-300 hover:bg-[#fceede]'
                            }`}
                          >
                            {qtyVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Option B: Direct Amount Entry */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Concepto de la venta directa
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Pan dulce, recarga, varios..."
                    value={customSaleTitle}
                    onChange={(e) => setCustomSaleTitle(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-semibold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Monto directo a cobrar (Bs.)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-base font-extrabold text-stone-500">Bs.</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0.00"
                      value={customSaleAmount}
                      onChange={(e) => setCustomSaleAmount(e.target.value)}
                      className="w-full h-12 pl-12 pr-3 rounded-xl border-2 border-stone-300 bg-stone-50 text-lg font-black text-[#9f3c16] focus:outline-none focus:border-[#9f3c16]"
                    />
                  </div>
                </div>

                {/* Quick money shortcuts: 5, 10, 20, 50 */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-500 font-bold uppercase">Montos:</span>
                  {[5, 10, 15, 20, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomSaleAmount(String(amt))}
                      className="flex-1 py-1 rounded-lg text-xs font-extrabold bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
                    >
                      {amt}Bs
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmSale}
                className="w-full h-13 bg-[#2a6651] hover:bg-[#205140] text-white font-extrabold text-base rounded-2xl active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[24px]">point_of_sale</span>
                <span>
                  Confirmar Cobro • Bs.{' '}
                  {saleMode === 'monto' && customSaleAmount
                    ? parseFloat(customSaleAmount || '0').toFixed(2)
                    : selectedProduct
                    ? (selectedProduct.price * saleQty).toFixed(2)
                    : '0.00'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSaleModal(false);
                  setSaleSearch('');
                }}
                className="w-full h-10 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Registrar Compra Proveedor */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffddb8] text-[#855300] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                </div>
                <h3 className="font-bold text-base text-[#1f1b19]">Compra a Proveedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Shortcut: Escanear mercadería con IA */}
              <button
                type="button"
                onClick={() => {
                  setShowPurchaseModal(false);
                  setProductScanMode('inventario');
                  setShowProductScanModal(true);
                }}
                className="w-full p-2.5 rounded-xl bg-[#ffeed9] border border-[#ffddb8] hover:bg-[#fedfb8] text-[#855300] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs active:scale-98"
              >
                <span className="material-symbols-outlined text-base text-[#9f3c16]">photo_camera</span>
                <span>¿Llegó mercadería nueva? Escanear productos con IA</span>
              </button>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Concepto / Mercadería recibida
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1 caja aceite, 20 bolsas arroz"
                  value={purchaseTitle}
                  onChange={(e) => setPurchaseTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-medium text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Categoría
                </label>
                <select
                  value={purchaseCategory}
                  onChange={(e) => setPurchaseCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-medium text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                >
                  <option value="Abarrotes">Abarrotes</option>
                  <option value="Bebidas">Bebidas y Refrescos</option>
                  <option value="Lácteos">Lácteos y Derivados</option>
                  <option value="Carnes">Carnes y Embutidos</option>
                  <option value="Verduras / Frutas">Verduras y Frutas</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Total Pagado al Proveedor (Bs.)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-stone-500">Bs.</span>
                  <input
                    type="number"
                    placeholder="Ej. 180.00"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  className="w-full h-12 bg-[#fea619] text-[#2c1e19] font-extrabold text-sm rounded-xl active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Guardar Compra de Mercadería
                </button>
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="w-full h-10 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Registrar Gasto de Caja */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                </div>
                <h3 className="font-bold text-base text-[#1f1b19]">Registrar Gasto de Caja</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3.5">


              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Motivo del Gasto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de luz, flete taxi feria, bolsas plásticas"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-medium text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Categoría
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-medium text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                >
                  <option value="Servicios (Luz/Agua)">Servicios (Luz/Agua)</option>
                  <option value="Alquiler">Alquiler de puesto / tienda</option>
                  <option value="Transporte y Flete">Transporte y flete</option>
                  <option value="Insumos (Bolsas/Limpieza)">Insumos (Bolsas/Limpieza)</option>
                  <option value="Imprevistos">Imprevistos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Monto Retirado de Caja (Bs.)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-stone-500">Bs.</span>
                  <input
                    type="number"
                    placeholder="Ej. 35.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleConfirmExpense}
                  className="w-full h-12 bg-[#ba1a1a] text-white font-bold text-sm rounded-xl active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">remove_circle</span>
                  Restar Gasto de Caja
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="w-full h-10 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Fondo de Caja Inicial */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#fceede] text-[#bd532b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
                <h3 className="font-extrabold text-base text-[#1f1b19]">Fondo de Caja Inicial</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-xs text-[#57423b] leading-relaxed">
              Define con cuánto dinero en efectivo comenzaste tu turno o día en el mostrador.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-[#57423b] mb-1">Monto en Efectivo (Bs.)</label>
              <div className="flex items-center bg-[#f5ece8] rounded-xl px-3 py-2 border border-[#dec0b7]">
                <span className="text-xs font-bold text-[#bd532b] mr-2">Bs.</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="350"
                  className="w-full bg-transparent text-sm font-bold text-[#1f1b19] border-none p-0 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSaveInitialCash}
                className="w-full h-11 bg-[#bd532b] hover:bg-[#a94822] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">check</span>
                Guardar Fondo de Caja
              </button>
              <button
                type="button"
                onClick={() => setShowCashModal(false)}
                className="w-full h-9 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Vision Scanner Modal */}
      <ProductScanModal
        isOpen={showProductScanModal}
        onClose={() => setShowProductScanModal(false)}
        initialMode={productScanMode}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
      />

      <BottomNav />
    </div>
  );
};
