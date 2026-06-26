import React from 'react';
import { Catalog, Product } from '../../types';
import { ArrowRight, Package } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  catalog: Catalog;
  products: Product[];
  onClick: () => void;
}

const CatalogCard: React.FC<Props> = ({ catalog, products, onClick }) => {
  const previewProducts = products.slice(0, 4);
  const count = catalog.productIds.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group cursor-pointer bg-white border-2 border-black rounded-[24px] overflow-hidden hover:pop-shadow transition-all duration-300"
      id={`catalog-card-${catalog.id}`}
    >
      {/* Cover image / product strip */}
      <div className="relative aspect-[16/9] bg-black/5 overflow-hidden">
        {catalog.coverImage ? (
          <img
            src={catalog.coverImage}
            alt={catalog.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : previewProducts.length > 0 ? (
          <div className={`grid h-full ${previewProducts.length === 1 ? 'grid-cols-1' : previewProducts.length === 2 ? 'grid-cols-2' : previewProducts.length === 3 ? 'grid-cols-3' : 'grid-cols-4'} gap-0.5 bg-black/10`}>
            {previewProducts.map((p, i) => (
              <div key={i} className="relative overflow-hidden">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-black/10 flex items-center justify-center">
                    <Package size={20} className="text-black/30" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-black/20 gap-2">
            <Package size={32} />
            <span className="text-xs font-bold uppercase">No products yet</span>
          </div>
        )}

        {/* Gradient + category chip overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />

        {/* Product count badge */}
        <div className="absolute top-3 left-3 bg-[#FFCC00] text-black text-[10px] font-black px-2.5 py-1 rounded-lg border border-black/15 shadow uppercase tracking-wider">
          {count} {count === 1 ? 'Item' : 'Items'}
        </div>

        {/* Category chip */}
        <div className="absolute top-3 right-3 bg-black/85 text-white text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider backdrop-blur-sm">
          {catalog.categoryName}
        </div>

        {/* Published indicator */}
        {!catalog.isPublished && (
          <div className="absolute bottom-3 left-3 bg-[#FFD43B] text-black text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
            Draft
          </div>
        )}
      </div>

      {/* Info block */}
      <div className="p-4">
        <h3 className="font-display font-black text-base text-black group-hover:text-[#D5A021] transition-colors line-clamp-1 mb-1">
          {catalog.title}
        </h3>
        {catalog.description && (
          <p className="text-black/55 text-[11px] font-sans leading-relaxed line-clamp-2 mb-3">
            {catalog.description}
          </p>
        )}

        {/* Tags */}
        {catalog.tags && catalog.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {catalog.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] font-black uppercase tracking-wider bg-black/5 text-black/60 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {previewProducts.slice(0, 3).map((p, i) => (
              p.images?.[0] ? (
                <img
                  key={i}
                  src={p.images[0]}
                  alt={p.brand}
                  className="w-7 h-7 rounded-full object-cover border-2 border-white"
                  referrerPolicy="no-referrer"
                />
              ) : null
            ))}
          </div>
          <button className="flex items-center gap-1.5 text-xs font-black text-black group-hover:text-[#D5A021] uppercase tracking-wider transition border-b-2 border-black pb-0.5">
            View Catalog <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CatalogCard;
