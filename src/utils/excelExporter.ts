import { Transaction } from '../types';

export interface ExportReportParams {
  title: string;
  storeName: string;
  ownerName?: string;
  periodLabel: string;
  transactions: Transaction[];
  summary?: {
    totalIngresos: number;
    totalGastos: number;
    balanceNeto: number;
  };
}

/**
 * Escapes characters for CSV format. If value contains delimiter, quotes or newline,
 * it wraps the string in double quotes and escapes existing quotes.
 */
function escapeCsv(val: string | number | undefined, delimiter = ';'): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates standard CSV with UTF-8 BOM (\uFEFF) and semicolon (;) delimiter.
 * Semicolon is the standard delimiter in Spanish/Latin American Excel versions
 * where comma is used as decimal separator. Opens without any warning or dialog.
 */
export function generateCsv(params: ExportReportParams): string {
  const { title, storeName, ownerName, periodLabel, transactions, summary } = params;

  const now = new Date();
  const exportDateStr = now.toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const exportTimeStr = now.toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalIng = summary?.totalIngresos ?? transactions
    .filter((t) => t.type === 'venta')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalGast = summary?.totalGastos ?? transactions
    .filter((t) => t.type === 'compra' || t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = summary?.balanceNeto ?? (totalIng - totalGast);

  const lines: string[] = [];

  // BOM for Excel UTF-8 recognition
  const BOM = '\uFEFF';

  // Header Title Info
  lines.push(`${escapeCsv(title)} - ${escapeCsv(storeName)};;;;;;;`);
  lines.push(`Propietario: ${escapeCsv(ownerName || 'Administrador')};Período: ${escapeCsv(periodLabel)};Generado el: ${exportDateStr} a las ${exportTimeStr};;;;;`);
  lines.push(';;;;;;;');

  // Column Headers
  lines.push([
    'N°',
    'Fecha',
    'Hora',
    'Tipo',
    'Categoría',
    'Detalle / Producto',
    'Método',
    'Monto (Bs.)',
  ].join(';'));

  // Data Rows
  transactions.forEach((tx, idx) => {
    const isVenta = tx.type === 'venta';
    const typeLabel = isVenta ? 'VENTA (+)' : tx.type === 'compra' ? 'COMPRA (-)' : 'GASTO (-)';
    const metodo = (tx.detail?.toLowerCase().includes('qr') || tx.title?.toLowerCase().includes('qr')) ? 'QR' : 'Efectivo';
    const amountVal = tx.amount.toFixed(2);

    lines.push([
      escapeCsv(idx + 1),
      escapeCsv(tx.date || ''),
      escapeCsv(tx.time || ''),
      escapeCsv(typeLabel),
      escapeCsv(tx.category || 'General'),
      escapeCsv(tx.title || 'Transacción'),
      escapeCsv(metodo),
      escapeCsv(amountVal),
    ].join(';'));
  });

  // Totals Summary
  lines.push(';;;;;;;');
  lines.push(`;;;;;;Total Ingresos (+):;Bs. ${totalIng.toFixed(2)}`);
  lines.push(`;;;;;;Total Salidas (-):;Bs. ${totalGast.toFixed(2)}`);
  lines.push(`;;;;;;BALANCE NETO:;Bs. ${balance.toFixed(2)}`);

  return BOM + lines.join('\r\n');
}

/**
 * Generates TSV (Tab-Separated Values) format perfect for copying and pasting
 * directly into Excel or Google Sheets (Ctrl + V).
 */
export function generateTsv(params: ExportReportParams): string {
  const { transactions } = params;
  const lines: string[] = [];

  lines.push(['N°', 'Fecha', 'Hora', 'Tipo', 'Categoría', 'Detalle', 'Método', 'Monto (Bs.)'].join('\t'));

  transactions.forEach((tx, idx) => {
    const isVenta = tx.type === 'venta';
    const typeLabel = isVenta ? 'VENTA' : tx.type === 'compra' ? 'COMPRA' : 'GASTO';
    const metodo = (tx.detail?.toLowerCase().includes('qr') || tx.title?.toLowerCase().includes('qr')) ? 'QR' : 'Efectivo';

    lines.push([
      idx + 1,
      tx.date || '',
      tx.time || '',
      typeLabel,
      tx.category || 'General',
      tx.title || 'Transacción',
      metodo,
      tx.amount.toFixed(2),
    ].join('\t'));
  });

  return lines.join('\n');
}

/**
 * Copies transactions table directly to clipboard so the user can paste it in Excel.
 */
export async function copyTransactionsToClipboard(params: ExportReportParams): Promise<{ success: boolean; message: string }> {
  try {
    if (params.transactions.length === 0) {
      return { success: false, message: 'No hay transacciones para copiar.' };
    }
    const tsv = generateTsv(params);
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(tsv);
      return {
        success: true,
        message: '¡Tabla copiada! Abre Excel o Google Sheets y presiona Ctrl+V para pegarla.',
      };
    }
    return { success: false, message: 'El portapapeles no está disponible en este dispositivo.' };
  } catch (err: any) {
    return { success: false, message: 'No se pudo copiar al portapapeles.' };
  }
}

/**
 * Generates an Excel HTML-Spreadsheet (.xls) with full formatting, colors, and styling.
 */
function generateExcelHtml(params: ExportReportParams): string {
  const { title, storeName, ownerName, periodLabel, transactions, summary } = params;

  const totalIng = summary?.totalIngresos ?? transactions
    .filter((t) => t.type === 'venta')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalGast = summary?.totalGastos ?? transactions
    .filter((t) => t.type === 'compra' || t.type === 'gasto')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = summary?.balanceNeto ?? (totalIng - totalGast);

  let rowsHtml = '';
  transactions.forEach((tx, idx) => {
    const isVenta = tx.type === 'venta';
    const typeLabel = isVenta ? 'VENTA (+)' : tx.type === 'compra' ? 'COMPRA (-)' : 'GASTO (-)';
    const color = isVenta ? '#15803d' : '#b91c1c';
    const metodo = (tx.detail?.toLowerCase().includes('qr') || tx.title?.toLowerCase().includes('qr')) ? 'QR' : 'Efectivo';

    rowsHtml += `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${tx.date || ''}</td>
        <td>${tx.time || ''}</td>
        <td style="font-weight:bold; color:${color};">${typeLabel}</td>
        <td>${tx.category || 'General'}</td>
        <td>${tx.title || 'Transacción'}</td>
        <td style="text-align:center;">${metodo}</td>
        <td style="text-align:right; font-weight:bold; color:${color};">Bs. ${tx.amount.toFixed(2)}</td>
      </tr>`;
  });

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Ventas y Balance</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Calibri, sans-serif; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #1E70BA; color: #ffffff; padding: 10px; font-weight: bold; border: 1px solid #cbd5e1; }
      td { padding: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
      .header-title { font-size: 18px; font-weight: bold; color: #1E70BA; }
      .header-sub { font-size: 12px; color: #64748b; font-style: italic; }
      .total-label { font-weight: bold; text-align: right; background-color: #f8fafc; }
      .total-val { font-weight: bold; text-align: right; font-size: 14px; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="8" class="header-title">${title} - ${storeName}</td>
      </tr>
      <tr>
        <td colspan="8" class="header-sub">Propietario: ${ownerName || 'Administrador'} | Período: ${periodLabel}</td>
      </tr>
      <tr><td colspan="8"></td></tr>
      <thead>
        <tr>
          <th>N°</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Tipo</th>
          <th>Categoría</th>
          <th>Detalle / Producto</th>
          <th>Método</th>
          <th>Monto</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr><td colspan="8"></td></tr>
        <tr>
          <td colspan="6"></td>
          <td class="total-label">Total Ingresos (+):</td>
          <td class="total-val" style="color:#15803d;">Bs. ${totalIng.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="6"></td>
          <td class="total-label">Total Salidas (-):</td>
          <td class="total-val" style="color:#b91c1c;">Bs. ${totalGast.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="6"></td>
          <td class="total-label" style="background:#e0f2fe; color:#0369a1;">BALANCE NETO:</td>
          <td class="total-val" style="background:#e0f2fe; color:#0369a1;">Bs. ${balance.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

/**
 * Downloads or shares the generated Excel or CSV file.
 * Handles desktop browsers, mobile Chrome, and Android WebView with automatic fallback.
 */
export async function exportAndSaveExcel(
  params: ExportReportParams,
  format: 'csv' | 'xls' = 'csv',
  preferredFileName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (params.transactions.length === 0) {
      return { success: false, message: 'No hay transacciones en este período para exportar.' };
    }

    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cleanStore = (params.storeName || 'metrika').replace(/[^a-zA-Z0-9_-]/g, '_');

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      content = generateCsv(params);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      content = generateExcelHtml(params);
      mimeType = 'application/vnd.ms-excel;charset=utf-8;';
      extension = 'xls';
    }

    const filename = preferredFileName || `Resumen_${cleanStore}_${dateStamp}.${extension}`;
    const blob = new Blob([content], { type: mimeType });

    // 1. Mobile Web Share API
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Resumen de Ventas - ${params.storeName}`,
            text: `Informe de ventas y balance de ${params.storeName} (${params.periodLabel}).`,
          });
          return {
            success: true,
            message: '¡Archivo generado! Selecciona guardar o enviar por WhatsApp/Drive.',
          };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, message: 'Descarga cancelada.' };
        }
      }
    }

    // 2. Direct browser download trigger
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2500);

    return {
      success: true,
      message: `¡Archivo "${filename}" descargado con éxito!`,
    };
  } catch (err: any) {
    console.error('Error al exportar archivo:', err);
    return {
      success: false,
      message: 'Ocurrió un error al generar el archivo. Puedes copiar la tabla al portapapeles.',
    };
  }
}
