import React, { useState } from 'react';
import { CompleteFit } from '../../types';
import { useApp } from '../../context/AppContext';
import { Heart, ExternalLink, Sparkles, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FitCardProps {
  fit: CompleteFit;
}

export const FitCard: React.FC<FitCardProps> = ({ fit }) => {
  const { savedFitIds, toggleSaveFit, trackAffiliateClick, navigate, products } = useApp();
  const [showShopTray, setShowShopTray] = useState(false);

  const isSaved = savedFitIds.includes(fit.id);

  // Retrieve the full product models of the items in this lookbook
  const itemsWithProduct = fit.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    return { ...item, product };
  }).filter(item => item.product !== undefined);

  const handleOpenAffiliate = (id: string, url: string, retailer: string) => {
    trackAffiliateClick(id, retailer, url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      className="bg-white border-2 border-black rounded-[32px] hover:pop-shadow duration-300 transition-all flex flex-col justify-between overflow-hidden"
      id={`fit-card-${fit.id}`}
    >
      <div>
        {/* Layer 1: Lookbook Cover Banner & Grid */}
        <div className="relative p-6 bg-gradient-to-br from-[#FAF9F6] to-white border-b-2 border-black">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF3F6C]" />
              <span className="text-black font-black text-[10px] tracking-widest font-grotesk bg-[#FFE600] border border-black/15 px-2.5 py-1 rounded">
                CURATED LOOKBOOK • {fit.theme.toUpperCase()}
              </span>
            </div>
            
            {/* Save Lookbook Toggle */}
            <button
               onClick={() => toggleSaveFit(fit.id)}
              className="p-2.5 bg-white hover:bg-[#FF3F6C] text-black hover:text-white rounded-full border border-black shadow z-10 transition hover:scale-110 active:scale-95"
              id={`save-fit-btn-${fit.id}`}
            >
              <Heart size={15} className={isSaved ? 'fill-[#FF3F6C] text-[#FF3F6C]' : ''} />
            </button>
          </div>

          <h2 className="text-black font-display text-2xl md:text-3xl font-black uppercase tracking-tight leading-none mb-3">
            {fit.title}
          </h2>

          <p className="text-black/70 text-xs leading-relaxed font-sans line-clamp-3 mb-5">
            {fit.stylingNotes}
          </p>

          {/* Stitched grid item highlights */}
          <div className="grid grid-cols-3 gap-3">
            {itemsWithProduct.map((item) => (
              <div 
                key={item.product!.id}
                onClick={() => navigate('product', { productId: item.product!.id })}
                className="cursor-pointer group flex flex-col bg-white hover:bg-[#FAF9F6] rounded-2xl p-2.5 border border-black/10 hover:border-black transition-all text-center relative shadow-sm"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-black/5 mb-1.5 relative border border-black/5">
                  <img 
                    src={item.product!.images[0]} 
                    alt={item.product!.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[9px] uppercase tracking-wider bg-black/60">
                    Sizing
                  </div>
                </div>
                <span className="text-[9px] font-black text-[#FF3F6C] uppercase tracking-wider block mb-0.5">
                  {item.role}
                </span>
                <span className="text-black font-semibold text-[10px] leading-tight font-sans line-clamp-1">
                  {item.product!.brand}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer 2: Affiliate Shopping Options Trigger */}
      <div className="p-6 bg-black/5 w-full border-t border-black/10">
        <div className="flex gap-3">
          {/* Main Action Group Shopping Drawer */}
          <button
            onClick={() => setShowShopTray(!showShopTray)}
            className="flex-grow flex items-center justify-center gap-2 bg-[#FF3F6C] text-white text-xs font-grotesk font-black py-3.5 px-4 rounded-xl border border-black shadow-sm hover:scale-[1.02] transform active:scale-95 transition uppercase tracking-wide cursor-pointer"
            id={`shop-the-fit-btn-${fit.id}`}
          >
            <ShoppingBag size={15} />
            <span>{showShopTray ? 'Hide Grid Breakdown' : 'Shop Curation Outfit'}</span>
          </button>
        </div>

        {/* Dynamic Slidout Retailer lists */}
        <AnimatePresence>
          {showShopTray && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4 pt-4 border-t-2 border-black"
            >
              <div className="bg-white rounded-3xl p-4 border-2 border-black shadow">
                <div className="mb-3 text-left">
                  <h4 className="text-black text-xs font-black uppercase tracking-wider font-grotesk flex items-center gap-1.5">
                    <span>Retailer Outlet Specs</span>
                  </h4>
                  <p className="text-black/60 text-[10px] leading-relaxed">
                    Tap any of the verified outlets to view pricing or proceed with our custom affiliate portal tags.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {itemsWithProduct.map((item) => (
                    <div 
                      key={item.product!.id}
                      className="flex items-center justify-between border-b border-black/10 pb-3 last:border-b-0 last:pb-0 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/5 flex-shrink-0 border border-black/10">
                          <img 
                            src={item.product!.images[0]} 
                            alt={item.product!.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-black text-xs font-black font-sans line-clamp-1">
                            {item.product!.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-white bg-[#FF3F6C] px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wide">
                              {item.product!.retailer}
                            </span>
                            <span className="text-black font-mono font-bold text-xs">
                              ₹{item.product!.priceAtRetailer.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenAffiliate(item.product!.id, item.product!.affiliateUrl, item.product!.retailer)}
                        className="p-2.5 bg-black hover:bg-[#FF3F6C] text-white rounded-xl transition border border-black duration-300"
                        title={`Redirect to ${item.product!.retailer}`}
                        id={`open-affiliate-${item.product!.id}`}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
export default FitCard;
