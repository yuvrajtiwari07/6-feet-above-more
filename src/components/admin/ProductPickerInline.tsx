import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import { Search, Filter, Check, X, Plus } from 'lucide-react';

interface Props {
  products: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onImportNewProduct: () => void;
}

export const ProductPickerInline: React.FC<Props> = ({
  products,
  selectedIds,
  onChange,
  onImportNewProduct,
}) => {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [selectedFilterOnly, setSelectedFilterOnly] = useState(false);

  // Derive unique brands and segments for filters
  const brands = useMemo(() => {
    const bSet = new Set<string>();
    products.forEach(p => {
      if (p.brand) bSet.add(p.brand);
    });
    return Array.from(bSet).sort();
  }, [products]);

  const segments = useMemo(() => {
    const sSet = new Set<string>();
    products.forEach(p => {
      if (p.productSegment) sSet.add(p.productSegment);
    });
    return Array.from(sSet).sort();
  }, [products]);

  // Filtered product list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search check
      const query = search.toLowerCase();
      const matchSearch =
        p.title.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query);

      // Segment filter check
      const matchSegment = !segmentFilter || p.productSegment === segmentFilter;

      // Brand filter check
      const matchBrand = !brandFilter || p.brand === brandFilter;

      // Selection filter check
      const matchSelection = !selectedFilterOnly || selectedIds.includes(p.id);

      return matchSearch && matchSegment && matchBrand && matchSelection;
    });
  }, [products, search, segmentFilter, brandFilter, selectedFilterOnly, selectedIds]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const removeSelected = (id: string) => {
    onChange(selectedIds.filter(x => x !== id));
  };

  const selectedProducts = useMemo(() => {
    return selectedIds
      .map(id => products.find(p => p.id === id))
      .filter(Boolean) as Product[];
  }, [selectedIds, products]);

  return (
    <div className="border border-black/10 rounded-2xl p-4 bg-black/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <label className="text-xs font-black uppercase tracking-wider text-black/50">
          Selected Products ({selectedIds.length})
        </label>
        <button
          type="button"
          onClick={onImportNewProduct}
          className="flex items-center gap-1 text-[10px] font-black uppercase bg-[#7D2AE8] hover:bg-[#6820C4] text-white px-2.5 py-1.5 rounded-lg border border-black/10 transition"
        >
          <Plus size={10} />
          Import New Product
        </button>
      </div>

      {/* Selected Chips */}
      {selectedProducts.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-white border border-black/5 rounded-xl max-h-32 overflow-y-auto">
          {selectedProducts.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-[#7D2AE8]/10 text-[#7D2AE8] border border-[#7D2AE8]/20 px-2 py-1 rounded-lg text-[10px] font-bold"
            >
              {p.images?.[0] && (
                <img
                  src={p.images[0]}
                  alt=""
                  className="w-4 h-4 rounded object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <span className="truncate max-w-[120px]">{p.brand} - {p.title}</span>
              <button
                type="button"
                onClick={() => removeSelected(p.id)}
                className="hover:bg-[#7D2AE8]/20 p-0.5 rounded transition"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-black/40 uppercase mb-4 italic">
          No products selected yet. Search and check items below.
        </div>
      )}

      <hr className="border-black/5 my-3" />

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30" />
          <input
            type="text"
            placeholder="Search brand or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-2 py-2 border border-black/10 rounded-xl text-xs bg-white focus:ring-1 focus:ring-[#7D2AE8] outline-none"
          />
        </div>

        <div>
          <select
            value={segmentFilter}
            onChange={e => setSegmentFilter(e.target.value)}
            className="w-full px-2.5 py-2 border border-black/10 rounded-xl text-xs bg-white focus:ring-1 focus:ring-[#7D2AE8] outline-none"
          >
            <option value="">All Segments</option>
            {segments.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="w-full px-2.5 py-2 border border-black/10 rounded-xl text-xs bg-white focus:ring-1 focus:ring-[#7D2AE8] outline-none"
          >
            <option value="">All Brands</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <label className="flex items-center gap-2 text-xs font-bold text-black/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedFilterOnly}
              onChange={e => setSelectedFilterOnly(e.target.checked)}
              className="rounded border-black/10 text-[#7D2AE8] focus:ring-[#7D2AE8]"
            />
            Selected Only
          </label>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1">
        {filteredProducts.map(p => {
          const isChecked = selectedIds.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => toggleSelect(p.id)}
              className={`cursor-pointer group relative border rounded-xl overflow-hidden bg-white p-2 flex flex-col justify-between transition-all ${
                isChecked
                  ? 'border-[#7D2AE8] ring-1 ring-[#7D2AE8]'
                  : 'border-black/10 hover:border-black/35'
              }`}
            >
              {/* Product preview */}
              <div className="flex gap-2">
                <div className="w-10 h-12 bg-black/5 rounded overflow-hidden shrink-0 relative">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  {isChecked && (
                    <div className="absolute inset-0 bg-[#7D2AE8]/60 flex items-center justify-center">
                      <Check size={14} className="text-white font-black" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase text-black/40 truncate">{p.brand}</div>
                  <div className="text-[10px] font-bold text-black truncate leading-tight">{p.title}</div>
                  <div className="text-[10px] font-black text-black/70 mt-1">₹{p.priceAtRetailer}</div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-6 text-[10px] text-black/30 font-bold uppercase">
            No matching products found
          </div>
        )}
      </div>
    </div>
  );
};
