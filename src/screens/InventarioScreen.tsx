import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { ProductScanModal } from '../components/ProductScanModal';
import { VoiceRecorderModal } from '../components/VoiceRecorderModal';
import { Product, ProductCategory } from '../types';

export const InventarioScreen: React.FC = () => {
  const { products, updateProduct, addProduct, deleteProduct, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'Todos' | 'Con stock' | 'Stock bajo'>('Todos');
  const [sortBy, setSortBy] = useState<'nombre' | 'precio' | 'stock'>('nombre');

  // Modal: Detail & Edit Product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal: Create New Product (Screen 4)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Abarrotes');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'L' | 'ud'>('ud');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // Dynamic Categories & Mini-flows
  const defaultCategories: string[] = ['Abarrotes', 'Bebidas', 'Lácteos', 'Snacks', 'Verduras / Frutas', 'Carnes'];
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategoryEdit, setShowAddCategoryEdit] = useState(false);
  const [newCatInputEdit, setNewCatInputEdit] = useState('');
  const [showAddCategoryCreate, setShowAddCategoryCreate] = useState(false);
  const [newCatInputCreate, setNewCatInputCreate] = useState('');

  const allCategories = Array.from(
    new Set([
      ...defaultCategories,
      ...products.map((p) => p.category),
      ...customCategories,
    ])
  );

  const handleAddCategoryForEdit = () => {
    const trimmed = newCatInputEdit.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    if (editingProduct) {
      setEditingProduct({ ...editingProduct, category: trimmed });
    }
    setNewCatInputEdit('');
    setShowAddCategoryEdit(false);
    showToast(`Categoría "${trimmed}" añadida`);
  };

  const handleAddCategoryForCreate = () => {
    const trimmed = newCatInputCreate.trim();
    if (!trimmed) return;
    if (!allCategories.includes(trimmed)) {
      setCustomCategories((prev) => [...prev, trimmed]);
    }
    setNewCategory(trimmed);
    setNewCatInputCreate('');
    setShowAddCategoryCreate(false);
    showToast(`Categoría "${trimmed}" añadida`);
  };

  // Photo upload handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: result });
        }
        showToast('¡Foto cargada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImageUrl(event.target?.result as string);
        showToast('¡Foto seleccionada!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Dictation for Product Name using Web Speech API if supported
  const handleQuickDictation = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setShowVoiceModal(true);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      showToast('Escuchando... Di el nombre del producto', 'info');
      rec.onresult = (ev: SpeechRecognitionEvent) => {
        const spoken = ev.results[0][0].transcript;
        if (spoken) {
          setNewName(spoken.charAt(0).toUpperCase() + spoken.slice(1));
          showToast(`Nombre detectado: ${spoken}`, 'success');
        }
      };
      rec.onerror = () => {
        setShowVoiceModal(true);
      };
      rec.start();
    } catch {
      setShowVoiceModal(true);
    }
  };

  // Filtering products
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const isLowStock = p.stock <= p.minStock;

      if (stockFilter === 'Con stock') {
        return matchesSearch && p.stock > p.minStock;
      }
      if (stockFilter === 'Stock bajo') {
        return matchesSearch && isLowStock;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'precio') return b.price - a.price;
      if (sortBy === 'stock') return a.stock - b.stock;
      return a.name.localeCompare(b.name);
    });

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const handleOpenEdit = (p: Product) => {
    setEditingProduct({ ...p });
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    if (!editingProduct.name.trim()) {
      showToast('El nombre no puede estar vacío', 'warning');
      return;
    }
    updateProduct(editingProduct.id, {
      name: editingProduct.name,
      category: editingProduct.category,
      price: Number(editingProduct.price),
      cost: Number(editingProduct.cost),
      stock: Number(editingProduct.stock),
      unit: editingProduct.unit,
      minStock: Number(editingProduct.minStock),
      imageUrl: editingProduct.imageUrl,
    });
    setEditingProduct(null);
    showToast('Producto actualizado con éxito', 'success');
  };

  const handleCreateProduct = () => {
    if (!newName.trim() || !newPrice) {
      showToast('Completa el nombre y precio del producto', 'warning');
      return;
    }

    const price = parseFloat(newPrice) || 0;
    const cost = parseFloat(newCost) || price * 0.75;
    const stock = parseFloat(newStock) || 0;
    const minStock = parseFloat(newMinStock) || 5;

    let icon = 'inventory_2';
    if (newCategory === 'Verduras / Frutas') icon = 'nutrition';
    if (newCategory === 'Carnes') icon = 'restaurant';
    if (newCategory === 'Lácteos') icon = 'water_drop';
    if (newCategory === 'Bebidas') icon = 'local_drink';
    if (newCategory === 'Snacks') icon = 'cookie';

    addProduct({
      name: newName.trim(),
      category: newCategory,
      price,
      cost,
      stock,
      unit: newUnit,
      minStock,
      icon,
      imageUrl: newImageUrl,
    });

    setShowCreateModal(false);
    setNewName('');
    setNewSku('');
    setNewPrice('');
    setNewCost('');
    setNewStock('');
    setNewImageUrl(undefined);
    showToast('¡Producto guardado en inventario!', 'success');
  };

  return (
    <div className="bg-[#F6F8FA] dark:bg-[#13171D] text-[#252524] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors relative">
      <AppHeader title="Inventario" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-3">
        {/* Direct Action Card: Agregar Producto (Con Cámara o Modo Manual) */}
        <section className="bg-white dark:bg-[#1A1F26] rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#1E70BA] dark:text-[#60A5FA]">add_circle</span>
              Agregar producto
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              1 toque
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Direct Button 1: Con Cámara */}
            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="h-16 px-3 rounded-xl bg-[#EAF2F9] hover:bg-[#dcebf8] dark:bg-[#162738] dark:hover:bg-[#1c3248] border-2 border-[#1E70BA]/30 hover:border-[#1E70BA] active:scale-[0.98] transition-all flex items-center gap-2.5 text-left cursor-pointer shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1E70BA] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]">photo_camera</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  Con Cámara
                </div>
                <div className="text-[10px] font-bold text-[#1E70BA] dark:text-[#60A5FA] truncate mt-0.5">
                  Foto / Escáner IA
                </div>
              </div>
            </button>

            {/* Direct Button 2: Modo Manual */}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="h-16 px-3 rounded-xl bg-[#F4F9EA] hover:bg-[#eaf4da] dark:bg-[#1F2C18] dark:hover:bg-[#28381e] border-2 border-[#9EC84A]/40 hover:border-[#9EC84A] active:scale-[0.98] transition-all flex items-center gap-2.5 text-left cursor-pointer shadow-2xs group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#9EC84A] text-slate-950 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px] font-black">edit_note</span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  Modo Manual
                </div>
                <div className="text-[10px] font-bold text-[#4B7319] dark:text-[#A7CC44] truncate mt-0.5">
                  Escribir datos
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Search & Filter bar (Matches Mockup Screen 3) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <span className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              type="text"
              placeholder="Buscar producto o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A1F26] text-sm font-semibold text-[#252524] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1E70BA] shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* AI Camera scanner button */}
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="w-11 h-11 rounded-2xl bg-[#EAF2F9] dark:bg-[#1E293B] text-[#1E70BA] dark:text-[#60A5FA] border border-blue-200/60 dark:border-slate-700 flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
            title="Escanear con IA"
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          </button>
        </div>

        {/* Filter Pills / Chips (Matches Mockup Screen 3: "Todos" / "Con stock" / "Stock bajo") */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setStockFilter('Todos')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              stockFilter === 'Todos'
                ? 'bg-[#9EC84A] text-slate-950 shadow-xs ring-2 ring-[#9EC84A]/30'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Todos
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('Con stock')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
              stockFilter === 'Con stock'
                ? 'bg-[#9EC84A] text-slate-950 shadow-xs ring-2 ring-[#9EC84A]/30'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Con stock
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('Stock bajo')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              stockFilter === 'Stock bajo'
                ? 'bg-[#EE6B4D] text-white shadow-xs'
                : 'bg-white dark:bg-[#1A1F26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {lowStockCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
            <span>Stock bajo</span>
          </button>
        </div>

        {/* Subtitle bar: Product Count & Sort (Matches Mockup Screen 3: "24 productos | Ordenar por v") */}
        <div className="flex items-center justify-between px-1 pt-1 text-xs">
          <span className="font-bold text-slate-500 dark:text-slate-400">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
          </span>

          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'nombre' | 'precio' | 'stock')}
              className="bg-transparent border-none text-xs font-bold text-[#1E70BA] dark:text-[#60A5FA] p-0 pr-1 cursor-pointer focus:ring-0"
            >
              <option value="nombre">Nombre</option>
              <option value="precio">Mayor precio</option>
              <option value="stock">Menor stock</option>
            </select>
          </div>
        </div>

        {/* Products List (Matches Mockup Screen 3) */}
        <div className="space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-[#1A1F26] rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800 space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-400">inventory_2</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No se encontraron productos</p>
              <p className="text-xs text-slate-400">Toca el botón (+) verde abajo para agregar uno nuevo</p>
            </div>
          ) : (
            filteredProducts.map((p, idx) => {
              const isLow = p.stock <= p.minStock;
              const pseudoSku = `SKU: ${p.category.slice(0, 3).toUpperCase()}-${String(idx + 1).padStart(3, '0')}`;

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  className="bg-white dark:bg-[#1A1F26] rounded-2xl p-3 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:border-[#1E70BA]/50 transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail Box */}
                    <div className="relative w-12 h-12 rounded-xl bg-[#F6F8FA] dark:bg-[#20252D] border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[24px] text-[#1E70BA] dark:text-[#60A5FA]">
                          {p.icon || 'inventory_2'}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">
                        {pseudoSku}
                      </p>
                      <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">
                        Bs. {p.price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Stock Badge (Matches Mockup Screen 3: Lime pill badge with quantity) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div
                      className={`px-3 py-1.5 rounded-full flex items-center gap-1 font-black text-xs ${
                        isLow
                          ? 'bg-[#FDEFEA] text-[#EE6B4D] border border-[#EE6B4D]/30'
                          : 'bg-[#EBF5EC] text-[#2D8A4E] border border-emerald-200/60'
                      }`}
                    >
                      <span>{p.stock}</span>
                      <span className="material-symbols-outlined text-[13px]">
                        {isLow ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>

                    <span className="material-symbols-outlined text-slate-300 group-hover:text-[#1E70BA] text-[18px] transition-colors ml-0.5">
                      chevron_right
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Action Button (+) in Brand Green (Mockup Screen 3) */}
      <button
        type="button"
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-22 right-5 z-40 w-14 h-14 rounded-full bg-[#9EC84A] hover:bg-[#86A334] active:scale-95 text-slate-950 flex items-center justify-center shadow-lg shadow-[#9EC84A]/40 transition-all cursor-pointer border-2 border-white"
        title="Agregar nuevo producto"
      >
        <span className="material-symbols-outlined text-3xl font-black">add</span>
      </button>

      {/* ================= MODAL: NUEVO PRODUCTO (Matches Mockup Screen 4) ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header in Brand Blue */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-black cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                </button>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Nuevo producto
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Quick Switch to Camera Scanner Option */}
            <div className="bg-[#EAF2F9] dark:bg-[#162738] rounded-2xl p-3 border border-blue-200/70 dark:border-blue-900/40 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#1E70BA] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    ¿Prefieres usar la cámara?
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Reconoce el producto y su foto con IA
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowScannerModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-[#1E70BA] hover:bg-[#165A98] text-white text-xs font-black shrink-0 cursor-pointer active:scale-95 transition-all shadow-xs"
              >
                Abrir Cámara
              </button>
            </div>

            {/* Photo Card Box (Matches Mockup Screen 4: "Agregar foto") */}
            <div className="flex flex-col items-center justify-center">
              <input
                type="file"
                id="new-product-photo"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleNewPhotoUpload}
              />
              <label
                htmlFor="new-product-photo"
                className="w-full max-w-[200px] h-28 rounded-2xl bg-[#F6F8FA] dark:bg-[#20252D] border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#1E70BA] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all overflow-hidden group shadow-2xs"
              >
                {newImageUrl ? (
                  <img
                    src={newImageUrl}
                    alt="Nuevo producto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 shadow-xs group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-2xl text-[#1E70BA]">photo_camera</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Agregar foto
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Form Fields (Matches Mockup Screen 4) */}
            <div className="space-y-3">
              {/* Product Name with Voice Dictation Button (Orange/Coral mic button like Mockup Screen 4) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del producto *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ej: Galletas de avena"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-11 pl-3 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                  />
                  <button
                    type="button"
                    onClick={handleQuickDictation}
                    className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#EE6B4D] hover:bg-[#D65538] text-white flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition-all"
                    title="Dictar nombre por voz"
                  >
                    <span className="material-symbols-outlined text-base">mic</span>
                  </button>
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código (SKU)
                </label>
                <input
                  type="text"
                  placeholder="Ej: GAL-002"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                />
              </div>

              {/* Price and Stock in 2 cols (Mockup Screen 4) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Precio de venta *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-slate-400">Bs.</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="22.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full h-11 pl-9 pr-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stock inicial *
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                  />
                </div>
              </div>

              {/* Categoría Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Categoría
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <span className="material-symbols-outlined text-lg">sell</span>
                  </span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductCategory)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Green CTA Button (Matches Mockup Screen 4: "Guardar producto" in #9EC84A) */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  className="w-full h-12 bg-[#9EC84A] hover:bg-[#86A334] active:scale-98 text-slate-950 font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Guardar producto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR PRODUCTO ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1A1F26] text-[#252524] dark:text-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 group">
                  <input
                    type="file"
                    id="edit-product-photo"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <label
                    htmlFor="edit-product-photo"
                    className="relative w-14 h-14 rounded-2xl bg-[#EAF2F9] border-2 border-[#1E70BA]/30 hover:border-[#1E70BA] flex items-center justify-center cursor-pointer overflow-hidden shadow-xs block"
                  >
                    {editingProduct.imageUrl ? (
                      <img
                        src={editingProduct.imageUrl}
                        alt={editingProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[28px] text-[#1E70BA]">
                        {editingProduct.icon}
                      </span>
                    )}
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#1E70BA] text-white flex items-center justify-center shadow-xs border border-white">
                      <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                    </div>
                  </label>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Editar Producto</h3>
                  <label
                    htmlFor="edit-product-photo"
                    className="text-[11px] text-[#1E70BA] dark:text-[#60A5FA] font-bold hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                  >
                    <span>Cambiar foto</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Precio Venta (Bs.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, stock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#20252D] text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E70BA]"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="w-full h-12 bg-[#1E70BA] hover:bg-[#165A98] text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  Guardar Cambios
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${editingProduct.name}"?`)) {
                      deleteProduct(editingProduct.id);
                      setEditingProduct(null);
                    }
                  }}
                  className="w-full h-9 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl hover:bg-rose-100 cursor-pointer"
                >
                  Eliminar Producto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Product Vision Scanner Modal */}
      <ProductScanModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        initialMode="inventario"
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