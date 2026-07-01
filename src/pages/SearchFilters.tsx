import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard';
import { GridDensitySelector } from '../components/layout/GridDensitySelector';
import { Search as SearchIcon, Sliders, X, Check, Grid, Sparkles, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'motion/react';
import { getProductRecommendation, isPositiveRecommendation } from '../utils/fitEngine';

const PAGE_SIZE = 24;

export const SearchFilters: React.FC = () => {
  const { height, bodyType, setHeight, cardSize, products, loadingProducts } = useApp();

  // Search input state
  const [query, setQuery] = useState<string>('');

  // Active filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [selectedSeason, setSelectedSeason] = useState<string>('All');
  const [selectedSilhouette, setSelectedSilhouette] = useState<string>('All');

  // Mobile filters expansion state
  const [isMobileFiltersExpanded, setIsMobileFiltersExpanded] = useState<boolean>(false);

  // Derive unique values directly from live products database to stay robust and zero-maintenance
  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const brands = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.brand)))], [products]);
  
  const occasions = ['All', 'Office', 'College', 'Casual', 'Travel', 'Vacation', 'Wedding', 'Date Night', 'Festive', 'Gym'];
  const colors = ['All', 'White', 'Blue', 'Navy', 'Aqua', 'Black', 'Grey', 'Green', 'Gold', 'Ivory', 'Beige', 'Sage', 'Lemon', 'Yellow', 'Burgundy', 'Brown', 'Red', 'Khaki', 'Indigo'];
  const seasons = ['All', 'Summer', 'Winter'];
  const silhouettes = ['All', 'Slim Tall', 'Classic Tall', 'Oversized Loose', 'Relaxed Tall', 'Structured Regular', 'Straight', 'High-Rise Straight', 'Waffle Loose'];

  // Reset all tags back to native state
  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setSelectedOccasion('All');
    setSelectedBrand('All');
    setSelectedColor('All');
    setSelectedSeason('All');
    setSelectedSilhouette('All');
  };

  // Perform exhaustive multi-variant filter calculations
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Exclude out of stock items from the search
      if (product.outOfStock) return false;
      
      // 1. Text Search query matching title, brand, category, subCategory
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesText = 
          product.title.toLowerCase().includes(q) ||
          product.brand.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          (product.subCategory && product.subCategory.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      // 2. Main Category tag (Checks both category and categories array for robustness)
      if (selectedCategory !== 'All') {
        const selCat = selectedCategory.toLowerCase();
        const matchesCategory = 
          product.category?.toLowerCase() === selCat ||
          (product.categories && product.categories.some(c => c.toLowerCase() === selCat));
        if (!matchesCategory) return false;
      }

      // 3. Occasion matching array
      if (selectedOccasion !== 'All' && !product.occasions.includes(selectedOccasion)) {
        return false;
      }

      // 4. Brand tag
      if (selectedBrand !== 'All' && product.brand !== selectedBrand) {
        return false;
      }

      // 5. Colors array match
      if (selectedColor !== 'All' && !product.colors.includes(selectedColor)) {
        return false;
      }

      // 6. Seasons array match
      if (selectedSeason !== 'All' && !product.seasons.includes(selectedSeason)) {
        return false;
      }

      // 7. Silhouette fits
      if (selectedSilhouette !== 'All') {
        const s = selectedSilhouette.toLowerCase();
        const matchesSilhouette = product.fitType.toLowerCase().includes(s);
        if (!matchesSilhouette) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort priority: Tall verify status for active height and bodyType
      const recA = getProductRecommendation(a.verdicts, height, bodyType);
      const recB = getProductRecommendation(b.verdicts, height, bodyType);
      const scoreA = recA && recA.fitRecommendation.includes('Highly') ? 2 : (recA && isPositiveRecommendation(recA.fitRecommendation) ? 1 : 0);
      const scoreB = recB && recB.fitRecommendation.includes('Highly') ? 2 : (recB && isPositiveRecommendation(recB.fitRecommendation) ? 1 : 0);
      return scoreB - scoreA;
    });
  }, [query, selectedCategory, selectedOccasion, selectedBrand, selectedColor, selectedSeason, selectedSilhouette, height, bodyType]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset to first page whenever any filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, selectedCategory, selectedOccasion, selectedBrand, selectedColor, selectedSeason, selectedSilhouette, height, bodyType]);

  // Auto-load more when sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && visibleCount < filteredProducts.length) {
          setVisibleCount((prev: number) => Math.min(prev + PAGE_SIZE, filteredProducts.length));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, filteredProducts.length]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="pb-24 pt-10 text-[#112133] w-full max-w-none mx-auto px-4 md:px-8 text-left">
      
      {/* 1. FILTER CORE COLUMN FOR ASYMMETRIC CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Interactive Filtering console */}
        <div className={`lg:col-span-3 bg-white border border-[#112133]/10 rounded-3xl shadow-sm transition-all duration-300 ${
          isMobileFiltersExpanded ? 'p-6 space-y-6' : 'p-4 lg:p-6 space-y-0 lg:space-y-6'
        }`}>
          <div 
            onClick={() => setIsMobileFiltersExpanded(!isMobileFiltersExpanded)}
            className={`flex items-center justify-between cursor-pointer lg:cursor-default select-none ${
              isMobileFiltersExpanded 
                ? 'border-b border-[#112133]/10 pb-4' 
                : 'border-b-0 pb-0 lg:border-b lg:border-[#112133]/10 lg:pb-4'
            }`}
          >
            <h3 className="font-display font-black text-lg uppercase tracking-wider flex items-center gap-1.5 text-[#112133]">
              <Filter size={16} className="text-[#7D2AE8]" />
              <span>Personalizers</span>
              <span className="lg:hidden text-[#7D2AE8] ml-1">
                {isMobileFiltersExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </h3>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleResetFilters();
              }}
              className="text-[10px] font-bold text-[#112133]/50 hover:text-[#7D2AE8] uppercase tracking-wider transition"
            >
              Reset All
            </button>
          </div>

          <div className={`${isMobileFiltersExpanded ? 'space-y-6 block' : 'hidden lg:block lg:space-y-6'}`}>
            {/* Sizing Height calibrator inside filter pane */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-3 font-grotesk">
                Height Calibrator
              </h4>
              <div className="grid grid-cols-3 gap-1.5">
                {["6'0", "6'1", "6'2", "6'3", "6'4", "6'5", "6'6+"].map((h) => {
                  const isActive = height === h;
                  return (
                    <button
                      key={h}
                      onClick={() => setHeight(h)}
                      className={`px-2 py-1.5 text-xs rounded-xl font-grotesk font-semibold transition ${
                        isActive ? 'bg-[#7D2AE8] text-white font-extrabold shadow-sm' : 'bg-[#112133]/5 text-[#112133]/70 hover:bg-[#112133]/10'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category selection */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2.5">
                By Category
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-[11px] rounded-lg transition font-sans font-bold uppercase tracking-wide ${
                      selectedCategory === cat ? 'bg-[#7D2AE8] text-white' : 'bg-[#112133]/5 text-[#112133]/65 hover:bg-[#112133]/10'
                    }`}
                  >
                    {cat === 'All' ? 'All Curations' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasions selection */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2.5">
                By Occasion
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {occasions.map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setSelectedOccasion(occ)}
                    className={`px-3 py-1.5 text-[11px] rounded-lg transition font-sans font-bold uppercase tracking-wide ${
                      selectedOccasion === occ ? 'bg-[#00C4CC] text-white font-extrabold' : 'bg-[#112133]/5 text-[#112133]/65 hover:bg-[#112133]/10'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand select */}
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2.5">
                Partnership Brands
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((br) => (
                  <button
                    key={br}
                    onClick={() => setSelectedBrand(br)}
                    className={`px-3 py-1 text-[10px] rounded-lg transition font-sans font-bold uppercase tracking-wide ${
                      selectedBrand === br ? 'bg-[#7D2AE8] text-white' : 'bg-[#112133]/5 text-[#112133]/65 hover:bg-[#112133]/10'
                    }`}
                  >
                    {br}
                  </button>
                ))}
              </div>
            </div>

            {/* Colour and silhouette filter blocks */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">Color Hue</h4>
                <select 
                  value={selectedColor} 
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="bg-[#112133]/5 border border-[#112133]/10 rounded-lg p-2.5 text-xs w-full font-sans font-semibold text-[#112133]/80 focus:border-[#7D2AE8] outline-none"
                >
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">Seasonality</h4>
                <select 
                  value={selectedSeason} 
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="bg-[#112133]/5 border border-[#112133]/10 rounded-lg p-2.5 text-xs w-full font-sans font-semibold text-[#112133]/80 focus:border-[#7D2AE8] outline-none"
                >
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Active Input field, count results & Cards products */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Main search visual input panel */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#112133]/45">
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search specifications (e.g. Linen shirt, Manyavar Kurta, 36L Inseam, hoodies Zara)..."
              className="w-full bg-white border border-[#112133]/15 hover:border-[#112133]/20 focus:border-[#7D2AE8] rounded-2xl py-4.5 pl-12 pr-4 text-sm font-sans font-medium text-[#112133] placeholder-[#112133]/40 outline-none transition shadow-sm"
              id="search-input-field"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-4 flex items-center text-[#112133]/50 hover:text-[#112133]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-row justify-between items-center bg-[#112133]/5 border border-[#112133]/5 p-2 pl-4 pr-2 rounded-2xl min-h-14">
            <div className="text-xs font-sans text-black/60 flex items-center h-full">
              {loadingProducts ? (
                <span className="font-black text-sm uppercase tracking-wider text-[#112133]/40 animate-pulse">
                  Loading...
                </span>
              ) : (
                <span className="font-black text-sm uppercase tracking-wider text-[#112133]">
                  {visibleCount < filteredProducts.length
                    ? `Showing ${visibleCount} of ${filteredProducts.length} Garments`
                    : `${filteredProducts.length} Garments Found`}
                </span>
              )}
            </div>

            {/* Real-time Layout Density Selector */}
            <div className="shrink-0 flex items-center justify-end">
              <GridDensitySelector />
            </div>
          </div>

          {/* Results grid */}
          {loadingProducts ? (
            <div className={
              cardSize === 'small'
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-4"
                : cardSize === 'large'
                  ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                  : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            }>
              {Array.from({ length: 12 }).map((_, i) => (
                <ProductCardSkeleton key={i} size={cardSize} />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              <div className={
                cardSize === 'small'
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-4"
                  : cardSize === 'large'
                    ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              }>
                {visibleProducts.map((p: (typeof visibleProducts)[0]) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
              {/* Sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-10" />
              {visibleCount < filteredProducts.length && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={() => setVisibleCount((prev: number) => Math.min(prev + PAGE_SIZE, filteredProducts.length))}
                    className="bg-[#112133] text-white font-grotesk font-black text-xs px-8 py-3 rounded-2xl uppercase tracking-wider hover:bg-[#1e3a5f] transition"
                  >
                    Load More ({filteredProducts.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#112133]/5 border border-[#112133]/10 rounded-[30px] p-16 text-center max-w-sm mx-auto my-12">
              <X size={32} className="text-accent-coral mx-auto mb-3" />
              <h4 className="text-[#112133] font-display text-xl uppercase tracking-wider mb-2">No specs matched</h4>
              <p className="text-[#112133]/60 text-xs leading-relaxed mb-6">
                No garments matched the specific cross-section of colors, brands or sizes. Let's restart our selectors to extend choices.
              </p>
              <button
                onClick={handleResetFilters}
                className="bg-[#7D2AE8] text-white hover:bg-[#6820C4] font-grotesk font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider shadow-sm"
              >
                Clear Filters
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
export default SearchFilters;
