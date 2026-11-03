export type ProductCategory =
  | 'Verduras / Frutas'
  | 'Carnes'
  | 'Lácteos'
  | 'Refrescos'
  | 'Abarrotes'
  | string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  unit: 'kg' | 'L' | 'ud';
  minStock: number;
  icon: string;
  badgeColor?: string;
  imageUrl?: string;
}

export type TransactionType = 'venta' | 'compra' | 'gasto';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  title: string;
  detail: string;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string;
  productId?: string;
  qty?: number;
  receiptImage?: string;
}

export interface ScannedReceiptItem {
  id: string;
  producto: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number | null;
  subtotal?: number | null;
  matchedProductId?: string;
}

export interface ScannedReceiptData {
  tipo: 'compra' | 'gasto' | 'venta';
  proveedor: string;
  fecha: string;
  total: number | null;
  categoriaSugerida: string;
  conceptoGeneral: string;
  items: ScannedReceiptItem[];
  imageBase64?: string;
}

export interface StoreInfo {
  name: string;
  owner: string;
  phone: string;
  city: string;
  type: string;
}

export interface UserSession {
  id: string;
  name: string;
  storeName: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google';
  token: string;
}

export type ScreenId =
  | 'ingreso'
  | 'inicio'
  | 'historial'
  | 'inventario'
  | 'mi-tienda'
  | 'reportes';
