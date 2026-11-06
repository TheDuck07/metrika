import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { exportAndSaveExcel } from '../utils/excelExporter';
import {
  getTodayDateStr,
  getYesterdayDateStr,
  formatDateToDisplay,
  formatDisplayToIso,
  getFirstDayOfMonthStr,
} from '../utils/dateUtils';

export const HistorialScreen: React.FC = () => {
  const { transactions, storeInfo, showToast } = useStore();

  const todayStr = getTodayDateStr();
  const yesterdayStr = getYesterdayDateStr();
  const firstDayStr = getFirstDayOfMonthStr();

  const [startDate, setStartDate] = useState<string>(() => formatDateToDisplay(yesterdayStr));
  const [endDate, setEndDate] = useState<string>(() => formatDateToDisplay(todayStr));
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarPreset, setCalendarPreset] = useState<'both' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('both');
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);

  // Custom date picker inputs
  const [customStartIso, setCustomStartIso] = useState<string>(yesterdayStr);
  const [customEndIso, setCustomEndIso] = useState<string>(todayStr);

  const startIso = useMemo(() => formatDisplayToIso(startDate), [startDate]);
  const endIso = useMemo(() => formatDisplayToIso(endDate), [endDate]);

  // Filter transactions within the active range
  const filteredTxs = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      return t.date >= startIso && t.date <= endIso;
    });
  }, [transactions, startIso, endIso]);

  // Calculate totals based on visible transactions
  const { totalIncome, totalExpense, salesCount, expenseDetail } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;

    filteredTxs.forEach((t) => {
      if (t.type === 'venta') {
        income += t.amount;
        count++;
      } else {
        expense += t.amount;
      }
    });

    let detail = 'Mercadería y servicios';
    if (calendarPreset === 'today') detail = 'Movimientos de hoy';
    else if (calendarPreset === 'yesterday') detail = 'Movimientos de ayer';
    else if (calendarPreset === 'month') detail = 'Total del mes';

    return { totalIncome: income, totalExpense: expense, salesCount: count, expenseDetail: detail };
  }, [filteredTxs, calendarPreset]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof transactions> = {};
    filteredTxs.forEach((tx) => {
      const d = tx.date || todayStr;
      if (!groups[d]) groups[d] = [];
      groups[d].push(tx);
    });

    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTxs, todayStr]);

  const handleApplyPreset = (preset: 'both' | 'today' | 'yesterday' | 'week' | 'month') => {
    setCalendarPreset(preset);
    let s = startDate;
    let e = endDate;

    if (preset === 'today') {
      s = formatDateToDisplay(todayStr);
      e = formatDateToDisplay(todayStr);
    } else if (preset === 'yesterday') {
      s = formatDateToDisplay(yesterdayStr);
      e = formatDateToDisplay(yesterdayStr);
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      s = formatDateToDisplay(d.toISOString().split('T')[0]);
      e = formatDateToDisplay(todayStr);
    } else if (preset === 'both') {
      s = formatDateToDisplay(yesterdayStr);
      e = formatDateToDisplay(todayStr);
    } else {
      s = formatDateToDisplay(firstDayStr);
      e = formatDateToDisplay(todayStr);
    }

    setStartDate(s);
    setEndDate(e);
    setCustomStartIso(formatDisplayToIso(s));
    setCustomEndIso(formatDisplayToIso(e));
    setShowCalendarModal(false);
    showToast(`Filtro aplicado: ${s} al ${e}`);
  };

  const handleApplyCustomDates = () => {
    if (!customStartIso || !customEndIso) {
      showToast('Selecciona fecha de inicio y fin', 'warning');
      return;
    }
    if (customStartIso > customEndIso) {
      showToast('La fecha "Desde" no puede ser mayor que "Hasta"', 'warning');
      return;
    }
    const s = formatDateToDisplay(customStartIso);
    const e = formatDateToDisplay(customEndIso);
    setStartDate(s);
    setEndDate(e);
    setCalendarPreset('custom');
    setShowCalendarModal(false);
    showToast(`Filtro personalizado: ${s} al ${e}`);
  };

  // Real Excel export with mobile save dialog
  const handleDownloadReport = async () => {
    if (filteredTxs.length === 0) {
      showToast('No hay transacciones en el rango para exportar', 'warning');
      return;
    }

    const res = await exportAndSaveExcel(
      {
        title: 'Historial de Transacciones',
        storeName: storeInfo?.name || 'Mi Negocio',
        ownerName: storeInfo?.owner || 'Administrador',
        periodLabel: `Del ${startDate} al ${endDate}`,
        transactions: filteredTxs,
        summary: {
          totalIngresos: totalIncome,
          totalGastos: totalExpense,
          balanceNeto: totalIncome - totalExpense,
        },
      },
      `Historial_Metrika_${startDate.replace(/\//g, '-')}_al_${endDate.replace(/\//g, '-')}.xls`
    );

    showToast(res.message, res.success ? 'success' : 'warning');
  };

  // Real WhatsApp sharing
  const handleShareWhatsApp = () => {
    if (filteredTxs.length === 0) {
      showToast('No hay movimientos en este rango para compartir', 'warning');
      return;
    }

    const netBalance = totalIncome - totalExpense;
    const msg = `📊 *REPORTE DE MOVIMIENTOS - METRIKA*
📅 *Período:* ${startDate} al ${endDate}
----------------------------------
🟢 *Ventas (Ingresos):* +Bs. ${totalIncome.toFixed(2)} (${salesCount} ventas)
🔴 *Compras y Gastos:* -Bs. ${totalExpense.toFixed(2)}
----------------------------------
💵 *BALANCE NETO:* ${netBalance >= 0 ? '+' : ''}Bs. ${netBalance.toFixed(2)}
📋 *Total Operaciones:* ${filteredTxs.length} registros

_Generado automáticamente desde Metrika._`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    showToast('Abriendo WhatsApp con el balance...', 'success');
  };

  const getDateLabel = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hoy';
    if (dateStr === yesterdayStr) return 'Ayer';
    return formatDateToDisplay(dateStr);
  };

  return (
    <div className="bg-[#fff8f5] dark:bg-[#171210] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col select-none relative pb-48 transition-colors">
      <AppHeader title="Historial" />

      {/* Selector de Rango de Fechas y Resumen Fijo */}
      <section className="flex-none w-full bg-[#fff8f5] dark:bg-[#171210] z-30 px-4 pt-2 pb-3 space-y-2 border-b border-[#eae1dd]/60 dark:border-stone-800 shadow-[0_2px_8px_rgba(0,0,0,0.02)] max-w-md mx-auto transition-colors">
        <div className="bg-white dark:bg-[#231b17] rounded-xl p-2.5 shadow-xs border border-[#dec0b7]/40 dark:border-stone-800 flex items-center gap-2">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[11px] text-[#57423b] dark:text-stone-300 font-bold tracking-wider uppercase px-0.5">
              Desde
            </span>
            <button
              id="btn-date-start"
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="w-full h-10 px-2.5 bg-[#fbf2ee] dark:bg-[#2c221e] hover:bg-[#f5ece8] dark:hover:bg-[#382b26] border border-[#dec0b7]/40 dark:border-stone-700 rounded-xl flex items-center justify-between gap-1.5 text-[#1f1b19] dark:text-stone-100 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[#9f3c16] dark:text-[#ff9973] text-[18px] shrink-0">
                  calendar_month
                </span>
                <span id="btn-date-start-text" className="font-bold text-[13px] truncate">
                  {startDate}
                </span>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[18px] shrink-0">
                expand_more
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center pt-4 text-[#8a726a] dark:text-stone-400 shrink-0">
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[11px] text-[#57423b] dark:text-stone-300 font-bold tracking-wider uppercase px-0.5">
              Hasta
            </span>
            <button
              id="btn-date-end"
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="w-full h-10 px-2.5 bg-[#fbf2ee] dark:bg-[#2c221e] hover:bg-[#f5ece8] dark:hover:bg-[#382b26] border border-[#dec0b7]/40 dark:border-stone-700 rounded-xl flex items-center justify-between gap-1.5 text-[#1f1b19] dark:text-stone-100 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[#9f3c16] dark:text-[#ff9973] text-[18px] shrink-0">
                  calendar_month
                </span>
                <span id="btn-date-end-text" className="font-bold text-[13px] truncate">
                  {endDate}
                </span>
              </div>
              <span className="material-symbols-outlined text-[#8a726a] dark:text-stone-400 text-[18px] shrink-0">
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* Tarjetas de Resumen (Ingresos y Egresos del período) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tarjeta 1: Total Ingresos */}
          <div className="bg-white rounded-xl p-3 shadow-xs border border-[#dec0b7]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#57423b]">Ventas Totales</span>
              <div className="w-6 h-6 rounded-full bg-[#b1f0d4] text-[#0f513c] flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
              </div>
            </div>
            <div>
              <p id="summary-income" className="text-xl font-extrabold text-[#2a6651] tracking-tight">
                + Bs. {totalIncome.toFixed(2).replace('.', ',')}
              </p>
              <p id="summary-income-sales" className="text-[11px] text-[#57423b] truncate">
                {salesCount} {salesCount === 1 ? 'venta realizada' : 'ventas realizadas'}
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Total Egresos */}
          <div className="bg-white rounded-xl p-3 shadow-xs border border-[#dec0b7]/40 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#57423b]">Salidas Totales</span>
              <div className="w-6 h-6 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">trending_down</span>
              </div>
            </div>
            <div>
              <p id="summary-expense" className="text-xl font-extrabold text-[#ba1a1a] tracking-tight">
                - Bs. {totalExpense.toFixed(2).replace('.', ',')}
              </p>
              <p id="summary-expense-detail" className="text-[11px] text-[#57423b] truncate">
                {expenseDetail}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Área de Scroll Vertical: Historial agrupado por fecha real */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 space-y-4 overflow-y-auto">
        {groupedTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-[#dec0b7]/40 space-y-2 mt-4">
            <span className="material-symbols-outlined text-[40px] text-[#8a726a]">receipt_long</span>
            <h4 className="font-bold text-sm text-[#1f1b19]">Sin movimientos en este período</h4>
            <p className="text-xs text-[#57423b]">
              No se registraron ventas ni gastos entre el {startDate} y el {endDate}.
            </p>
          </div>
        ) : (
          groupedTransactions.map(([dateKey, txs]) => (
            <section key={dateKey} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      dateKey === todayStr
                        ? 'bg-[#ffdbcf] text-[#390c00]'
                        : dateKey === yesterdayStr
                        ? 'bg-[#eae1dd] text-[#57423b]'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {getDateLabel(dateKey)}
                  </span>
                  <span className="text-[13px] text-[#1f1b19] font-bold">
                    {formatDateToDisplay(dateKey)}
                  </span>
                </div>
                <span className="text-[11px] text-[#57423b]">
                  {txs.length} {txs.length === 1 ? 'movimiento' : 'movimientos'}
                </span>
              </div>

              <div className="bg-white rounded-xl shadow-xs border border-[#dec0b7]/30 divide-y divide-[#eae1dd]/60 overflow-hidden">
                {txs.map((tx) => {
                  const isIncome = tx.type === 'venta';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 flex items-center justify-between gap-2 hover:bg-[#fbf2ee] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.type === 'gasto'
                              ? 'bg-[#ffddb8] text-[#855300]'
                              : isIncome
                              ? 'bg-[#b1f0d4] text-[#0f513c]'
                              : 'bg-[#ffdad6] text-[#ba1a1a]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {tx.type === 'gasto' ? 'bolt' : isIncome ? 'north_east' : 'south_west'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span
                              className={`text-[11px] uppercase font-bold ${
                                tx.type === 'gasto'
                                  ? 'text-[#855300]'
                                  : isIncome
                                  ? 'text-[#2a6651]'
                                  : 'text-[#ba1a1a]'
                              }`}
                            >
                              {tx.type === 'venta'
                                ? 'Venta'
                                : tx.type === 'compra'
                                ? 'Compra Proveedor'
                                : 'Gasto Fijo'}
                            </span>
                            <span className="text-[#8a726a] text-[11px]">• {tx.time}</span>
                            {tx.receiptImage && (
                              <button
                                type="button"
                                onClick={() => setSelectedReceiptImage(tx.receiptImage || null)}
                                className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 hover:bg-emerald-200 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[12px]">receipt_long</span>
                                Comprobante
                              </button>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-[#1f1b19] truncate">{tx.title}</h4>
                          <span className="text-[11px] text-[#57423b]">{tx.detail}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`text-base font-extrabold ${
                            isIncome ? 'text-[#2a6651]' : 'text-[#ba1a1a]'
                          }`}
                        >
                          {isIncome ? `+${tx.amount.toFixed(2)} Bs.` : `-${tx.amount.toFixed(2)} Bs.`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Momento Agradable: Cierre del Día */}
        <section className="bg-gradient-to-r from-[#ffddb8]/40 to-[#f5ece8] p-3 rounded-xl flex items-center gap-3 border border-[#dec0b7]/40">
          <div className="w-10 h-10 rounded-full bg-[#fea619] text-[#684000] flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#1f1b19]">Caja balanceada</p>
            <p className="text-[11px] text-[#57423b]" id="reconciled-text">
              {filteredTxs.length} transacciones verificadas en el rango seleccionado.
            </p>
          </div>
        </section>
      </main>

      {/* Barra de Acciones Fija: Descarga Real de Excel y Enlace WhatsApp */}
      <div className="fixed bottom-20 left-0 right-0 z-40 bg-[#fff8f5]/95 dark:bg-[#1a1412]/95 backdrop-blur-md border-t border-[#eae1dd] dark:border-stone-800 px-4 py-2.5 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-1.5 max-w-md mx-auto w-full">
          <button
            id="btn-download-report"
            type="button"
            onClick={handleDownloadReport}
            className="w-full h-11 bg-[#fea619] hover:bg-[#f59e0b] text-[#2c1e19] rounded-xl flex items-center justify-center gap-2 text-sm font-extrabold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">file_download</span>
            <span>Descargar Reporte en Excel (CSV)</span>
          </button>
          <button
            id="btn-share-report"
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full h-10 bg-white dark:bg-[#201814] hover:bg-[#f5ece8] dark:hover:bg-[#2b1f1a] text-[#9f3c16] dark:text-[#ff9973] border border-[#dec0b7] dark:border-stone-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            <span>Enviar Balance por WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Modal Preview Comprobante Adjunto */}
      {selectedReceiptImage && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f1815] text-[#1f1b19] dark:text-stone-100 rounded-3xl p-4 max-w-sm w-full space-y-3 shadow-2xl border border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9f3c16] dark:text-[#ff9973]">document_scanner</span>
                <h4 className="text-sm font-extrabold text-[#1f1b19] dark:text-stone-100">Comprobante Escaneado</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptImage(null)}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-900 max-h-80 flex items-center justify-center">
              <img
                src={selectedReceiptImage}
                alt="Comprobante"
                className="max-h-76 w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedReceiptImage(null)}
              className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-bold cursor-pointer"
            >
              Cerrar vista
            </button>
          </div>
        </div>
      )}

      {/* Modal Calendario con Selección Dinámica de Rango */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center">
          <div className="bg-white dark:bg-[#1f1815] text-[#1f1b19] dark:text-stone-100 w-full max-w-md rounded-t-3xl p-5 shadow-2xl border-t border-stone-200 dark:border-stone-800 space-y-3.5 max-h-[88vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-[#dec0b7] dark:bg-stone-700 rounded-full mx-auto mb-1"></div>

            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="font-bold text-base text-[#1f1b19] dark:text-stone-100">Período de Consulta</h3>
                <p className="text-xs text-[#7a5a4e] dark:text-stone-400">Elige un atajo o ingresa fechas específicas</p>
              </div>
              <button
                type="button"
                id="calendar-close-btn"
                onClick={() => setShowCalendarModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Atajos Rápidos */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-[#57423b] tracking-wider block">
                Atajos Frecuentes
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('today')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    calendarPreset === 'today'
                      ? 'bg-[#9f3c16] text-white shadow-xs'
                      : 'bg-[#f5ece8] text-[#57423b] hover:bg-[#eae1dd]'
                  }`}
                >
                  <span>Solo Hoy</span>
                  <span className="text-[10px] opacity-80">{formatDateToDisplay(todayStr)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('yesterday')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    calendarPreset === 'yesterday'
                      ? 'bg-[#9f3c16] text-white shadow-xs'
                      : 'bg-[#f5ece8] text-[#57423b] hover:bg-[#eae1dd]'
                  }`}
                >
                  <span>Solo Ayer</span>
                  <span className="text-[10px] opacity-80">{formatDateToDisplay(yesterdayStr)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('both')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    calendarPreset === 'both'
                      ? 'bg-[#9f3c16] text-white shadow-xs'
                      : 'bg-[#f5ece8] text-[#57423b] hover:bg-[#eae1dd]'
                  }`}
                >
                  <span>Ayer y Hoy</span>
                  <span className="text-[10px] opacity-80">2 días</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('week')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between cursor-pointer ${
                    calendarPreset === 'week'
                      ? 'bg-[#9f3c16] text-white shadow-xs'
                      : 'bg-[#f5ece8] text-[#57423b] hover:bg-[#eae1dd]'
                  }`}
                >
                  <span>Últimos 7 días</span>
                  <span className="text-[10px] opacity-80">Semana</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApplyPreset('month')}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  calendarPreset === 'month'
                    ? 'bg-[#9f3c16] text-white shadow-xs'
                    : 'bg-[#f5ece8] text-[#57423b] hover:bg-[#eae1dd]'
                }`}
              >
                <span>Consultar Todo el Mes en Curso</span>
              </button>
            </div>

            {/* Selector de Rango Personalizado con HTML5 Date Inputs */}
            <div className="bg-[#fbf2ee] rounded-2xl p-3.5 space-y-3 border border-[#dec0b7]/40">
              <span className="text-[11px] font-bold uppercase text-[#57423b] tracking-wider block">
                O Elige Fechas Específicas
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-[#57423b] mb-1">Desde fecha</label>
                  <input
                    type="date"
                    value={customStartIso}
                    onChange={(e) => setCustomStartIso(e.target.value)}
                    className="w-full bg-white rounded-xl px-2.5 py-2 text-xs font-bold text-[#1f1b19] border border-[#dec0b7] focus:ring-0 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-[#57423b] mb-1">Hasta fecha</label>
                  <input
                    type="date"
                    value={customEndIso}
                    onChange={(e) => setCustomEndIso(e.target.value)}
                    className="w-full bg-white rounded-xl px-2.5 py-2 text-xs font-bold text-[#1f1b19] border border-[#dec0b7] focus:ring-0 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="w-full h-11 bg-[#bd532b] hover:bg-[#a94822] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">check</span>
                Aplicar Rango Personalizado
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                id="calendar-cancel-btn"
                onClick={() => setShowCalendarModal(false)}
                className="w-full h-10 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
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
