import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ArrowLeft, Plus, Pencil, Trash2, Package } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../lib/context/AppContext';
import { useApp } from '../../lib/context/AppContext';
import { Catalog } from '../../lib/types';

export default function CatalogsAdminScreen() {
  const { deleteCatalog } = useApp();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/catalogs/admin');
      setCatalogs(data.catalogs ?? []);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to load catalogs');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (c: Catalog) => {
    Alert.alert('Delete catalog', `Delete "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCatalog(c.id); await load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="text-sm font-black uppercase text-[#112133]">Catalogs</Text>
        <Pressable onPress={() => router.push('/admin/catalog-form')} className="flex-row items-center gap-1.5 bg-[#7D2AE8] px-3 py-2 rounded-xl">
          <Plus size={13} color="#fff" />
          <Text className="text-[11px] font-black uppercase text-white">Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#7D2AE8" /></View>
      ) : (
        <FlatList
          data={catalogs}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          onRefresh={load}
          refreshing={loading}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Package size={40} color="#11213330" />
              <Text className="text-[#112133]/40 text-xs font-bold uppercase mt-3">No catalogs yet</Text>
            </View>
          }
          renderItem={({ item: c }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-black/5">
              <View className="flex-row items-center gap-3">
                {c.coverImage ? (
                  <Image source={c.coverImage} style={{ width: 48, height: 48, borderRadius: 12 }} contentFit="cover" />
                ) : (
                  <View className="w-12 h-12 rounded-xl bg-[#112133]/5 items-center justify-center">
                    <Package size={18} color="#11213340" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-sm font-black text-[#112133]" numberOfLines={1}>{c.title}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-[10px] text-[#7D2AE8] font-bold uppercase">{c.categoryName}</Text>
                    <View className={`px-1.5 py-0.5 rounded ${c.isPublished ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <Text className={`text-[8px] font-black uppercase ${c.isPublished ? 'text-green-600' : 'text-yellow-600'}`}>
                        {c.isPublished ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                    <Text className="text-[10px] text-[#112133]/40">{c.productIds.length} items</Text>
                  </View>
                </View>
                <Pressable onPress={() => router.push(`/admin/catalog-form?id=${c.id}`)} className="w-8 h-8 bg-[#112133]/5 rounded-xl items-center justify-center">
                  <Pencil size={13} color="#112133" />
                </Pressable>
                <Pressable onPress={() => handleDelete(c)} className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center">
                  <Trash2 size={13} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
