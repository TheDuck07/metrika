import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { AppHeader } from '../components/AppHeader';
import { BottomNav } from '../components/BottomNav';
import { ProductScanModal } from '../components/ProductScanModal';
import { Product, ProductCategory } from '../types';

export const InventarioScreen: React.FC = () => {
  const { products, updateProduct, addProduct, deleteProduct, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Modal: Detail & Edit Product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Modal: Create New Product
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ProductCategory>('Abarrotes');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStock, setNewStock] = useState('');
  const [newUnit, setNewUnit] = useState<'kg' | 'L' | 'ud'>('ud');
  const [newMinStock, setNewMinStock] = useState('5');
  const [newImageUrl, setNewImageUrl] = useState<string | undefined>(undefined);
  const [showScannerModal, setShowScannerModal] = useState(false);

  // Dynamic Categories & Mini-flows
  const defaultCategories: string[] = ['Verduras / Frutas', 'Carnes', 'Lácteos', 'Refrescos', 'Abarrotes'];
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

  // Photo upload handler for editing product
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, imageUrl: result });
        }
        showToast('¡Foto cargada! Toca "Guardar Cambios" para aplicarla a la lista.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Photo upload handler for creating product
  const handleNewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImageUrl(event.target?.result as string);
        showToast('¡Foto seleccionada para el nuevo producto!');
      };
      reader.readAsDataURL(file);
    }
  };

  // Filtering products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isLowStock = p.stock <= p.minStock;

    if (selectedCategory === 'Todos') {
      return matchesSearch;
    }
    if (selectedCategory === '¡Poco Stock!') {
      return matchesSearch && isLowStock;
    }
    return matchesSearch && p.category === selectedCategory;
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
    if (newCategory === 'Refrescos') icon = 'local_drink';
    if (newCategory === 'Abarrotes') icon = 'grain';

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
    setNewPrice('');
    setNewCost('');
    setNewStock('');
    setNewImageUrl(undefined);
  };

  return (
    <div className="bg-[#fff8f5] dark:bg-[#171210] text-[#1f1b19] dark:text-stone-100 min-h-screen flex flex-col pb-28 select-none transition-colors">
      <AppHeader title="Inventario" />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 space-y-3.5">
        {/* Action Buttons: Manual + AI Scanner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full h-11 bg-[#9f3c16] hover:bg-[#822801] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Nuevo producto manual</span>
          </button>
          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="w-full h-11 bg-[#2a6651] hover:bg-[#205140] active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">photo_camera</span>
            <span>Escanear producto con IA</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-[#8a726a] flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-[20px] text-stone-400">search</span>
          </span>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#dec0b7] dark:border-stone-700 bg-white dark:bg-[#201814] text-sm font-medium text-[#1f1b19] dark:text-stone-100 placeholder-[#8a726a] dark:placeholder-stone-400 focus:outline-none focus:border-[#9f3c16] dark:focus:border-[#ff9973] shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[#8a726a] hover:text-[#1f1b19] dark:hover:text-stone-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Horizontal filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('Todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'Todos'
                ? 'bg-[#9f3c16] text-white shadow-xs'
                : 'bg-white dark:bg-[#201814] text-[#57423b] dark:text-stone-300 border border-[#dec0b7] dark:border-stone-700 hover:bg-[#f5ece8] dark:hover:bg-[#2b1f1a]'
            }`}
          >
            Todos <span className="opacity-80 ml-0.5">{products.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('¡Poco Stock!')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              selectedCategory === '¡Poco Stock!'
                ? 'bg-[#ba1a1a] text-white shadow-xs'
                : 'bg-[#ffdad6] dark:bg-rose-950/80 text-[#ba1a1a] dark:text-rose-300 hover:bg-[#ffc8c1]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>¡Poco Stock!</span>
            <span className="ml-0.5 bg-white/40 dark:bg-black/30 px-1 rounded-full text-[10px]">{lowStockCount}</span>
          </button>

          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#9f3c16] text-white shadow-xs'
                  : 'bg-white dark:bg-[#201814] text-[#57423b] dark:text-stone-300 border border-[#dec0b7] dark:border-stone-700 hover:bg-[#f5ece8] dark:hover:bg-[#2b1f1a]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products List */}
        <div className="space-y-2.5">
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-[#1f1815] rounded-2xl p-8 text-center border border-[#dec0b7]/50 dark:border-stone-800 space-y-2">
              <span className="material-symbols-outlined text-4xl text-[#8a726a] dark:text-stone-500">inventory</span>
              <p className="text-sm font-bold text-[#1f1b19] dark:text-stone-200">No se encontraron productos</p>
              <p className="text-xs text-[#8a726a] dark:text-stone-400">Intenta con otro término de búsqueda o categoría</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isLow = p.stock <= p.minStock;
              const stockPercent = Math.min(100, Math.max(10, (p.stock / (p.minStock * 2.5)) * 100));

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  className="bg-white dark:bg-[#1f1815] rounded-2xl p-3.5 shadow-xs border border-[#dec0b7]/60 dark:border-stone-800 hover:border-[#9f3c16]/60 dark:hover:border-stone-600 transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon / Thumbnail Box */}
                    <div className="relative w-14 h-14 rounded-xl bg-[#f5ece8] dark:bg-[#2b1f1a] border border-[#dec0b7]/50 dark:border-stone-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group-hover:bg-[#ffdbcf] dark:group-hover:bg-[#382620] transition-colors">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[28px] text-[#9f3c16] dark:text-[#ff9973]">
                          {p.icon}
                        </span>
                      )}
                      {isLow && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#ba1a1a] ring-2 ring-white dark:ring-black"></div>
                      )}
                      <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold uppercase bg-white/90 dark:bg-stone-900/90 px-1 rounded-sm text-[#57423b] dark:text-stone-300">
                        {p.unit}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#8a726a] dark:text-stone-400 uppercase tracking-wider">
                          {p.category}
                        </span>
                        {isLow && (
                          <span className="bg-[#ffdad6] dark:bg-rose-950/80 text-[#ba1a1a] dark:text-rose-300 text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">warning</span>
                            ¡Poco Stock!
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#1f1b19] dark:text-stone-100 truncate leading-tight mt-0.5">
                        {p.name}
                      </h3>

                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-extrabold text-[#9f3c16] dark:text-[#ff9973]">
                          Bs. {p.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[11px] text-[#8a726a]">/{p.unit}</span>
                      </div>

                      {/* Stock bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 bg-[#eae1dd] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow ? 'bg-[#ba1a1a]' : 'bg-[#2a6651]'
                            }`}
                            style={{ width: `${stockPercent}%` }}
                          ></div>
                        </div>
                        <span className={`text-[11px] font-bold shrink-0 ${isLow ? 'text-[#ba1a1a]' : 'text-[#57423b]'}`}>
                          {isLow ? `Quedan: ${p.stock} ${p.unit} (¡Bajo!)` : `Stock: ${p.stock} ${p.unit}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="material-symbols-outlined text-[#8a726a] group-hover:text-[#9f3c16] text-[20px] shrink-0 transition-colors">
                    chevron_right
                  </span>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL: Detalle y Edición de Producto al Clic 100% Funcional */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1815] text-[#1f1b19] dark:text-stone-100 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                {/* Photo/Camera Button Avatar Container (acts as both photo and button) */}
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
                    className="relative w-14 h-14 rounded-2xl bg-[#ffdbcf] border-2 border-[#9f3c16]/30 hover:border-[#9f3c16] flex items-center justify-center cursor-pointer overflow-hidden shadow-xs active:scale-95 transition-all block group"
                    title="Toca para tomar o subir foto del producto"
                  >
                    {editingProduct.imageUrl ? (
                      <img
                        src={editingProduct.imageUrl}
                        alt={editingProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[28px] text-[#9f3c16]">
                        {editingProduct.icon}
                      </span>
                    )}

                    {/* Camera icon badge on the photo itself */}
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#9f3c16] text-white flex items-center justify-center shadow-xs border border-white">
                      <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                    </div>

                    {/* Subtle hover overlay */}
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-[18px]">photo_camera</span>
                    </div>
                  </label>
                </div>

                <div>
                  <h3 className="font-bold text-base text-[#1f1b19] leading-tight">Editar Producto</h3>
                  <label
                    htmlFor="edit-product-photo"
                    className="text-[11px] text-[#9f3c16] font-bold hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">add_a_photo</span>
                    <span>Toca la foto para sacar o cambiar</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              {/* Categoría con botones interactivos y miniflow para añadir más */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700">Categoría</label>
                  <span className="text-[11px] font-bold text-[#9f3c16] bg-[#ffede3] px-2 py-0.5 rounded-full border border-[#f5bba3]">
                    {editingProduct.category}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-stone-100 rounded-xl border border-stone-200">
                  {allCategories.map((cat) => {
                    const isSelected = editingProduct.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, category: cat })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#9f3c16] text-white shadow-xs ring-2 ring-[#9f3c16]/30'
                            : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 active:scale-95'
                        }`}
                      >
                        {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {cat}
                      </button>
                    );
                  })}

                  {!showAddCategoryEdit && (
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryEdit(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fea619]/25 text-[#733c00] border border-[#fea619]/60 hover:bg-[#fea619]/35 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Añadir categoría
                    </button>
                  )}
                </div>

                {/* Miniflujo inline para añadir categoría */}
                {showAddCategoryEdit && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">category</span>
                      Nueva categoría
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: Panadería, Snacks, Limpieza..."
                        value={newCatInputEdit}
                        onChange={(e) => setNewCatInputEdit(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategoryForEdit();
                          }
                        }}
                        autoFocus
                        className="flex-1 h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9f3c16]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategoryForEdit}
                        className="h-9 px-3 rounded-lg bg-[#9f3c16] text-white text-xs font-bold hover:bg-[#853212] active:scale-95 transition-all cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryEdit(false);
                          setNewCatInputEdit('');
                        }}
                        className="h-9 px-2.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-300 active:scale-95 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Unidad de Medida en botones */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Unidad de Medida</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ud', label: 'Unidades (ud)' },
                    { id: 'kg', label: 'Kilogramos (kg)' },
                    { id: 'L', label: 'Litros (L)' },
                  ].map((u) => {
                    const isSelected = editingProduct.unit === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() =>
                          setEditingProduct({ ...editingProduct, unit: u.id as 'kg' | 'L' | 'ud' })
                        }
                        className={`h-10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#2c1e19] text-white shadow-xs'
                            : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price & Cost in 2 cols */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Precio Venta (por {editingProduct.unit === 'kg' ? 'Kg' : editingProduct.unit === 'L' ? 'L' : 'ud'})
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-stone-500">Bs.</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editingProduct.price}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-11 pl-8 pr-2.5 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-[#9f3c16] focus:outline-none focus:border-[#9f3c16]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Costo / Compra (Bs.)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-stone-500">Bs.</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editingProduct.cost}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-11 pl-8 pr-2.5 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-700 focus:outline-none focus:border-[#9f3c16]"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Stock Controls */}
              <div className="bg-[#fbf2ee] rounded-xl p-3 border border-[#dec0b7]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">
                    Stock Disponible ({editingProduct.unit})
                  </span>
                  <span className="text-xs font-extrabold text-[#9f3c16]">
                    {editingProduct.stock} {editingProduct.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: Math.max(0, editingProduct.stock - 1),
                      })
                    }
                    className="w-10 h-10 rounded-xl bg-[#ffede3] text-[#9f3c16] border border-[#f5bba3] font-bold text-xl flex items-center justify-center active:scale-95 cursor-pointer hover:bg-[#feddcf] transition-colors"
                    aria-label="Disminuir stock"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.stock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="flex-1 h-10 text-center font-bold text-base rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#9f3c16]"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct({
                        ...editingProduct,
                        stock: editingProduct.stock + 1,
                      })
                    }
                    className="w-10 h-10 rounded-xl bg-[#9f3c16] text-white font-bold text-xl flex items-center justify-center active:scale-95 cursor-pointer hover:bg-[#853212] transition-colors shadow-sm"
                    aria-label="Aumentar stock"
                  >
                    +
                  </button>

                </div>

                {/* Min stock threshold */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-stone-600">Alerta de poco stock si baja de:</span>
                  <input
                    type="number"
                    value={editingProduct.minStock}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        minStock: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-16 h-8 text-center text-xs font-bold rounded-lg border border-stone-300 bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="w-full h-12 bg-[#9f3c16] hover:bg-[#822801] active:scale-98 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">save</span>
                  Guardar Cambios del Producto
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar "${editingProduct.name}"?`)) {
                        deleteProduct(editingProduct.id);
                        setEditingProduct(null);
                      }
                    }}
                    className="flex-1 h-10 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl hover:bg-rose-100 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 h-10 bg-stone-100 text-stone-600 text-xs font-bold rounded-xl hover:bg-stone-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Nuevo Producto */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1f1815] text-[#1f1b19] dark:text-stone-100 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0 group">
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
                    className="relative w-14 h-14 rounded-2xl bg-[#ffdbcf] border-2 border-[#9f3c16]/30 hover:border-[#9f3c16] flex items-center justify-center cursor-pointer overflow-hidden shadow-xs active:scale-95 transition-all block group"
                    title="Toca para tomar o subir foto del producto"
                  >
                    {newImageUrl ? (
                      <img
                        src={newImageUrl}
                        alt="Nuevo producto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-[28px] text-[#9f3c16]">
                        add_a_photo
                      </span>
                    )}
                    <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#9f3c16] text-white flex items-center justify-center shadow-xs border border-white">
                      <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                    </div>
                  </label>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1f1b19]">Nuevo Producto</h3>
                  <label
                    htmlFor="new-product-photo"
                    className="text-[11px] text-[#9f3c16] font-bold hover:underline cursor-pointer flex items-center gap-1 mt-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">add_a_photo</span>
                    <span>Toca para añadir foto</span>
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* AI Vision Fast Capture Banner inside Create Modal */}
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setShowScannerModal(true);
              }}
              className="w-full p-2.5 bg-gradient-to-r from-[#fcedde] to-[#ffe5cf] hover:from-[#fbe2cd] hover:to-[#ffdabb] border border-[#fea619]/50 rounded-xl flex items-center justify-between text-left cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#bd532b] text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-lg">photo_camera</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#bd532b]">¿Escanear producto con IA?</span>
                    <span className="text-[9px] font-extrabold bg-[#bd532b]/15 text-[#bd532b] px-1.5 py-0.5 rounded-full">Gemini</span>
                  </div>
                  <p className="text-[10px] text-[#57423b]">Saca una foto y autocompleta nombre y categoría</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#bd532b] text-base">chevron_right</span>
            </button>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  placeholder="Ej: Fideo Famosa 500g, Papas holandesa"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#9f3c16]"
                />
              </div>

              {/* Categoría con botones interactivos y miniflow */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700">Categoría</label>
                  <span className="text-[11px] font-bold text-[#9f3c16] bg-[#ffede3] px-2 py-0.5 rounded-full border border-[#f5bba3]">
                    {newCategory}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 bg-stone-100 rounded-xl border border-stone-200">
                  {allCategories.map((cat) => {
                    const isSelected = newCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#9f3c16] text-white shadow-xs ring-2 ring-[#9f3c16]/30'
                            : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200 active:scale-95'
                        }`}
                      >
                        {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                        {cat}
                      </button>
                    );
                  })}

                  {!showAddCategoryCreate && (
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryCreate(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#fea619]/25 text-[#733c00] border border-[#fea619]/60 hover:bg-[#fea619]/35 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Añadir categoría
                    </button>
                  )}
                </div>

                {/* Miniflujo inline para añadir categoría */}
                {showAddCategoryCreate && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                    <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">category</span>
                      Nueva categoría
                    </p>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Ej: Panadería, Snacks, Limpieza..."
                        value={newCatInputCreate}
                        onChange={(e) => setNewCatInputCreate(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategoryForCreate();
                          }
                        }}
                        autoFocus
                        className="flex-1 h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9f3c16]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategoryForCreate}
                        className="h-9 px-3 rounded-lg bg-[#9f3c16] text-white text-xs font-bold hover:bg-[#853212] active:scale-95 transition-all cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategoryCreate(false);
                          setNewCatInputCreate('');
                        }}
                        className="h-9 px-2.5 rounded-lg bg-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-300 active:scale-95 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Unidad de Medida en botones */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Unidad de Medida</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ud', label: 'Unidades (ud)' },
                    { id: 'kg', label: 'Kilogramos (kg)' },
                    { id: 'L', label: 'Litros (L)' },
                  ].map((u) => {
                    const isSelected = newUnit === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setNewUnit(u.id as 'kg' | 'L' | 'ud')}
                        className={`h-10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#2c1e19] text-white shadow-xs'
                            : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {u.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Precio Venta (por {newUnit === 'kg' ? 'Kg' : newUnit === 'L' ? 'L' : 'ud'})
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-bold text-stone-500">Bs.</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="0.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full h-11 pl-8 pr-2.5 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-[#9f3c16] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Stock Inicial</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-stone-50 text-sm font-bold text-stone-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  className="w-full h-12 bg-[#9f3c16] hover:bg-[#822801] active:scale-98 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  Crear y Guardar en Tienda
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full h-10 text-xs font-bold text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Vision Scanner Modal */}
      <ProductScanModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        initialMode="inventario"
      />

      <BottomNav />
    </div>
  );
};
