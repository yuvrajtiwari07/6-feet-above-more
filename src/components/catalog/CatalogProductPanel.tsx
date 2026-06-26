import React, { useState, useCallback } from 'react';
import { Product, FitVerdict } from '../../types';
import { useApp } from '../../context/AppContext';
import { getAccessToken } from '../../supabase';
import {
  Heart, ShieldCheck, ChevronLeft, ChevronRight, ExternalLink,
  Ruler, Layers, Tag, Star, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  product: Product;
  onNavigateToDetail?: () => void;
}

const VERDICT_CONFIG = {
  verified:  { label: 'Tall Verified',  bg: 'bg-black',         text: 'text-white',      border: 'border-black' },
  friendly:  { label: 'Tall Friendly',  bg: 'bg-[#FF3F6C]',     text: 'text-white',      border: 'border-[#FF3F6C]' },
  community: { label: 'Community Pick', bg: 'bg-[#00AFB9]',     text: 'text-white',      border: 'border-[#00AFB9]' },
  runs_short:{ label: 'Runs Short',     bg: 'bg-white',         text: 'text-[#FF3F6C]',  border: 'border-[#FF3F6C]' },
};

const CatalogProductPanel: React.FC<Props> = ({ product, onNavigateToDetail }) => {
  const { height, bodyType, savedProductIds, toggleSaveProduct, trackAffiliateClick } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [affiliateUrl, setAffiliateUrl] = useState(product.affiliateUrl || '');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const isSaved = savedProductIds.includes(product.id);

  const recommendation = getProductRecommendation(product.verdicts, height, bodyType);
  const verdictCfg = recommendation ? VERDICT_CONFIG[recommendation.status as keyof typeof VERDICT_CONFIG] : null;

  const images = product.images.length > 0 ? product.images : ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop'];

  const prevImg = useCallback(() => setImgIdx(i => (i - 1 + images.length) % images.length), [images.length]);
  const nextImg = useCallback(() => setImgIdx(i => (i + 1) % images.length), [images.length]);

  const memberPrice = product.discountPercent
    ? Math.round(product.priceAtRetailer * (1 - (product.discountPercent / 100)))
    : null;

  const handleGenerateAffiliate = async () => {
    if (!product.affiliateUrl && !affiliateUrl) return;
    setGenLoading(true);
    setGenError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/generate-affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: affiliateUrl || product.affiliateUrl }),
      });
      const data = await res.json();
      if (data.success) setAffiliateUrl(data.affiliateUrl);
      else setGenError(data.error || 'Failed to generate link');
    } catch {
      setGenError('Network error');
    } finally {
      setGenLoading(false);
    }
  };

  const handleShopItem = () => {
    const url = affiliateUrl || product.affiliateUrl;
    if (!url) return;
    trackAffiliateClick(product.id, product.retailer, url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col bg-white border-2 border-black rounded-[20px] overflow-hidden shadow-sm min-w-[300px] max-w-[400px]">
      {/* Image carousel */}
      <div className="relative aspect-[3/4] bg-black/5 overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.img
            key={images[imgIdx]}
            src={images[imgIdx]}
            alt={product.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            draggable={false}
          />
        </AnimatePresence>

        {/* Nav arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 border border-black/10 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 border border-black/10 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition hover:bg-white"
            >
              <ChevronRight size={16} />
            </button>
            {/* Dots */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Save button */}
        <button
          onClick={() => toggleSaveProduct(product.id)}
          className="absolute top-3 right-3 w-9 h-9 bg-white/90 border border-black/10 rounded-full flex items-center justify-center shadow hover:scale-110 transition"
        >
          <Heart
            size={16}
            className={isSaved ? 'fill-[#FF3F6C] text-[#FF3F6C]' : 'text-black/50'}
          />
        </button>

        {/* Verdict badge */}
        {recommendation && (
          <div className={`absolute top-3 left-3 flex items-center gap-1.5 bg-white text-black text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-black/10 shadow-sm`}>
            <ShieldCheck size={10} className={isPositiveRecommendation(recommendation.fitRecommendation) ? "text-[#00C4CC]" : "text-amber-500"} />
            {recommendation.fitRecommendation}
          </div>
        )}

        {/* Out of stock */}
        {product.outOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-black font-black text-sm px-4 py-2 rounded-xl border-2 border-black uppercase">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Brand + title */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-0.5">{product.brand}</div>
          <h3 className="font-display font-black text-sm text-black leading-tight line-clamp-2">{product.title}</h3>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="font-display font-black text-lg text-black">₹{product.priceAtRetailer.toLocaleString()}</span>
          {memberPrice && memberPrice < product.priceAtRetailer && (
            <>
              <span className="text-xs text-black/40 line-through">₹{product.priceAtRetailer.toLocaleString()}</span>
              <span className="text-xs font-black text-[#FF3F6C] bg-[#FF3F6C]/10 px-1.5 py-0.5 rounded">
                {product.discountPercent}% off
              </span>
            </>
          )}
        </div>

        {/* Verdict note for user's height */}
        {recommendation && (
          <div className="bg-black/[0.02] rounded-xl p-3 border border-black/5">
            <div className="flex items-center gap-1.5 mb-1">
              <Ruler size={10} className="text-[#7D2AE8]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-black/45">Tall Fit Verdict</span>
            </div>
            <p className="text-[11px] font-medium leading-relaxed text-black/70">
              Verified as <span className="text-[#7D2AE8] font-black">{recommendation.fitRecommendation}</span> for your profile.
            </p>
          </div>
        )}

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Layers size={10} className="text-black/40" />
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Available Sizes</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {product.sizes.map(s => (
                <span key={s} className="text-[10px] font-bold border border-black/20 px-2 py-0.5 rounded-lg text-black/70">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Material */}
        {product.material && (
          <div className="flex items-center gap-1.5">
            <Tag size={10} className="text-black/30" />
            <span className="text-[10px] text-black/50 font-sans">{product.material}</span>
          </div>
        )}

        {/* Rating */}
        {product.reviewsCount && product.reviewsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Star size={10} className="fill-[#FFCC00] text-[#FFCC00]" />
            <span className="text-[10px] font-black text-black">{product.averageRating?.toFixed(1)}</span>
            <span className="text-[10px] text-black/40">({product.reviewsCount} reviews)</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Affiliate error */}
        {genError && <p className="text-[10px] text-[#FF3F6C] font-bold">{genError}</p>}

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleShopItem}
            disabled={product.outOfStock}
            className={`w-full py-3 text-xs font-black uppercase tracking-wider rounded-xl border-2 transition flex items-center justify-center gap-2 ${
              product.outOfStock
                ? 'bg-black/10 text-black/30 border-black/10 cursor-not-allowed'
                : 'bg-black text-white border-black hover:bg-[#FF3F6C] hover:border-[#FF3F6C]'
            }`}
          >
            <ExternalLink size={13} />
            Shop This Item
          </button>

          {onNavigateToDetail && (
            <button
              onClick={onNavigateToDetail}
              className="w-full py-2 text-[10px] font-black uppercase tracking-wider text-black/50 hover:text-black transition flex items-center justify-center gap-1.5"
            >
              Full Details <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogProductPanel;
