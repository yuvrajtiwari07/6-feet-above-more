import React from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { Header } from '../../components/layout/Header';
import { Image } from 'expo-image';
import { Sparkles, LayoutGrid, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 12;
const TILE_W = (SCREEN_WIDTH - 16 * 2 - GAP) / 2;

const TILE_THEMES = [
  { bg: '#0F0F10', text: '#fff', accent: '#FFCC00' },
  { bg: '#FFD43B', text: '#000', accent: '#000' },
  { bg: '#7D2AE8', text: '#fff', accent: '#FFCC00' },
  { bg: '#00AFB9', text: '#fff', accent: '#fff' },
  { bg: '#112133', text: '#fff', accent: '#FFD43B' },
  { bg: '#FFFFFF', text: '#112133', accent: '#D5A021' },
];

export default function CatalogsScreen() {
  const { catalogCategories, catalogs, loadingCatalogs, isWellness } = useApp();
  const activeCategories = catalogCategories.filter(c => c.isActive);

  const countForCategory = (name: string) =>
    catalogs.filter(c => c.categoryName === name && c.isPublished).length;

  return (
    <View className="flex-1 bg-[#F9F8F6]">
      <Header />
      <View className="px-4 pt-4 pb-4" style={{ backgroundColor: isWellness ? '#0E2A21' : '#0F0F10' }}>
        <View className="flex-row items-center gap-1.5 mb-1">
          <Sparkles size={14} color={isWellness ? '#7BE3B4' : '#FFCC00'} />
          <Text
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: isWellness ? '#7BE3B4' : '#FFCC00' }}
          >
            Curated Collections
          </Text>
        </View>
        <Text className="text-3xl font-black text-white uppercase tracking-tight">Catalogs</Text>
        <Text className="text-xs text-white/50 mt-1">
          {isWellness ? 'Routines and stacks, bundled.' : 'Multiple products, one perfect style story.'}
        </Text>
      </View>

      {loadingCatalogs ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7D2AE8" />
        </View>
      ) : activeCategories.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <LayoutGrid size={48} color="#11213330" />
          <Text className="text-[#112133]/30 font-black text-xl uppercase tracking-wider mt-4 mb-2">No categories yet</Text>
          <Text className="text-[#112133]/40 text-xs text-center">Check back soon — curated collections are coming.</Text>
        </View>
      ) : (
        <FlatList
          data={activeCategories}
          keyExtractor={c => c.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16 }}
          columnWrapperStyle={{ gap: GAP }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: cat, index }) => {
            const theme = TILE_THEMES[index % TILE_THEMES.length];
            const count = countForCategory(cat.name);
            return (
              <Pressable
                onPress={() => router.push(`/catalog-category/${encodeURIComponent(cat.name)}`)}
                style={{ width: TILE_W, aspectRatio: 3 / 4, backgroundColor: theme.bg, marginBottom: GAP }}
                className="rounded-2xl overflow-hidden border-2 border-black justify-end p-4"
              >
                {!!cat.coverImage && (
                  <Image source={cat.coverImage} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.25 }} contentFit="cover" />
                )}
                <Text style={{ color: theme.accent }} className="text-[10px] font-black uppercase tracking-widest mb-1">
                  {count} {count === 1 ? 'Catalog' : 'Catalogs'}
                </Text>
                <Text style={{ color: theme.text }} className="text-lg font-black uppercase tracking-tight leading-tight" numberOfLines={2}>
                  {cat.name}
                </Text>
                <View className="flex-row items-center gap-1 mt-2">
                  <Text style={{ color: theme.text }} className="text-[10px] font-black uppercase tracking-wider opacity-70">Browse</Text>
                  <ArrowRight size={11} color={theme.text} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
