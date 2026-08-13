import React from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { GridDensitySelector } from '../components/layout/GridDensitySelector';
import { ArrowRight, Leaf, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { WELLNESS_CATEGORIES, WELLNESS_CONCERNS } from '../data/wellness';

/** Home screen for the wellness storefront — nutrition, body care, health care. */
export const WellnessHome: React.FC = () => {
  const { navigate, cardSize, products, loadingProducts, catalogCategories } = useApp();

  const inStock = products.filter(p => !p.outOfStock);
  const featured = inStock.filter(p => p.isFeatured);
  const rail = (featured.length > 0 ? featured : inStock).slice(0, 8);

  // Only surface concerns that actually have products behind them.
  const liveConcerns = WELLNESS_CONCERNS.filter(c =>
    inStock.some(p => (p.concerns ?? []).includes(c))
  ).slice(0, 12);

  const gridClass =
    cardSize === 'small'
      ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-4'
      : cardSize === 'large'
        ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
        : 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6';

  return (
    <div className="pb-24 bg-[#F7FAF8]">

      {/* 1. HERO */}
      <section className="w-full max-w-none mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-10">
        <div className="bg-[#0E2A21] text-white rounded-[20px] md:rounded-[26px] p-6 md:p-12 relative overflow-hidden border-2 border-black shadow-sm">
          {/* Soft accent blooms */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#0E7C5A]/40 blur-3xl pointer-events-none" />
          <div className="absolute right-24 bottom-0 w-52 h-52 rounded-full bg-[#FFD43B]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-[#FFD43B] text-black border-2 border-black px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest mb-6 shadow"
            >
              <Leaf size={12} className="fill-black text-black" />
              <span>For every height, every body</span>
            </motion.div>

            <h1
              className="text-3xl sm:text-4xl md:text-[54px] font-black leading-[1.02] tracking-tighter mb-4"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              NUTRITION, SKIN &amp;{' '}
              <span className="text-[#7BE3B4] relative inline-block">
                HEALTH CARE
                <span className="absolute bottom-[-6px] left-0 right-0 h-[4px] bg-[#7BE3B4] rounded-full opacity-80" />
              </span>
              <br />
              THAT EARNS ITS PLACE.
            </h1>

            <p className="text-xs md:text-sm text-white/70 font-semibold leading-relaxed max-w-lg mt-6 mb-8">
              Supplements, ayurveda, skin and body care picked for what is actually in them —
              and priced from the retailers you already trust.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'REAL INGREDIENTS', desc: 'Listed on every product', icon: '🧾' },
                { label: 'BY CONCERN', desc: 'Shop what you want to fix', icon: '🎯' },
                { label: 'TRUSTED SELLERS', desc: 'Brand & pharmacy partners', icon: '🏥' },
                { label: 'NO HEIGHT GATE', desc: 'Open to everyone', icon: '🙌' },
              ].map((b, i) => (
                <div key={i} className="flex flex-col text-left">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-base mb-2 border border-white/5">
                    {b.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase text-[#7BE3B4] tracking-wider">{b.label}</span>
                  <span className="text-[8px] text-white/50 mt-0.5 leading-snug">{b.desc}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('search')}
                className="bg-[#7BE3B4] hover:bg-[#5fd39f] text-black border-2 border-black font-grotesk font-black text-xs px-6 md:px-8 py-3.5 md:py-4 rounded-2xl uppercase tracking-wider transition shadow-sm flex items-center gap-2"
                id="wellness-explore-btn"
              >
                <span>Explore Store</span>
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => navigate('category', { categoryName: WELLNESS_CATEGORIES[1].name })}
                className="bg-transparent hover:bg-white/5 text-[#7BE3B4] border-2 border-[#7BE3B4] font-grotesk font-black text-xs px-6 md:px-8 py-3.5 md:py-4 rounded-2xl uppercase tracking-wider transition flex items-center gap-2"
              >
                <span>Supplements</span> 💪
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TILES */}
      <section className="bg-white py-12 md:py-16 px-4 md:px-8 border-y-2 border-black">
        <div className="w-full max-w-none mx-auto">
          <div className="text-center mb-10">
            <span className="text-black text-xs font-black uppercase tracking-[0.2em] font-sans bg-[#7BE3B4] px-3 py-1.5 rounded-full">
              Seven Aisles
            </span>
            <h2 className="text-black font-display text-2xl md:text-5xl uppercase font-black mt-4 mb-2 tracking-tight">
              Browse The Wellness Shelf
            </h2>
            <p className="text-black/60 text-sm max-w-lg mx-auto">
              From protein and ayurveda to serums, oral care and lab tests — each aisle is curated,
              not scraped in bulk.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
            {WELLNESS_CATEGORIES.map((cat, i) => {
              const count = inStock.filter(p => p.category === cat.name).length;
              return (
                <motion.button
                  key={cat.name}
                  whileHover={{ y: -6 }}
                  onClick={() => navigate('category', { categoryName: cat.name })}
                  className="group relative text-left aspect-[4/5] sm:aspect-[3/4] rounded-[15px] md:rounded-[20px] overflow-hidden border-2 border-black p-4 md:p-6 flex flex-col justify-end transition-all"
                  style={{ backgroundColor: cat.bg, color: cat.text }}
                  id={`wellness-tile-${cat.name.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                >
                  <span className="absolute top-4 left-4 md:top-6 md:left-6 text-3xl md:text-4xl">{cat.icon}</span>
                  <span
                    className="font-mono text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1 opacity-70"
                    style={{ color: cat.accent }}
                  >
                    Aisle 0{i + 1} · {count} {count === 1 ? 'item' : 'items'}
                  </span>
                  <span className="font-display text-base md:text-2xl uppercase tracking-tighter font-black leading-tight">
                    {cat.name}
                  </span>
                  <p className="text-[10px] md:text-[11px] leading-relaxed mt-1 opacity-70 line-clamp-3">
                    {cat.desc}
                  </p>
                  <div
                    className="h-1.5 w-0 group-hover:w-full transition-all duration-300 mt-3 rounded-full"
                    style={{ backgroundColor: cat.accent }}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. SHOP BY CONCERN */}
      {liveConcerns.length > 0 && (
        <section className="py-12 px-4 md:px-8 w-full max-w-none mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={15} className="text-[#0E7C5A]" />
            <h2 className="font-display text-xl md:text-3xl uppercase font-black text-[#112133]">
              Shop By Concern
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-2.5">
            {liveConcerns.map(concern => (
              <button
                key={concern}
                onClick={() => navigate('search', { query: concern })}
                className="px-4 py-2.5 rounded-full bg-white border-2 border-black/10 hover:border-[#0E7C5A] hover:text-[#0E7C5A] text-[#112133] font-grotesk font-black text-[11px] uppercase tracking-wider transition-all"
              >
                {concern}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 4. PRODUCT RAIL */}
      <section className="py-8 md:py-12 px-4 md:px-8 w-full max-w-none mx-auto">
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between mb-8 border-b-2 border-black/15 pb-4 gap-4">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={14} className="text-[#0E7C5A]" />
              <span className="text-[10px] text-black/50 font-black uppercase tracking-widest font-sans">
                Hand-checked labels
              </span>
            </div>
            <h2
              className="font-display text-2xl md:text-4xl uppercase font-black text-black"
              style={{ fontFamily: '"Space Grotesk", sans-serif' }}
            >
              Picked For You
            </h2>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto">
            <GridDensitySelector />
            <button
              onClick={() => navigate('search')}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black hover:text-[#0E7C5A] font-grotesk transition-colors border-b-2 border-black pb-0.5 shrink-0"
            >
              <span>See Full Store</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className={gridClass}>
          {loadingProducts
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} size={cardSize} />)
            : rail.map(product => <ProductCard key={product.id} product={product} />)}
        </div>

        {!loadingProducts && rail.length === 0 && (
          <div className="bg-white border-2 border-black/10 rounded-[20px] p-10 md:p-16 text-center max-w-lg mx-auto my-6">
            <span className="text-4xl">🌱</span>
            <h3 className="text-[#112133] font-display text-xl md:text-2xl uppercase tracking-wider font-bold mt-4 mb-2">
              Stocking the shelves
            </h3>
            <p className="text-[#112133]/60 text-xs leading-relaxed max-w-xs mx-auto">
              The wellness catalogue is being curated right now. Check back shortly, or browse the
              fashion store in the meantime.
            </p>
          </div>
        )}
      </section>

      {/* 5. CURATED CATALOGS TEASER */}
      {catalogCategories.filter(c => c.isActive).length > 0 && (
        <section className="py-10 px-4 md:px-8 w-full max-w-none mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl md:text-3xl uppercase font-black text-[#112133]">
              Curated Routines
            </h2>
            <button
              onClick={() => navigate('catalog-categories')}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black hover:text-[#0E7C5A] font-grotesk border-b-2 border-black pb-0.5"
            >
              <span>All Catalogs</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {catalogCategories.filter(c => c.isActive).slice(0, 4).map(cat => (
              <button
                key={cat.id}
                onClick={() => navigate('catalog-list', { categoryName: cat.name })}
                className="text-left bg-[#0E2A21] text-white border-2 border-black rounded-2xl p-4 h-28 flex flex-col justify-end hover:-translate-y-1 transition-transform"
              >
                <span className="font-black text-xs uppercase tracking-tight line-clamp-2">{cat.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 6. TRUST STRIP */}
      <section className="py-10 md:py-12 bg-white border-y-2 border-black text-center px-4 md:px-8">
        <div className="w-full max-w-none mx-auto">
          <p className="text-[10px] text-[#112133]/40 font-black uppercase tracking-[0.25em] mb-6">
            Affiliate partnerships with India&rsquo;s wellness and pharmacy brands
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-50 contrast-125">
            {['NUTRABAY', 'THE DERMA CO', 'KAPIVA', 'MUSCLEBLAZE', 'NETMEDS', 'MCAFFEINE', 'SUGAR'].map(brand => (
              <span
                key={brand}
                className="font-display font-black text-lg md:text-2xl tracking-widest text-[#112133] select-none hover:opacity-100 transition duration-300"
              >
                {brand}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-[10px] font-black uppercase tracking-widest text-[#112133]/45">
            <span className="flex items-center gap-1.5"><Truck size={13} /> Ships from the brand</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> Retailer warranty & returns</span>
          </div>
          <p className="text-[10px] text-[#112133]/35 max-w-xl mx-auto mt-6 leading-relaxed">
            Wellness products listed here are not medicines and are not intended to diagnose, treat or
            cure any condition. Talk to a doctor before starting a supplement.
          </p>
        </div>
      </section>

    </div>
  );
};

export default WellnessHome;
