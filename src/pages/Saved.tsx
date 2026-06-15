import React from 'react';
import { useApp } from '../context/AppContext';
import { COMPLETE_FITS } from '../data/mockData';
import { ProductCard } from '../components/product/ProductCard';
import { FitCard } from '../components/fits/FitCard';
import { Heart, Sparkles, Shirt, Compass } from 'lucide-react';

export const Saved: React.FC = () => {
  const { savedProductIds, savedFitIds, navigate, height, products } = useApp();

  // Pick up full models
  const savedProducts = products.filter(p => savedProductIds.includes(p.id));
  const savedFits = COMPLETE_FITS.filter(f => savedFitIds.includes(f.id));

  const countTotal = savedProducts.length + savedFits.length;

  return (
    <div className="pb-24 pt-10 text-[#112133] max-w-7xl mx-auto px-4 md:px-8 text-left">
      
      {/* Editorial Title */}
      <div className="border-b border-[#112133]/15 pb-6 mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={16} className="text-accent-coral fill-accent-coral" />
          <span className="text-[10px] text-accent-coral font-black uppercase tracking-[0.2em] font-sans">
            Your Tall Sizing Locker
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black font-display uppercase tracking-tight text-[#112133] leading-none mb-3 text-left">
          PERSONAL WARDROBE
        </h1>
        <p className="text-xs md:text-sm text-[#112133]/60 leading-relaxed font-sans">
          Your bookmarked talls specifically checked for <strong className="text-[#7D2AE8]">{height}" statures</strong>. Tap affiliate links or spec tables.
        </p>
      </div>

      {countTotal > 0 ? (
        <div className="space-y-12">
          
          {/* Saved Curations lookbooks */}
          {savedFits.length > 0 && (
            <div>
              <h3 className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest font-grotesk border-b border-[#112133]/10 pb-2 mb-6 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#7D2AE8]" />
                <span>Saved Lookbook Outfits ({savedFits.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {savedFits.map((f) => (
                  <FitCard key={f.id} fit={f} />
                ))}
              </div>
            </div>
          )}

          {/* Saved Individual Garments */}
          {savedProducts.length > 0 && (
            <div>
              <h3 className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest font-grotesk border-b border-[#112133]/10 pb-2 mb-6 flex items-center gap-1.5">
                <Shirt size={12} className="text-[#7D2AE8]" />
                <span>Saved Standalone Items ({savedProducts.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {savedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white border border-[#112133]/15 rounded-[24px] p-16 text-center max-w-lg mx-auto my-12 shadow-sm">
          <Heart size={48} className="text-[#112133]/20 mx-auto mb-4 animate-pulse" />
          <h3 className="text-[#112133] font-display text-2xl uppercase tracking-wider font-bold mb-2">
            Your Locker is Empty
          </h3>
          <p className="text-[#112133]/50 text-xs leading-relaxed max-w-xs mx-auto mb-8">
            Bookmark items while browsing catalogues. They will save immediately in this container locker, synced automatically across your browser sessions.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('search')}
              className="bg-[#7D2AE8] text-white font-grotesk font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider hover:bg-[#6820C4] transition shadow-sm"
              id="empty-saved-search-btn"
            >
              Search Catalog
            </button>
            <button
              onClick={() => navigate('complete-fits')}
              className="bg-[#112133]/5 hover:bg-[#112133]/10 border border-[#112133]/10 text-[#112133] font-grotesk font-black text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition"
              id="empty-saved-looks-btn"
            >
              Browse Lookbooks
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default Saved;
