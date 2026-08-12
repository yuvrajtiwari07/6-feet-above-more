import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { ProductCard, ProductCardSkeleton } from '../../components/product/ProductCard';
import { getProductRecommendation, isPositiveRecommendation } from '../../lib/utils/fitEngine';
import { getWellnessCategory } from '../../lib/data/wellness';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_SIZE = 24;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  'Streetwear': { bg: '#0F0F10', text: '#fff',    accent: '#FFD43B' },
  'Formals':    { bg: '#112133', text: '#fff',    accent: '#FFD43B' },
  'Ethnic Wear':{ bg: '#FFD43B', text: '#000',    accent: '#7D2AE8' },
  'Summer':     { bg: '#00AFB9', text: '#fff',    accent: '#fff'    },
  'Winter':     { bg: '#1a2a4a', text: '#fff',    accent: '#FFD43B' },
};

export default function CategoryScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { products, height, bodyType, cardSize, loadingProducts, isWellness } = useApp();
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [visibleCount, setVisibleCount]   = useState(PAGE_SIZE);

  const decodedName = decodeURIComponent(name ?? '');
  const wellnessCat = getWellnessCategory(decodedName);
  const theme = wellnessCat
    ? { bg: wellnessCat.bg, text: wellnessCat.text, accent: wellnessCat.accent }
    : CATEGORY_COLORS[decodedName] ?? { bg: '#112133', text: '#fff', accent: '#FFD43B' };

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (p.outOfStock) return false;
      if (p.category?.toLowerCase() !== decodedName.toLowerCase()) return false;
      if (selectedBrand !== 'All' && p.brand !== selectedBrand) return false;
      return true;
    }).sort((a, b) => {
      if (isWellness) return 0; // no fit verdicts to rank by
      const ra = getProductRecommendation(a.verdicts, height, bodyType);
      const rb = getProductRecommendation(b.verdicts, height, bodyType);
      const sa = ra?.fitRecommendation.includes('Highly') ? 2 : ra && isPositiveRecommendation(ra.fitRecommendation) ? 1 : 0;
      const sb = rb?.fitRecommendation.includes('Highly') ? 2 : rb && isPositiveRecommendation(rb.fitRecommendation) ? 1 : 0;
      return sb - sa;
    });
  }, [products, decodedName, selectedBrand, height, bodyType, isWellness]);

  const brands = useMemo(() => ['All', ...Array.from(new Set(
    products.filter(p => p.category?.toLowerCase() === decodedName.toLowerCase()).map(p => p.brand)
  ))], [products, decodedName]);

  const visible = filtered.slice(0, visibleCount);
  const numCols = cardSize === 'small' ? 3 : cardSize === 'large' ? 1 : 2;
  const cardW   = cardSize === 'large' ? SCREEN_WIDTH - 32 : cardSize === 'small' ? (SCREEN_WIDTH - 40) / 3 : (SCREEN_WIDTH - 40) / 2;

  const onEndReached = useCallback(() => {
    if (visibleCount < filtered.length) setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filtered.length));
  }, [visibleCount, filtered.length]);

  const renderItem = useCallback(({ item }: { item: typeof products[0] }) => (
    <View style={{ width: cardW, marginBottom: 10 }}>
      <ProductCard product={item} cardWidth={cardW} />
    </View>
  ), [cardW]);

  const ListHeader = () => (
    <>
      {/* Category hero */}
      <View style={{ backgroundColor: theme.bg }} className="mx-4 mt-4 rounded-3xl p-6 mb-5">
        <Text className="font-black text-3xl uppercase tracking-tight mb-1" style={{ color: theme.text }}>
          {decodedName}
        </Text>
        <Text className="text-xs font-bold" style={{ color: theme.accent }}>
          {isWellness
            ? `${filtered.length} products · open to everyone`
            : `${filtered.length} garments · sorted by fit for ${height}`}
        </Text>
        {wellnessCat && (
          <Text className="text-[11px] mt-2 leading-relaxed" style={{ color: theme.text, opacity: 0.7 }}>
            {wellnessCat.desc}
          </Text>
        )}
      </View>

      {/* Brand filter chips */}
      {brands.length > 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-4">
          <View className="flex-row gap-2">
            {brands.map(b => (
              <Pressable key={b}
                onPress={() => { setSelectedBrand(b); setVisibleCount(PAGE_SIZE); }}
                className={`px-3 py-1.5 rounded-xl border ${selectedBrand === b ? 'bg-[#7D2AE8] border-[#7D2AE8]' : 'border-black/10 bg-white'}`}>
                <Text className={`text-xs font-black uppercase tracking-wide ${selectedBrand === b ? 'text-white' : 'text-[#112133]/70'}`}>{b}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </>
  );

  if (loadingProducts) {
    return (
      <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 px-4 py-3">
          <ArrowLeft size={20} color="#112133" />
          <Text className="text-sm font-black uppercase text-[#112133]">Back</Text>
        </Pressable>
        <View className="flex-row flex-wrap gap-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => <View key={i} style={{ width: cardW }}><ProductCardSkeleton size={cardSize} /></View>)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      {/* Back bar */}
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => item.id}
        numColumns={numCols}
        key={numCols}
        renderItem={renderItem}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        columnWrapperStyle={numCols > 1 ? { gap: 8 } : undefined}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16 px-8">
            <Text className="text-[#112133] font-black text-lg uppercase tracking-wider mb-2">Nothing here yet</Text>
            <Text className="text-[#112133]/50 text-xs text-center">
              {isWellness ? 'This aisle is still being stocked.' : 'Products in this category are coming soon.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
