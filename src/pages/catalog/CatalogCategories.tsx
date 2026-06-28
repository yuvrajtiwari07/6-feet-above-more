import React from 'react';
import { useApp } from '../../context/AppContext';
import CatalogCategoryTile from '../../components/catalog/CatalogCategoryTile';
import { Loader2, LayoutGrid, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

const CatalogCategories: React.FC = () => {
  const { catalogCategories, catalogs, loadingCatalogs, navigate, isAdmin } = useApp();

  const activeCategories = catalogCategories.filter(c => c.isActive);

  // Count catalogs per category
  const countForCategory = (name: string) =>
    catalogs.filter(c => c.categoryName === name && c.isPublished).length;

  if (loadingCatalogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#D5A021]" />
      </div>
    );
  }

  return (
    <div className="pb-28 bg-[#F9F8F6]">
      {/* Hero header */}
      <section className="bg-black text-white px-4 md:px-8 pt-12 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none select-none flex items-center justify-center">
          <span className="text-[10vw] font-black uppercase tracking-tighter">CURATED</span>
        </div>
        <div className="w-full max-w-none mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-[#FFCC00] text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-black/10">
                  ✦ Curated Collections
                </div>
              </div>
              <h1 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-3">
                Browse<br />
                <span className="text-[#D5A021]">Catalogs</span>
              </h1>
              <p className="text-white/60 text-sm max-w-md font-sans leading-relaxed">
                Expertly curated collections built for tall frames — multiple products, one perfect style story.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => navigate('admin')}
                className="flex items-center gap-2 bg-[#FFD43B] text-black text-white font-black text-xs uppercase tracking-wider px-4 py-3 rounded-xl border-2 border-white/20 hover:bg-[#e0305a] transition shrink-0"
              >
                <Sparkles size={14} />
                Manage Catalogs
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* Categories grid */}
      <section className="w-full max-w-none mx-auto px-4 md:px-8 py-12">
        {activeCategories.length === 0 ? (
          <div className="text-center py-24">
            <LayoutGrid size={48} className="mx-auto text-black/20 mb-4" />
            <h2 className="font-display text-2xl font-black text-black/30 uppercase mb-2">No Categories Yet</h2>
            <p className="text-black/40 text-sm">
              {isAdmin
                ? 'Go to Admin → Catalog Categories to create your first category.'
                : 'Check back soon — curated collections are coming.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8 border-b-2 border-black/10 pb-4">
              <h2 className="font-display text-2xl font-black uppercase tracking-tighter">
                {activeCategories.length} {activeCategories.length === 1 ? 'Category' : 'Categories'}
              </h2>
              <span className="text-black/40 text-xs font-bold uppercase tracking-wider">
                {catalogs.length} Total Catalogs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {activeCategories.map((cat, i) => (
                <CatalogCategoryTile
                  key={cat.id}
                  category={cat}
                  catalogCount={countForCategory(cat.name)}
                  index={i}
                  onClick={() => navigate('catalog-list', { categoryName: cat.name })}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default CatalogCategories;
