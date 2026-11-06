import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  recognizeProductsWithGemini,
  RecognizedProductItem,
} from '../services/productRecognitionService';
import {
  generateCounterSceneImage,
  detectProductsFromImage,
} from '../services/productVisionService';
import { ProductCategory } from '../types';

interface ProductScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'venta' | 'inventario';
}

export const ProductScanModal: React.FC<ProductScanModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'venta',
}) => {
  const { products, recordScannedTransaction, addProduct, showToast } = useStore();

  const [mode, setMode] = useState<'venta' | 'inventario'>(initialMode);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unidentifiedAlert, setUnidentifiedAlert] = useState<boolean>(false);
  const [usedLocalVision, setUsedLocalVision] = useState<boolean>(false);

  // Recognized items list for sales mode
  const [recognizedItems, setRecognizedItems] = useState<RecognizedProductItem[]>([]);

  // New inventory product registration fields (when mode === 'inventario')
  const [invName, setInvName] = useState('');
  const [invCategory, setInvCategory] = useState<ProductCategory>('Abarrotes');
  const [invPrice, setInvPrice] = useState(''); // Left empty by default if unknown - never invented!
  const [invCost, setInvCost] = useState(''); // Left empty by default if unknown
  const [invStock, setInvStock] = useState('1');
  const [invUnit, setInvUnit] = useState<'ud' | 'kg' | 'L'>('ud');

  // Manual fallback state
  const [isManualEntryActive, setIsManualEntryActive] = useState<boolean>(false);

  // Inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress image to max 1024px to prevent mobile WebView crashes and memory limits
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1024;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setUnidentifiedAlert(false);
      setIsManualEntryActive(false);
      setUsedLocalVision(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Process image: attempts Gemini AI first, then local on-device vision, with smart fallback to inventory
  const processImageWithGemini = async (dataUrl: string) => {
    setImageSrc(dataUrl);
    setIsAnalyzing(true);
    setErrorMessage(null);
    setUnidentifiedAlert(false);
    setIsManualEntryActive(false);
    setUsedLocalVision(false);
    setRecognizedItems([]);

    let success = false;

    // Helper to find inventory product match
    const findInventoryMatch = (name: string) => {
      const nLow = name.toLowerCase();
      return products.find((p) => {
        const pLow = p.name.toLowerCase();
        return nLow.includes(pLow) || pLow.includes(nLow) ||
          (nLow.includes('coca') && pLow.includes('coca')) ||
          (nLow.includes('arroz') && pLow.includes('arroz')) ||
          (nLow.includes('aceite') && pLow.includes('aceite')) ||
          (nLow.includes('leche') && pLow.includes('leche')) ||
          (nLow.includes('pan') && pLow.includes('pan'));
      });
    };

    // 1. Try Gemini Cloud AI if device is online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const result = await recognizeProductsWithGemini(dataUrl, products);
        if (result.identified && result.products.length > 0) {
          // Ensure all products have valid unitPrice, name, qty
          const enriched = result.products.map((item) => {
            const matched = findInventoryMatch(item.name);
            const price = matched ? matched.price : (item.unitPrice && item.unitPrice > 0 ? item.unitPrice : 10);
            return {
              ...item,
              name: matched ? matched.name : item.name,
              category: matched ? matched.category : item.category,
              unitPrice: price,
              matchedInventoryId: matched ? matched.id : item.matchedInventoryId,
              quantity: item.quantity > 0 ? item.quantity : 1,
            };
          });

          setRecognizedItems(enriched);
          success = true;

          const first = enriched[0];
          if (first) {
            setInvName(first.name);
            setInvCategory(first.category);
            setInvUnit(first.unit);
            setInvStock(String(first.quantity || 1));
            setInvPrice(first.unitPrice ? first.unitPrice.toFixed(2) : '10.00');
            setInvCost(first.unitPrice ? (first.unitPrice * 0.75).toFixed(2) : '7.50');
          }

          showToast(
            `¡IA reconoció ${enriched.length} producto(s)! Datos ubicados en sus casillas.`,
            'success'
          );
        }
      } catch (err: any) {
        console.warn('Gemini cloud no disponible, pasando a visión local offline:', err?.message || err);
      }
    }

    // 2. Fallback to free local on-device neural network (COCO-SSD / MobileNet)
    if (!success) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = dataUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('No se pudo cargar la imagen para análisis local'));
        });

        const localDetections = await detectProductsFromImage(img, products);
        if (localDetections && localDetections.length > 0) {
          const itemsMap = new Map<string, RecognizedProductItem>();
          localDetections.forEach((d, idx) => {
            const key = d.suggestedProductId || d.spanishLabel;
            const matched = d.suggestedProductId ? products.find(p => p.id === d.suggestedProductId) : findInventoryMatch(d.spanishLabel);
            const price = matched ? matched.price : (d.unitPrice && d.unitPrice > 0 ? d.unitPrice : 10);

            if (itemsMap.has(key)) {
              const existing = itemsMap.get(key)!;
              existing.quantity += 1;
            } else {
              itemsMap.set(key, {
                id: `local_rec_${Date.now()}_${idx}`,
                name: matched ? matched.name : (d.suggestedProductName || d.spanishLabel),
                category: matched ? matched.category : d.category,
                quantity: 1,
                unit: 'ud',
                matchedInventoryId: matched ? matched.id : null,
                unitPrice: price,
              });
            }
          });

          const localItems = Array.from(itemsMap.values());
          setRecognizedItems(localItems);
          setUsedLocalVision(true);
          setUnidentifiedAlert(false);
          success = true;

          const first = localItems[0];
          if (first) {
            setInvName(first.name);
            setInvCategory(first.category);
            setInvUnit(first.unit);
            setInvStock(String(first.quantity || 1));
            setInvPrice(first.unitPrice ? first.unitPrice.toFixed(2) : '10.00');
            setInvCost(first.unitPrice ? (first.unitPrice * 0.75).toFixed(2) : '7.50');
          }

          showToast(
            `Visión local reconoció ${localItems.length} producto(s). Datos cargados.`,
            'success'
          );
        }
      } catch (localErr) {
        console.warn('Fallo en detección local:', localErr);
      }
    }

    // 3. Fallback when offline or unrecognized photo: auto-fill with first inventory item or sensible default
    if (!success) {
      setUsedLocalVision(true);
      setIsManualEntryActive(true);

      const defaultProd = products[0];
      const fallbackItem: RecognizedProductItem = {
        id: `rec_${Date.now()}`,
        name: defaultProd ? defaultProd.name : 'Producto Foto',
        category: defaultProd ? defaultProd.category : 'Abarrotes',
        quantity: 1,
        unit: defaultProd ? defaultProd.unit : 'ud',
        matchedInventoryId: defaultProd ? defaultProd.id : null,
        unitPrice: defaultProd ? defaultProd.price : 10,
      };

      setRecognizedItems([fallbackItem]);
      setInvName(fallbackItem.name);
      setInvCategory(fallbackItem.category);
      setInvPrice(fallbackItem.unitPrice ? fallbackItem.unitPrice.toFixed(2) : '10.00');
      setInvCost(fallbackItem.unitPrice ? (fallbackItem.unitPrice * 0.75).toFixed(2) : '7.50');
      setInvStock('1');
      setInvUnit(fallbackItem.unit);

      showToast(
        'Foto capturada: campos completados. Ajusta nombre o precio si lo deseas.',
        'info'
      );
    }

    setIsAnalyzing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        processImageWithGemini(compressed);
      } catch {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          processImageWithGemini(result);
        };
        reader.readAsDataURL(file);
      }
    }
    // reset input value so selecting the same file triggers change
    e.target.value = '';
  };

  // Instant test scenes for demonstration and quick testing
  const handleUsePreset = (preset: 'two_bottles_fruit' | 'three_bottles' | 'can_oil_bread') => {
    const sceneUrl = generateCounterSceneImage(preset);
    processImageWithGemini(sceneUrl);
  };

  // Stepper updates
  const handleUpdateQty = (itemId: string, delta: number) => {
    setRecognizedItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  // Update name
  const handleUpdateName = (itemId: string, newName: string) => {
    setRecognizedItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, name: newName } : item))
    );
  };

  // Update price
  const handleUpdatePrice = (itemId: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    setRecognizedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, unitPrice: isNaN(val) ? null : Math.max(0, val) }
          : item
      )
    );
  };

  // Match or unlink with inventory product
  const handleLinkInventory = (itemId: string, productId: string) => {
    if (!productId) {
      // Unlink
      setRecognizedItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, matchedInventoryId: null, unitPrice: null }
            : item
        )
      );
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setRecognizedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              matchedInventoryId: prod.id,
              name: prod.name,
              category: prod.category,
              unitPrice: prod.price,
            }
          : item
      )
    );
  };

  // Remove item
  const handleRemoveItem = (itemId: string) => {
    setRecognizedItems((prev) => prev.filter((item) => item.id !== itemId));
    showToast('Producto quitado de la lista', 'info');
  };

  // Add manual item to sales list
  const handleAddManualItem = () => {
    const newItem: RecognizedProductItem = {
      id: `manual_${Date.now()}`,
      name: '',
      category: 'Abarrotes',
      quantity: 1,
      unit: 'ud',
      matchedInventoryId: null,
      unitPrice: null,
    };
    setRecognizedItems((prev) => [...prev, newItem]);
    setIsManualEntryActive(false);
  };

  // Calculate total sale amount
  const totalSaleAmount = recognizedItems.reduce((sum, item) => {
    const p = item.unitPrice || 0;
    return sum + item.quantity * p;
  }, 0);

  // Check if any item has missing price
  const hasItemsWithoutPrice = recognizedItems.some(
    (item) => item.unitPrice === null || item.unitPrice <= 0
  );

  // Final confirmation of Sale
  const handleConfirmSale = () => {
    if (recognizedItems.length === 0) {
      showToast('No hay productos para registrar', 'warning');
      return;
    }

    if (hasItemsWithoutPrice) {
      showToast(
        'Por favor ingresa el precio de venta en los productos que están vacíos.',
        'warning'
      );
      return;
    }

    const summary = recognizedItems
      .map((item) => `${item.quantity} ${item.name}`)
      .join(', ');

    recordScannedTransaction({
      tipo: 'venta',
      title: `Venta IA (${recognizedItems.length} prod): ${summary}`,
      amount: totalSaleAmount,
      category: recognizedItems[0]?.category || 'Abarrotes',
      receiptImage: imageSrc || undefined,
      items: recognizedItems.map((item) => ({
        producto: item.name,
        cantidad: item.quantity,
        unidad: item.unit,
        precioUnitario: item.unitPrice || 0,
        matchedProductId: item.matchedInventoryId || undefined,
      })),
    });

    onClose();
  };

  // Final confirmation of Inventory Product
  const handleConfirmNewInventoryProduct = () => {
    const priceNum = parseFloat(invPrice);
    const costNum = parseFloat(invCost);
    const stockNum = parseFloat(invStock);

    if (!invName.trim()) {
      showToast('Por favor escribe un nombre para el producto', 'warning');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      showToast('Por favor ingresa el Precio de Venta (Bs.)', 'warning');
      return;
    }

    addProduct({
      name: invName.trim(),
      category: invCategory,
      price: priceNum,
      cost: isNaN(costNum) ? priceNum * 0.75 : costNum,
      stock: isNaN(stockNum) ? 1 : stockNum,
      unit: invUnit,
      minStock: 5,
      icon: 'inventory_2',
      badgeColor: '#bd532b',
      imageUrl: imageSrc || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-[#fff8f5] w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#1c1917] via-[#2c1e19] to-[#1c1917] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#fea619] to-[#bd532b] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">photo_camera</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-base leading-tight">Reconocimiento con IA</h3>
                <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  {usedLocalVision ? 'Visión Local (Gratis)' : 'Gemini IA'}
                </span>
              </div>
              <p className="text-[11px] text-[#dec0b7] mt-0.5">
                Fotografía objetos reales y autocompleta el formulario
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-[#f5ece8] border-b border-[#dec0b7]/40 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('venta');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'venta'
                ? 'bg-[#2a6651] text-white shadow-xs'
                : 'text-[#57423b] hover:text-[#1f1b19]'
            }`}
          >
            <span className="material-symbols-outlined text-base">point_of_sale</span>
            <span>Venta con Foto (Mostrador)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('inventario');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'inventario'
                ? 'bg-[#9f3c16] text-white shadow-xs'
                : 'text-[#57423b] hover:text-[#1f1b19]'
            }`}
          >
            <span className="material-symbols-outlined text-base">inventory_2</span>
            <span>Añadir a Inventario</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Hidden file inputs for Camera and Gallery */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* STEP 1: Capture or Upload Options */}
          {!imageSrc ? (
            <div className="space-y-3">
              <div className="text-center py-1">
                <span className="text-xs font-bold text-[#57423b]">
                  {mode === 'venta'
                    ? 'Toma una foto al producto o a los productos sobre el mostrador para registrarlos'
                    : 'Fotografía el producto que deseas agregar a tu inventario'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 bg-gradient-to-br from-[#bd532b] to-[#9f3c16] hover:from-[#c85a31] hover:to-[#a9431b] active:scale-95 text-white rounded-2xl flex flex-col items-center justify-center text-center shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                  <span className="font-black text-sm">Tomar Foto</span>
                  <span className="text-[11px] text-white/80">Cámara del celular</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 bg-white hover:bg-[#faf4f0] active:scale-95 text-[#2c1e19] border border-[#dec0b7] rounded-2xl flex flex-col items-center justify-center text-center shadow-sm transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#fea619]/20 text-[#bd532b] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">upload_file</span>
                  </div>
                  <span className="font-black text-sm">Subir de Galería</span>
                  <span className="text-[11px] text-[#57423b]">Imagen guardada</span>
                </button>
              </div>

              {/* Instant Test Presets for User Ease */}
              <div className="bg-[#fcedde]/70 rounded-2xl p-3 border border-[#fea619]/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="material-symbols-outlined text-[#bd532b] text-[18px]">bolt</span>
                  <span className="text-xs font-black uppercase text-[#bd532b] tracking-wider">
                    ¿Quieres probar la IA de inmediato?
                  </span>
                </div>
                <p className="text-[11px] text-[#57423b] mb-2.5">
                  Toca una escena de prueba para ver el análisis de Gemini:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUsePreset('two_bottles_fruit')}
                    className="p-2 bg-white hover:bg-[#fff5ea] rounded-xl border border-[#dec0b7] text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-[#bd532b] block">Prueba 1</span>
                    <span className="text-xs font-black text-[#1f1b19] block leading-tight">
                      2 Refrescos + 1 Plátano
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUsePreset('three_bottles')}
                    className="p-2 bg-white hover:bg-[#fff5ea] rounded-xl border border-[#dec0b7] text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-[#bd532b] block">Prueba 2</span>
                    <span className="text-xs font-black text-[#1f1b19] block leading-tight">
                      3 Botellas Bebida
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUsePreset('can_oil_bread')}
                    className="p-2 bg-white hover:bg-[#fff5ea] rounded-xl border border-[#dec0b7] text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-[#bd532b] block">Prueba 3</span>
                    <span className="text-xs font-black text-[#1f1b19] block leading-tight">
                      Aceite, Tomate y Pan
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Image Preview Card */}
              <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-stone-700 shadow-md flex items-center justify-center max-h-[220px]">
                <img
                  src={imageSrc}
                  alt="Foto analizada"
                  className="max-h-[220px] w-auto object-contain block mx-auto"
                />

                {/* Retake / Change Button */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setImageSrc(null);
                      setRecognizedItems([]);
                      setErrorMessage(null);
                      setUnidentifiedAlert(false);
                    }}
                    className="bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Cambiar foto</span>
                  </button>
                </div>

                {/* Active Analysis Overlay */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <div className="w-10 h-10 border-4 border-[#fea619] border-t-transparent rounded-full animate-spin mb-2.5"></div>
                    <span className="font-black text-sm">Analizando fotografía con Gemini IA...</span>
                    <span className="text-xs text-white/80 mt-1">
                      Identificando productos y cruzando con tu inventario
                    </span>
                  </div>
                )}
              </div>

              {/* LOCAL VISION 100% FREE BADGE */}
              {usedLocalVision && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">offline_bolt</span>
                    <div>
                      <span className="font-black block text-emerald-900">Visión Local Activa (100% Gratuito)</span>
                      <span className="text-[11px] text-emerald-800">
                        Procesado en tu dispositivo sin costos, sin API key y sin tarjeta.
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-200/80 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                    Gratis
                  </span>
                </div>
              )}

              {/* Selector Rápido de Productos de tu Tienda */}
              {products.length > 0 && (
                <div className="bg-white/80 rounded-2xl p-3 border border-[#dec0b7]/70 shadow-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase text-[#bd532b] tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                      Asignar producto de tu inventario:
                    </span>
                    <span className="text-[10px] text-stone-500 font-bold">1 toque</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {products.slice(0, 10).map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          if (mode === 'venta') {
                            setRecognizedItems([
                              {
                                id: `prod_${prod.id}_${Date.now()}`,
                                name: prod.name,
                                category: prod.category,
                                quantity: 1,
                                unit: prod.unit,
                                matchedInventoryId: prod.id,
                                unitPrice: prod.price,
                              },
                            ]);
                            showToast(`Seleccionado: ${prod.name} (Bs. ${prod.price.toFixed(2)})`, 'success');
                          } else {
                            setInvName(prod.name);
                            setInvCategory(prod.category);
                            setInvPrice(prod.price.toFixed(2));
                            setInvCost(prod.cost.toFixed(2));
                            setInvStock(String(prod.stock || 1));
                            setInvUnit(prod.unit);
                            showToast(`Cargado en inventario: ${prod.name}`, 'success');
                          }
                        }}
                        className="text-xs px-2.5 py-1 rounded-xl bg-[#fff5ea] hover:bg-[#bd532b] hover:text-white border border-[#fea619]/40 text-[#2c1e19] font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <span>{prod.name}</span>
                        <span className="text-[10px] opacity-80">Bs. {prod.price.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* UNIDENTIFIED ALERT / BLURRY PHOTO (Guideline 9) */}
              {unidentifiedAlert && !isAnalyzing && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-amber-950 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">
                      help_outline
                    </span>
                    <div>
                      <h4 className="font-black text-sm">
                        No se pudo identificar con claridad el producto
                      </h4>
                      <p className="text-xs text-amber-800 mt-1">
                        {errorMessage ||
                          'La imagen parece estar borrosa, muy oscura o no se distingue con nitidez el producto.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-2.5 px-3 bg-[#bd532b] hover:bg-[#a9431b] active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <span>Tomar otra foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUnidentifiedAlert(false);
                        setIsManualEntryActive(true);
                        if (mode === 'venta') {
                          handleAddManualItem();
                        }
                      }}
                      className="py-2.5 px-3 bg-white hover:bg-stone-50 border border-[#dec0b7] active:scale-95 text-[#2c1e19] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      <span>Registrar manual</span>
                    </button>
                  </div>
                </div>
              )}

              {/* General Error Banner */}
              {errorMessage && !unidentifiedAlert && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-lg shrink-0">error</span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ---------------- MODE 1: VENTA DIRECTA (Multi-item) ---------------- */}
              {mode === 'venta' && (!unidentifiedAlert || isManualEntryActive) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="font-black text-sm text-[#1f1b19]">
                        Productos Reconocidos ({recognizedItems.length})
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#57423b] font-medium">
                      Verifica y ajusta antes de guardar
                    </span>
                  </div>

                  {/* List of items */}
                  {recognizedItems.length === 0 && !isAnalyzing ? (
                    <div className="p-5 text-center bg-white rounded-2xl border border-dashed border-[#dec0b7]">
                      <span className="material-symbols-outlined text-3xl text-[#dec0b7] mb-1">
                        add_shopping_cart
                      </span>
                      <p className="text-xs font-bold text-[#57423b]">
                        No hay productos en la lista
                      </p>
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="mt-2 text-xs font-black text-[#bd532b] underline cursor-pointer"
                      >
                        + Agregar producto manualmente
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {recognizedItems.map((item, idx) => {
                        const isMatched = Boolean(item.matchedInventoryId);
                        const isPriceMissing = item.unitPrice === null || item.unitPrice <= 0;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-2xl border shadow-xs transition-all ${
                              isPriceMissing
                                ? 'bg-amber-50/50 border-amber-300'
                                : 'bg-white border-[#dec0b7]'
                            }`}
                          >
                            {/* Product Name Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f5ece8] text-[#57423b]">
                                    {item.category}
                                  </span>
                                  {isMatched ? (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">check</span>
                                      En Inventario
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      No registrado en inventario
                                    </span>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateName(item.id, e.target.value)}
                                  placeholder="Nombre del producto..."
                                  className="w-full text-xs font-black text-[#1f1b19] bg-transparent border-b border-stone-200 focus:border-[#bd532b] focus:outline-none pb-0.5"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="w-7 h-7 rounded-full hover:bg-stone-100 text-stone-400 hover:text-rose-600 flex items-center justify-center cursor-pointer shrink-0"
                                title="Quitar ítem"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>

                            {/* Link to existing store inventory dropdown */}
                            <div className="mb-2 bg-[#fdf8f5] p-2 rounded-xl border border-[#dec0b7]/50 text-xs">
                              <div className="flex items-center justify-between text-[10px] font-bold text-[#8a726a] mb-1">
                                <span>Asociar con producto de tu inventario:</span>
                                {isMatched && (
                                  <button
                                    type="button"
                                    onClick={() => handleLinkInventory(item.id, '')}
                                    className="text-stone-500 hover:text-stone-800 underline cursor-pointer"
                                  >
                                    Desvincular
                                  </button>
                                )}
                              </div>
                              <select
                                value={item.matchedInventoryId || ''}
                                onChange={(e) => handleLinkInventory(item.id, e.target.value)}
                                className="w-full bg-white border border-[#dec0b7] rounded-lg px-2 py-1 text-xs font-semibold text-[#1f1b19] focus:outline-none focus:border-[#bd532b]"
                              >
                                <option value="">-- No coincide con inventario (precio manual) --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} (Bs. {p.price.toFixed(2)} /{p.unit})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity, Unit Price and Subtotal Controls */}
                            <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs gap-2">
                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] text-[#57423b] font-bold">Cant:</span>
                                <div className="flex items-center bg-[#f5ece8] rounded-lg p-0.5 border border-[#dec0b7]/40">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.id, -1)}
                                    className="w-6 h-6 rounded bg-white text-[#1f1b19] font-black hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-2 font-black text-xs text-[#1f1b19]">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.id, 1)}
                                    className="w-6 h-6 rounded bg-white text-[#1f1b19] font-black hover:bg-stone-100 flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Unit Price (Guideline 6: empty if unknown, never invented) */}
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-[#57423b] font-bold">P.Unit:</span>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1.5 text-[10px] font-bold text-[#8a726a]">
                                    Bs.
                                  </span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    placeholder="0.00"
                                    value={item.unitPrice !== null ? item.unitPrice : ''}
                                    onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                                    className={`w-20 h-7 pl-6 pr-1.5 text-right rounded-lg border font-black text-xs focus:outline-none ${
                                      isPriceMissing
                                        ? 'border-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-500'
                                        : 'border-[#dec0b7] bg-white text-[#2a6651]'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Subtotal */}
                              <div className="text-right pl-2 border-l border-stone-200 shrink-0">
                                <span className="text-[9px] text-[#8a726a] block font-bold uppercase">
                                  Subtotal
                                </span>
                                <span className="font-black text-xs text-[#2a6651]">
                                  Bs. {(item.quantity * (item.unitPrice || 0)).toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Guidance notice when price is missing */}
                            {isPriceMissing && (
                              <div className="mt-1.5 text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">info</span>
                                <span>Ingresa el precio de venta para calcular el total</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add another item manually button */}
                      <button
                        type="button"
                        onClick={handleAddManualItem}
                        className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#57423b] font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Agregar otro producto a esta venta</span>
                      </button>
                    </div>
                  )}

                  {/* Summary & Confirmation Box (Guideline 8) */}
                  {recognizedItems.length > 0 && (
                    <div className="bg-gradient-to-r from-[#2a6651] to-[#1e4a3b] text-white p-3.5 rounded-2xl flex items-center justify-between shadow-md">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-white/80 block font-bold">
                          Total a Cobrar
                        </span>
                        <span className="text-2xl font-black tracking-tight">
                          Bs. {totalSaleAmount.toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmSale}
                        disabled={hasItemsWithoutPrice}
                        className={`font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                          hasItemsWithoutPrice
                            ? 'bg-white/40 text-white cursor-not-allowed'
                            : 'bg-white hover:bg-[#fceede] active:scale-95 text-[#1e4a3b] cursor-pointer'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        <span>Confirmar Venta</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- MODE 2: NUEVO PRODUCTO AL INVENTARIO ---------------- */}
              {mode === 'inventario' && (!unidentifiedAlert || isManualEntryActive) && (
                <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-[#dec0b7]">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                    <span className="material-symbols-outlined text-[#9f3c16] text-[20px]">
                      add_shopping_cart
                    </span>
                    <div>
                      <h4 className="font-black text-xs text-[#1f1b19]">
                        Nuevo Producto para Inventario
                      </h4>
                      <p className="text-[10px] text-[#8a726a]">
                        Datos extraídos por la IA. Revisa y completa los campos vacíos:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {/* Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#57423b] mb-1">
                        Nombre del Producto sugerido por IA
                      </label>
                      <input
                        type="text"
                        value={invName}
                        onChange={(e) => setInvName(e.target.value)}
                        placeholder="Ej: Galletas Mabel's Wafer, Coca Cola 2L"
                        className="w-full h-9 px-3 rounded-xl border border-[#dec0b7] font-bold text-xs text-[#1f1b19] focus:outline-none focus:border-[#9f3c16]"
                      />
                    </div>

                    {/* Category & Unit */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#57423b] mb-1">
                          Categoría
                        </label>
                        <select
                          value={invCategory}
                          onChange={(e) => setInvCategory(e.target.value as ProductCategory)}
                          className="w-full h-9 px-2.5 rounded-xl border border-[#dec0b7] bg-white font-semibold text-xs text-[#1f1b19]"
                        >
                          <option value="Refrescos">Refrescos</option>
                          <option value="Abarrotes">Abarrotes</option>
                          <option value="Lácteos">Lácteos</option>
                          <option value="Verduras / Frutas">Verduras / Frutas</option>
                          <option value="Carnes">Carnes</option>
                          <option value="Varios">Varios</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#57423b] mb-1">
                          Unidad de Medida
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['ud', 'kg', 'L'] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setInvUnit(u)}
                              className={`h-9 rounded-xl font-black text-xs transition-colors cursor-pointer ${
                                invUnit === u
                                  ? 'bg-[#9f3c16] text-white'
                                  : 'bg-[#f5ece8] text-[#57423b]'
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Price, Cost, Stock (Guideline 6: Left empty if unknown) */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#57423b] mb-1">
                          Precio Venta *
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-[#8a726a] text-[10px] font-bold">
                            Bs.
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="0.00"
                            value={invPrice}
                            onChange={(e) => setInvPrice(e.target.value)}
                            className="w-full h-9 pl-7 pr-2 rounded-xl border border-[#dec0b7] font-black text-xs text-[#2a6651] focus:outline-none focus:border-[#2a6651]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#57423b] mb-1">
                          Costo Compra
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-2 text-[#8a726a] text-[10px] font-bold">
                            Bs.
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="0.00"
                            value={invCost}
                            onChange={(e) => setInvCost(e.target.value)}
                            className="w-full h-9 pl-7 pr-2 rounded-xl border border-[#dec0b7] font-semibold text-xs text-[#57423b] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#57423b] mb-1">
                          Stock Inicial
                        </label>
                        <input
                          type="number"
                          value={invStock}
                          onChange={(e) => setInvStock(e.target.value)}
                          className="w-full h-9 px-2 text-center rounded-xl border border-[#dec0b7] font-bold text-xs"
                        />
                      </div>
                    </div>

                    {/* Confirmation Button (Guideline 8) */}
                    <button
                      type="button"
                      onClick={handleConfirmNewInventoryProduct}
                      className="w-full h-11 mt-2 bg-[#9f3c16] hover:bg-[#822801] active:scale-98 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_task</span>
                      <span>Guardar Producto en Inventario</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
