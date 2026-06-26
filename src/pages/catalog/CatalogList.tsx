import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import CatalogCard from '../../components/catalog/CatalogCard';
import { ChevronLeft, Loader2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

const CatalogList: React.FC = () => {
  const { catalogs, products, loadingCatalogs, navigate, route } = useApp();
  const categoryName = route.params?.categoryName || '';

  const filteredCatalogs = useMemo(
    () => catalogs.filter(c => c.isPublished && c.categoryName === categoryName),
    [catalogs, categoryName]
  );

  // Resolve products for each catalog
  const catalogsWithProducts = useMemo(() =>
    filteredCatalogs.map(catalog => ({
      catalog,
      products: catalog.productIds
        .map(id => products.find(p => p.id === id))
        .filter(Boolean) as typeof products,
    })),
    [filteredCatalogs, products]
  );

  if (loadingCatalogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#D5A021]" />
      </div>
    );
  }

  return (
    <div className="pb-28 bg-[#F9F8F6]">
      {/* Header */}
      <section className="bg-white border-b-2 border-black px-4 md:px-8 pt-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('catalog-categories')}
            className="flex items-center gap-1.5 text-black/40 hover:text-black text-xs font-black uppercase tracking-wider mb-4 transition"
          >
            <ChevronLeft size={14} />
            All Categories
          </button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <span className="text-[#D5A021] text-[10px] font-black uppercase tracking-widest bg-[#FFD43B] text-black/10 px-3 py-1 rounded-full">
                {categoryName}
              </span>
              <h1 className="font-display text-3xl md:text-5xl font-black uppercase tracking-tighter mt-2">
                {categoryName} <span className="text-[#D5A021]">Catalogs</span>
              </h1>
              <p className="text-black/50 text-sm mt-1">
                {filteredCatalogs.length} {filteredCatalogs.length === 1 ? 'catalog' : 'catalogs'} curated for tall fits
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {catalogsWithProducts.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={48} className="mx-auto text-black/20 mb-4" />
            <h2 className="font-display text-2xl font-black text-black/30 uppercase mb-2">No Catalogs Here Yet</h2>
            <p className="text-black/40 text-sm mb-6">Check back soon — new catalogs drop regularly.</p>
            <button
              onClick={() => navigate('catalog-categories')}
              className="inline-flex items-center gap-2 bg-black text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-black"
            >
              <ChevronLeft size={13} /> Browse Other Categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogsWithProducts.map(({ catalog, products: catProducts }, i) => (
              <motion.div
                key={catalog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <CatalogCard
                  catalog={catalog}
                  products={catProducts}
                  onClick={() => navigate('catalog-detail', { catalogId: catalog.id })}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CatalogList;
