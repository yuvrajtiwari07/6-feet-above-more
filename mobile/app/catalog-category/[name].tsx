import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, BookOpen, Package } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';

export default function CatalogListScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const categoryName = decodeURIComponent(name ?? '');
  const { catalogs, products, loadingCatalogs } = useApp();

  const filteredCatalogs = useMemo(
    () => catalogs.filter(c => c.isPublished && c.categoryName === categoryName),
    [catalogs, categoryName]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
      </View>

      {loadingCatalogs ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7D2AE8" />
        </View>
      ) : (
        <FlatList
          data={filteredCatalogs}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View className="mb-5">
              <Text className="text-[10px] font-black uppercase tracking-widest text-[#7D2AE8] mb-1">{categoryName}</Text>
              <Text className="text-2xl font-black text-[#112133] uppercase tracking-tight mb-1">{categoryName} Catalogs</Text>
              <Text className="text-xs text-[#112133]/40 font-bold uppercase tracking-widest">
                {filteredCatalogs.length} {filteredCatalogs.length === 1 ? 'catalog' : 'catalogs'} curated for tall fits
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <BookOpen size={48} color="#11213330" />
              <Text className="text-[#112133] font-black text-lg uppercase mt-4 mb-2">No catalogs here yet</Text>
              <Text className="text-[#112133]/50 text-xs text-center">Check back soon — new catalogs drop regularly.</Text>
            </View>
          }
          renderItem={({ item: catalog }) => {
            const catalogProducts = catalog.productIds
              .map(pid => products.find(p => p.id === pid))
              .filter(Boolean) as typeof products;
            const preview = catalogProducts.slice(0, 4);

            return (
              <Pressable
                onPress={() => router.push(`/catalog/${catalog.id}`)}
                className="bg-white rounded-3xl overflow-hidden border-2 border-black/10 mb-4"
              >
                <View className="h-40 bg-black/5 flex-row">
                  {catalog.coverImage ? (
                    <Image source={catalog.coverImage} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : preview.length > 0 ? (
                    preview.map((p, i) => (
                      <View key={i} style={{ flex: 1 }} className="border-r border-white/50">
                        {p!.images?.[0] ? (
                          <Image source={p!.images[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Package size={18} color="#11213330" />
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Package size={28} color="#11213330" />
                    </View>
                  )}

                  <View className="absolute top-3 left-3 bg-[#FFCC00] px-2.5 py-1 rounded-lg border border-black/15">
                    <Text className="text-[10px] font-black uppercase tracking-wider text-black">
                      {catalog.productIds.length} {catalog.productIds.length === 1 ? 'Item' : 'Items'}
                    </Text>
                  </View>
                </View>

                <View className="p-4">
                  <Text className="font-black text-base text-[#112133]" numberOfLines={1}>{catalog.title}</Text>
                  {!!catalog.description && (
                    <Text className="text-[#112133]/55 text-[11px] leading-relaxed mt-1" numberOfLines={2}>{catalog.description}</Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
