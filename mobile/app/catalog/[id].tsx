import React from 'react';
import { View, Text, Pressable, ScrollView, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { ProductCard } from '../../components/product/ProductCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CatalogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { catalogs, products, cardSize } = useApp();

  const catalog = catalogs?.find((c: any) => c.id === id);
  const numCols = cardSize === 'small' ? 3 : cardSize === 'large' ? 1 : 2;
  const cardW   = cardSize === 'large' ? SCREEN_WIDTH - 32 : cardSize === 'small' ? (SCREEN_WIDTH - 40) / 3 : (SCREEN_WIDTH - 40) / 2;

  if (!catalog) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-[#112133] font-bold">Catalog not found</Text>
        <Pressable onPress={() => router.back()} className="mt-4 bg-[#7D2AE8] px-6 py-3 rounded-xl">
          <Text className="text-white font-black text-xs uppercase">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const catalogProducts = catalog.productIds
    .map(pid => products.find(pr => pr.id === pid))
    .filter(Boolean) as typeof products;

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top']}>
      {/* Back bar */}
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
      </View>

      <FlatList
        data={catalogProducts}
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
          <View className="mb-5">
            {/* Cover image */}
            {catalog.coverImage && (
              <View className="h-56 rounded-3xl overflow-hidden mb-4">
                <Image source={catalog.coverImage} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            )}
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-1">
              {catalog.categoryName ?? 'Catalog'}
            </Text>
            <Text className="text-2xl font-black text-[#112133] uppercase tracking-tight mb-2">
              {catalog.title}
            </Text>
            {catalog.description && (
              <Text className="text-xs text-[#112133]/60 leading-relaxed mb-3">{catalog.description}</Text>
            )}
            <Text className="text-xs font-black text-[#112133]/40 uppercase tracking-widest mb-4">
              {catalogProducts.length} garments
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-[#112133] font-black text-lg uppercase mb-2">No products yet</Text>
            <Text className="text-[#112133]/50 text-xs text-center">Products will appear here when added.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
