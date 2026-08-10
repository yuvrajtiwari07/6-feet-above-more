import React from 'react';
import { View, Text, FlatList, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Heart, Sparkles, Shirt } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { ProductCard } from '../../components/product/ProductCard';
import { COMPLETE_FITS } from '../../lib/utils/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SavedScreen() {
  const { products, savedProductIds, savedFitIds, cardSize } = useApp();
  const savedProducts = products.filter(p => savedProductIds.includes(p.id));
  const savedFits = COMPLETE_FITS.filter(f => savedFitIds.includes(f.id));
  const numCols = cardSize === 'small' ? 3 : cardSize === 'large' ? 1 : 2;
  const cardW   = cardSize === 'large' ? SCREEN_WIDTH - 32 : cardSize === 'small' ? (SCREEN_WIDTH - 40) / 3 : (SCREEN_WIDTH - 40) / 2;
  const countTotal = savedProducts.length + savedFits.length;

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top']}>
      <View className="px-4 pt-4 pb-3 bg-white border-b border-black/10">
        <Text className="text-2xl font-black text-[#112133] uppercase tracking-tight">Saved</Text>
        <Text className="text-xs text-[#112133]/50 mt-0.5">{countTotal} items saved</Text>
      </View>

      {countTotal === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Heart size={48} color="#FFD43B" />
          <Text className="text-[#112133] font-black text-xl uppercase tracking-wider mt-4 mb-2">Nothing saved yet</Text>
          <Text className="text-[#112133]/60 text-xs text-center mb-6">Tap the heart on any product or lookbook to save it here.</Text>
          <View className="flex-row gap-3">
            <Pressable onPress={() => router.push('/(tabs)/search')} className="bg-[#7D2AE8] px-6 py-3 rounded-xl">
              <Text className="text-white font-black text-xs uppercase tracking-wider">Browse Products</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/complete-fits')} className="bg-[#112133]/5 px-6 py-3 rounded-xl">
              <Text className="text-[#112133] font-black text-xs uppercase tracking-wider">Browse Lookbooks</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          data={savedProducts}
          keyExtractor={item => item.id}
          numColumns={numCols}
          key={numCols}
          renderItem={({ item }) => (
            <View style={{ width: cardW, marginBottom: 10 }}>
              <ProductCard product={item} cardWidth={cardW} />
            </View>
          )}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={numCols > 1 ? { gap: 8 } : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            savedFits.length > 0 ? (
              <View className="mb-5">
                <View className="flex-row items-center gap-1.5 mb-3">
                  <Sparkles size={12} color="#7D2AE8" />
                  <Text className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest">
                    Saved Lookbooks ({savedFits.length})
                  </Text>
                </View>
                {savedFits.map(fit => (
                  <Pressable key={fit.id} onPress={() => router.push('/complete-fits')}
                    className="bg-white rounded-2xl p-4 mb-2 border border-black/5 flex-row items-center gap-3">
                    {fit.items[0] && (() => {
                      const p = products.find(pr => pr.id === fit.items[0].productId);
                      return p?.images?.[0] ? (
                        <Image source={p.images[0]} style={{ width: 48, height: 56, borderRadius: 10 }} contentFit="cover" />
                      ) : null;
                    })()}
                    <View className="flex-1">
                      <Text className="text-sm font-black text-[#112133]" numberOfLines={1}>{fit.title}</Text>
                      <Text className="text-[10px] text-[#7D2AE8] font-bold uppercase mt-0.5">{fit.theme}</Text>
                    </View>
                  </Pressable>
                ))}
                {savedProducts.length > 0 && (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Shirt size={12} color="#7D2AE8" />
                    <Text className="text-[10px] text-[#112133]/50 font-black uppercase tracking-widest">
                      Saved Items ({savedProducts.length})
                    </Text>
                  </View>
                )}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
