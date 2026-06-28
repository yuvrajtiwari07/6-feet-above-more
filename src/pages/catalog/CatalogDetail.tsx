import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import CatalogProductPanel from '../../components/catalog/CatalogProductPanel';
import BuyCatalogButton from '../../components/catalog/BuyCatalogButton';
import { Catalog, Product } from '../../types';
import { ChevronLeft, Loader2, Tag, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAccessToken } from '../../supabase';

const CatalogDetail: React.FC = () => {
  const { products: allProducts, navigate, route } = useApp();
  const catalogId = route.params?.catalogId || '';

  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!catalogId) return;
    setLoading(true);
    setError('');

    const fetchCatalog = async () => {
      try {
        const token = await getAccessToken().catch(() => null);
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/catalogs/${catalogId}`, { headers });
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Catalog not found');
          return;
        }

        setCatalog(data.catalog);
        // Use server-resolved products if available, otherwise resolve client-side
        if (data.products && data.products.length > 0) {
          setCatalogProducts(data.products);
        } else {
          const resolved = (data.catalog.productIds as string[])
            .map((id: string) => allProducts.find(p => p.id === id))
            .filter(Boolean) as Product[];
          setCatalogProducts(resolved);
        }
      } catch {
        setError('Failed to load catalog');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, [catalogId, allProducts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-[#D5A021]" />
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <BookOpen size={48} className="text-black/20" />
        <h2 className="font-display text-2xl font-black uppercase text-black/30">{error || 'Catalog not found'}</h2>
        <button
          onClick={() => navigate('catalog-categories')}
          className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-wider border-b-2 border-black"
        >
          <ChevronLeft size={13} /> Back to Catalogs
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28 bg-[#F9F8F6]">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b-2 border-black px-4 md:px-8 py-4">
        <div className="w-full max-w-none mx-auto flex items-start md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate('catalog-list', { categoryName: catalog.categoryName })}
              className="flex items-center gap-1.5 text-black/40 hover:text-black text-[10px] font-black uppercase tracking-wider mb-1 transition"
            >
              <ChevronLeft size={12} />
              {catalog.categoryName}
            </button>
            <h1 className="font-display text-xl md:text-3xl font-black uppercase tracking-tighter text-black truncate">
              {catalog.title}
            </h1>
            {catalog.description && (
              <p className="text-black/50 text-xs mt-0.5 line-clamp-1 hidden md:block">{catalog.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Tags — desktop only */}
            <div className="hidden lg:flex gap-1.5">
              {catalog.tags?.slice(0, 3).map(tag => (
                <span key={tag} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-black/5 text-black/50 px-2 py-1 rounded-full">
                  <Tag size={8} />#{tag}
                </span>
              ))}
            </div>

            {/* Buy Whole Catalog — web only */}
            <BuyCatalogButton catalog={catalog} products={catalogProducts} />
          </div>
        </div>
      </header>

      {/* ── MOBILE: Tab system ─────────────────────────────────── */}
      <div className="md:hidden">
        {/* Scrollable tab bar */}
        <div className="bg-white border-b border-black/10 px-4 py-2 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {catalogProducts.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition border-2 ${
                  activeTab === i
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black/60 border-black/10 hover:border-black/30'
                }`}
                id={`catalog-tab-${i}`}
              >
                {p.images?.[0] && (
                  <img
                    src={p.images[0]}
                    alt=""
                    className="w-5 h-5 rounded object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span>{i + 1}. {p.brand}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active product panel */}
        <div className="p-4">
          <AnimatePresence mode="wait">
            {catalogProducts[activeTab] && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
              >
                <div className="w-full max-w-sm">
                  <CatalogProductPanel
                    product={catalogProducts[activeTab]}
                    onNavigateToDetail={() => navigate('product', { productId: catalogProducts[activeTab].id })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── DESKTOP: Side-by-side panels ──────────────────────────── */}
      <div className="hidden md:block px-4 md:px-8 py-8">
        <div className="w-full max-w-none mx-auto">
          {catalog.description && (
            <p className="text-black/60 text-sm mb-6 max-w-2xl font-sans leading-relaxed">{catalog.description}</p>
          )}

          {catalogProducts.length === 0 ? (
            <div className="text-center py-20 text-black/30">
              <BookOpen size={40} className="mx-auto mb-3" />
              <p className="font-display text-xl font-black uppercase">No products in this catalog</p>
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-black/20 scrollbar-track-transparent">
              {catalogProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex-shrink-0"
                  style={{ width: 'min(360px, 80vw)' }}
                >
                  <CatalogProductPanel
                    product={product}
                    onNavigateToDetail={() => navigate('product', { productId: product.id })}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogDetail;
