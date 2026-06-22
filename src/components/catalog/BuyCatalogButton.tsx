import React, { useState } from 'react';
import { Catalog, Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Loader2 } from 'lucide-react';

interface Props {
  catalog: Catalog;
  products: Product[];
}

const BuyCatalogButton: React.FC<Props> = ({ catalog, products }) => {
  const { trackAffiliateClick } = useApp();
  const [loading, setLoading] = useState(false);

  const handleBuyAll = async () => {
    setLoading(true);
    try {
      // Track affiliate clicks for all products
      await Promise.all(
        products.map(p =>
          p.affiliateUrl
            ? trackAffiliateClick(p.id, p.retailer, p.affiliateUrl)
            : Promise.resolve()
        )
      );

      // Open catalog affiliate URL if available, otherwise open each product individually
      if (catalog.affiliateUrl) {
        window.open(catalog.affiliateUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Open each product in a new tab with a slight delay to avoid popup blockers
        for (let i = 0; i < products.length; i++) {
          const url = products[i].affiliateUrl;
          if (url) {
            setTimeout(() => {
              window.open(url, '_blank', 'noopener,noreferrer');
            }, i * 150);
          }
        }
      }
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const availableCount = products.filter(p => !p.outOfStock && p.affiliateUrl).length;

  if (availableCount === 0) return null;

  return (
    // Desktop-only — hidden on mobile via Tailwind
    <button
      onClick={handleBuyAll}
      disabled={loading}
      className="hidden md:flex items-center gap-2.5 bg-[#FFCC00] hover:bg-[#f5c200] text-black font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl border-2 border-black shadow pop-shadow-sm transition hover:pop-shadow disabled:opacity-60"
      id="buy-whole-catalog-btn"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <ShoppingBag size={16} />
      )}
      {loading ? 'Opening...' : `Buy Whole Catalog (${availableCount} items)`}
    </button>
  );
};

export default BuyCatalogButton;
