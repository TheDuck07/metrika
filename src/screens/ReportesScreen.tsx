import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { exportAndSaveExcel, copyTransactionsToClipboard, ExportReportParams } from '../utils/excelExporter';

const CATEGORY_COLORS: Record<string, string> = {
  Mercadería: '#1E70BA',
  Abarrotes: '#EE6B4D',
  Lácteos: '#0284C7',
  Bebidas: '#1E70BA',
  Refrescos: '#1E70BA',
  Carnes: '#EF4444',
  'Verduras / Frutas': '#9EC84A',
  Servicios: '#8B5CF6',
  'Servicio eléctrico local': '#8B5CF6',
  Alquiler: '#F97316',
  'Panadería fresca': '#EAB308',
  Snacks: '#9EC84A',
  Otros: '#252524',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const ReportesScreen: React.FC = () => {
  const { transactions, storeInfo, user, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<'semana' | 'mes' | 'productos'>('mes');
  const [topMode, setTopMode] = useState<'ingresos' | 'unidades'>('ingresos');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Month Navigator reference
  const today = useMemo(() => new Date(), []);
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);

  // Target month calculation
  const targetDate = useMemo(() => {
    return new Date(today.getFullYear(), today.getMonth() + selectedMonthOffset, 1);
  }, [today, selectedMonthOffset]);

  const monthYearStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  const monthDisplayName = `${MONTH_NAMES[targetDate.getMonth()]} ${targetDate.getFullYear()}`;

  // 1. REAL MONTHLY TRANSACTIONS & STATS
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(monthYearStr));
  }, [transactions, monthYearStr]);

  const monthlyStats = useMemo(() => {
    const ventas = monthTransactions.filter((t) => t.type === 'venta');
    const comprasYGastos = monthTransactions.filter((t) => t.type === 'compra' || t.type === 'gasto');

    const totalVentas = ventas.reduce((acc, t) => acc + t.amount, 0);
    const totalGastos = comprasYGastos.reduce((acc, t) => acc + t.amount, 0);
    const gananciaNeta = totalVentas - totalGastos;

    // Previous month comparison
    const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevTxs = transactions.filter((t) => t.date && t.date.startsWith(prevMonthStr) && t.type === 'venta');
    const prevTotalVentas = prevTxs.reduce((acc, t) => acc + t.amount, 0);

    const diffPct = prevTotalVentas > 0
      ? ((totalVentas - prevTotalVentas) / prevTotalVentas) * 100
      : (totalVentas > 0 ? 100 : 0);
    const diffPctLabel = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(0)}% vs. mes anterior`;

    // Weekly buckets inside the month: [1-7, 8-14, 15-21, 22-28, 29-31]
    const weekBuckets = [
      { label: '1-7', min: 1, max: 7, total: 0 },
      { label: '8-14', min: 8, max: 14, total: 0 },
      { label: '15-21', min: 15, max: 21, total: 0 },
      { label: '22-28', min: 22, max: 28, total: 0 },
      { label: '29-31', min: 29, max: 31, total: 0 },
    ];

    ventas.forEach((tx) => {
      if (tx.date) {
        const day = parseInt(tx.date.split('-')[2], 10);
        const b = weekBuckets.find((w) => day >= w.min && day <= w.max);
        if (b) b.total += tx.amount;
      }
    });

    const maxWeekTotal = Math.max(...weekBuckets.map((w) => w.total), 1);
    const chartWeeks = weekBuckets.map((w, idx) => {
      const isPeak = w.total > 0 && w.total === maxWeekTotal;
      const x = 30 + idx * 62;
      const y = totalVentas > 0 ? 110 - (w.total / maxWeekTotal) * 75 : 105;
      return {
        label: `Sem. ${w.label}`,
        val: w.total,
        isPeak,
        x,
        y,
      };
    });

    const svgPath = chartWeeks.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
    const svgArea = `${svgPath} L ${chartWeeks[chartWeeks.length - 1].x} 120 L ${chartWeeks[0].x} 120 Z`;

    // Categories breakdown (from real transactions)
    const catMap: Record<string, number> = {};
    monthTransactions.forEach((tx) => {
      const cat = tx.category || 'Otros';
      catMap[cat] = (catMap[cat] || 0) + tx.amount;
    });

    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const grandTotal = totalVentas + totalGastos;

    const CIRCUMFERENCE = 238.7;
    let accumulatedOffset = 0;
    const donutCircles: Array<{ stroke: string; dash: string; offset: string }> = [];

    const categoryBreakdown = catEntries.map(([name, bs]) => {
      const pctNum = grandTotal > 0 ? (bs / grandTotal) * 100 : 0;
      const stroke = CATEGORY_COLORS[name] || '#1E70BA';
      const dashLength = (pctNum / 100) * CIRCUMFERENCE;

      donutCircles.push({
        stroke,
        dash: `${dashLength.toFixed(1)} ${CIRCUMFERENCE}`,
        offset: `-${accumulatedOffset.toFixed(1)}`,
      });
      accumulatedOffset += dashLength;

      return {
        name,
        color: stroke,
        pct: Math.round(pctNum),
        bs,
      };
    });

    // Top Products
    const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
    ventas.forEach((tx) => {
      const key = tx.title || 'Venta de mostrador';
      if (!prodMap[key]) prodMap[key] = { name: key, units: 0, revenue: 0 };
      prodMap[key].units += tx.qty || 1;
      prodMap[key].revenue += tx.amount;
    });

    const topList = Object.values(prodMap).sort((a, b) =>
      topMode === 'ingresos' ? b.revenue - a.revenue : b.units - a.units
    );

    return {
      totalVentas,
      totalGastos,
      gananciaNeta,
      diffPctLabel,
      chartWeeks,
      svgPath,
      svgArea,
      categoryBreakdown,
      donutCircles,
      topList,
      salesCount: ventas.length,
      expensesCount: comprasYGastos.length,
    };
  }, [monthTransactions, targetDate, transactions, topMode]);

  // 2. REAL WEEKLY STATS (Current 7 Days: Lun - Dom)
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
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
    const chartDays = daysData.map((d, idx) => {
      const isPeak = d.ventas > 0 && d.ventas === maxDayVal;
      const x = 20 + idx * 45;
      const y = totalVentas > 0 ? 110 - (d.ventas / maxDayVal) * 75 : 105;
      return {
        day: d.day,
        val: d.ventas,
        isPeak,
        x,
        y,
      };
    });

    const svgPath = chartDays.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
    const svgArea = `${svgPath} L ${chartDays[chartDays.length - 1].x} 120 L ${chartDays[0].x} 120 Z`;

    // Category breakdown
    const catMap: Record<string, number> = {};
    weekTxs.forEach((tx) => {
      const cat = tx.category || 'Otros';
      catMap[cat] = (catMap[cat] || 0) + tx.amount;
    });

    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const grandTotal = totalVentas + totalGastos;

    const CIRCUMFERENCE = 238.7;
    let accumulatedOffset = 0;
    const donutCircles: Array<{ stroke: string; dash: string; offset: string }> = [];

    const categoryBreakdown = catEntries.map(([name, bs]) => {
      const pctNum = grandTotal > 0 ? (bs / grandTotal) * 100 : 0;
      const stroke = CATEGORY_COLORS[name] || '#1E70BA';
      const dashLength = (pctNum / 100) * CIRCUMFERENCE;

      donutCircles.push({
        stroke,
        dash: `${dashLength.toFixed(1)} ${CIRCUMFERENCE}`,
        offset: `-${accumulatedOffset.toFixed(1)}`,
      });
      accumulatedOffset += dashLength;

      return {
        name,
        color: stroke,
        pct: Math.round(pctNum),
        bs,
      };
    });

    // Top products
    const prodMap: Record<string, { name: string; units: number; revenue: number }> = {};
    weekTxs
      .filter((t) => t.type === 'venta')
      .forEach((tx) => {
        const key = tx.title || 'Venta de mostrador';
        if (!prodMap[key]) prodMap[key] = { name: key, units: 0, revenue: 0 };
        prodMap[key].units += tx.qty || 1;
        prodMap[key].revenue += tx.amount;
      });

    const topList = Object.values(prodMap).sort((a, b) =>
      topMode === 'ingresos' ? b.revenue - a.revenue : b.units - a.units
    );

    return {
      weekTxs,
      totalVentas,
      totalGastos,
      gananciaNeta,
      chartDays,
      svgPath,
      svgArea,
      categoryBreakdown,
      donutCircles,
      topList,
      salesCount: weekTxs.filter((t) => t.type === 'venta').length,
    };
  }, [transactions, topMode]);

  // Current active data scope
  const activeStats = activeTab === 'semana' ? weeklyStats : monthlyStats;

  const [showExportModal, setShowExportModal] = useState(false);

  const getExportParams = (): ExportReportParams => {
    const txsToExport = activeTab === 'semana' ? weeklyStats.weekTxs : monthTransactions;
    const period = activeTab === 'semana' ? 'Esta Semana (Lun-Dom)' : monthDisplayName;
    return {
      title: 'Informe Contable y Balance',
      storeName: storeInfo?.name || user?.storeName || 'Mi Negocio',
      ownerName: storeInfo?.owner || user?.name || 'Administrador',
      periodLabel: period,
      transactions: txsToExport,
      summary: {
        totalIngresos: activeStats.totalVentas,
        totalGastos: activeStats.totalGastos,
        balanceNeto: activeStats.gananciaNeta,
      },
    };
  };

  const handleDownloadCsv = async () => {
    setIsExporting(true);
    const params = getExportParams();
    const res = await exportAndSaveExcel(params, 'csv');
    setIsExporting(false);
    showToast(res.message, res.success ? 'success' : 'warning');
  };

  const handleDownloadXls = async () => {
    setIsExporting(true);
    const params = getExportParams();
    const res = await exportAndSaveExcel(params, 'xls');
    setIsExporting(false);
    showToast(res.message, res.success ? 'success' : 'warning');
  };

  const handleCopyTable = async () => {
    const params = getExportParams();
    const res = await copyTransactionsToClipboard(params);
    showToast(res.message, res.success ? 'success' : 'warning');
  };

  return (
    <div className="bg-[#F6F8FA] dark:bg-[#13171D] text-[#252524] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Reportes" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-3.5">
        {/* Navigation Tabs (Semana, Mes, Productos) */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('mes')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeTab === 'mes'
                ? 'bg-[#9EC84A] text-slate-950 shadow-xs ring-2 ring-[#9EC84A]/30'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Mensual
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semana')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeTab === 'semana'
                ? 'bg-[#9EC84A] text-slate-950 shadow-xs ring-2 ring-[#9EC84A]/30'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Esta Semana
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('productos')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              activeTab === 'productos'
                ? 'bg-[#9EC84A] text-slate-950 shadow-xs ring-2 ring-[#9EC84A]/30'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Top Productos
          </button>
        </div>

        {/* Date Filter & Excel Download Bar */}
        <div className="flex items-center justify-between">
          {activeTab === 'mes' ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#1A1F26] rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
                className="material-symbols-outlined text-sm text-slate-400 hover:text-[#1E70BA] cursor-pointer"
                title="Mes anterior"
              >
                chevron_left
              </button>
              <span className="material-symbols-outlined text-[17px] text-[#1E70BA]">calendar_month</span>
              <span>{monthDisplayName}</span>
              <button
                type="button"
                disabled={selectedMonthOffset >= 0}
                onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
                className="material-symbols-outlined text-sm text-slate-400 hover:text-[#1E70BA] disabled:opacity-30 cursor-pointer"
                title="Mes siguiente"
              >
                chevron_right
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-[#1A1F26] rounded-full border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs">
              <span className="material-symbols-outlined text-[17px] text-[#1E70BA]">date_range</span>
              <span>Semana Actual (Lun - Dom)</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#EBF5EC] dark:bg-[#1B2F23] text-[#2D8A4E] dark:text-emerald-300 rounded-full border border-emerald-200 text-xs font-black hover:bg-emerald-100 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">table_view</span>
            <span>Generar Excel</span>
          </button>
        </div>

        {/* 1. VENTAS DEL PERÍODO CARD (Actual real-time figures in Bs.) */}
        <section className="bg-white dark:bg-[#1A1F26] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EBF5EC] text-[#2D8A4E] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">bar_chart</span>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {activeTab === 'semana' ? 'Ventas de la semana' : 'Ventas del mes'}
              </span>
            </div>
            <span className="text-[10px] font-black text-[#2D8A4E] bg-[#EBF5EC] dark:bg-[#1B2F23] px-2 py-0.5 rounded-full">
              {monthlyStats.diffPctLabel}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Bs. {activeStats.totalVentas.toFixed(2)}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">
                {activeStats.salesCount} {activeStats.salesCount === 1 ? 'venta registrada' : 'ventas registradas'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 block font-bold">Ganancia neta</span>
              <span
                className={`text-base font-black ${
                  activeStats.gananciaNeta >= 0 ? 'text-[#1E70BA] dark:text-[#60A5FA]' : 'text-rose-600'
                }`}
              >
                Bs. {activeStats.gananciaNeta.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* 2. EVOLUCIÓN DE VENTAS CHART (Real amounts plotted) */}
        {activeTab !== 'productos' && (
          <section className="bg-white dark:bg-[#1A1F26] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Evolución de ventas
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {activeTab === 'semana' ? 'Montos por día (Bs.)' : 'Montos por semana (Bs.)'}
              </span>
            </div>

            {/* SVG Chart with Blue Gradient and Real Points */}
            <div className="w-full h-36 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 310 130">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E70BA" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#1E70BA" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area */}
                <path d={activeStats.svgArea} fill="url(#chartGradient)" />

                {/* Line */}
                <path
                  d={activeStats.svgPath}
                  fill="none"
                  stroke="#1E70BA"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Dots and Labels */}
                {(activeTab === 'semana' ? weeklyStats.chartDays : monthlyStats.chartWeeks).map((pt: any, idx: number) => (
                  <g key={idx}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill={pt.isPeak ? '#EE6B4D' : '#1E70BA'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    {pt.val > 0 && (
                      <text
                        x={pt.x}
                        y={pt.y - 8}
                        textAnchor="middle"
                        className="text-[9px] fill-[#1E70BA] font-extrabold"
                      >
                        {pt.val.toFixed(0)}
                      </text>
                    )}
                    <text
                      x={pt.x}
                      y={126}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-bold"
                    >
                      {activeTab === 'semana' ? pt.day : pt.label.replace('Sem. ', '')}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </section>
        )}

        {/* 3. CATEGORÍAS (Real breakdown from transactions) */}
        {activeTab !== 'productos' && (
          <section className="bg-white dark:bg-[#1A1F26] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Distribución por categoría
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                {activeStats.categoryBreakdown.length} categorías
              </span>
            </div>

            {activeStats.categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No hay movimientos registrados en este período.
              </p>
            ) : (
              <div className="flex items-center gap-5">
                {/* Real SVG Donut graphic */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#E5E7EB" strokeWidth="14" />
                    {activeStats.donutCircles.map((c, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke={c.stroke}
                        strokeDasharray={c.dash}
                        strokeDashoffset={c.offset}
                        strokeWidth="14"
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold text-slate-400 leading-none">Total</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      Bs. {activeStats.totalVentas.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Category Percentages and Amounts */}
                <div className="flex-1 space-y-2">
                  {activeStats.categoryBreakdown.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        ></span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-slate-900 dark:text-white">
                          {cat.pct}%
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Bs. {cat.bs.toFixed(0)})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. TOP PRODUCTOS LIST (Real-time ranked by units or revenue) */}
        {(activeTab === 'productos' || activeTab === 'mes') && (
          <section className="bg-white dark:bg-[#1A1F26] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Productos más vendidos
              </h3>
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setTopMode('ingresos')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    topMode === 'ingresos' ? 'bg-white text-[#1E70BA] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Por Bs.
                </button>
                <button
                  type="button"
                  onClick={() => setTopMode('unidades')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    topMode === 'unidades' ? 'bg-white text-[#1E70BA] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Por u.
                </button>
              </div>
            </div>

            {activeStats.topList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No hay ventas de productos registradas en este período.
              </p>
            ) : (
              <div className="space-y-2">
                {activeStats.topList.slice(0, 5).map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#EAF2F9] text-[#1E70BA] font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-xs text-[#2D8A4E]">
                        Bs. {p.revenue.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {p.units} {p.units === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ================= MODAL: EXPORTAR A EXCEL ================= */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[88dvh] overflow-y-auto overscroll-contain modal-bottom-sheet flex flex-col"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#2D8A4E] text-white rounded-t-3xl sm:rounded-t-3xl flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">table_view</span>
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Exportar Resumen de Ventas</h3>
                  <p className="text-[11px] text-emerald-100">
                    {activeTab === 'semana' ? 'Esta Semana (Lun-Dom)' : monthDisplayName} • {activeStats.totalVentas.toFixed(2)} Bs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 flex-1">
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-[#EBF5EC] dark:bg-[#1B2F23] border border-emerald-200/60">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Ventas</span>
                  <span className="text-xs sm:text-sm font-black text-[#2D8A4E] dark:text-emerald-300">
                    Bs. {activeStats.totalVentas.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FDEFEA] dark:bg-[#341F1A] border border-orange-200/60">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Salidas</span>
                  <span className="text-xs sm:text-sm font-black text-[#EE6B4D]">
                    Bs. {activeStats.totalGastos.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#EAF2F9] dark:bg-[#162738] border border-blue-200/60">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">Balance</span>
                  <span className="text-xs sm:text-sm font-black text-[#1E70BA] dark:text-[#60A5FA]">
                    Bs. {activeStats.gananciaNeta.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Opciones de Descarga
                </label>

                {/* Option 1: CSV for Excel */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadCsv}
                  className="w-full p-3 rounded-2xl bg-gradient-to-br from-[#EBF5EC] to-[#ddf0df] dark:from-[#1B2F23] dark:to-[#14231a] border-2 border-emerald-400/50 hover:border-emerald-500 transition-all flex items-center justify-between text-left cursor-pointer shadow-xs active:scale-98 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2D8A4E] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl font-bold">description</span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                        Descargar archivo CSV para Excel
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        Compatible con Excel, Sheets y móvil (UTF-8 con tildes)
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-emerald-600 text-xl">download</span>
                </button>

                {/* Option 2: XLS Formatted */}
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadXls}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-[#20252D] border-2 border-slate-200 dark:border-slate-700 hover:border-[#1E70BA] transition-all flex items-center justify-between text-left cursor-pointer shadow-xs active:scale-98 group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E70BA] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl font-bold">table_chart</span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                        Descargar formato Excel (.xls con colores)
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Tabla estilizada con diseño oficial de Metrika
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[#1E70BA] text-xl">download</span>
                </button>

                {/* Option 3: Copy to clipboard */}
                <button
                  type="button"
                  onClick={handleCopyTable}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-[#20252D] border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-all flex items-center justify-between text-left cursor-pointer shadow-xs active:scale-98 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl">content_copy</span>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                        Copiar tabla al portapapeles
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Para pegar directo en Excel con Ctrl + V
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-500 text-xl">copy_all</span>
                </button>
              </div>

              {/* Transactions Preview Table */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Vista previa ({activeTab === 'semana' ? weeklyStats.weekTxs.length : monthTransactions.length} registros)
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold sticky top-0 text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-1.5">Fecha</th>
                        <th className="p-1.5">Detalle</th>
                        <th className="p-1.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(activeTab === 'semana' ? weeklyStats.weekTxs : monthTransactions).map((tx) => (
                        <tr key={tx.id} className="text-[11px]">
                          <td className="p-1.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{tx.date}</td>
                          <td className="p-1.5 font-semibold truncate max-w-[150px]">{tx.title}</td>
                          <td className={`p-1.5 text-right font-black whitespace-nowrap ${tx.type === 'venta' ? 'text-[#2D8A4E]' : 'text-[#EE6B4D]'}`}>
                            {tx.type === 'venta' ? '+' : '-'}Bs. {tx.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};