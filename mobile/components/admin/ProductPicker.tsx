import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { Search, X, Plus, Package } from 'lucide-react-native';
import { Product } from '../../lib/types';

interface Props {
  products: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onImportNewProduct?: () => void;
}

export const ProductPicker: React.FC<Props> = ({ products, selectedIds, onChange, onImportNewProduct }) => {
  const [search, setSearch] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const selectedProducts = useMemo(
    () => selectedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[],
    [selectedIds, products]
  );

  const filtered = useMemo(() => {
    let list = products;
    if (showSelectedOnly) list = list.filter(p => selectedIds.includes(p.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return list.slice(0, 60);
  }, [products, search, showSelectedOnly, selectedIds]);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]);
  };

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs font-black uppercase tracking-widest text-[#112133]/50">
          Products ({selectedIds.length})
        </Text>
        {!!onImportNewProduct && (
          <Pressable onPress={onImportNewProduct} className="flex-row items-center gap-1 bg-[#7D2AE8]/10 px-2.5 py-1.5 rounded-lg">
            <Plus size={11} color="#7D2AE8" />
            <Text className="text-[10px] font-black uppercase text-[#7D2AE8]">New Product</Text>
          </Pressable>
        )}
      </View>

      {/* Selected chips */}
      {selectedProducts.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {selectedProducts.map(p => (
            <Pressable key={p.id} onPress={() => toggle(p.id)}
              className="flex-row items-center gap-1.5 bg-[#112133]/5 pl-1 pr-2 py-1 rounded-full">
              {p.images?.[0] ? (
                <Image source={p.images[0]} style={{ width: 20, height: 20, borderRadius: 10 }} contentFit="cover" />
              ) : (
                <View className="w-5 h-5 rounded-full bg-[#112133]/10" />
              )}
              <Text className="text-[10px] font-bold text-[#112133]" numberOfLines={1} style={{ maxWidth: 100 }}>{p.title}</Text>
              <X size={11} color="#112133" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Search + filter */}
      <View className="flex-row items-center gap-2 mb-2">
        <View className="flex-1 flex-row items-center gap-2 bg-white border border-black/10 rounded-lg px-3 py-2.5">
          <Search size={13} color="#11213360" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#11213360"
            className="flex-1 text-xs text-[#112133]"
          />
        </View>
        <Pressable onPress={() => setShowSelectedOnly(v => !v)}
          className={`px-3 py-2.5 rounded-lg ${showSelectedOnly ? 'bg-[#7D2AE8]' : 'bg-white border border-black/10'}`}>
          <Text className={`text-[10px] font-black uppercase ${showSelectedOnly ? 'text-white' : 'text-[#112133]/60'}`}>Selected</Text>
        </Pressable>
      </View>

      {/* Grid list */}
      <View className="border border-black/10 rounded-xl overflow-hidden" style={{ maxHeight: 320 }}>
        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          nestedScrollEnabled
          ListEmptyComponent={
            <View className="items-center py-10">
              <Package size={28} color="#11213330" />
              <Text className="text-[10px] text-[#112133]/40 font-bold uppercase mt-2">No products found</Text>
            </View>
          }
          renderItem={({ item: p }) => {
            const isSelected = selectedIds.includes(p.id);
            return (
              <Pressable onPress={() => toggle(p.id)}
                className={`flex-row items-center gap-3 px-3 py-2.5 border-b border-black/5 ${isSelected ? 'bg-[#7D2AE8]/5' : 'bg-white'}`}>
                {p.images?.[0] ? (
                  <Image source={p.images[0]} style={{ width: 36, height: 36, borderRadius: 8 }} contentFit="cover" />
                ) : (
                  <View className="w-9 h-9 rounded-lg bg-[#112133]/5" />
                )}
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#112133]" numberOfLines={1}>{p.title}</Text>
                  <Text className="text-[10px] text-[#112133]/40" numberOfLines={1}>{p.brand} · ₹{p.priceAtRetailer}</Text>
                </View>
                <View className={`w-5 h-5 rounded-full items-center justify-center ${isSelected ? 'bg-[#7D2AE8]' : 'border border-black/20'}`}>
                  {isSelected && <Text className="text-white text-[10px] font-black">✓</Text>}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
};

export default ProductPicker;
