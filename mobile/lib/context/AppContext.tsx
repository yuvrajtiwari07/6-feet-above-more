import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { HeightBand, UserPreferences, Product, Catalog, CatalogCategory } from '../types';
import { supabase, signInWithGoogle, signOut, getAccessToken, User } from '../supabase';

const ADMIN_EMAILS = ['ytiwari@argusoft.com', 'rajtiwari07102001@gmail.com'];

// ── Storage keys ───────────────────────────────────────────
const KEYS = {
  height:          'lamba_height',
  bodyType:        'lamba_body_type',
  savedProducts:   'lamba_saved_products',
  savedFits:       'lamba_saved_fits',
  preferences:     'lamba_preferences',
  cardSize:        'lamba_card_size',
  productsCache:   'lamba_products_cache',
} as const;

const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Context type ───────────────────────────────────────────
interface AppContextType {
  height: string;
  heightBand: HeightBand;
  setHeight: (h: string) => Promise<void>;
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  setBodyType: (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => Promise<void>;
  preferences: UserPreferences;
  updatePreferences: (p: Partial<UserPreferences>) => Promise<void>;
  cardSize: 'small' | 'medium' | 'large';
  setCardSize: (s: 'small' | 'medium' | 'large') => Promise<void>;
  savedProductIds: string[];
  toggleSaveProduct: (id: string) => Promise<void>;
  savedFitIds: string[];
  toggleSaveFit: (id: string) => Promise<void>;
  user: User | null;
  loadingFirebase: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  products: Product[];
  loadingProducts: boolean;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  refetchProducts: () => Promise<void>;
  catalogs: Catalog[];
  catalogCategories: CatalogCategory[];
  loadingCatalogs: boolean;
  addCatalog: (c: Partial<Catalog>) => Promise<Catalog>;
  updateCatalog: (id: string, c: Partial<Catalog>) => Promise<void>;
  deleteCatalog: (id: string) => Promise<void>;
  addCatalogCategory: (c: Partial<CatalogCategory>) => Promise<CatalogCategory>;
  updateCatalogCategory: (id: string, c: Partial<CatalogCategory>) => Promise<void>;
  deleteCatalogCategory: (id: string) => Promise<void>;
  refreshCatalogs: () => Promise<void>;
  clickLogs: { productId: string; timestamp: Date; retailer: string }[];
  trackAffiliateClick: (productId: string, retailer: string, url: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function getHeightBand(height: string): HeightBand {
  if (height === "6'0" || height === "6'1") return '6_0_6_1';
  if (height === "6'2" || height === "6'3") return '6_2_6_3';
  if (height === "6'4" || height === "6'5") return '6_4_6_5';
  return '6_6_plus';
}

// ── API helper (same fetch logic, works in RN) ─────────────
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://6-feet-above-more.vercel.app';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Provider ───────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Defaults — AsyncStorage hydrates these after mount
  const [height, setHeightState]         = useState<string>("6'3");
  const [bodyType, setBodyTypeState]     = useState<'Lean' | 'Athletic' | 'Broad' | 'Heavy'>('Athletic');
  const [savedProductIds, setSavedProductIds] = useState<string[]>([]);
  const [savedFitIds, setSavedFitIds]    = useState<string[]>([]);
  const [preferences, setPreferences]   = useState<UserPreferences>({ height: "6'3", bodyType: 'Athletic', preferredBrands: [], occasions: [] });
  const [cardSize, setCardSizeState]    = useState<'small' | 'medium' | 'large'>('medium');
  const [clickLogs, setClickLogs]       = useState<{ productId: string; timestamp: Date; retailer: string }[]>([]);
  const [hydrated, setHydrated]         = useState(false);

  // ── Auth ─────────────────────────────────────────────────
  const [user, setUser]                 = useState<User | null>(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // ── Products ─────────────────────────────────────────────
  const [products, setProducts]         = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const heightBand = getHeightBand(height);
  const isAdmin = user ? ADMIN_EMAILS.includes(user.email ?? '') : false;

  // ── Hydrate from AsyncStorage on mount ───────────────────
  useEffect(() => {
    AsyncStorage.multiGet([
      KEYS.height, KEYS.bodyType, KEYS.savedProducts,
      KEYS.savedFits, KEYS.preferences, KEYS.cardSize,
    ]).then(pairs => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map[KEYS.height])        setHeightState(map[KEYS.height]!);
      if (map[KEYS.bodyType])      setBodyTypeState(map[KEYS.bodyType] as any);
      if (map[KEYS.savedProducts]) { try { setSavedProductIds(JSON.parse(map[KEYS.savedProducts]!)); } catch {} }
      if (map[KEYS.savedFits])     { try { setSavedFitIds(JSON.parse(map[KEYS.savedFits]!)); } catch {} }
      if (map[KEYS.preferences])   { try { setPreferences(JSON.parse(map[KEYS.preferences]!)); } catch {} }
      if (map[KEYS.cardSize])      setCardSizeState(map[KEYS.cardSize] as any);
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, []);

  // ── Product cache helpers (AsyncStorage, 5-min TTL) ──────
  async function readProductCache(): Promise<Product[] | null> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.productsCache);
      if (!raw) return null;
      const { products: cached, ts } = JSON.parse(raw);
      if (Date.now() - ts > PRODUCT_CACHE_TTL) return null;
      return cached as Product[];
    } catch { return null; }
  }

  async function writeProductCache(ps: Product[]) {
    try {
      await AsyncStorage.setItem(KEYS.productsCache, JSON.stringify({ products: ps, ts: Date.now() }));
    } catch {}
  }

  async function clearProductCache() {
    await AsyncStorage.removeItem(KEYS.productsCache).catch(() => {});
  }

  async function fetchAllFromAPI(): Promise<Product[]> {
    const first = await apiFetch('/api/products?limit=50&offset=0');
    const firstProducts: Product[] = first.products ?? [];
    const total: number = first.total ?? 0;
    if (total <= 50) return firstProducts;
    const rest = await apiFetch(`/api/products?limit=${total - 50}&offset=50`);
    return [...firstProducts, ...(rest.products ?? [])];
  }

  // ── Stale-while-revalidate product fetch ─────────────────
  const fetchProducts = useCallback(async () => {
    const cached = await readProductCache();
    if (cached && cached.length > 0) {
      setProducts(cached);
      setLoadingProducts(false);
      fetchAllFromAPI().then(fresh => {
        if (fresh.length !== cached.length) {
          setProducts(fresh);
          writeProductCache(fresh);
        }
      }).catch(err => console.warn('[AppContext] Background revalidation failed:', err));
    } else {
      setLoadingProducts(true);
      try {
        const first = await apiFetch('/api/products?limit=50&offset=0');
        const firstProducts: Product[] = first.products ?? [];
        setProducts(firstProducts);
        setLoadingProducts(false);
        const total: number = first.total ?? 0;
        if (total > 50) {
          const rest = await apiFetch(`/api/products?limit=${total - 50}&offset=50`);
          const all = [...firstProducts, ...(rest.products ?? [])];
          setProducts(all);
          await writeProductCache(all);
        } else {
          await writeProductCache(firstProducts);
        }
      } catch (err) {
        console.error('[AppContext] Failed to fetch products:', err);
        setProducts([]);
        setLoadingProducts(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Auth listener ─────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingFirebase(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoadingFirebase(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Preference setters ────────────────────────────────────
  const setHeight = async (h: string) => {
    setHeightState(h);
    const updatedPrefs = { ...preferences, height: h };
    setPreferences(updatedPrefs);
    await AsyncStorage.multiSet([[KEYS.height, h], [KEYS.preferences, JSON.stringify(updatedPrefs)]]);
  };

  const setBodyType = async (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => {
    setBodyTypeState(bt);
    const updatedPrefs = { ...preferences, bodyType: bt };
    setPreferences(updatedPrefs);
    await AsyncStorage.multiSet([[KEYS.bodyType, bt], [KEYS.preferences, JSON.stringify(updatedPrefs)]]);
  };

  const setCardSize = async (size: 'small' | 'medium' | 'large') => {
    setCardSizeState(size);
    await AsyncStorage.setItem(KEYS.cardSize, size);
  };

  const updatePreferences = async (p: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...p };
    setPreferences(updated);
    await AsyncStorage.setItem(KEYS.preferences, JSON.stringify(updated));
  };

  const toggleSaveProduct = async (id: string) => {
    const next = savedProductIds.includes(id) ? savedProductIds.filter(x => x !== id) : [...savedProductIds, id];
    setSavedProductIds(next);
    await AsyncStorage.setItem(KEYS.savedProducts, JSON.stringify(next));
  };

  const toggleSaveFit = async (id: string) => {
    const next = savedFitIds.includes(id) ? savedFitIds.filter(x => x !== id) : [...savedFitIds, id];
    setSavedFitIds(next);
    await AsyncStorage.setItem(KEYS.savedFits, JSON.stringify(next));
  };

  // ── Product mutations ─────────────────────────────────────
  const addProduct = async (p: Product) => {
    const data = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(p) });
    if (data.product) {
      setProducts(prev => { const next = [data.product, ...prev.filter(x => x.id !== data.product.id)]; clearProductCache(); return next; });
    }
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    const data = await apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(p) });
    if (data.product) {
      setProducts(prev => { const next = prev.map(x => x.id === id ? data.product : x); clearProductCache(); return next; });
    }
  };

  const deleteProduct = async (id: string) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => { const next = prev.filter(x => x.id !== id); clearProductCache(); return next; });
  };

  const refetchProducts = async () => { await clearProductCache(); await fetchProducts(); };

  // ── Catalogs ──────────────────────────────────────────────
  const [catalogs, setCatalogs]                 = useState<Catalog[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [loadingCatalogs, setLoadingCatalogs]   = useState(true);

  const fetchCatalogs = useCallback(async () => {
    setLoadingCatalogs(true);
    try {
      const [catData, catCatData] = await Promise.all([
        apiFetch('/api/catalogs').catch(() => ({ catalogs: [] })),
        apiFetch('/api/catalogs/categories').catch(() => ({ categories: [] })),
      ]);
      setCatalogs(catData.catalogs ?? []);
      setCatalogCategories(catCatData.categories ?? []);
    } catch (err) { console.error('[AppContext] Failed to fetch catalogs:', err); }
    finally { setLoadingCatalogs(false); }
  }, []);

  useEffect(() => { fetchCatalogs(); }, [fetchCatalogs]);

  const addCatalog = async (c: Partial<Catalog>): Promise<Catalog> => {
    const data = await apiFetch('/api/catalogs', { method: 'POST', body: JSON.stringify(c) });
    if (data.catalog) setCatalogs(prev => [data.catalog, ...prev]);
    return data.catalog;
  };
  const updateCatalog = async (id: string, c: Partial<Catalog>) => {
    const data = await apiFetch(`/api/catalogs/${id}`, { method: 'PUT', body: JSON.stringify(c) });
    if (data.catalog) setCatalogs(prev => prev.map(x => x.id === id ? data.catalog : x));
  };
  const deleteCatalog = async (id: string) => {
    await apiFetch(`/api/catalogs/${id}`, { method: 'DELETE' });
    setCatalogs(prev => prev.filter(x => x.id !== id));
  };
  const addCatalogCategory = async (c: Partial<CatalogCategory>): Promise<CatalogCategory> => {
    const data = await apiFetch('/api/catalogs/categories', { method: 'POST', body: JSON.stringify(c) });
    if (data.category) setCatalogCategories(prev => [...prev, data.category]);
    return data.category;
  };
  const updateCatalogCategory = async (id: string, c: Partial<CatalogCategory>) => {
    const data = await apiFetch(`/api/catalogs/categories/${id}`, { method: 'PUT', body: JSON.stringify(c) });
    if (data.category) setCatalogCategories(prev => prev.map(x => x.id === id ? data.category : x));
  };
  const deleteCatalogCategory = async (id: string) => {
    await apiFetch(`/api/catalogs/categories/${id}`, { method: 'DELETE' });
    setCatalogCategories(prev => prev.filter(x => x.id !== id));
  };
  const refreshCatalogs = useCallback(async () => { await fetchCatalogs(); }, [fetchCatalogs]);

  // ── Affiliate tracking ────────────────────────────────────
  const trackAffiliateClick = async (productId: string, retailer: string, url: string) => {
    setClickLogs(prev => [{ productId, timestamp: new Date(), retailer }, ...prev]);
    apiFetch('/api/products/track', { method: 'POST', body: JSON.stringify({ productId, retailer, affiliateUrl: url }) }).catch(() => {});
  };

  // ── Auth actions ──────────────────────────────────────────
  const loginWithGoogle = async () => { await signInWithGoogle(); };
  const logout = async () => { await signOut(); };

  return (
    <AppContext.Provider value={{
      height, heightBand, setHeight,
      bodyType, setBodyType,
      preferences, updatePreferences,
      cardSize, setCardSize,
      savedProductIds, toggleSaveProduct,
      savedFitIds, toggleSaveFit,
      user, loadingFirebase, loginWithGoogle, logout, isAdmin,
      products, loadingProducts, addProduct, updateProduct, deleteProduct, refetchProducts,
      catalogs, catalogCategories, loadingCatalogs,
      addCatalog, updateCatalog, deleteCatalog,
      addCatalogCategory, updateCatalogCategory, deleteCatalogCategory, refreshCatalogs,
      clickLogs, trackAffiliateClick,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
