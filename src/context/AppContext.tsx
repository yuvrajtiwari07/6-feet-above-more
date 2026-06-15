import React, { createContext, useContext, useState, useEffect } from 'react';
import { HeightBand, UserPreferences, Product } from '../types';
import { db, auth, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, collection, onSnapshot, deleteDoc } from 'firebase/firestore';

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

interface AppContextType {
  // Height Profile
  height: string; // e.g. "6'2" or "6'6+"
  heightBand: HeightBand;
  setHeight: (h: string) => Promise<void>;
  bodyType: 'Lean' | 'Athletic' | 'Broad' | 'Heavy';
  setBodyType: (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => Promise<void>;
  preferences: UserPreferences;
  updatePreferences: (p: Partial<UserPreferences>) => Promise<void>;
  
  // Grid Density / Card Size
  cardSize: 'small' | 'medium' | 'large';
  setCardSize: (s: 'small' | 'medium' | 'large') => Promise<void>;
  
  // Saved state (Wishlist)
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

  // Firebase Auth additions
  user: User | null;
  loadingFirebase: boolean;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;

  // Firestore Products Management
  products: Product[];
  loadingProducts: boolean;
  isAdmin: boolean;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to convert selection string to HeightBand enum
export function getHeightBand(height: string): HeightBand {
  if (height === "6'0" || height === "6'1") return '6_0_6_1';
  if (height === "6'2" || height === "6'3") return '6_2_6_3';
  if (height === "6'4" || height === "6'5") return '6_4_6_5';
  return '6_6_plus';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Load initial states from LocalStorage or Defaults
  const [height, setHeightState] = useState<string>(() => {
    return localStorage.getItem('lamba_height') || "6'3";
  });
  const [bodyType, setBodyTypeState] = useState<'Lean' | 'Athletic' | 'Broad' | 'Heavy'>(() => {
    return (localStorage.getItem('lamba_body_type') as any) || 'Athletic';
  });
  const [savedProductIds, setSavedProductIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lamba_saved_products') || '[]');
    } catch { return []; }
  });
  const [savedFitIds, setSavedFitIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lamba_saved_fits') || '[]');
    } catch { return []; }
  });
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem('lamba_preferences');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      height: "6'3",
      bodyType: 'Athletic',
      preferredBrands: [],
      occasions: []
    };
  });

  const [cardSize, setCardSizeState] = useState<'small' | 'medium' | 'large'>(() => {
    return (localStorage.getItem('lamba_card_size') as any) || 'medium';
  });

  const [clickLogs, setClickLogs] = useState<{ productId: string; timestamp: Date; retailer: string }[]>([]);

  // Firestore Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loadingFirebase, setLoadingFirebase] = useState<boolean>(true);

  // Calculate height band dynamically
  const heightBand = getHeightBand(height);

  // Calculate administrative privileges
  const isAdmin = user ? (
    user.email === 'ytiwari@argusoft.com' || user.email === 'yuvrajtiwari0710@gmail.com'
  ) : false;

  // Validate connection inside an effect as required by skill rules
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Fetch products collection real-time
  useEffect(() => {
    setLoadingProducts(true);
    const unsub = onSnapshot(collection(db, 'products'), async (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });

      if (items.length === 0) {
        // Automatically seed with default lookbook products if the table is currently empty
        try {
          const { PRODUCTS } = await import('../data/mockData');
          for (const item of PRODUCTS) {
            await setDoc(doc(db, 'products', item.id), item);
          }
        } catch (err) {
          console.error("Auto-seeding default products failed:", err);
        }
      } else {
        setProducts(items);
        setLoadingProducts(false);
      }
    }, (error) => {
      console.error("Failed to fetch products from Firestore:", error);
      handleFirestoreError(error, OperationType.GET, 'products');
    });

    return () => unsub();
  }, []);

  // Sync state modifications helper
  const syncProfileChange = async (updatedFields: Record<string, any>) => {
    if (!auth.currentUser) return;
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid);
      const isUserAdmin = auth.currentUser.email === 'ytiwari@argusoft.com' || auth.currentUser.email === 'yuvrajtiwari0710@gmail.com';
      await setDoc(docRef, {
        ...updatedFields,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        isAdmin: isUserAdmin,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync profile change to Firestore:", e);
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
  };

  // Load profile definitions
  const loadProfileFromFirestore = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.height) {
          setHeightState(data.height);
          localStorage.setItem('lamba_height', data.height);
        }
        if (data.bodyType) {
          setBodyTypeState(data.bodyType as any);
          localStorage.setItem('lamba_body_type', data.bodyType);
        }
        if (data.cardSize) {
          setCardSizeState(data.cardSize as any);
          localStorage.setItem('lamba_card_size', data.cardSize);
        }
        if (data.savedProductIds) {
          setSavedProductIds(data.savedProductIds);
          localStorage.setItem('lamba_saved_products', JSON.stringify(data.savedProductIds));
        }
        if (data.savedFitIds) {
          setSavedFitIds(data.savedFitIds);
          localStorage.setItem('lamba_saved_fits', JSON.stringify(data.savedFitIds));
        }
        if (data.preferences) {
          setPreferences(data.preferences as any);
          localStorage.setItem('lamba_preferences', JSON.stringify(data.preferences));
        }
      } else {
        // Document does not exist, seed immediately
        const isUserAdmin = auth.currentUser?.email === 'ytiwari@argusoft.com' || auth.currentUser?.email === 'yuvrajtiwari0710@gmail.com';
        const localData = {
          userId: uid,
          email: auth.currentUser?.email || '',
          isAdmin: isUserAdmin,
          height,
          bodyType,
          cardSize,
          savedProductIds,
          savedFitIds,
          preferences,
          updatedAt: serverTimestamp()
        };
        await setDoc(docRef, localData);
      }
    } catch (e) {
      console.error("Error loading profile from Firestore:", e);
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    }
  };

  // Track Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadProfileFromFirestore(currentUser.uid);
      }
      setLoadingFirebase(false);
    });
    return () => unsubscribe();
  }, []);

  // Google Sign-In helper
  const loginWithGoogle = async (): Promise<User> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (e) {
      console.error("Login with Google failed:", e);
      throw e;
    }
  };

  // Sign out helper
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Products Mutation operations
  const addProduct = async (p: Product) => {
    try {
      await setDoc(doc(db, 'products', p.id), {
        ...p,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("addProduct failed:", e);
      handleFirestoreError(e, OperationType.WRITE, `products/${p.id}`);
    }
  };

  const updateProduct = async (id: string, p: Partial<Product>) => {
    try {
      await setDoc(doc(db, 'products', id), {
        ...p,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("updateProduct failed:", e);
      handleFirestoreError(e, OperationType.WRITE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      console.error("deleteProduct failed:", e);
      handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
    }
  };

  // Sync state modifications to local storages
  const setHeight = async (h: string) => {
    setHeightState(h);
    localStorage.setItem('lamba_height', h);
    
    let updatedPreferences: any = null;
    setPreferences(prev => {
      const updated = { ...prev, height: h };
      localStorage.setItem('lamba_preferences', JSON.stringify(updated));
      updatedPreferences = updated;
      return updated;
    });

    if (auth.currentUser) {
      await syncProfileChange({
        height: h,
        preferences: updatedPreferences || { ...preferences, height: h }
      });
    }
  };

  const setBodyType = async (bt: 'Lean' | 'Athletic' | 'Broad' | 'Heavy') => {
    setBodyTypeState(bt);
    localStorage.setItem('lamba_body_type', bt);
    
    let updatedPreferences: any = null;
    setPreferences(prev => {
      const updated = { ...prev, bodyType: bt };
      localStorage.setItem('lamba_preferences', JSON.stringify(updated));
      updatedPreferences = updated;
      return updated;
    });

    if (auth.currentUser) {
      await syncProfileChange({
        bodyType: bt,
        preferences: updatedPreferences || { ...preferences, bodyType: bt }
      });
    }
  };

  const setCardSize = async (size: 'small' | 'medium' | 'large') => {
    setCardSizeState(size);
    localStorage.setItem('lamba_card_size', size);
    if (auth.currentUser) {
      await syncProfileChange({ cardSize: size });
    }
  };

  const updatePreferences = async (p: Partial<UserPreferences>) => {
    let updatedPreferences: any = null;
    setPreferences(prev => {
      const updated = { ...prev, ...p };
      localStorage.setItem('lamba_preferences', JSON.stringify(updated));
      updatedPreferences = updated;
      return updated;
    });
    if (auth.currentUser) {
      await syncProfileChange({
        preferences: updatedPreferences || { ...preferences, ...p }
      });
    }
  };

  const toggleSaveProduct = async (id: string) => {
    let finalIds: string[] = [];
    setSavedProductIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('lamba_saved_products', JSON.stringify(next));
      finalIds = next;
      return next;
    });
    if (auth.currentUser) {
      await syncProfileChange({ savedProductIds: finalIds });
    }
  };

  const toggleSaveFit = async (id: string) => {
    let finalIds: string[] = [];
    setSavedFitIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('lamba_saved_fits', JSON.stringify(next));
      finalIds = next;
      return next;
    });
    if (auth.currentUser) {
      await syncProfileChange({ savedFitIds: finalIds });
    }
  };

  // 2. Hash Routing Engine (SPA Navigation built for safe container iframe preview)
  const [route, setRoute] = useState<RouteState>({ current: 'home', params: {} });
  const [routeHistory, setRouteHistory] = useState<RouteState[]>([]);

  // Parse location hash
  const parseHash = (hashString: string): RouteState => {
    if (!hashString || hashString === '#' || hashString === '#/') {
      return { current: 'home', params: {} };
    }
    const cleanHash = hashString.replace(/^#\/?/, '');
    const segments = cleanHash.split('/');
    const current = segments[0] as RouteType;
    
    const params: Record<string, string> = {};
    if (segments[1]) {
      if (current === 'category') {
        params.categoryName = decodeURIComponent(segments[1]);
      } else if (current === 'product') {
        params.productId = decodeURIComponent(segments[1]);
      } else if (current === 'search') {
        params.query = decodeURIComponent(segments[1]);
      }
    }
    
    return { current: current || 'home', params };
  };

  // Safe navigation function that pushes hashes
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
      setRouteHistory(history => history.slice(0, -1));
      navigate(prev.current, prev.params);
    } else {
      navigate('home');
    }
  };

  // Listen for hashchange events
  useEffect(() => {
    const handleHashChange = () => {
      const state = parseHash(window.location.hash);
      setRoute(state);
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 3. Track Affiliate Click Link redirection
  const trackAffiliateClick = async (productId: string, retailer: string, url: string) => {
    const log = { productId, timestamp: new Date(), retailer };
    setClickLogs(prev => [log, ...prev]);

    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, retailer, affiliateUrl: url })
      });
    } catch (e) {
      console.warn("Could not log click on backend:", e);
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
        
        // Extended Firestore systems
        products,
        loadingProducts,
        isAdmin,
        addProduct,
        updateProduct,
        deleteProduct
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
