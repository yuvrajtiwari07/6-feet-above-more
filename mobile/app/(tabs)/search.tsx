import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ScrollView, Dimensions } from 'react-native';
import { Search as SearchIcon, X, Filter, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useApp } from '../../lib/context/AppContext';
import { ProductCard, ProductCardSkeleton } from '../../components/product/ProductCard';
import { GridDensitySelector } from '../../components/layout/GridDensitySelector';
import { getProductRecommendation, isPositiveRecommendation } from '../../lib/utils/fitEngine';
import { Header } from '../../components/layout/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 24;
const OCCASIONS = ['All','Office','College','Casual','Travel','Vacation','Wedding','Date Night','Festive','Gym'];
const HEIGHT_OPTIONS = ["6'0","6'1","6'2","6'3","6'4","6'5","6'6+"];

export default function SearchScreen() {
  const { height, bodyType, setHeight, cardSize, products, loadingProducts, isWellness } = useApp();

  const [query, setQuery]                       = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [selectedBrand, setSelectedBrand]       = useState('All');
  const [selectedSeason, setSelectedSeason]     = useState('All');
  const [selectedConcern, setSelectedConcern]   = useState('All');
  const [selectedForm, setSelectedForm]         = useState('All');
  const [filtersOpen, setFiltersOpen]           = useState(false);
  const [visibleCount, setVisibleCount]         = useState(PAGE_SIZE);

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.category)))], [products]);
  const brands     = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.brand)))], [products]);
  const concerns   = useMemo(() => ['All', ...Array.from(new Set(products.flatMap(p => p.concerns ?? []).filter(Boolean)))], [products]);
  const forms      = useMemo(() => ['All', ...Array.from(new Set(products.map(p => p.form).filter(Boolean) as string[]))], [products]);

  const filteredProducts = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter(p => {
      if (p.outOfStock) return false;
      if (q && !p.title.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)
          && !p.category.toLowerCase().includes(q)
          && !(p.keyIngredients ?? []).some(i => i.toLowerCase().includes(q))
          && !(p.concerns ?? []).some(c => c.toLowerCase().includes(q))) return false;
      if (selectedCategory !== 'All' && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) return false;
      if (isWellness) {
        if (selectedConcern !== 'All' && !(p.concerns ?? []).includes(selectedConcern)) return false;
        if (selectedForm !== 'All' && p.form !== selectedForm) return false;
        return true;
      }
      if (selectedOccasion !== 'All' && !p.occasions.includes(selectedOccasion)) return false;
      if (selectedSeason !== 'All' && !p.seasons.includes(selectedSeason)) return false;
      return true;
    }).sort((a, b) => {
      if (isWellness) return 0;
      const ra = getProductRecommendation(a.verdicts, height, bodyType);
      const rb = getProductRecommendation(b.verdicts, height, bodyType);
      const sa = ra?.fitRecommendation.includes('Highly') ? 2 : ra && isPositiveRecommendation(ra.fitRecommendation) ? 1 : 0;
      const sb = rb?.fitRecommendation.includes('Highly') ? 2 : rb && isPositiveRecommendation(rb.fitRecommendation) ? 1 : 0;
      return sb - sa;
    });
  }, [query, selectedCategory, selectedOccasion, selectedBrand, selectedSeason, selectedConcern,
      selectedForm, height, bodyType, products, isWellness]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const numCols = cardSize === 'small' ? 3 : cardSize === 'large' ? 1 : 2;
  const cardW   = cardSize === 'large' ? SCREEN_WIDTH - 32 : cardSize === 'small' ? (SCREEN_WIDTH - 40) / 3 : (SCREEN_WIDTH - 40) / 2;

  const handleReset = () => {
    setQuery(''); setSelectedCategory('All'); setSelectedOccasion('All');
    setSelectedBrand('All'); setSelectedSeason('All');
    setSelectedConcern('All'); setSelectedForm('All'); setVisibleCount(PAGE_SIZE);
  };
  const onEndReached = useCallback(() => {
    if (visibleCount < filteredProducts.length) setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredProducts.length));
  }, [visibleCount, filteredProducts.length]);

  const renderProduct = useCallback(({ item }: { item: (typeof visibleProducts)[0] }) => (
    <View style={{ width: cardW, marginBottom: 10 }}>
      <ProductCard product={item} cardWidth={cardW} />
    </View>
  ), [cardW]);

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} className={`px-3 py-1.5 rounded-lg mr-1.5 mb-1.5 ${active ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
      <Text className={`text-[11px] font-bold uppercase tracking-wide ${active ? 'text-white' : 'text-[#112133]/70'}`}>{label}</Text>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-[#F9F8F6]">
      <Header />

      {/* Search bar + filter toggle */}
      <View className="px-4 pt-3 pb-2 bg-white border-b border-black/10">
        <View className="flex-row items-center bg-[#112133]/5 rounded-xl px-3 py-2.5 gap-2 mb-2">
          <SearchIcon size={16} color="#112133" />
          <TextInput
            value={query}
            onChangeText={t => { setQuery(t); setVisibleCount(PAGE_SIZE); }}
            placeholder={isWellness ? 'Search products, brands, ingredients...' : 'Search brand, category, style...'}
            placeholderTextColor="#11213360"
            className="flex-1 text-sm text-[#112133] font-medium"
          />
          {query.length > 0 && <Pressable onPress={() => setQuery('')}><X size={15} color="#112133" /></Pressable>}
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-[#112133]/60 font-bold">
            {loadingProducts
              ? 'Loading...'
              : `${Math.min(visibleCount, filteredProducts.length)} of ${filteredProducts.length} ${isWellness ? 'products' : 'garments'}`}
          </Text>
          <View className="flex-row items-center gap-2">
            <GridDensitySelector />
            <Pressable onPress={() => setFiltersOpen(v => !v)} className="flex-row items-center gap-1.5 bg-[#112133]/5 px-3 py-2 rounded-lg">
              <Filter size={13} color="#112133" />
              <Text className="text-xs font-bold text-[#112133] uppercase">Filters</Text>
              {filtersOpen ? <ChevronUp size={13} color="#112133" /> : <ChevronDown size={13} color="#112133" />}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Filter panel */}
      {filtersOpen && (
        <View className="bg-white border-b border-black/10 px-4 py-4 gap-3">
          {!isWellness && (
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-2">Height</Text>
              <View className="flex-row flex-wrap gap-1.5">
                {HEIGHT_OPTIONS.map(h => (
                  <Pressable key={h} onPress={() => setHeight(h)} className={`px-3 py-1.5 rounded-lg ${h === height ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
                    <Text className={`text-xs font-bold ${h === height ? 'text-white' : 'text-[#112133]/70'}`}>{h}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {isWellness && (
            <>
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-[#0E7C5A] mb-2">Concern</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row">{concerns.map(c => <Chip key={c} label={c} active={selectedConcern === c} onPress={() => { setSelectedConcern(c); setVisibleCount(PAGE_SIZE); }} />)}</View>
                </ScrollView>
              </View>
              {forms.length > 1 && (
                <View>
                  <Text className="text-[10px] font-black uppercase tracking-widest text-[#0E7C5A] mb-2">Form</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row">{forms.map(f => <Chip key={f} label={f} active={selectedForm === f} onPress={() => { setSelectedForm(f); setVisibleCount(PAGE_SIZE); }} />)}</View>
                  </ScrollView>
                </View>
              )}
            </>
          )}
          <View>
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">{categories.map(c => <Chip key={c} label={c} active={selectedCategory === c} onPress={() => { setSelectedCategory(c); setVisibleCount(PAGE_SIZE); }} />)}</View>
            </ScrollView>
          </View>
          {!isWellness && (
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">Occasion</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">{OCCASIONS.map(o => <Chip key={o} label={o} active={selectedOccasion === o} onPress={() => { setSelectedOccasion(o); setVisibleCount(PAGE_SIZE); }} />)}</View>
              </ScrollView>
            </View>
          )}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50">Brand</Text>
              <Pressable onPress={handleReset}><Text className="text-[10px] font-bold text-[#7D2AE8] uppercase">Reset All</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row">{brands.map(b => <Chip key={b} label={b} active={selectedBrand === b} onPress={() => { setSelectedBrand(b); setVisibleCount(PAGE_SIZE); }} />)}</View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Results */}
      {loadingProducts ? (
        <View className="flex-row flex-wrap gap-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => <View key={i} style={{ width: cardW }}><ProductCardSkeleton size={cardSize} /></View>)}
        </View>
      ) : filteredProducts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <X size={32} color="#FF3E90" />
          <Text className="text-[#112133] font-black text-xl uppercase tracking-wider mt-4 mb-2">
            {isWellness ? 'Nothing matched' : 'No specs matched'}
          </Text>
          <Text className="text-[#112133]/60 text-xs text-center leading-relaxed mb-6">
            {isWellness ? 'Try another concern, or reset the filters.' : 'Try resetting filters.'}
          </Text>
          <Pressable onPress={handleReset} className="bg-[#7D2AE8] px-6 py-3 rounded-lg">
            <Text className="text-white font-black text-xs uppercase tracking-wider">Clear Filters</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleProducts}
          keyExtractor={item => item.id}
          numColumns={numCols}
          key={numCols}
          renderItem={renderProduct}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={numCols > 1 ? { gap: 8 } : undefined}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
