import React from 'react';
import { CatalogCategory } from '../../types';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface Props {
  category: CatalogCategory;
  catalogCount: number;
  onClick: () => void;
  index: number;
}

const TILE_THEMES = [
  { bg: 'bg-black', text: 'text-white', accent: 'text-[#FFCC00]', hover: 'hover:bg-[#111]' },
  { bg: 'bg-white', text: 'text-black', accent: 'text-[#FF3F6C]', hover: 'hover:bg-[#FAF9F6]' },
  { bg: 'bg-[#FF3F6C]', text: 'text-white', accent: 'text-[#FFCC00]', hover: 'hover:bg-[#e0305a]' },
  { bg: 'bg-[#00AFB9]', text: 'text-white', accent: 'text-white', hover: 'hover:bg-[#009aa3]' },
  { bg: 'bg-[#7D2AE8]', text: 'text-white', accent: 'text-[#FFCC00]', hover: 'hover:bg-[#6922c8]' },
  { bg: 'bg-[#FFCC00]', text: 'text-black', accent: 'text-black', hover: 'hover:bg-[#f5c200]' },
];

const CatalogCategoryTile: React.FC<Props> = ({ category, catalogCount, onClick, index }) => {
  const theme = TILE_THEMES[index % TILE_THEMES.length];
  const hasCover = !!category.coverImage;
  const isDark = theme.text === 'text-white';

  return (
    <motion.div
      whileHover={{ y: -6 }}
      onClick={onClick}
      className={`group cursor-pointer relative aspect-[3/4] md:aspect-[10/13] rounded-[30px] overflow-hidden border-2 border-black transition-all ${theme.bg} ${theme.hover}`}
      id={`catalog-cat-tile-${category.slug}`}
    >
      {hasCover && (
        <img
          src={category.coverImage}
          alt={category.name}
          className={`absolute inset-0 w-full h-full object-cover ${isDark ? 'opacity-20' : 'opacity-15'} group-hover:opacity-35 transition-all duration-300 scale-100 group-hover:scale-105`}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-black/90 via-black/20' : 'from-white/95 via-white/20'} to-transparent pointer-events-none`} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-6">
        <div className={`font-mono ${theme.accent} text-[10px] font-black uppercase tracking-widest mb-1`}>
          {catalogCount} {catalogCount === 1 ? 'Catalog' : 'Catalogs'}
        </div>
        <span className={`font-display text-2xl md:text-3xl uppercase tracking-tighter font-black leading-tight group-hover:scale-105 transform origin-left transition duration-300 ${theme.text}`}>
          {category.name}
        </span>
        {category.description && (
          <p className={`text-[11px] leading-relaxed font-sans mt-1.5 line-clamp-2 ${isDark ? 'text-white/60' : 'text-black/65'}`}>
            {category.description}
          </p>
        )}

        <div className={`flex items-center gap-1.5 mt-4 ${theme.text} opacity-0 group-hover:opacity-100 transition-all duration-300 text-xs font-black uppercase tracking-wider`}>
          <span>Browse</span>
          <ArrowRight size={12} />
        </div>

        <div className={`h-1.5 ${isDark ? 'bg-white/25' : 'bg-[#FF3F6C]/25'} w-0 group-hover:w-full transition-all duration-300 mt-3 rounded-full`} />
      </div>
    </motion.div>
  );
};

export default CatalogCategoryTile;
