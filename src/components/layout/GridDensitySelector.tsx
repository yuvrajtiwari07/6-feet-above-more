import React from 'react';
import { useApp } from '../../context/AppContext';
import { Square, Grid, LayoutGrid } from 'lucide-react';

export const GridDensitySelector: React.FC = () => {
  const { cardSize, setCardSize } = useApp();

  const options = [
    {
      value: 'large' as const,
      label: 'Editorial Large',
      icon: Square,
    },
    {
      value: 'medium' as const,
      label: 'Standard Tiles',
      icon: Grid,
    },
    {
      value: 'small' as const,
      label: 'Compact Density',
      icon: LayoutGrid,
    },
  ];

  return (
    <div className="flex items-center gap-1 bg-black/5 p-1 rounded-2xl border border-black/5 w-max">
      <span className="text-[9px] font-black uppercase tracking-widest text-black/40 pl-2 pr-1 select-none hidden md:inline">
        Density Feed:
      </span>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = cardSize === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setCardSize(opt.value)}
            className={`flex items-center gap-1 py-1.5 px-2.5 rounded-xl transition-all duration-300 text-[10px] font-grotesk font-black uppercase tracking-wider ${
              isActive
                ? 'bg-black text-white shadow-sm scale-102 border border-black'
                : 'text-black/50 hover:text-black hover:bg-black/5 border border-transparent'
            }`}
            title={opt.label}
            id={`density-btn-${opt.value}`}
          >
            <Icon size={12} className={isActive ? 'text-[#FFCC00] fill-[#FFCC00]' : ''} />
            <span className="hidden sm:inline">{opt.value === 'small' ? 'Compact' : opt.value === 'medium' ? 'Standard' : 'Large'}</span>
          </button>
        );
      })}
    </div>
  );
};
export default GridDensitySelector;
