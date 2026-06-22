import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HeightBand, UserPreferences, Product } from '../types';
import {
  supabase,
  signInWithGoogle,
  signOut,
  getAccessToken,
  User,
} from '../supabase';

// ── Admin whitelist (client-side UX only — enforced server-side) ─────────────
const ADMIN_EMAILS = ['ytiwari@argusoft.com', 'yuvrajtiwari0710@gmail.com'];

// ── Route types ───────────────────────────────────────────────────────────────
export type RouteType =
  | 'home'
  | 'category'
  | 'product'
  | 'fit-finder'
  | 'complete-fits'
  | 'search'
  | 'saved'
  | 'profile'
  | 'admin';

interface RouteState {
  current: RouteType;
  params: Record<string, string>;
}

// ── Context type ──────────────────────────────────────────────────────────────
interface AppContextType {
  // Height Profile
  height: string;
  heightBand: HeightBand;
  setHeight: (h: string) => Promise<void>;
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  setBodyType: (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => Promise<void>;
  preferences: UserPreferences;
  updatePreferences: (p: Partial<UserPreferences>) => Promise<void>;

  // Grid Density / Card Size
  cardSize: 'small' | 'medium' | 'large';
  setCardSize: (s: 'small' | 'medium' | 'large') => Promise<void>;

  // Saved (Wishlist)
  savedProductIds: string[];
  toggleSaveProduct: (id: string) => Promise<void>;
  savedFitIds: string[];
  toggleSaveFit: (id: string) => Promise<void>;

  // Navigation
  route: RouteState;
  navigate: (target: RouteType, params?: Record<string, string>) => void;
  goBack: () => void;

  // Affiliate Click Tracker
  trackAffiliateClick: (productId: string, retailer: string, url: string) => Promise<void>;
  clickLogs: { productId: string; timestamp: Date; retailer: string }[];

  // Auth
  user: User | null;
  loadingFirebase: boolean; // kept for backward compat — actually "loadingAuth"
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  // Products
  products: Product[];
  loadingProducts: boolean;
  isAdmin: boolean;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function getHeightBand(height: string): HeightBand {
  if (height === "6'0" || height === "6'1") return '6_0_6_1';
  if (height === "6'2" || height === "6'3") return '6_2_6_3';
  if (height === "6'4" || height === "6'5") return '6_4_6_5';
  return '6_6_plus';
}

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Provider ──────────────────────────────────────────────────────────────────
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Local state with localStorage fallback ──────────────────────────────
  const [height, setHeightState] = useState<string>(
    () => localStorage.getItem('lamba_height') || "6'3"
  );
  const [bodyType, setBodyTypeState] = useState<'Lean' | 'Athletic' | 'Broad' | 'Heavy'>(
    () => (localStorage.getItem('lamba_body_type') as any) || 'Athletic'
  );
  const [savedProductIds, setSavedProductIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lamba_saved_products') || '[]'); }
    catch { return []; }
  });
  const [savedFitIds, setSavedFitIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('lamba_saved_fits') || '[]'); }
    catch { return []; }
  });
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const s = localStorage.getItem('lamba_preferences');
      if (s) return JSON.parse(s);
    } catch {}
    return { height: "6'3", bodyType: 'Athletic', preferredBrands: [], occasions: [] };
  });
  const [cardSize, setCardSizeState] = useState<'small' | 'medium' | 'large'>(
    () => (localStorage.getItem('lamba_card_size') as any) || 'medium'
  );
  const [clickLogs, setClickLogs] = useState<{ productId: string; timestamp: Date; retailer: string }[]>([]);

  // ── Auth state ──────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);
  const [loadingFirebase, setLoadingFirebase] = useState(true);

  // ── Products state ──────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const heightBand = getHeightBand(height);
  const isDev = (import.meta as any).env?.DEV;
  const isAdmin = isDev || (user ? ADMIN_EMAILS.includes(user.email ?? '') : false);

  // ── Fetch products from REST API ────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await apiFetch('/api/products');
      setProducts(data.products ?? []);
    } catch (err) {
      console.error('[AppContext] Failed to fetch products:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Sync user profile from/to backend ──────────────────────────────────
  const syncProfileFromBackend = useCallback(async () => {
    try {
      const data = await apiFetch('/api/users/profile');
      const profile = data.profile;
      if (!profile) return;

      if (profile.height) {
        setHeightState(profile.height);
        localStorage.setItem('lamba_height', profile.height);
      }
      if (profile.bodyType) {
        setBodyTypeState(profile.bodyType);
        localStorage.setItem('lamba_body_type', profile.bodyType);
      }
      if (profile.cardSize) {
        setCardSizeState(profile.cardSize);
        localStorage.setItem('lamba_card_size', profile.cardSize);
      }
      if (profile.savedProductIds) {
        setSavedProductIds(profile.savedProductIds);
        localStorage.setItem('lamba_saved_products', JSON.stringify(profile.savedProductIds));
      }
      if (profile.savedFitIds) {
        setSavedFitIds(profile.savedFitIds);
        localStorage.setItem('lamba_saved_fits', JSON.stringify(profile.savedFitIds));
      }
      if (profile.preferences && Object.keys(profile.preferences).length > 0) {
        setPreferences(profile.preferences);
        localStorage.setItem('lamba_preferences', JSON.stringify(profile.preferences));
      }
    } catch (err) {
      console.warn('[AppContext] Profile sync failed (non-fatal):', err);
    }
  }, []);

  const syncProfileToBackend = useCallback(async (updates: Record<string, any>) => {
    try {
      await apiFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('[AppContext] Failed to sync profile to backend:', err);
    }
  }, []);

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) syncProfileFromBackend();
      setLoadingFirebase(false);
    });

    // Listen for auth changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);
        if (sessionUser) {
          await syncProfileFromBackend();
        }
        setLoadingFirebase(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [syncProfileFromBackend]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const loginWithGoogle = async () => {
    try {
      await signInWithGoogle();
      // Session will be handled by onAuthStateChange after redirect
    } catch (err) {
      console.error('[AppContext] Google login failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[AppContext] Logout failed:', err);
    }
  };

  // ── Product mutations (admin-only — enforced server-side) ────────────────
  const addProduct = async (p: Product) => {
    const data = await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(p),
    });
    if (data.product) {
      setProducts(prev => [data.product, ...prev.filter(x => x.id !== data.product.id)]);
    }
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    const data = await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(p),
    });
    if (data.product) {
      setProducts(prev => prev.map(x => x.id === id ? data.product : x));
    }
  };

  const deleteProduct = async (id: string) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(x => x.id !== id));
  };

  // ── Profile setters ──────────────────────────────────────────────────────
  const setHeight = async (h: string) => {
    setHeightState(h);
    localStorage.setItem('lamba_height', h);
    const updatedPrefs = { ...preferences, height: h };
    setPreferences(updatedPrefs);
    localStorage.setItem('lamba_preferences', JSON.stringify(updatedPrefs));
    if (user) await syncProfileToBackend({ height: h, preferences: updatedPrefs });
  };

  const setBodyType = async (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => {
    setBodyTypeState(bt);
    localStorage.setItem('lamba_body_type', bt);
    const updatedPrefs = { ...preferences, bodyType: bt };
    setPreferences(updatedPrefs);
    localStorage.setItem('lamba_preferences', JSON.stringify(updatedPrefs));
    if (user) await syncProfileToBackend({ bodyType: bt, preferences: updatedPrefs });
  };

  const setCardSize = async (size: 'small' | 'medium' | 'large') => {
    setCardSizeState(size);
    localStorage.setItem('lamba_card_size', size);
    if (user) await syncProfileToBackend({ cardSize: size });
  };

  const updatePreferences = async (p: Partial<UserPreferences>) => {
    const updatedPrefs = { ...preferences, ...p };
    setPreferences(updatedPrefs);
    localStorage.setItem('lamba_preferences', JSON.stringify(updatedPrefs));
    if (user) await syncProfileToBackend({ preferences: updatedPrefs });
  };

  const toggleSaveProduct = async (id: string) => {
    const next = savedProductIds.includes(id) ? savedProductIds.filter(x => x !== id) : [...savedProductIds, id];
    setSavedProductIds(next);
    localStorage.setItem('lamba_saved_products', JSON.stringify(next));
    if (user) await syncProfileToBackend({ savedProductIds: next });
  };

  const toggleSaveFit = async (id: string) => {
    const next = savedFitIds.includes(id) ? savedFitIds.filter(x => x !== id) : [...savedFitIds, id];
    setSavedFitIds(next);
    localStorage.setItem('lamba_saved_fits', JSON.stringify(next));
    if (user) await syncProfileToBackend({ savedFitIds: next });
  };

  // ── Routing ──────────────────────────────────────────────────────────────
  const [route, setRoute] = useState<RouteState>({ current: 'home', params: {} });
  const [routeHistory, setRouteHistory] = useState<RouteState[]>([]);

  const parseHash = (hashString: string): RouteState => {
    if (!hashString || hashString === '#' || hashString === '#/') {
      return { current: 'home', params: {} };
    }
    const cleanHash = hashString.replace(/^#\/?/, '');
    const segments = cleanHash.split('/');
    const current = segments[0] as RouteType;
    const params: Record<string, string> = {};
    if (segments[1]) {
      if (current === 'category')    params.categoryName = decodeURIComponent(segments[1]);
      else if (current === 'product') params.productId   = decodeURIComponent(segments[1]);
      else if (current === 'search')  params.query        = decodeURIComponent(segments[1]);
    }
    return { current: current || 'home', params };
  };

  const navigate = (target: RouteType, params?: Record<string, string>) => {
    let hash = `#${target}`;
    if (params) {
      if (params.categoryName) hash += `/${encodeURIComponent(params.categoryName)}`;
      else if (params.productId) hash += `/${encodeURIComponent(params.productId)}`;
      else if (params.query) hash += `/${encodeURIComponent(params.query)}`;
    }
    setRouteHistory(prev => [...prev, route]);
    window.location.hash = hash;
  };

  const goBack = () => {
    if (routeHistory.length > 0) {
      const prev = routeHistory[routeHistory.length - 1];
      setRouteHistory(h => h.slice(0, -1));
      navigate(prev.current, prev.params);
    } else {
      navigate('home');
    }
  };

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ── Affiliate click tracking ──────────────────────────────────────────────
  const trackAffiliateClick = async (productId: string, retailer: string, url: string) => {
    setClickLogs(prev => [{ productId, timestamp: new Date(), retailer }, ...prev]);
    try {
      await apiFetch('/api/products/track', {
        method: 'POST',
        body: JSON.stringify({ productId, retailer, affiliateUrl: url }),
      });
    } catch (e) {
      console.warn('[AppContext] Could not log affiliate click:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        height,
        heightBand,
        setHeight,
        bodyType,
        setBodyType,
        preferences,
        updatePreferences,
        savedProductIds,
        toggleSaveProduct,
        savedFitIds,
        toggleSaveFit,
        cardSize,
        setCardSize,
        route,
        navigate,
        goBack,
        trackAffiliateClick,
        clickLogs,
        user,
        loadingFirebase,
        loginWithGoogle,
        logout,
        products,
        loadingProducts,
        isAdmin,
        addProduct,
        updateProduct,
        deleteProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider');
  return context;
};
