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
 * Generates an Excel-compatible XML Spreadsheet (.xls) with formatting,
 * currency types, and totals.
 */
function generateExcelXml(params: ExportReportParams): string {
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

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#1F1B19"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#9F3C16"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#57423B"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#9F3C16"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#DEC0B7"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#BD532B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAE1DD"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyVenta">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAE1DD"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#0F513C"/>
   <NumberFormat ss:Format="&quot;Bs. &quot;#,##0.00"/>
  </Style>
  <Style ss:ID="CurrencyGasto">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EAE1DD"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#B91C1C"/>
   <NumberFormat ss:Format="&quot;Bs. -&quot;#,##0.00"/>
  </Style>
  <Style ss:ID="TotalLabel">
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#9F3C16"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1F1B19"/>
  </Style>
  <Style ss:ID="TotalValue">
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#9F3C16"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#9F3C16"/>
   <NumberFormat ss:Format="&quot;Bs. &quot;#,##0.00"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Transacciones">
  <Table ss:ExpandedColumnCount="8" ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="85"/>
   <Column ss:Width="70"/>
   <Column ss:Width="80"/>
   <Column ss:Width="110"/>
   <Column ss:Width="240"/>
   <Column ss:Width="80"/>
   <Column ss:Width="95"/>

   <!-- Titulo -->
   <Row ss:Height="26">
    <Cell ss:MergeAcross="7" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(title)} - ${escapeXml(storeName)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="7" ss:StyleID="SubTitle"><Data ss:Type="String">Propietario: ${escapeXml(ownerName || 'Administrador')} | Período: ${escapeXml(periodLabel)} | Generado el: ${exportDateStr} a las ${exportTimeStr}</Data></Cell>
   </Row>
   <Row ss:Height="12"></Row>

   <!-- Encabezados de Columna -->
   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">N°</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Hora</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Tipo</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Categoría</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Detalle / Producto</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Método</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Monto (Bs.)</Data></Cell>
   </Row>
`;

  // Filas de datos
  transactions.forEach((tx, idx) => {
    const isVenta = tx.type === 'venta';
    const typeLabel = isVenta ? 'VENTA (+)' : tx.type === 'compra' ? 'COMPRA (-)' : 'GASTO (-)';
    const styleCurrency = isVenta ? 'CurrencyVenta' : 'CurrencyGasto';
    const metodo = (tx.detail?.toLowerCase().includes('qr') || tx.title?.toLowerCase().includes('qr')) ? 'QR' : 'Efectivo';

    xml += `   <Row>
    <Cell ss:StyleID="DataRow"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(tx.date || '')}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(tx.time || '')}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(typeLabel)}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(tx.category || 'General')}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(tx.title || 'Transacción')}</Data></Cell>
    <Cell ss:StyleID="DataRow"><Data ss:Type="String">${escapeXml(metodo)}</Data></Cell>
    <Cell ss:StyleID="${styleCurrency}"><Data ss:Type="Number">${tx.amount.toFixed(2)}</Data></Cell>
   </Row>\n`;
  });

  // Espacio y Resumen
  xml += `   <Row ss:Height="12"></Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="5"></Cell>
    <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Total Ingresos (+):</Data></Cell>
    <Cell ss:StyleID="CurrencyVenta"><Data ss:Type="Number">${totalIng.toFixed(2)}</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:MergeAcross="5"></Cell>
    <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">Total Salidas (-):</Data></Cell>
    <Cell ss:StyleID="CurrencyGasto"><Data ss:Type="Number">${totalGast.toFixed(2)}</Data></Cell>
   </Row>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="5"></Cell>
    <Cell ss:StyleID="TotalLabel"><Data ss:Type="String">BALANCE NETO:</Data></Cell>
    <Cell ss:StyleID="TotalValue"><Data ss:Type="Number">${balance.toFixed(2)}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;

  return xml;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Downloads or shares the generated Excel file.
 * On mobile/Android: uses Web Share API so the user can choose where to save
 * (Google Drive, Downloads, SD Card, WhatsApp, Excel app).
 * Fallback: standard browser file download.
 */
export async function exportAndSaveExcel(
  params: ExportReportParams,
  preferredFileName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (params.transactions.length === 0) {
      return { success: false, message: 'No hay transacciones en este período para exportar.' };
    }

    const xmlContent = generateExcelXml(params);
    const blob = new Blob([xmlContent], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });

    const now = new Date();
    const dateStamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const cleanStoreName = (params.storeName || 'metrika').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = preferredFileName || `Informe_${cleanStoreName}_${dateStamp}.xls`;

    const file = new File([blob], filename, {
      type: 'application/vnd.ms-excel',
      lastModified: Date.now(),
    });

    // 1. Check if native Web Share is supported with files (Mobile Android / iOS)
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `Informe Excel - ${params.storeName}`,
          text: `Informe contable de ${params.storeName} (${params.periodLabel}).`,
        });
        return {
          success: true,
          message: '¡Informe generado! Selecciona dónde deseas guardarlo o compartirlo.',
        };
      } catch (shareErr: any) {
        // User cancelled share dialog or dismissed it
        if (shareErr.name === 'AbortError') {
          return { success: true, message: 'Descarga cancelada por el usuario.' };
        }
        // If sharing failed, fallback to direct download below
      }
    }

    // 2. Direct browser download fallback (Desktop or unsupported mobile browsers)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    return {
      success: true,
      message: `¡Informe en Excel descargado como "${filename}"!`,
    };
  } catch (err: any) {
    console.error('Error al generar Excel:', err);
    return {
      success: false,
      message: 'Ocurrió un error al generar el archivo Excel.',
    };
  }
}
