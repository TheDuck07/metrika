import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product, Transaction, StoreInfo, ScreenId, UserSession } from '../types';
import { getTodayDateStr, getYesterdayDateStr, formatNowTime } from '../utils/dateUtils';

interface StoreContextType {
  user: UserSession | null;
  login: (identity: string, pin: string) => Promise<boolean>;
  loginWithGoogle: (credentialOrData: any) => Promise<boolean>;
  registerUser: (data: { storeName: string; ownerName: string; phone?: string; email?: string; pin: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  storeInfo: StoreInfo;
  updateStoreInfo: (updates: Partial<StoreInfo>) => void;
  products: Product[];
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (newProduct: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
  transactions: Transaction[];
  recordSale: (productId: string, qty: number, customTitle?: string, customAmount?: number) => void;
  recordDirectSale: (title: string, amount: number, category?: string) => void;
  recordPurchase: (title: string, amount: number, category?: string, productId?: string, qty?: number) => void;
  recordExpense: (title: string, amount: number, category: string) => void;
  recordScannedTransaction: (params: {
    tipo: 'compra' | 'gasto' | 'venta';
    title: string;
    amount: number;
    category: string;
    date?: string;
    time?: string;
    receiptImage?: string;
    items?: Array<{
      producto: string;
      cantidad: number;
      unidad?: string;
      precioUnitario?: number | null;
      matchedProductId?: string;
    }>;
  }) => void;
  toastMessage: string | null;
  toastType: 'success' | 'info' | 'warning';
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  navigateWithPush: (screen: ScreenId) => void;
  navigateWithPushBack: (screen: ScreenId) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  showTutorial: boolean;
  setShowTutorial: (show: boolean) => void;
  availableStores: Array<{ id: string; name: string; storeName: string; phone?: string; email?: string }>;
  refreshAvailableStores: () => Promise<void>;
  switchStore: (storeId: string) => Promise<boolean>;
  showBusinessSwitcher: boolean;
  setShowBusinessSwitcher: (show: boolean) => void;
  showCreateBusinessModal: boolean;
  setShowCreateBusinessModal: (show: boolean) => void;
  showAccountModal: boolean;
  setShowAccountModal: (show: boolean) => void;
  updateUserProfile: (updates: {
    name?: string;
    storeName?: string;
    avatarUrl?: string;
    phone?: string;
    email?: string;
  }) => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const INITIAL_STORE_INFO: StoreInfo = {
  name: 'Tienda Don Lucho',
  owner: 'Doña María Mendoza R.',
  phone: '77234567',
  city: 'La Paz - San Pedro',
  type: 'Barrio',
};

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Tomate perita de feria',
    category: 'Verduras / Frutas',
    price: 8.0,
    cost: 5.5,
    stock: 12.5,
    unit: 'kg',
    minStock: 5.0,
    icon: 'nutrition',
    badgeColor: '#e11d48',
  },
  {
    id: 'prod-2',
    name: 'Carne de res molida especial',
    category: 'Carnes',
    price: 38.0,
    cost: 29.0,
    stock: 6.0,
    unit: 'kg',
    minStock: 8.0,
    icon: 'restaurant',
    badgeColor: '#dc2626',
  },
  {
    id: 'prod-3',
    name: 'Leche Pil Entera (1L)',
    category: 'Lácteos',
    price: 6.5,
    cost: 4.8,
    stock: 25.0,
    unit: 'L',
    minStock: 10.0,
    icon: 'water_drop',
    badgeColor: '#2563eb',
  },
  {
    id: 'prod-4',
    name: 'Coca-Cola 2L Retornable',
    category: 'Refrescos',
    price: 14.0,
    cost: 11.0,
    stock: 18.0,
    unit: 'ud',
    minStock: 10.0,
    icon: 'local_drink',
    badgeColor: '#b91c1c',
  },
  {
    id: 'prod-5',
    name: 'Arroz Grano de Oro 1kg',
    category: 'Abarrotes',
    price: 9.5,
    cost: 7.2,
    stock: 42.0,
    unit: 'kg',
    minStock: 15.0,
    icon: 'grain',
    badgeColor: '#d97706',
  },
  {
    id: 'prod-6',
    name: 'Aceite Fino 900ml',
    category: 'Abarrotes',
    price: 13.0,
    cost: 10.2,
    stock: 15.0,
    unit: 'ud',
    minStock: 8.0,
    icon: 'oil_barrel',
    badgeColor: '#eab308',
  },
];

function getInitialTransactions(): Transaction[] {
  const today = getTodayDateStr();
  const yesterday = getYesterdayDateStr();

  return [
    {
      id: 'tx-1',
      type: 'venta',
      category: 'Bebidas',
      title: '3 uds. Coca-Cola 500 ml',
      detail: 'Bebidas',
      amount: 18.0,
      date: today,
      time: '11:42 AM',
    },
    {
      id: 'tx-2',
      type: 'venta',
      category: 'Lácteos',
      title: '5 uds. Pilfrut',
      detail: 'Lácteos',
      amount: 10.0,
      date: today,
      time: '10:15 AM',
    },
    {
      id: 'tx-3',
      type: 'compra',
      category: 'Abarrotes',
      title: '20 uds. Lata de atún',
      detail: 'Abarrotes',
      amount: 250.0,
      date: today,
      time: '08:30 AM',
    },
    {
      id: 'tx-4',
      type: 'gasto',
      category: 'Servicio eléctrico local',
      title: 'Gasto Luz mensual',
      detail: 'Servicio eléctrico local',
      amount: 40.0,
      date: yesterday,
      time: '06:10 PM',
    },
    {
      id: 'tx-5',
      type: 'venta',
      category: 'Lácteos',
      title: '3 uds. Leche PIL natural',
      detail: 'Lácteos',
      amount: 21.0,
      date: yesterday,
      time: '03:22 PM',
    },
    {
      id: 'tx-6',
      type: 'venta',
      category: 'Panadería fresca',
      title: '8 uds. Pan de batalla',
      detail: 'Panadería fresca',
      amount: 8.0,
      date: yesterday,
      time: '07:15 AM',
    },
  ];
}

const STORAGE_KEYS = {
  TOKEN: 'metrika_token',
  USER: 'metrika_user',
  STORE_DATA_PREFIX: 'metrika_store_',
  OFFLINE_USERS: 'metrika_offline_users',
};

interface OfflineUserRecord {
  id: string;
  name: string;
  storeName: string;
  phone?: string;
  email?: string;
  pin?: string;
}

const DEFAULT_DEMO_USER: OfflineUserRecord = {
  id: 'user-demo',
  name: 'Don Lucho',
  storeName: 'Abarrotes Don Lucho',
  phone: '77012345',
  email: 'donlucho@metrika.bo',
  pin: '1234',
};

function getLocalOfflineUsers(): OfflineUserRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [DEFAULT_DEMO_USER];
}

function parseGoogleJwt(token: string): { email?: string; name?: string; picture?: string; sub?: string } {
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    }
  } catch (err) {
    console.warn('Error parsing Google JWT:', err);
  }
  return {};
}

function saveLocalOfflineUser(record: OfflineUserRecord) {
  try {
    const list = getLocalOfflineUsers().filter((u) => u.id !== record.id);
    list.push(record);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_USERS, JSON.stringify(list));
  } catch {}
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('screen') && params.get('screen') !== 'ingreso') {
          return {
            id: 'user-demo',
            name: 'Don Lucho',
            storeName: 'Abarrotes Don Lucho',
            token: 'demo-token',
          };
        }
      }
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const req = params.get('screen') as ScreenId;
      if (req) return req;
    }
    // If user is already logged in, start at inicio, otherwise ingreso
    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return savedToken ? 'inicio' : 'ingreso';
  });

  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() => {
    if (user && user.id !== 'user-demo') {
      return {
        name: user.storeName || 'Mi Negocio',
        owner: user.name || 'Propietario',
        phone: user.phone || '',
        city: 'La Paz - San Pedro',
        type: 'Barrio',
      };
    }
    return INITIAL_STORE_INFO;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    if (user && user.id !== 'user-demo') {
      try {
        const cached = localStorage.getItem(`${STORAGE_KEYS.STORE_DATA_PREFIX}${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.products)) return parsed.products;
        }
      } catch {}
      return [];
    }
    return INITIAL_PRODUCTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (user && user.id !== 'user-demo') {
      try {
        const cached = localStorage.getItem(`${STORAGE_KEYS.STORE_DATA_PREFIX}${user.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.transactions)) return parsed.transactions;
        }
      } catch {}
      return [];
    }
    return getInitialTransactions();
  });

  const [availableStores, setAvailableStores] = useState<
    Array<{ id: string; name: string; storeName: string; phone?: string; email?: string }>
  >([]);
  const [showBusinessSwitcher, setShowBusinessSwitcher] = useState<boolean>(false);
  const [showCreateBusinessModal, setShowCreateBusinessModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'warning'>('success');
  const syncTimeoutRef = useRef<any>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('theme') === 'light') return false;
        if (params.get('theme') === 'dark') return true;
      }
      const saved = localStorage.getItem('metrika_dark_mode');
      if (saved !== null) return saved === 'true';
      return false;
    } catch {
      return false;
    }
  });

  // Onboarding Tutorial State
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    try {
      localStorage.setItem('metrika_dark_mode', String(isDarkMode));
    } catch {
      // Ignored
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  }, []);

  // Sync data to backend and localStorage whenever store state changes
  const persistStoreData = useCallback(
    (info: StoreInfo, prods: Product[], txs: Transaction[], currentUser = user) => {
      if (!currentUser) return;

      const cacheKey = `${STORAGE_KEYS.STORE_DATA_PREFIX}${currentUser.id}`;
      const payload = {
        storeInfo: info,
        products: prods,
        transactions: txs,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }

      // Debounce sync to backend API
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(async () => {
        const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
        if (!token) return;
        try {
          await fetch('/api/store/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              storeInfo: info,
              products: prods,
              transactions: txs,
            }),
          });
        } catch (err) {
          console.warn('Failed syncing store data to server:', err);
        }
      }, 500);
    },
    [user]
  );

  // Load user data on startup or user change
  const loadUserData = useCallback(async (activeUser: UserSession) => {
    const isDemo = activeUser.id === 'user-demo';
    const cacheKey = `${STORAGE_KEYS.STORE_DATA_PREFIX}${activeUser.id}`;
    let loadedFromCache = false;

    // Try loading cached local data
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.storeInfo) setStoreInfo(parsed.storeInfo);
        if (Array.isArray(parsed.products)) setProducts(parsed.products);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        loadedFromCache = true;
      }
    } catch (e) {
      console.warn('Could not read cached store data:', e);
    }

    // Attempt remote sync from server database
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      try {
        const res = await fetch('/api/store/data', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setStoreInfo(
              json.data.storeInfo || {
                name: activeUser.storeName || (isDemo ? INITIAL_STORE_INFO.name : 'Mi Negocio'),
                owner: activeUser.name || (isDemo ? INITIAL_STORE_INFO.owner : 'Propietario'),
                phone: activeUser.phone || '',
                city: 'La Paz - San Pedro',
                type: 'Barrio',
              }
            );
            setProducts(Array.isArray(json.data.products) ? json.data.products : (isDemo ? INITIAL_PRODUCTS : []));
            setTransactions(Array.isArray(json.data.transactions) ? json.data.transactions : (isDemo ? getInitialTransactions() : []));
            return;
          }
        }
      } catch (err) {
        console.warn('Error fetching store data from API:', err);
      }
    }

    if (!loadedFromCache) {
      // First time initialization for this user: clean slate for custom store, mock data only for demo
      const initialInfo: StoreInfo = {
        name: activeUser.storeName || (isDemo ? INITIAL_STORE_INFO.name : 'Mi Negocio'),
        owner: activeUser.name || (isDemo ? INITIAL_STORE_INFO.owner : 'Propietario'),
        phone: activeUser.phone || '',
        city: 'La Paz - San Pedro',
        type: 'Barrio',
      };
      const initialProds = isDemo ? INITIAL_PRODUCTS : [];
      const initialTxs = isDemo ? getInitialTransactions() : [];
      setStoreInfo(initialInfo);
      setProducts(initialProds);
      setTransactions(initialTxs);
      persistStoreData(initialInfo, initialProds, initialTxs, activeUser);
    }
  }, [persistStoreData]);

  const refreshAvailableStores = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/stores');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.stores)) {
          // Merge with local offline stores
          const offlineList = getLocalOfflineUsers().map((u) => ({
            id: u.id,
            name: u.name,
            storeName: u.storeName,
            phone: u.phone,
            email: u.email,
          }));
          const map = new Map<string, any>();
          json.stores.forEach((s: any) => map.set(s.id, s));
          offlineList.forEach((s) => map.set(s.id, s));
          setAvailableStores(Array.from(map.values()));
          return;
        }
      }
    } catch {
      // Ignored
    }

    // Fallback to local offline stores
    const offlineList = getLocalOfflineUsers().map((u) => ({
      id: u.id,
      name: u.name,
      storeName: u.storeName,
      phone: u.phone,
      email: u.email,
    }));
    setAvailableStores(offlineList);
  }, []);

  const switchStore = async (storeId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/switch-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const sessionUser: UserSession = {
            ...data.user,
            token: data.token,
          };

          localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
          saveLocalOfflineUser({
            id: sessionUser.id,
            name: sessionUser.name,
            storeName: sessionUser.storeName,
            phone: sessionUser.phone,
            email: sessionUser.email,
          });
          setUser(sessionUser);

          const isDemo = sessionUser.id === 'user-demo';
          setProducts(isDemo ? INITIAL_PRODUCTS : []);
          setTransactions(isDemo ? getInitialTransactions() : []);
          setStoreInfo({
            name: sessionUser.storeName || (isDemo ? INITIAL_STORE_INFO.name : 'Mi Negocio'),
            owner: sessionUser.name || (isDemo ? INITIAL_STORE_INFO.owner : 'Propietario'),
            phone: sessionUser.phone || '',
            city: 'La Paz - San Pedro',
            type: 'Barrio',
          });

          await loadUserData(sessionUser);
          showToast(`Cambiado a negocio: ${sessionUser.storeName}`, 'success');
          return true;
        }
      }
    } catch {
      // Server offline / unreachable: continue to offline switch
    }

    // Offline store switch
    const localUser = getLocalOfflineUsers().find((u) => u.id === storeId);
    if (localUser) {
      const sessionUser: UserSession = {
        id: localUser.id,
        name: localUser.name,
        storeName: localUser.storeName,
        phone: localUser.phone,
        email: localUser.email,
        token: `offline-token-${localUser.id}-${Date.now()}`,
      };
      localStorage.setItem(STORAGE_KEYS.TOKEN, sessionUser.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
      setUser(sessionUser);

      const isDemo = sessionUser.id === 'user-demo';
      setProducts(isDemo ? INITIAL_PRODUCTS : []);
      setTransactions(isDemo ? getInitialTransactions() : []);
      setStoreInfo({
        name: sessionUser.storeName || (isDemo ? INITIAL_STORE_INFO.name : 'Mi Negocio'),
        owner: sessionUser.name || (isDemo ? INITIAL_STORE_INFO.owner : 'Propietario'),
        phone: sessionUser.phone || '',
        city: 'La Paz - San Pedro',
        type: 'Barrio',
      });

      await loadUserData(sessionUser);
      showToast(`Cambiado a negocio: ${sessionUser.storeName}`, 'success');
      return true;
    }

    showToast('No se encontró el negocio solicitado', 'warning');
    return false;
  };

  // Validate session on mount
  useEffect(() => {
    refreshAvailableStores();
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (!token) {
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.user) {
          const sessionUser: UserSession = {
            ...json.user,
            token,
          };
          setUser(sessionUser);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
          loadUserData(sessionUser);
        } else {
          // Token invalid or expired
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          setUser(null);
          setCurrentScreen('ingreso');
        }
      })
      .catch(() => {
        // If offline, continue with cached user if present
        if (user) {
          loadUserData(user);
        }
      });
  }, []);

  const login = async (identity: string, pin: string): Promise<boolean> => {
    let sessionUser: UserSession | null = null;
    const cleanId = identity.trim();
    const cleanPin = pin.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: cleanId, pin: cleanPin }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          sessionUser = {
            ...data.user,
            token: data.token,
          };
        } else if (data.error) {
          showToast(data.error, 'warning');
          return false;
        }
      }
    } catch {
      // Backend not running / offline: fall back to offline credentials check
    }

    // Offline fallback verification
    if (!sessionUser) {
      const offlineUsers = getLocalOfflineUsers();
      const found = offlineUsers.find(
        (u) =>
          (u.phone === cleanId ||
            u.email?.toLowerCase() === cleanId.toLowerCase() ||
            u.name.toLowerCase() === cleanId.toLowerCase()) &&
          (u.pin === cleanPin || (!u.pin && cleanPin === '1234'))
      ) || (cleanId === '77012345' && cleanPin === '1234' ? DEFAULT_DEMO_USER : null);

      if (found) {
        sessionUser = {
          id: found.id,
          name: found.name,
          storeName: found.storeName,
          phone: found.phone,
          email: found.email,
          token: `offline-token-${found.id}-${Date.now()}`,
        };
      }
    }

    if (!sessionUser) {
      showToast('Credenciales incorrectas o usuario no encontrado', 'warning');
      return false;
    }

    localStorage.setItem(STORAGE_KEYS.TOKEN, sessionUser.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
    saveLocalOfflineUser({
      id: sessionUser.id,
      name: sessionUser.name,
      storeName: sessionUser.storeName,
      phone: sessionUser.phone,
      email: sessionUser.email,
      pin: cleanPin,
    });

    setUser(sessionUser);
    await loadUserData(sessionUser);

    showToast(`¡Bienvenido de nuevo, ${sessionUser.name}!`, 'success');
    setCurrentScreen('inicio');
    return true;
  };

  const loginWithGoogle = async (credentialOrData?: any): Promise<boolean> => {
    try {
      let email = 'mi.tienda@gmail.com';
      let name = 'Comerciante Google';
      let picture = 'https://lh3.googleusercontent.com/a/default-user';
      let sub = `g-${Date.now()}`;

      if (typeof credentialOrData === 'string') {
        const decoded = parseGoogleJwt(credentialOrData);
        email = decoded.email || email;
        name = decoded.name || name;
        picture = decoded.picture || picture;
        sub = decoded.sub || sub;
      } else if (credentialOrData && typeof credentialOrData === 'object') {
        if (credentialOrData.credential) {
          const decoded = parseGoogleJwt(credentialOrData.credential);
          email = decoded.email || credentialOrData.email || email;
          name = decoded.name || credentialOrData.name || name;
          picture = decoded.picture || credentialOrData.picture || picture;
          sub = decoded.sub || credentialOrData.sub || sub;
        } else {
          email = credentialOrData.email || email;
          name = credentialOrData.name || name;
          picture = credentialOrData.picture || credentialOrData.avatarUrl || picture;
          sub = credentialOrData.sub || credentialOrData.id || sub;
        }
      }

      // 1. Try online Google auth endpoint if online
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const body = {
            credential: typeof credentialOrData === 'string' ? credentialOrData : undefined,
            email,
            name,
            picture,
            sub,
          };

          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
              const sessionUser: UserSession = {
                ...data.user,
                avatarUrl: data.user.avatarUrl || picture,
                token: data.token,
              };

              localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
              setUser(sessionUser);
              setStoreInfo((prev) => ({
                ...prev,
                owner: sessionUser.name,
                name: sessionUser.storeName || `Tienda de ${sessionUser.name.split(' ')[0]}`,
                logoUrl: sessionUser.avatarUrl,
                avatarUrl: sessionUser.avatarUrl,
              }));
              await loadUserData(sessionUser);

              showToast(`¡Conectado con Google (${sessionUser.email || sessionUser.name})!`, 'success');
              setCurrentScreen('inicio');
              return true;
            }
          }
        } catch {
          // Fall back gracefully to offline Google profile
        }
      }

      // 2. Offline / local Google sign in using user's real email, name and picture
      const storeName = `Tienda de ${name.split(' ')[0]}`;
      const offlineGoogleUser: UserSession = {
        id: `google-user-${sub}`,
        name,
        storeName,
        phone: '77012345',
        email,
        avatarUrl: picture,
        authProvider: 'google',
        token: `google-token-${Date.now()}`,
      };

      localStorage.setItem(STORAGE_KEYS.TOKEN, offlineGoogleUser.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(offlineGoogleUser));
      saveLocalOfflineUser({
        id: offlineGoogleUser.id,
        name: offlineGoogleUser.name,
        storeName: offlineGoogleUser.storeName,
        phone: offlineGoogleUser.phone,
        email: offlineGoogleUser.email,
        pin: '1234',
        createdAt: new Date().toISOString(),
      });
      setUser(offlineGoogleUser);
      setStoreInfo((prev) => ({
        ...prev,
        owner: offlineGoogleUser.name,
        name: offlineGoogleUser.storeName,
        logoUrl: picture,
        avatarUrl: picture,
      }));
      await loadUserData(offlineGoogleUser);

      showToast(`¡Conectado con tu cuenta Google (${email})!`, 'success');
      setCurrentScreen('inicio');
      return true;
    } catch (err) {
      showToast('Error al conectar con Google', 'warning');
      return false;
    }
  };

  const registerUser = async (params: {
    storeName: string;
    ownerName: string;
    phone?: string;
    email?: string;
    pin: string;
  }): Promise<boolean> => {
    let sessionUser: UserSession | null = null;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          sessionUser = {
            ...data.user,
            token: data.token,
          };
        } else if (data.error) {
          showToast(data.error, 'warning');
          return false;
        }
      }
    } catch {
      // Backend offline / APK standalone mode
    }

    // Offline registration fallback
    if (!sessionUser) {
      const offlineId = `user-local-${Date.now()}`;
      sessionUser = {
        id: offlineId,
        name: params.ownerName.trim(),
        storeName: params.storeName.trim() || `Tienda de ${params.ownerName.trim()}`,
        phone: params.phone?.trim(),
        email: params.email?.trim(),
        token: `offline-token-${offlineId}`,
      };
    }

    localStorage.setItem(STORAGE_KEYS.TOKEN, sessionUser.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(sessionUser));
    saveLocalOfflineUser({
      id: sessionUser.id,
      name: sessionUser.name,
      storeName: sessionUser.storeName,
      phone: sessionUser.phone,
      email: sessionUser.email,
      pin: params.pin.trim(),
    });

    setUser(sessionUser);

    const newInfo: StoreInfo = {
      name: params.storeName || `Tienda de ${params.ownerName}`,
      owner: params.ownerName,
      phone: params.phone || '',
      city: 'La Paz - San Pedro',
      type: 'Barrio',
    };
    const cleanProducts: Product[] = [];
    const cleanTransactions: Transaction[] = [];
    setStoreInfo(newInfo);
    setProducts(cleanProducts);
    setTransactions(cleanTransactions);
    persistStoreData(newInfo, cleanProducts, cleanTransactions, sessionUser);
    refreshAvailableStores();

    showToast(`¡Cuenta creada con éxito! Bienvenido a ${params.storeName}`, 'success');
    setCurrentScreen('inicio');
    setShowTutorial(true);
    return true;
  };

  const logout = async () => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    setShowAccountModal(false);
    setCurrentScreen('ingreso');
    showToast('Sesión cerrada. ¡Buen descanso!');
  };

  const setThemeMode = useCallback((mode: 'light' | 'dark') => {
    setIsDarkMode(mode === 'dark');
  }, []);

  const updateUserProfile = useCallback(
    (updates: {
      name?: string;
      storeName?: string;
      avatarUrl?: string;
      phone?: string;
      email?: string;
    }) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated: UserSession = {
          ...prev,
          name: updates.name !== undefined ? updates.name : prev.name,
          storeName: updates.storeName !== undefined ? updates.storeName : prev.storeName,
          avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : prev.avatarUrl,
          phone: updates.phone !== undefined ? updates.phone : prev.phone,
          email: updates.email !== undefined ? updates.email : prev.email,
        };
        try {
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setStoreInfo((prev) => {
        const updated: StoreInfo = {
          ...prev,
          owner: updates.name !== undefined ? updates.name : prev.owner,
          name: updates.storeName !== undefined ? updates.storeName : prev.name,
          phone: updates.phone !== undefined ? updates.phone : prev.phone,
          logoUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : prev.logoUrl,
          avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : prev.avatarUrl,
        };
        persistStoreData(updated, products, transactions);
        return updated;
      });

      showToast('¡Perfil y foto actualizados!', 'success');
    },
    [products, transactions, persistStoreData, showToast]
  );

  const updateStoreInfo = (updates: Partial<StoreInfo>) => {
    setStoreInfo((prev) => {
      const next = { ...prev, ...updates };
      persistStoreData(next, products, transactions);
      return next;
    });
    showToast('¡Datos de la tienda actualizados con éxito!');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      persistStoreData(storeInfo, next, transactions);
      return next;
    });
    showToast('¡Producto actualizado en inventario!');
  };

  const addProduct = (newProduct: Omit<Product, 'id'>) => {
    const id = `prod-${Date.now()}`;
    const product: Product = { ...newProduct, id };
    setProducts((prev) => {
      const next = [product, ...prev];
      persistStoreData(storeInfo, next, transactions);
      return next;
    });
    showToast(`¡"${product.name}" agregado a tu inventario!`);
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistStoreData(storeInfo, next, transactions);
      return next;
    });
    showToast('Producto eliminado del inventario', 'info');
  };

  const recordSale = (productId: string, qty: number, customTitle?: string, customAmount?: number) => {
    const prod = products.find((p) => p.id === productId);
    const title = customTitle || (prod ? `${qty} ${prod.unit}. ${prod.name}` : `Venta de mostrador`);
    const amount = customAmount !== undefined ? customAmount : prod ? prod.price * qty : 10;
    const category = prod ? prod.category : 'Varios';

    let updatedProducts = products;
    if (prod) {
      const newStock = Math.max(0, prod.stock - qty);
      updatedProducts = products.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p));
      setProducts(updatedProducts);
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'venta',
      category,
      title,
      detail: category,
      amount,
      date: getTodayDateStr(),
      time: formatNowTime(),
      productId,
      qty,
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      persistStoreData(storeInfo, updatedProducts, next);
      return next;
    });
    showToast(`Venta registrada: +Bs. ${amount.toFixed(2)}`, 'success');
  };

  const recordDirectSale = (title: string, amount: number, category: string = 'Venta Rápida') => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'venta',
      category,
      title,
      detail: category,
      amount,
      date: getTodayDateStr(),
      time: formatNowTime(),
    };
    setTransactions((prev) => {
      const next = [newTx, ...prev];
      persistStoreData(storeInfo, products, next);
      return next;
    });
    showToast(`Venta rápida registrada: +Bs. ${amount.toFixed(2)}`, 'success');
  };

  const recordPurchase = (
    title: string,
    amount: number,
    category: string = 'Mercadería',
    productId?: string,
    qty?: number
  ) => {
    let updatedProducts = products;
    if (productId && qty) {
      const prod = products.find((p) => p.id === productId);
      if (prod) {
        updatedProducts = products.map((p) => (p.id === prod.id ? { ...p, stock: prod.stock + qty } : p));
        setProducts(updatedProducts);
      }
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'compra',
      category,
      title,
      detail: category,
      amount,
      date: getTodayDateStr(),
      time: formatNowTime(),
      productId,
      qty,
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      persistStoreData(storeInfo, updatedProducts, next);
      return next;
    });
    showToast(`Compra registrada: -Bs. ${amount.toFixed(2)}`, 'warning');
  };

  const recordExpense = (title: string, amount: number, category: string) => {
    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: 'gasto',
      category,
      title,
      detail: category,
      amount,
      date: getTodayDateStr(),
      time: formatNowTime(),
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      persistStoreData(storeInfo, products, next);
      return next;
    });
    showToast(`Gasto registrado: -Bs. ${amount.toFixed(2)}`, 'warning');
  };

  const recordScannedTransaction = (params: {
    tipo: 'compra' | 'gasto' | 'venta';
    title: string;
    amount: number;
    category: string;
    date?: string;
    time?: string;
    receiptImage?: string;
    items?: Array<{
      producto: string;
      cantidad: number;
      unidad?: string;
      precioUnitario?: number | null;
      matchedProductId?: string;
    }>;
  }) => {
    let updatedProducts = [...products];
    if (params.tipo === 'compra' && params.items) {
      params.items.forEach((item) => {
        if (item.matchedProductId && item.cantidad > 0) {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id === item.matchedProductId) {
              return {
                ...p,
                stock: p.stock + item.cantidad,
                cost: item.precioUnitario && item.precioUnitario > 0 ? item.precioUnitario : p.cost,
              };
            }
            return p;
          });
        }
      });
      setProducts(updatedProducts);
    } else if (params.tipo === 'venta' && params.items) {
      params.items.forEach((item) => {
        if (item.matchedProductId && item.cantidad > 0) {
          updatedProducts = updatedProducts.map((p) => {
            if (p.id === item.matchedProductId) {
              return {
                ...p,
                stock: Math.max(0, p.stock - item.cantidad),
              };
            }
            return p;
          });
        }
      });
      setProducts(updatedProducts);
    }

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      type: params.tipo,
      category: params.category || (params.tipo === 'compra' ? 'Mercadería' : params.tipo === 'gasto' ? 'Servicios' : 'Ventas'),
      title: params.title,
      detail: params.category,
      amount: params.amount,
      date: params.date || getTodayDateStr(),
      time: params.time || formatNowTime(),
      receiptImage: params.receiptImage,
    };

    setTransactions((prev) => {
      const next = [newTx, ...prev];
      persistStoreData(storeInfo, updatedProducts, next);
      return next;
    });

    const toastPrefix =
      params.tipo === 'compra'
        ? 'Compra registrada'
        : params.tipo === 'gasto'
        ? 'Gasto registrado'
        : 'Venta registrada';
    showToast(`${toastPrefix}: Bs. ${params.amount.toFixed(2)}`, params.tipo === 'venta' ? 'success' : 'warning');
  };

  const navigateWithPush = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  const navigateWithPushBack = (screen: ScreenId) => {
    setCurrentScreen(screen);
  };

  const value = useMemo(
    () => ({
      user,
      login,
      loginWithGoogle,
      registerUser,
      logout,
      storeInfo,
      updateStoreInfo,
      products,
      updateProduct,
      addProduct,
      deleteProduct,
      transactions,
      recordSale,
      recordDirectSale,
      recordPurchase,
      recordExpense,
      recordScannedTransaction,
      toastMessage,
      toastType,
      showToast,
      currentScreen,
      setCurrentScreen,
      navigateWithPush,
      navigateWithPushBack,
      isDarkMode,
      toggleDarkMode,
      showTutorial,
      setShowTutorial,
      availableStores,
      refreshAvailableStores,
      switchStore,
      showBusinessSwitcher,
      setShowBusinessSwitcher,
      showCreateBusinessModal,
      setShowCreateBusinessModal,
      showAccountModal,
      setShowAccountModal,
      updateUserProfile,
      setThemeMode,
    }),
    [
      user,
      storeInfo,
      products,
      transactions,
      currentScreen,
      toastMessage,
      toastType,
      isDarkMode,
      showTutorial,
      toggleDarkMode,
      availableStores,
      refreshAvailableStores,
      showBusinessSwitcher,
      showCreateBusinessModal,
      showAccountModal,
      updateUserProfile,
      setThemeMode,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
