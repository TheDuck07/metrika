import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { ScannedReceiptData, ScannedReceiptItem, ProductCategory } from '../types';
import { ApiKeyModal } from './ApiKeyModal';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'compra' | 'gasto' | 'venta';
}

const CATEGORIES: ProductCategory[] = [
  'Abarrotes',
  'Bebidas',
  'Lácteos',
  'Carnes',
  'Verduras / Frutas',
  'Servicios',
  'Fletes / Transporte',
  'Varios',
];

export const ScanReceiptModal: React.FC<ScanReceiptModalProps> = ({
  isOpen,
  onClose,
  initialType = 'compra',
}) => {
  const { products, recordScannedTransaction } = useStore();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showImageZoom, setShowImageZoom] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  // Extracted and editable review data
  const [extractedData, setExtractedData] = useState<ScannedReceiptData | null>(null);

  if (!isOpen) return null;

  // Generate synthetic sample receipt image for quick testing
  const generateSampleReceipt = (type: 'compra_pil' | 'gasto_luz') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 780;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Paper background
    ctx.fillStyle = '#fbf9f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper texture / borders
    ctx.strokeStyle = '#d7cfc7';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    ctx.fillStyle = '#1f1b19';

    if (type === 'compra_pil') {
      // Header
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DISTRIBUIDORA PIL ANDINA S.A.', 300, 70);

      ctx.font = '16px monospace';
      ctx.fillText('NOTA DE ENTREGA / COMPRA N° 04829', 300, 105);
      ctx.fillText('Fecha: 2026-02-02   Hora: 09:15', 300, 130);
      ctx.fillText('Cliente: Tienda Don Lucho - La Paz', 300, 155);

      // Line
      ctx.strokeStyle = '#1f1b19';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 180);
      ctx.lineTo(560, 180);
      ctx.stroke();

      // Table Header
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CANT.  DESCRIPCIÓN          P.UNIT  SUBTOTAL', 50, 210);

      ctx.beginPath();
      ctx.moveTo(40, 225);
      ctx.lineTo(560, 225);
      ctx.stroke();

      // Items
      ctx.font = '16px monospace';
      ctx.fillText('10 L   Leche Pil Entera 1L   Bs. 4.80  Bs. 48.00', 50, 260);
      ctx.fillText(' 5 ud  Mantequilla Pil 200g  Bs. 9.50  Bs. 47.50', 50, 305);
      ctx.fillText(' 6 L   Yogurt Bebible 1L     Bs. 8.00  Bs. 48.00', 50, 350);

      ctx.beginPath();
      ctx.moveTo(40, 420);
      ctx.lineTo(560, 420);
      ctx.stroke();

      // Total
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('TOTAL A PAGAR: Bs. 143.50', 550, 470);

      ctx.font = 'italic 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('¡Gracias por su compra! Entregado conforme.', 300, 560);
    } else {
      // Gasto de Luz
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DELAPAZ S.A.', 300, 75);

      ctx.font = '16px monospace';
      ctx.fillText('AVISO DE COBRANZA / FACTURA LUZ', 300, 110);
      ctx.fillText('Mes: ENERO 2026   Fecha Emisión: 2026-02-01', 300, 140);
      ctx.fillText('Titular: Tienda Barrio San Pedro', 300, 165);

      ctx.strokeStyle = '#1f1b19';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 190);
      ctx.lineTo(560, 190);
      ctx.stroke();

      ctx.font = '16px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Concepto: Consumo Energía Eléctrica', 50, 235);
      ctx.fillText('Consumo registrado: 184 kWh', 50, 275);
      ctx.fillText('Alumbrado Público y Aseo: Bs. 14.50', 50, 315);
      ctx.fillText('Cargo fijo mensual:       Bs.  8.00', 50, 355);

      ctx.beginPath();
      ctx.moveTo(40, 420);
      ctx.lineTo(560, 420);
      ctx.stroke();

      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('TOTAL A PAGAR: Bs. 95.00', 550, 470);

      ctx.font = 'italic 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Comprobante oficial de pago de servicio básico', 300, 560);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    processImageWithAI(dataUrl, 'image/jpeg');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      processImageWithAI(result, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
    // Reset file input value so user can re-select same file if desired
    e.target.value = '';
  };

  const processImageWithAI = async (base64Url: string, mimeType: string) => {
    setImagePreview(base64Url);
    setImageMimeType(mimeType);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Url,
          mimeType,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo procesar el comprobante');
      }

      const data = result.data;

      // Smart match extracted items with current inventory products
      const mappedItems: ScannedReceiptItem[] = (data.items || []).map((item: any, idx: number) => {
        const itemNom = (item.producto || '').toLowerCase();
        // Look for match in store inventory
        const matched = products.find((p) => {
          const pNom = p.name.toLowerCase();
          return (
            itemNom.includes(pNom) ||
            pNom.includes(itemNom) ||
            (itemNom.includes('leche') && pNom.includes('leche')) ||
            (itemNom.includes('coca') && pNom.includes('coca')) ||
            (itemNom.includes('arroz') && pNom.includes('arroz')) ||
            (itemNom.includes('aceite') && pNom.includes('aceite')) ||
            (itemNom.includes('carne') && pNom.includes('carne')) ||
            (itemNom.includes('tomate') && pNom.includes('tomate'))
          );
        });

        return {
          id: `item-${Date.now()}-${idx}`,
          producto: item.producto || '',
          cantidad: Number(item.cantidad) > 0 ? Number(item.cantidad) : 1,
          unidad: item.unidad || matched?.unit || 'ud',
          precioUnitario: item.precioUnitario !== null && item.precioUnitario !== undefined ? Number(item.precioUnitario) : null,
          subtotal: item.subtotal !== null && item.subtotal !== undefined ? Number(item.subtotal) : null,
          matchedProductId: matched?.id,
        };
      });

      const determinedType: 'compra' | 'gasto' | 'venta' =
        data.tipo === 'gasto' || data.tipo === 'venta' || data.tipo === 'compra'
          ? data.tipo
          : initialType;

      const finalExtracted: ScannedReceiptData = {
        tipo: determinedType,
        proveedor: data.proveedor || '',
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        total: data.total !== null && data.total !== undefined ? Number(data.total) : null,
        categoriaSugerida: data.categoriaSugerida || (determinedType === 'gasto' ? 'Servicios' : 'Mercadería'),
        conceptoGeneral: data.conceptoGeneral || 'Comprobante escaneado',
        items: mappedItems,
        imageBase64: base64Url,
      };

      if (data.billingRequired) {
        setErrorMessage(
          'El proyecto de Google AI Studio requiere activar facturación en https://aistudio.google.com/billing para digitalizar comprobantes con Gemini. Puedes ingresar los datos manualmente a continuación.'
        );
      }

      setExtractedData(finalExtracted);
    } catch (err: any) {
      console.warn('Aviso al procesar comprobante con IA:', err?.message || err);
      setErrorMessage(
        'Hubo un problema al procesar la imagen. Verifica que sea legible o ingresa los datos manualmente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItem = (id: string, field: keyof ScannedReceiptItem, value: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      items: extractedData.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // If cantidad or precioUnitario changes, auto-update subtotal if both exist
          if (field === 'cantidad' || field === 'precioUnitario') {
            const qty = field === 'cantidad' ? Number(value) : item.cantidad;
            const price =
              field === 'precioUnitario'
                ? value !== null && value !== '' && value !== undefined
                  ? Number(value)
                  : null
                : item.precioUnitario;
            if (qty && price !== null && price !== undefined) {
              updated.subtotal = Number((qty * price).toFixed(2));
            }
          }
          return updated;
        }
        return item;
      }),
    });
  };

  const handleAddItem = () => {
    if (!extractedData) return;
    const newItem: ScannedReceiptItem = {
      id: `item-${Date.now()}`,
      producto: '',
      cantidad: 1,
      unidad: 'ud',
      precioUnitario: null,
      subtotal: null,
    };
    setExtractedData({
      ...extractedData,
      items: [...extractedData.items, newItem],
    });
  };

  const handleDeleteItem = (id: string) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      items: extractedData.items.filter((item) => item.id !== id),
    });
  };

  const handleRecalculateTotal = () => {
    if (!extractedData) return;
    const sum = extractedData.items.reduce((acc: number, item: ScannedReceiptItem) => {
      if (item.subtotal !== null && item.subtotal !== undefined && !isNaN(item.subtotal)) {
        return acc + item.subtotal;
      }
      if (item.precioUnitario && item.cantidad) {
        return acc + item.precioUnitario * item.cantidad;
      }
      return acc;
    }, 0);
    setExtractedData({
      ...extractedData,
      total: Number(sum.toFixed(2)),
    });
  };

  const handleConfirmAndSave = () => {
    if (!extractedData) return;

    // Determine final total
    let finalTotal = extractedData.total;
    if (finalTotal === null || finalTotal === undefined || isNaN(finalTotal) || finalTotal <= 0) {
      // Calculate from items
      const sum = extractedData.items.reduce((acc: number, item: ScannedReceiptItem) => {
        if (item.subtotal !== null && item.subtotal !== undefined) return acc + item.subtotal;
        if (item.precioUnitario && item.cantidad) return acc + item.precioUnitario * item.cantidad;
        return acc;
      }, 0);
      finalTotal = sum > 0 ? Number(sum.toFixed(2)) : 0;
    }

    // Build title
    const providerText = extractedData.proveedor ? ` (${extractedData.proveedor})` : '';
    const title = extractedData.conceptoGeneral
      ? `${extractedData.conceptoGeneral}${providerText}`
      : `Comprobante ${extractedData.tipo}${providerText}`;

    recordScannedTransaction({
      tipo: extractedData.tipo,
      title,
      amount: finalTotal,
      category: extractedData.categoriaSugerida || 'Mercadería',
      date: extractedData.fecha || '2026-02-02',
      receiptImage: imagePreview || undefined,
      items: extractedData.items,
    });

    handleReset();
    onClose();
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtractedData(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setShowImageZoom(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fadeIn">
      {/* Hidden native camera/file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Modal Card */}
      <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ffeed9] text-[#9f3c16] flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[26px]">document_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-base sm:text-lg text-[#1f1b19] leading-tight">
                  Escanear Factura o Nota
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  IA Gratis
                </span>
              </div>
              <p className="text-xs text-[#6e5850] mt-0.5">
                Reconocimiento automático de comprobantes con Gemini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowApiKeyModal(true)}
              className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-purple-200"
            >
              <span className="material-symbols-outlined text-[15px]">key</span>
              <span className="hidden sm:inline">Clave Gemini</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* STEP 1: Upload or Capture Screen */}
        {!imagePreview && !isProcessing && (
          <div className="space-y-4 py-2">
            {/* Free Tier Notice */}
            <div className="bg-[#f5fbf7] border border-emerald-200 rounded-2xl p-3 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-emerald-700 text-xl shrink-0 mt-0.5">
                verified
              </span>
              <div className="text-xs text-stone-700 leading-snug">
                <span className="font-bold text-emerald-900 block mb-0.5">
                  100% Gratuito y Privado
                </span>
                Esta función utiliza el modelo <strong>Gemini 3.8 Flash</strong> sin costos ni suscripciones. Tus claves y datos no se exponen al navegador.
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Camera Button */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="bg-[#2a6651] hover:bg-[#205140] text-white p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-md active:scale-98 transition-all cursor-pointer group border border-emerald-700/30"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-3xl">photo_camera</span>
                </div>
                <span className="text-sm font-black">Tomar Foto con Cámara</span>
                <span className="text-[11px] text-white/80 mt-0.5">Apunta a la nota o factura</span>
              </button>

              {/* Gallery / File Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#9f3c16] hover:bg-[#863110] text-white p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-md active:scale-98 transition-all cursor-pointer group border border-amber-900/20"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <span className="text-sm font-black">Subir desde Galería</span>
                <span className="text-[11px] text-white/80 mt-0.5">JPG, PNG o foto guardada</span>
              </button>
            </div>

            {/* Quick Demo Receipts (Instant Testing without physical paper) */}
            <div className="pt-3 border-t border-stone-200">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide block mb-2">
                ¿No tienes una factura a mano? Prueba con estas muestras:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => generateSampleReceipt('compra_pil')}
                  className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-[#ffeed9]/60 hover:border-[#fea619] text-left flex items-center gap-2.5 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#b1f0d4] text-[#0f513c] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-stone-800 truncate group-hover:text-[#9f3c16]">
                      Nota Compra: Pil Andina
                    </h5>
                    <p className="text-[10px] text-stone-500">Leche, mantequilla, yogurt</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => generateSampleReceipt('gasto_luz')}
                  className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-[#ffeed9]/60 hover:border-[#fea619] text-left flex items-center gap-2.5 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#ffddb8] text-[#855300] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-base">bolt</span>
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-stone-800 truncate group-hover:text-[#9f3c16]">
                      Factura Luz: Delapaz
                    </h5>
                    <p className="text-[10px] text-stone-500">Consumo y servicios</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Instructions tip */}
            <div className="bg-[#fcf7f4] rounded-2xl p-3 border border-[#dec0b7]/50 text-xs text-[#57423b] space-y-1">
              <div className="font-bold text-[#9f3c16] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">lightbulb</span>
                Consejo para mejores resultados:
              </div>
              <p>
                Asegúrate de que la foto tenga buena luz y que se vean con claridad los nombres, cantidades y totales. Si algún dato no es legible, la IA lo dejará vacío para que no haya errores.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Processing / Loading State */}
        {isProcessing && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            {imagePreview && (
              <div className="relative w-36 h-48 rounded-2xl overflow-hidden border-2 border-[#9f3c16] shadow-lg bg-stone-100">
                <img src={imagePreview} alt="Comprobante" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#9f3c16]/20 via-transparent to-[#9f3c16]/30 animate-pulse" />
                {/* Scanning line animation */}
                <div className="absolute left-0 right-0 h-1 bg-[#fea619] shadow-[0_0_12px_#fea619] animate-bounce" />
              </div>
            )}

            <div className="space-y-1.5 max-w-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffeed9] text-[#9f3c16] text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-[#9f3c16] animate-ping" />
                Gemini 3.8 Flash trabajando
              </div>
              <h4 className="text-base font-extrabold text-[#1f1b19]">
                Leyendo factura o nota...
              </h4>
              <p className="text-xs text-stone-500">
                Extrayendo productos, cantidades, precios unitarios, fecha y montos legibles.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMessage && !isProcessing && (
          <div className="py-4 space-y-3">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-800">
              <span className="material-symbols-outlined text-red-600 text-xl shrink-0">error</span>
              <div>
                <span className="font-bold block">No pudimos procesar la imagen</span>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 font-bold text-xs text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                Tomar otra foto
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Edit Extracted Data Form (Before Saving) */}
        {extractedData && !isProcessing && (
          <div className="space-y-4 py-1">
            {/* Review Banner */}
            <div className="bg-[#fff8f2] border border-[#ffddb8] rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9f3c16] text-xl">fact_check</span>
                <div>
                  <h4 className="text-xs font-extrabold text-[#9f3c16] leading-tight">
                    Revisa los datos extraídos
                  </h4>
                  <p className="text-[11px] text-stone-600">
                    Corrige o completa los campos antes de guardar.
                  </p>
                </div>
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => setShowImageZoom(!showImageZoom)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#dec0b7] text-[11px] font-bold text-[#9f3c16] hover:bg-stone-50 cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-xs">
                    {showImageZoom ? 'visibility_off' : 'visibility'}
                  </span>
                  {showImageZoom ? 'Ocultar foto' : 'Ver foto'}
                </button>
              )}
            </div>

            {/* Optional Collapsible Image Zoom */}
            {showImageZoom && imagePreview && (
              <div className="rounded-2xl border border-stone-300 overflow-hidden bg-stone-900 max-h-56 flex items-center justify-center p-2 relative shadow-inner">
                <img
                  src={imagePreview}
                  alt="Comprobante original"
                  className="max-h-52 w-auto object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowImageZoom(false)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Transaction Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase tracking-wide mb-1">
                  Tipo de registro
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-bold">
                  {(['compra', 'gasto', 'venta'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setExtractedData({ ...extractedData, tipo: t })}
                      className={`py-2 rounded-lg capitalize transition-all cursor-pointer ${
                        extractedData.tipo === t
                          ? t === 'compra'
                            ? 'bg-[#fea619] text-[#2c1e19] shadow-xs'
                            : t === 'gasto'
                            ? 'bg-[#bd532b] text-white shadow-xs'
                            : 'bg-[#2a6651] text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t === 'compra' ? 'Compra' : t === 'gasto' ? 'Gasto' : 'Venta'}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Concept & Provider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Concepto General
                  </label>
                  <input
                    type="text"
                    value={extractedData.conceptoGeneral}
                    placeholder="Ej. Compra de lácteos, Factura luz"
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, conceptoGeneral: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Proveedor o Emisor
                  </label>
                  <input
                    type="text"
                    value={extractedData.proveedor}
                    placeholder="Ej. Pil Andina, Delapaz, Feria"
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, proveedor: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>
              </div>

              {/* Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Fecha del comprobante
                  </label>
                  <input
                    type="date"
                    value={extractedData.fecha}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, fecha: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={extractedData.categoriaSugerida}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, categoriaSugerida: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-stone-50 text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#9f3c16]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List (Extracted Products) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#9f3c16]">list_alt</span>
                    Productos o Líneas Extraídas ({extractedData.items.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-[#9f3c16] hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Añadir ítem
                  </button>
                </div>

                {extractedData.items.length === 0 ? (
                  <div className="p-3 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500">
                    No se detectaron líneas detalladas individuales. Puedes agregarlas o registrar el monto total directo.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {extractedData.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 relative group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase text-stone-400">
                            Ítem #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-stone-400 hover:text-red-600 cursor-pointer p-0.5"
                            title="Eliminar este ítem"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>

                        {/* Product Name */}
                        <div>
                          <input
                            type="text"
                            placeholder="Nombre del producto o detalle..."
                            value={item.producto}
                            onChange={(e) => handleUpdateItem(item.id, 'producto', e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                          />
                        </div>

                        {/* Numeric Fields Grid: Cantidad, Unidad, P.Unit, Subtotal */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {/* Cantidad */}
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-0.5">
                              Cant.
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleUpdateItem(item.id, 'cantidad', parseFloat(e.target.value) || 0)
                              }
                              className="w-full h-8 px-2 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-800 text-center"
                            />
                          </div>

                          {/* Unidad */}
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-0.5">
                              Unidad
                            </label>
                            <select
                              value={item.unidad || 'ud'}
                              onChange={(e) => handleUpdateItem(item.id, 'unidad', e.target.value)}
                              className="w-full h-8 px-1 rounded-lg border border-stone-300 bg-white text-[11px] font-semibold text-stone-800"
                            >
                              <option value="ud">ud</option>
                              <option value="kg">kg</option>
                              <option value="L">L</option>
                              <option value="bolsa">bolsa</option>
                              <option value="caja">caja</option>
                            </select>
                          </div>

                          {/* Precio Unitario */}
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-0.5">
                              P. Unit
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0.00"
                              value={item.precioUnitario !== null && item.precioUnitario !== undefined ? item.precioUnitario : ''}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'precioUnitario',
                                  e.target.value !== '' ? parseFloat(e.target.value) : null
                                )
                              }
                              className="w-full h-8 px-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-800 text-right"
                            />
                          </div>

                          {/* Subtotal */}
                          <div>
                            <label className="block text-[10px] text-stone-500 font-bold mb-0.5">
                              Subtotal
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder="0.00"
                              value={item.subtotal !== null && item.subtotal !== undefined ? item.subtotal : ''}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.id,
                                  'subtotal',
                                  e.target.value !== '' ? parseFloat(e.target.value) : null
                                )
                              }
                              className="w-full h-8 px-1.5 rounded-lg border border-stone-300 bg-white text-xs font-black text-[#9f3c16] text-right"
                            />
                          </div>
                        </div>

                        {/* Match with Inventory Product */}
                        <div className="pt-0.5 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-stone-400">inventory_2</span>
                          <span className="text-[10px] text-stone-500 font-bold shrink-0">
                            Inventario:
                          </span>
                          <select
                            value={item.matchedProductId || ''}
                            onChange={(e) =>
                              handleUpdateItem(item.id, 'matchedProductId', e.target.value || undefined)
                            }
                            className="flex-1 h-7 text-[11px] font-semibold text-stone-700 bg-white border border-stone-300 rounded-md px-1 truncate"
                          >
                            <option value="">(No vincular a stock)</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Stock actual: {p.stock} {p.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Final */}
              <div className="pt-2 bg-[#fcf7f4] rounded-2xl p-3 border border-[#dec0b7] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-extrabold text-[#1f1b19]">
                      Total del Comprobante (Bs.)
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Monto final a registrar en caja
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRecalculateTotal}
                      className="px-2 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-[10px] font-bold text-stone-700 cursor-pointer"
                      title="Sumar subtotales de los ítems"
                    >
                      Sumar ítems
                    </button>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-bold text-stone-500">Bs.</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0.00"
                        value={extractedData.total !== null ? extractedData.total : ''}
                        onChange={(e) =>
                          setExtractedData({
                            ...extractedData,
                            total: e.target.value !== '' ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-28 h-10 pl-8 pr-2 rounded-xl border-2 border-[#9f3c16] bg-white text-base font-black text-[#9f3c16] text-right focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmAndSave}
                className="w-full h-12 bg-[#2a6651] hover:bg-[#205140] text-white font-extrabold text-sm sm:text-base rounded-2xl active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
                <span>Guardar en Metrika</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 h-9 text-xs font-bold text-[#9f3c16] rounded-xl hover:bg-[#ffeed9] border border-[#dec0b7] cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  Escanear otra foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    onClose();
                  }}
                  className="flex-1 h-9 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </div>
  );
};
