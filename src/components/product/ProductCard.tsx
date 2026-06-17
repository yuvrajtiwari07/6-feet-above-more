import React, { useState, useRef } from 'react';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { Heart, ExternalLink, Ruler, CheckCircle2, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { height, heightBand, toggleSaveProduct, savedProductIds, navigate, trackAffiliateClick, cardSize } = useApp();

  const isSaved = savedProductIds.includes(product.id);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const hasSwipedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    hasSwipedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diffX = touchStartRef.current - currentX;
    if (Math.abs(diffX) > 10) {
      hasSwipedRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const diffX = touchStartRef.current - endX;
    
    if (Math.abs(diffX) > 40 && product.images && product.images.length > 1) {
      if (diffX > 0) {
        // Swipe left -> Next image
        setActiveImageIndex((prev) => (prev + 1) % product.images.length);
      } else {
        // Swipe right -> Prev image
        setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
      }
    }
    touchStartRef.current = null;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasSwipedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasSwipedRef.current = false;
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    navigate('product', { productId: product.id });
  };

  // Safely find the verdict configured for the user's current height band
  const verdict = product.verdicts.find(v => v.band === heightBand) || {
    status: 'community' as const,
    note: 'Generous fabric proportions for tall shoulders and torsos.'
  };

  // Helper method to display badges with high editorial styling
  const renderDifferentiatorBadge = () => {
    const isSm = cardSize === 'small';
    const badgeClass = isSm
      ? "flex items-center gap-1 bg-[#FF3F6C] text-white font-grotesk font-black text-[8px] tracking-wide uppercase px-2 py-0.5 rounded-md shadow-sm border-b border-black/10"
      : "flex items-center gap-1.5 bg-[#FF3F6C] text-white font-grotesk font-black text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full shadow-md border-b-2 border-black/20";
    
    const friendlyClass = isSm
      ? "flex items-center gap-1 bg-[#FFCC00] text-black font-grotesk font-black text-[8px] tracking-wide uppercase px-2 py-0.5 rounded-md shadow-sm border border-black/10"
      : "flex items-center gap-1.5 bg-[#FFCC00] text-black font-grotesk font-black text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full shadow-sm border border-black/15";

    const communityClass = isSm
      ? "flex items-center gap-1 bg-black text-white font-grotesk font-bold text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md"
      : "flex items-center gap-1.5 bg-black text-white font-grotesk font-bold text-[9px] tracking-widest uppercase px-3 py-1 rounded-full";

    const shortClass = isSm
      ? "flex items-center gap-1 bg-[#E11B22] text-white font-grotesk font-black text-[8px] tracking-wider uppercase px-2 py-0.5 rounded-md shadow-sm"
      : "flex items-center gap-1 bg-[#E11B22] text-white font-grotesk font-black text-[9px] tracking-wider uppercase px-2.5 py-1.5 rounded-lg shadow-sm";

    switch (verdict.status) {
      case 'verified':
        return (
          <div className={badgeClass}>
            <CheckCircle2 size={isSm ? 9 : 11} strokeWidth={isSm ? 2.5 : 3} className="text-white" />
            TALL VERIFIED
          </div>
        );
      case 'friendly':
        return (
          <div className={friendlyClass}>
            <Ruler size={isSm ? 9 : 11} className="text-black" />
            TALL FRIENDLY
          </div>
        );
      case 'community':
        return (
          <div className={communityClass}>
            <HelpCircle size={isSm ? 8 : 10} className="text-white/70" />
            COMMUNITY OK
          </div>
        );
      case 'runs_short':
        return (
          <div className={shortClass}>
            RUNS CUT SHORT
          </div>
        );
      default:
        return null;
    }
  };

  const handleShopRedirect = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAffiliateClick(product.id, product.retailer, product.affiliateUrl);
    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  const memberPrice = Math.floor(product.priceAtRetailer * 0.88);
  const isSm = cardSize === 'small';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className={`group relative flex flex-col bg-white border border-[#111111]/12 overflow-hidden transition-all duration-300 ${
        isSm 
          ? 'rounded-2xl hover:pop-shadow-sm hover:-translate-y-0.5 p-0' 
          : 'rounded-[28px] hover:pop-shadow hover:-translate-y-1'
      }`}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
      id={`product-card-${product.id}`}
    >
      {/* 1. Interactive Image Wrapper */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="aspect-[3/4] relative overflow-hidden bg-black/5 border-b border-black/10 group/img"
      >
        {/* Sliding Images Container */}
        <div 
          className="flex transition-transform duration-500 ease-out h-full w-full"
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {product.images && product.images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${product.title} ${idx + 1}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover shrink-0 transform transition-transform duration-500 scale-100 group-hover:scale-105"
              loading="lazy"
            />
          ))}
        </div>

        {/* Hover Arrow Controllers for PC/Desktop view */}
        {product.images && product.images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-white/85 text-black hover:bg-[#FF3F6C] hover:text-white p-1 rounded-full border border-black/10 shadow-sm z-30 transition opacity-0 group-hover/img:opacity-100 hidden md:flex"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageIndex((prev) => (prev + 1) % product.images.length);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white/85 text-black hover:bg-[#FF3F6C] hover:text-white p-1 rounded-full border border-black/10 shadow-sm z-30 transition opacity-0 group-hover/img:opacity-100 hidden md:flex"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}
        
        {/* Absolute Gradients (Sleek vignette shadow overlay) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 opacity-70 z-10 transition-all pointer-events-none" />
 
        {/* Dynamic Trust Badge Layer */}
        <div className={`absolute ${isSm ? 'top-2 left-2 z-25' : 'top-3.5 left-3.5 z-25'} flex flex-col gap-1`}>
          {renderDifferentiatorBadge()}
        </div>
 
        {/* Quick Save Pill */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSaveProduct(product.id);
          }}
          className={`absolute ${
            isSm 
              ? 'top-2 right-2 p-1.5' 
              : 'top-3.5 right-3.5 p-2.5'
          } bg-white hover:bg-[#FF3F6C] hover:text-white text-black rounded-full border border-black/10 shadow-sm z-30 transition hover:scale-110 active:scale-95`}
          id={`save-btn-${product.id}`}
        >
          <Heart size={isSm ? 12 : 15} className={isSaved ? 'fill-[#FF3F6C] text-[#FF3F6C] group-hover:text-white' : ''} />
        </button>
 
        {/* Retailer sticker corner */}
        <div className={`absolute ${isSm ? 'bottom-2 left-2 right-2' : 'bottom-3.5 left-3.5 right-3.5'} flex items-center justify-between z-20 pointer-events-none`}>
          <span className={`${isSm ? 'text-[8px] px-2 py-0.5 rounded' : 'text-[10px] px-3 py-1 rounded-md'} font-black font-display tracking-widest text-black bg-[#FFCC00] border border-black/15 shadow-sm uppercase`}>
            {product.retailer}
          </span>
          {!isSm && (
            <span className="text-[9px] font-black font-grotesk tracking-widest text-white bg-black/85 px-2.5 py-1 rounded">
              FIT SPEC AUDITED
            </span>
          )}
        </div>
      </div>
 
      {/* 2. Text / Fit Meta Block */}
      <div className={`${isSm ? 'p-3' : 'p-5'} flex flex-col flex-grow justify-between bg-white text-left`}>
        <div>
          <div className={`flex items-center justify-between gap-2 ${isSm ? 'mb-1' : 'mb-2'}`}>
            <span className={`text-black font-display font-extrabold ${isSm ? 'text-[10px]' : 'text-[12px]'} uppercase tracking-wider`}>
              {product.brand}
            </span>
            <span className={`text-white ${isSm ? 'text-[8.5px] px-1.5 py-0.5' : 'text-[10px] px-2'} font-mono bg-black font-bold rounded uppercase`}>
              {product.fitType}
            </span>
          </div>
 
          <h3 className={`text-black font-grotesk font-black line-clamp-1 group-hover:text-[#FF3F6C] transition-colors ${isSm ? 'text-xs mb-1.5' : 'text-base mb-2'}`}>
            {product.title}
          </h3>

          {/* Pricing Row */}
          <div className={`flex flex-col gap-0.5 ${isSm ? 'mb-2' : 'mb-3.5'}`}>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className={`font-black font-grotesk text-black ${isSm ? 'text-sm' : 'text-lg'}`}>
                ₹{product.priceAtRetailer.toLocaleString('en-IN')}
              </span>
              <span className="text-black/40 text-[10px] font-sans line-through">
                ₹{Math.floor(product.priceAtRetailer * 1.3).toLocaleString('en-IN')}
              </span>
              <span className="text-[#FF3F6C] text-[10px] font-black">
                (23%)
              </span>
            </div>
            {/* The Club Price Strip */}
            <div className={`uppercase font-black text-[#FF3F6C] bg-[#FF3F6C]/5 rounded border border-[#FF3F6C]/10 flex items-center justify-between ${isSm ? 'text-[8px] p-0.5 mt-0.5 px-1' : 'text-[10px] p-1'}`}>
              <span>Club:</span>
              <span className={`font-mono font-bold text-black ${isSm ? 'text-[9.5px]' : 'text-[11px]'}`}>₹{memberPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
 
          {/* Dynamic Verdict text strip */}
          <div className={`bg-[#FAF9F6] border border-black/5 ${isSm ? 'rounded-xl p-1.5 mb-2.5' : 'rounded-2xl p-3 mb-4'}`}>
            <div className="flex items-center gap-1.5 text-[#FF3F6C] text-[9px] font-black font-grotesk mb-0.5">
              <div className="w-1 h-1 rounded-full bg-[#FF3F6C]" />
              <span>{isSm ? `${height} FIT` : `${height} TALL VERDICT`}</span>
            </div>
            <p className={`text-black/70 font-sans ${isSm ? 'text-[9.5px] leading-snug line-clamp-1' : 'text-xs leading-relaxed line-clamp-2'}`}>
              {verdict.note || "Optimized torso length & wide shoulder-cuts prevent standard ride-up."}
            </p>
          </div>
        </div>
 
        {/* 3. Direct Affiliate Exit Action */}
        <div className={`grid grid-cols-5 gap-1.5 ${isSm ? 'mt-1' : 'mt-auto'}`}>
          {/* View Details */}
          <button
            onClick={() => navigate('product', { productId: product.id })}
            className={`col-span-2 text-center text-black bg-[#F5F5F7] hover:bg-black hover:text-white rounded-xl font-grotesk font-black tracking-wider transition uppercase border border-black/10 ${isSm ? 'py-1.5 text-[9px]' : 'py-3 text-xs'}`}
            id={`details-btn-${product.id}`}
          >
            Sizing
          </button>
          
          {/* Shop Affiliate Link */}
          <button
            onClick={handleShopRedirect}
            className={`col-span-3 flex items-center justify-center gap-0.5 bg-black hover:bg-[#FF3F6C] text-white font-black font-grotesk transition-all duration-300 shadow-sm border border-black shadow-[#FF3F6C]/5 hover:scale-[1.02] ${isSm ? 'py-1.5 text-[9px] rounded-xl' : 'py-3 text-xs rounded-2xl'}`}
            id={`shop-btn-${product.id}`}
          >
            <span>Shop</span>
            <ExternalLink size={isSm ? 8 : 10} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
export default ProductCard;
