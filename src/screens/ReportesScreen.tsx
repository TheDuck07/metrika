import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { getTodayDateStr } from '../utils/dateUtils';

const CATEGORY_COLORS: Record<string, string> = {
  Mercadería: '#2563eb',
  Abarrotes: '#2563eb',
  Lácteos: '#0284c7',
  Bebidas: '#0ea5e9',
  Refrescos: '#0ea5e9',
  Carnes: '#dc2626',
  'Verduras / Frutas': '#16a34a',
  Servicios: '#a855f7',
  'Servicio eléctrico local': '#a855f7',
  Alquiler: '#f97316',
  'Fletes / Transporte': '#eab308',
  Imprevistos: '#2a6651',
  Varios: '#6b7280',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const ReportesScreen: React.FC = () => {
  const { transactions } = useStore();

  const [activeTab, setActiveTab] = useState<'semana' | 'mes'>('mes');
  const [topModeMonth, setTopModeMonth] = useState<'unidades' | 'ingresos'>('unidades');
  const [topModeSemana, setTopModeSemana] = useState<'unidades' | 'ingresos'>('ingresos');

  // Today reference
  const today = useMemo(() => new Date(), []);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = current month, -1 = previous, etc.

  // Target month calculation
  const targetDate = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + selectedMonthOffset, 1);
    return d;
  }, [today, selectedMonthOffset]);

  const monthYearStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  const monthDisplayName = `${MONTH_NAMES[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

  // Transactions belonging to the selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(monthYearStr));
  }, [transactions, monthYearStr]);

  // Monthly KPIs
  const monthlyStats = useMemo(() => {
    const ventas = monthTransactions.filter((t) => t.type === 'venta');
    const comprasYGastos = monthTransactions.filter((t) => t.type === 'compra' || t.type === 'gasto');

    const totalVentas = ventas.reduce((acc, t) => acc + t.amount, 0);
    const totalGastos = comprasYGastos.reduce((acc, t) => acc + t.amount, 0);
    const gananciaNeta = totalVentas - totalGastos;

    // Weekly breakdown inside the month: [1-7, 8-14, 15-21, 22-28, 29-31]
    const weekBuckets = [
      { label: '1-7', min: 1, max: 7, total: 0 },
      { label: '8-14', min: 8, max: 14, total: 0 },
      { label: '15-21', min: 15, max: 21, total: 0 },
      { label: '22-28', min: 22, max: 28, total: 0 },
      { label: '29-31', min: 29, max: 31, total: 0 },
    ];

    ventas.forEach((tx) => {
      const day = parseInt(tx.date.split('-')[2], 10);
      const b = weekBuckets.find((w) => day >= w.min && day <= w.max);
      if (b) b.total += tx.amount;
    });

    const maxWeekTotal = Math.max(...weekBuckets.map((w) => w.total), 1);
    const semanas = weekBuckets.map((w) => {
      const isPeak = w.total > 0 && w.total === maxWeekTotal;
      const heightPct = Math.round((w.total / maxWeekTotal) * 80) + 10;
      return {
        label: w.label,
        val: w.total,
        height: `${w.total > 0 ? heightPct : 6}%`,
        isPeak,
      };
    });

    const peakWeek = weekBuckets.reduce((max, w) => (w.total > max.total ? w : max), weekBuckets[0]);

    // Top Products of the Month
    const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
    ventas.forEach((tx) => {
      const key = tx.title || 'Venta rápida';
      if (!prodMap[key]) {
        prodMap[key] = { name: key, units: 0, revenue: 0 };
      }
      prodMap[key].units += tx.qty || 1;
      prodMap[key].revenue += tx.amount;
    });

    const prodList = Object.values(prodMap);
    const byUnits = [...prodList].sort((a, b) => b.units - a.units).slice(0, 4);
    const byRevenue = [...prodList].sort((a, b) => b.revenue - a.revenue).slice(0, 4);

    const maxUnits = Math.max(...byUnits.map((p) => p.units), 1);
    const maxRev = Math.max(...byRevenue.map((p) => p.revenue), 1);

    const topUnidades = byUnits.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      qty: `${p.units} u.`,
      barW: `${Math.round((p.units / maxUnits) * 90) + 10}%`,
    }));

    const topIngresos = byRevenue.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      qty: `Bs. ${p.revenue.toFixed(0)}`,
      barW: `${Math.round((p.revenue / maxRev) * 90) + 10}%`,
    }));

    // Expenses breakdown
    const catMap: Record<string, number> = {};
    comprasYGastos.forEach((tx) => {
      const cat = tx.category || 'Mercadería';
      catMap[cat] = (catMap[cat] || 0) + tx.amount;
    });

    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const expensesTotalBs = totalGastos;

    const CIRCUMFERENCE = 238.7;
    let accumulatedOffset = 0;
    const donutCircles: Array<{ stroke: string; dash: string; offset: string }> = [];

    const gastosItems = catEntries.map(([name, bs]) => {
      const pctNum = expensesTotalBs > 0 ? (bs / expensesTotalBs) * 100 : 0;
      const stroke = CATEGORY_COLORS[name] || '#9ca3af';
      const dashLength = (pctNum / 100) * CIRCUMFERENCE;

      donutCircles.push({
        stroke,
        dash: `${dashLength.toFixed(1)} ${CIRCUMFERENCE}`,
        offset: `-${accumulatedOffset.toFixed(1)}`,
      });
      accumulatedOffset += dashLength;

      return {
        color: stroke,
        name,
        pct: `${Math.round(pctNum)}%`,
        bs: `${bs.toFixed(0)} Bs`,
      };
    });

    const majorGasto = catEntries[0] || ['Sin gastos', 0];
    const majorGastoPct = expensesTotalBs > 0 ? `${Math.round(((majorGasto[1] as number) / expensesTotalBs) * 100)}%` : '0%';
    const majorGastoName = majorGasto[0] as string;

    return {
      totalVentas,
      totalGastos,
      gananciaNeta,
      semanas,
      mejorSemanaLabel: peakWeek && peakWeek.total > 0 ? `Sem. ${peakWeek.label}` : 'En curso',
      mejorSemanaBs: peakWeek && peakWeek.total > 0 ? `Bs. ${peakWeek.total.toFixed(0)}` : 'Bs. 0',
      topUnidades,
      topIngresos,
      donutCircles,
      gastosItems,
      majorGastoPct,
      majorGastoName,
    };
  }, [monthTransactions]);

  // Weekly Stats (last 7 days)
  const weeklyStats = useMemo(() => {
    // Generate dates for the current week (Lun to Dom)
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);

    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const daysData = days.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        day: dayName,
        date: iso,
        ventas: 0,
        gastos: 0,
      };
    });

    const weekDates = new Set(daysData.map((d) => d.date));
    const weekTxs = transactions.filter((t) => t.date && weekDates.has(t.date));

    weekTxs.forEach((tx) => {
      const dObj = daysData.find((d) => d.date === tx.date);
      if (dObj) {
        if (tx.type === 'venta') dObj.ventas += tx.amount;
        else dObj.gastos += tx.amount;
      }
    });

    const totalVentas = daysData.reduce((acc, d) => acc + d.ventas, 0);
    const totalGastos = daysData.reduce((acc, d) => acc + d.gastos, 0);
    const gananciaNeta = totalVentas - totalGastos;

    const maxDayVal = Math.max(...daysData.map((d) => d.ventas), 1);
    const chartDays = daysData.map((d) => {
      const isPeak = d.ventas > 0 && d.ventas === maxDayVal;
      const hPct = Math.round((d.ventas / maxDayVal) * 80) + 10;
      return {
        day: d.day,
        val: Math.round(d.ventas),
        h: `${d.ventas > 0 ? hPct : 6}%`,
        peak: isPeak,
      };
    });

    const peakDay = daysData.reduce((max, d) => (d.ventas > max.ventas ? d : max), daysData[0]);

    // Top products of the week
    const weekVentas = weekTxs.filter((t) => t.type === 'venta');
    const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
    weekVentas.forEach((tx) => {
      const key = tx.title || 'Venta de mostrador';
      if (!prodMap[key]) prodMap[key] = { name: key, units: 0, revenue: 0 };
      prodMap[key].units += tx.qty || 1;
      prodMap[key].revenue += tx.amount;
    });

    const prodList = Object.values(prodMap);
    const byUnits = [...prodList].sort((a, b) => b.units - a.units).slice(0, 3);
    const byRevenue = [...prodList].sort((a, b) => b.revenue - a.revenue).slice(0, 3);

    const maxUnits = Math.max(...byUnits.map((p) => p.units), 1);
    const maxRev = Math.max(...byRevenue.map((p) => p.revenue), 1);

    const topUnidades = byUnits.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      qty: `${p.units} u.`,
      barW: `${Math.round((p.units / maxUnits) * 90) + 10}%`,
    }));

    const topIngresos = byRevenue.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      qty: `Bs. ${p.revenue.toFixed(0)}`,
      barW: `${Math.round((p.revenue / maxRev) * 90) + 10}%`,
    }));

    // Weekly expenses breakdown
    const weekExpenses = weekTxs.filter((t) => t.type === 'compra' || t.type === 'gasto');
    const catMap: Record<string, number> = {};
    weekExpenses.forEach((tx) => {
      const cat = tx.category || 'Mercadería';
      catMap[cat] = (catMap[cat] || 0) + tx.amount;
    });

    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const expensesTotalBs = totalGastos;
    const CIRCUMFERENCE = 238.7;
    let accumulatedOffset = 0;
    const donutCircles: Array<{ stroke: string; dash: string; offset: string }> = [];

    const gastosItems = catEntries.map(([name, bs]) => {
      const pctNum = expensesTotalBs > 0 ? (bs / expensesTotalBs) * 100 : 0;
      const stroke = CATEGORY_COLORS[name] || '#9ca3af';
      const dashLength = (pctNum / 100) * CIRCUMFERENCE;

      donutCircles.push({
        stroke,
        dash: `${dashLength.toFixed(1)} ${CIRCUMFERENCE}`,
        offset: `-${accumulatedOffset.toFixed(1)}`,
      });
      accumulatedOffset += dashLength;

      return {
        color: stroke,
        name,
        pct: `${Math.round(pctNum)}%`,
        bs: `${bs.toFixed(0)} Bs`,
      };
    });

    const majorGasto = catEntries[0] || ['Sin gastos', 0];
    const majorGastoPct = expensesTotalBs > 0 ? `${Math.round(((majorGasto[1] as number) / expensesTotalBs) * 100)}%` : '0%';
    const majorGastoName = majorGasto[0] as string;

    return {
      totalVentas,
      totalGastos,
      gananciaNeta,
      chartDays,
      diaEstrella: peakDay && peakDay.ventas > 0 ? peakDay.day : 'En curso',
      diaEstrellaBs: peakDay && peakDay.ventas > 0 ? `Bs. ${peakDay.ventas.toFixed(0)}` : 'Bs. 0',
      topUnidades,
      topIngresos,
      donutCircles,
      gastosItems,
      majorGastoPct,
      majorGastoName,
    };
  }, [transactions]);

  return (
    <div className="bg-[#fff8f5] dark:bg-[#171210] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Reportes" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-3.5">
        {/* Period Selector Tabs */}
        <div className="w-full bg-[#efe6e3] dark:bg-[#251d19] p-1 rounded-full shadow-xs">
          <div className="grid grid-cols-2 gap-1" id="timePeriodSelector">
            <button
              id="tab-semana"
              type="button"
              onClick={() => setActiveTab('semana')}
              className={`py-2 rounded-full text-center text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'semana'
                  ? 'bg-[#9f3c16] text-white shadow-xs'
                  : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
              }`}
            >
              Esta Semana
            </button>
            <button
              id="tab-mes"
              type="button"
              onClick={() => setActiveTab('mes')}
              className={`py-2 rounded-full text-center text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'mes'
                  ? 'bg-[#9f3c16] text-white shadow-xs'
                  : 'text-[#57423b] dark:text-stone-400 hover:text-[#1f1b19] dark:hover:text-stone-200'
              }`}
            >
              Mensual
            </button>
          </div>
        </div>

        {/* ================= VISTA MENSUAL ================= */}
        {activeTab === 'mes' && (
          <div className="space-y-3.5" id="view-mes">
            {/* Month Navigator */}
            <div className="bg-white dark:bg-[#201815] rounded-xl p-2.5 shadow-xs border border-[#dec0b7]/40 dark:border-stone-800 flex items-center justify-between transition-colors">
              <button
                id="btn-prev-mes"
                type="button"
                aria-label="Mes anterior"
                onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f5ece8] dark:bg-stone-800 hover:bg-[#eae1dd] dark:hover:bg-stone-700 text-[#57423b] dark:text-stone-300 cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>

              <div className="flex items-center gap-1.5 select-none">
                <span className="material-symbols-outlined text-[#9f3c16] dark:text-[#ff9973] text-[18px]">calendar_month</span>
                <span id="mes-display-title" className="text-sm font-extrabold text-[#1f1b19] dark:text-stone-100">
                  {monthDisplayName}
                </span>
                {selectedMonthOffset === 0 && (
                  <span className="bg-[#b1f0d4] dark:bg-emerald-950/70 text-[#0f513c] dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                    Actual
                  </span>
                )}
              </div>

              <button
                id="btn-next-mes"
                type="button"
                aria-label="Mes siguiente"
                disabled={selectedMonthOffset >= 0}
                onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#f5ece8] dark:bg-stone-800 hover:bg-[#eae1dd] dark:hover:bg-stone-700 text-[#57423b] dark:text-stone-300 disabled:opacity-30 cursor-pointer active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>

            {/* KPI Cards: Ganancia Neta y Semana Estrella */}
            <section className="bg-gradient-to-br from-[#ffddb8]/40 dark:from-[#352119] via-[#fbf2ee] dark:via-[#221815] to-[#f5ece8] dark:to-[#1c1411] rounded-2xl p-3.5 shadow-xs border border-[#dec0b7]/40 dark:border-stone-800">
              <div className="grid grid-cols-2 gap-2 bg-white/90 dark:bg-[#1a1311]/90 backdrop-blur-xs rounded-xl p-3 border border-[#dec0b7]/30 dark:border-stone-800">
                {/* Ganancia Neta */}
                <div className="flex flex-col min-w-0 border-r border-[#eae1dd] dark:border-stone-800 px-1">
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 flex items-center gap-1 truncate font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#9f3c16] dark:text-[#ff9973]">
                      account_balance_wallet
                    </span>
                    Ganancia Neta
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span id="kpi-ganancia-mes" className="text-2xl font-extrabold text-[#9f3c16] dark:text-[#ff9973] truncate">
                      {monthlyStats.gananciaNeta.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <span id="kpi-ganancia-sub" className="text-[10px] text-[#2a6651] dark:text-emerald-400 font-bold leading-none mt-0.5">
                    Bs. (Ventas - Salidas)
                  </span>
                </div>

                {/* Semana Estrella */}
                <div className="flex flex-col min-w-0 px-2">
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 flex items-center gap-1 truncate font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#855300] dark:text-amber-400">
                      workspace_premium
                    </span>
                    Mejor Semana
                  </span>
                  <div className="flex items-baseline gap-1 mt-1 truncate">
                    <span id="kpi-mejor-semana" className="text-2xl font-extrabold text-[#855300] dark:text-amber-400 truncate">
                      {monthlyStats.mejorSemanaLabel}
                    </span>
                  </div>
                  <span id="kpi-mejor-semana-bs" className="text-[10px] text-[#57423b] dark:text-stone-400 font-medium leading-none mt-0.5 truncate">
                    {monthlyStats.mejorSemanaBs}
                  </span>
                </div>
              </div>
            </section>

            {/* Ventas del Mes: Gráfico Semanal Dinámico */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-2 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9f3c16] dark:bg-[#ff9973]"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Ventas del Mes</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#57423b] dark:text-stone-400 block uppercase font-medium">Total Ventas</span>
                  <span className="text-sm font-extrabold text-[#9f3c16] dark:text-[#ff9973]">
                    Bs. {monthlyStats.totalVentas.toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <div className="h-36 w-full flex items-end justify-between px-2 gap-2">
                  {monthlyStats.semanas.map((s) => (
                    <div key={s.label} className="flex-1 flex flex-col items-center h-full justify-end">
                      <span className={`text-[10px] font-bold mb-1 ${s.isPeak ? 'text-[#9f3c16] dark:text-[#ff9973]' : 'text-[#57423b] dark:text-stone-400'}`}>
                        {s.val > 0 ? `Bs. ${s.val.toFixed(0)}` : '0'}
                      </span>
                      <div
                        className={`w-full max-w-[42px] rounded-t-lg transition-all duration-500 ${
                          s.isPeak ? 'bg-[#9f3c16] dark:bg-[#ff8659]' : 'bg-[#ffddb8] dark:bg-[#733e2b]'
                        }`}
                        style={{ height: s.height }}
                      />
                      <span className="text-[10px] text-[#57423b] dark:text-stone-400 font-semibold mt-1">
                        Días {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Top Productos del Mes */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-3 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9f3c16] dark:bg-[#ff9973]"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Productos Más Vendidos</h3>
                </div>
                <div className="flex items-center bg-[#f5ece8] dark:bg-stone-800 p-0.5 rounded-full text-[11px]">
                  <button
                    id="btn-top-unidades"
                    type="button"
                    onClick={() => setTopModeMonth('unidades')}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      topModeMonth === 'unidades'
                        ? 'bg-[#9f3c16] text-white shadow-xs'
                        : 'text-[#57423b] dark:text-stone-300 hover:text-[#1f1b19] dark:hover:text-stone-100'
                    }`}
                  >
                    Unidades
                  </button>
                  <button
                    id="btn-top-ingresos"
                    type="button"
                    onClick={() => setTopModeMonth('ingresos')}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      topModeMonth === 'ingresos'
                        ? 'bg-[#9f3c16] text-white shadow-xs'
                        : 'text-[#57423b] dark:text-stone-300 hover:text-[#1f1b19] dark:hover:text-stone-100'
                    }`}
                  >
                    Bs.
                  </button>
                </div>
              </div>

              <div className="space-y-3" id="month-top-products-list">
                {(topModeMonth === 'unidades' ? monthlyStats.topUnidades : monthlyStats.topIngresos).length === 0 ? (
                  <p className="text-xs text-[#8a726a] dark:text-stone-400 text-center py-4">No hay ventas registradas en este mes.</p>
                ) : (
                  (topModeMonth === 'unidades' ? monthlyStats.topUnidades : monthlyStats.topIngresos).map((p) => (
                    <div key={p.rank} className="space-y-1">
                      <div className="flex justify-between items-center text-[#1f1b19] dark:text-stone-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                              p.rank === 1 ? 'bg-[#ffdbcf] dark:bg-[#5c2411] text-[#9f3c16] dark:text-[#ff9973]' : 'bg-[#f5ece8] dark:bg-stone-800 text-[#57423b] dark:text-stone-300'
                            }`}
                          >
                            {p.rank}
                          </span>
                          <span className="text-xs font-bold truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-extrabold text-[#9f3c16] dark:text-[#ff9973] shrink-0">{p.qty}</span>
                      </div>
                      <div className="w-full bg-[#f5ece8] dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            p.rank === 1 ? 'bg-[#9f3c16] dark:bg-[#ff8659]' : p.rank === 2 ? 'bg-[#bf542c]' : 'bg-[#fea619]'
                          }`}
                          style={{ width: p.barW }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Salidas y Gastos del Mes (Donut Chart Dinámico) */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2a6651] dark:bg-emerald-400"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Gastos y Salidas</h3>
                </div>
                <span className="text-xs font-bold text-[#57423b] dark:text-stone-300 bg-[#f5ece8] dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  Bs. {monthlyStats.totalGastos.toFixed(2)} total
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {/* SVG Donut */}
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="transparent" r="38" className="stroke-[#f5ece8] dark:stroke-[#332420]" strokeWidth="15" />
                    {monthlyStats.donutCircles.map((c, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke={c.stroke}
                        strokeDasharray={c.dash}
                        strokeDashoffset={c.offset}
                        strokeWidth="15"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                    <span className="text-[10px] text-[#57423b] dark:text-stone-400 font-medium leading-none">Mayor gasto</span>
                    <span id="mes-donut-major-percent" className="text-xl font-extrabold text-[#1f1b19] dark:text-stone-100 leading-tight">
                      {monthlyStats.majorGastoPct}
                    </span>
                    <span id="mes-donut-major-name" className="text-[10px] text-[#9f3c16] dark:text-[#ff9973] font-bold truncate max-w-[80px]">
                      {monthlyStats.majorGastoName}
                    </span>
                  </div>
                </div>

                {/* Expense categories list */}
                <div className="flex-1 w-full space-y-1.5" id="mes-gastos-list">
                  {monthlyStats.gastosItems.length === 0 ? (
                    <p className="text-xs text-[#8a726a] dark:text-stone-400 py-3 text-center">No hay compras ni gastos registrados en este mes.</p>
                  ) : (
                    monthlyStats.gastosItems.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-[#1f1b19] dark:text-stone-200 bg-[#fbf2ee] dark:bg-[#2b1f1b] p-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-bold">
                          <span>{item.pct}</span>
                          <span className="text-[#57423b] dark:text-stone-400 font-normal">({item.bs})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= VISTA ESTA SEMANA ================= */}
        {activeTab === 'semana' && (
          <div className="space-y-3.5" id="view-semana">
            {/* KPI Cards: Ganancia Neta Semanal y Día Estrella */}
            <section className="bg-gradient-to-br from-[#ffddb8]/40 dark:from-[#352119] via-[#fbf2ee] dark:via-[#221815] to-[#f5ece8] dark:to-[#1c1411] rounded-2xl p-3.5 shadow-xs border border-[#dec0b7]/40 dark:border-stone-800">
              <div className="grid grid-cols-2 gap-2 bg-white/90 dark:bg-[#1a1311]/90 backdrop-blur-xs rounded-xl p-3 border border-[#dec0b7]/30 dark:border-stone-800">
                <div className="flex flex-col min-w-0 border-r border-[#eae1dd] dark:border-stone-800 px-1">
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 flex items-center gap-1 truncate font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#9f3c16] dark:text-[#ff9973]">
                      account_balance_wallet
                    </span>
                    Ganancia Neta
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-[#9f3c16] dark:text-[#ff9973] truncate">
                      {weeklyStats.gananciaNeta.toLocaleString('es-BO', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#2a6651] dark:text-emerald-400 font-bold leading-none mt-0.5">Bs. (Semana Actual)</span>
                </div>

                <div className="flex flex-col min-w-0 px-2">
                  <span className="text-[11px] text-[#57423b] dark:text-stone-400 flex items-center gap-1 truncate font-medium">
                    <span className="material-symbols-outlined text-[15px] text-[#855300] dark:text-amber-400">
                      workspace_premium
                    </span>
                    Día Estrella
                  </span>
                  <div className="flex items-baseline gap-1 mt-1 truncate">
                    <span className="text-2xl font-extrabold text-[#855300] dark:text-amber-400 truncate">
                      {weeklyStats.diaEstrella}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#57423b] dark:text-stone-400 font-medium leading-none mt-0.5">
                    {weeklyStats.diaEstrellaBs}
                  </span>
                </div>
              </div>
            </section>

            {/* Top Productos Semanales */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-3 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9f3c16] dark:bg-[#ff9973]"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Más Vendidos de la Semana</h3>
                </div>
                <div className="flex items-center bg-[#f5ece8] dark:bg-stone-800 p-0.5 rounded-full text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTopModeSemana('unidades')}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      topModeSemana === 'unidades'
                        ? 'bg-[#9f3c16] text-white shadow-xs'
                        : 'text-[#57423b] dark:text-stone-300 hover:text-[#1f1b19] dark:hover:text-stone-100'
                    }`}
                  >
                    Unidades
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopModeSemana('ingresos')}
                    className={`px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer ${
                      topModeSemana === 'ingresos'
                        ? 'bg-[#9f3c16] text-white shadow-xs'
                        : 'text-[#57423b] dark:text-stone-300 hover:text-[#1f1b19] dark:hover:text-stone-100'
                    }`}
                  >
                    Bs.
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {(topModeSemana === 'ingresos' ? weeklyStats.topIngresos : weeklyStats.topUnidades).length === 0 ? (
                  <p className="text-xs text-[#8a726a] dark:text-stone-400 text-center py-4">Aún no hay ventas registradas esta semana.</p>
                ) : (
                  (topModeSemana === 'ingresos' ? weeklyStats.topIngresos : weeklyStats.topUnidades).map((p) => (
                    <div key={p.rank} className="space-y-1">
                      <div className="flex justify-between items-center text-[#1f1b19] dark:text-stone-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                              p.rank === 1 ? 'bg-[#ffdbcf] dark:bg-[#5c2411] text-[#9f3c16] dark:text-[#ff9973]' : 'bg-[#f5ece8] dark:bg-stone-800 text-[#57423b] dark:text-stone-300'
                            }`}
                          >
                            {p.rank}
                          </span>
                          <span className="text-xs font-bold truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-extrabold text-[#9f3c16] dark:text-[#ff9973] shrink-0">{p.qty}</span>
                      </div>
                      <div className="w-full bg-[#f5ece8] dark:bg-stone-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            p.rank === 1 ? 'bg-[#9f3c16] dark:bg-[#ff8659]' : 'bg-[#bf542c]'
                          }`}
                          style={{ width: p.barW }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Ventas por Día (Lun - Dom) */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-2 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fea619]"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Ventas por Día</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#57423b] dark:text-stone-400 block uppercase font-medium">Total Semana</span>
                  <span className="text-sm font-extrabold text-[#9f3c16] dark:text-[#ff9973]">
                    Bs. {weeklyStats.totalVentas.toLocaleString('es-BO', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <div className="h-40 w-full flex items-end justify-between px-1 gap-1.5">
                  {weeklyStats.chartDays.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center h-full justify-end">
                      <span className={`text-[9px] font-bold mb-1 ${d.peak ? 'text-[#9f3c16] dark:text-[#ff9973] font-extrabold' : 'text-[#57423b] dark:text-stone-400'}`}>
                        {d.val > 0 ? d.val : '0'}
                      </span>
                      <div
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                          d.peak ? 'bg-[#9f3c16] dark:bg-[#ff8659] shadow-xs' : 'bg-[#fea619] dark:bg-[#d97706]'
                        }`}
                        style={{ height: d.h }}
                      />
                      <span className={`text-[10px] font-semibold mt-1 ${d.peak ? 'text-[#9f3c16] dark:text-[#ff9973] font-bold' : 'text-[#57423b] dark:text-stone-400'}`}>
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Gastos y Salidas Semanal */}
            <section className="bg-white dark:bg-[#201815] rounded-2xl p-4 shadow-xs border border-[#dec0b7]/50 dark:border-stone-800 space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2a6651] dark:bg-emerald-400"></span>
                  <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100">Gastos y Salidas</h3>
                </div>
                <span className="text-xs font-bold text-[#57423b] dark:text-stone-300 bg-[#f5ece8] dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                  Bs. {weeklyStats.totalGastos.toFixed(2)} total
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="transparent" r="38" className="stroke-[#f5ece8] dark:stroke-[#332420]" strokeWidth="15" />
                    {weeklyStats.donutCircles.map((c, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="38"
                        stroke={c.stroke}
                        strokeDasharray={c.dash}
                        strokeDashoffset={c.offset}
                        strokeWidth="15"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] text-[#57423b] dark:text-stone-400">Mayor gasto</span>
                    <span className="text-xl font-extrabold text-[#1f1b19] dark:text-stone-100">{weeklyStats.majorGastoPct}</span>
                    <span className="text-[10px] text-[#9f3c16] dark:text-[#ff9973] font-bold truncate max-w-[80px]">{weeklyStats.majorGastoName}</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  {weeklyStats.gastosItems.length === 0 ? (
                    <p className="text-xs text-[#8a726a] dark:text-stone-400 text-center py-3">No hay compras ni gastos esta semana.</p>
                  ) : (
                    weeklyStats.gastosItems.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-[#1f1b19] dark:text-stone-200 bg-[#fbf2ee] dark:bg-[#2b1f1b] p-2 rounded-xl text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-bold">
                          <span>{item.pct}</span>
                          <span className="text-[#57423b] dark:text-stone-400 font-normal">({item.bs})</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};
