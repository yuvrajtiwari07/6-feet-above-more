import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Layers, ChevronDown, ChevronUp, ExternalLink, Heart } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useApp } from '../lib/context/AppContext';
import { getProductRecommendation, isPositiveRecommendation } from '../lib/utils/fitEngine';
import { COMPLETE_FITS } from '../lib/utils/mockData';

type FitData = {
  id: string;
  name: string;
  occasion: string;
  stylingNotes?: string;
  productIds: string[];
};

export default function CompleteFitsScreen() {
  const { products, height, bodyType, savedFitIds, toggleSaveFit } = useApp();
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Complete Fits are curated lookbooks (not DB-backed on web either — see
  // src/pages/CompleteFits.tsx / src/data/mockData.ts). Products referenced
  // by id are resolved against the real, DB-backed product list.
  const fits: FitData[] = useMemo(() => (
    COMPLETE_FITS.map(fit => ({
      id: fit.id,
      name: fit.title,
      occasion: fit.theme,
      stylingNotes: fit.stylingNotes,
      productIds: fit.items.map(item => item.productId),
    }))
  ), []);

  const OCCASIONS = useMemo(() => ['All', ...Array.from(new Set(fits.map(f => f.occasion)))], [fits]);

  const filtered = selectedOccasion === 'All' ? fits : fits.filter(f => f.occasion === selectedOccasion);

  const FitCard = ({ fit }: { fit: FitData }) => {
    const isOpen = expandedId === fit.id;
    const isSaved = savedFitIds.includes(fit.id);
    const fitProducts = products.filter(p => fit.productIds.includes(p.id));
    const thumbs = fitProducts.slice(0, 3);

    return (
      <View className="bg-white rounded-3xl overflow-hidden border border-black/5 mb-4">
        {/* Collapsed header */}
        <Pressable onPress={() => setExpandedId(isOpen ? null : fit.id)}
          className="flex-row items-center gap-3 p-4">
          {/* Thumbnail stack */}
          <View className="flex-row" style={{ width: 80 }}>
            {thumbs.map((p, i) => (
              <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -18, zIndex: thumbs.length - i }}
                className="w-12 h-14 rounded-xl overflow-hidden border-2 border-white">
                <Image source={p.images?.[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            ))}
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-[#112133] uppercase tracking-tight">{fit.name}</Text>
            <Text className="text-xs text-[#7D2AE8] font-bold uppercase tracking-widest">{fit.occasion}</Text>
            <Text className="text-[10px] text-[#112133]/40 mt-0.5">{fitProducts.length} pieces</Text>
          </View>
          <Pressable onPress={() => toggleSaveFit(fit.id)} hitSlop={8} className="p-1">
            <Heart size={18} color={isSaved ? '#FF3E90' : '#112133'} fill={isSaved ? '#FF3E90' : 'transparent'} />
          </Pressable>
          {isOpen ? <ChevronUp size={16} color="#112133" /> : <ChevronDown size={16} color="#112133" />}
        </Pressable>

        {/* Expanded products */}
        {isOpen && (
          <View className="px-4 pb-4 border-t border-black/5 pt-3">
            {fit.stylingNotes && (
              <Text className="text-xs text-[#112133]/60 leading-relaxed mb-3">{fit.stylingNotes}</Text>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {fitProducts.map(p => {
                  const rec = getProductRecommendation(p.verdicts, height, bodyType);
                  const positive = rec && isPositiveRecommendation(rec.fitRecommendation);
                  return (
                    <Pressable key={p.id} onPress={() => router.push(`/product/${p.id}`)}
                      className="w-32">
                      <View className="w-32 h-40 rounded-2xl overflow-hidden bg-[#F0EEE8] mb-2">
                        <Image source={p.images?.[0]} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        {positive && (
                          <View className="absolute top-2 left-2 bg-[#FFD43B] px-1.5 py-0.5 rounded-full">
                            <Text className="text-[8px] font-black text-black">Fit ✓</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs font-black text-[#112133] leading-tight" numberOfLines={1}>{p.title}</Text>
                      <Text className="text-[10px] text-[#112133]/50 font-bold">{p.brand}</Text>
                      {!!p.priceAtRetailer && <Text className="text-xs font-black text-[#7D2AE8] mt-0.5">₹{p.priceAtRetailer.toLocaleString('en-IN')}</Text>}
                      {!!p.affiliateUrl && (
                        <Pressable onPress={() => Linking.openURL(p.affiliateUrl)}
                          className="flex-row items-center gap-1 mt-1.5 bg-[#112133]/5 px-2 py-1.5 rounded-lg">
                          <ExternalLink size={9} color="#112133" />
                          <Text className="text-[9px] font-black uppercase text-[#112133]">Shop</Text>
                        </Pressable>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={20} color="#112133" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-2xl font-black text-[#112133] uppercase tracking-tight">Complete Fits</Text>
          <Text className="text-xs text-[#112133]/50 mt-0.5">Full outfit combos tailored for your height</Text>
        </View>
      </View>

      {/* Occasion filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-white border-b border-black/5 px-3 py-3">
        <View className="flex-row gap-2">
          {OCCASIONS.map(occ => (
            <Pressable key={occ} onPress={() => setSelectedOccasion(occ)}
              className={`px-4 py-2 rounded-xl ${selectedOccasion === occ ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
              <Text className={`text-xs font-black uppercase tracking-wide ${selectedOccasion === occ ? 'text-white' : 'text-[#112133]/70'}`}>
                {occ}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Fits list */}
      {filtered.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Layers size={48} color="#FFD43B" />
          <Text className="text-[#112133] font-black text-xl uppercase tracking-wider mt-4 mb-2">No fits yet</Text>
          <Text className="text-[#112133]/60 text-xs text-center">Check back soon as we add curated outfit combos.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <FitCard fit={item} />}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
