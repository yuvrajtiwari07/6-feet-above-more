import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield, Plus, Trash2, Pencil, RefreshCw, LogOut, ArrowLeft,
  UploadCloud, Sparkles, LayoutGrid, Search, ToggleLeft, ToggleRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../lib/context/AppContext';

const STOCK_FILTERS = ['All', 'In stock', 'Out of stock'] as const;

export default function AdminScreen() {
  const { user, logout, allProducts: products, refetchProducts, deleteProduct, updateProduct, isAdmin } = useApp();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<typeof STOCK_FILTERS[number]>('All');

  if (!user || !isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8" edges={['top', 'bottom']}>
        <Shield size={48} color="#EF4444" />
        <Text className="text-2xl font-black text-[#112133] uppercase mt-4 mb-2">Access Denied</Text>
        <Text className="text-xs text-[#112133]/50 text-center mb-6">
          {user ? 'Your account does not have admin privileges.' : 'Please sign in as admin.'}
        </Text>
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-2 bg-[#112133] px-6 py-3 rounded-2xl">
          <ArrowLeft size={14} color="#fff" />
          <Text className="text-white font-black text-xs uppercase">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const filteredProducts = useMemo(() => {
    let list = products;
    if (stockFilter === 'In stock') list = list.filter(p => !p.outOfStock);
    if (stockFilter === 'Out of stock') list = list.filter(p => p.outOfStock);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return list;
  }, [products, search, stockFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try { await refetchProducts(); } finally { setLoading(false); }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete product', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteProduct(id); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleToggleStock = async (id: string, outOfStock: boolean) => {
    try { await updateProduct(id, { outOfStock: !outOfStock }); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>

      {/* Header */}
      <View className="bg-[#0F0F10] px-5 pt-5 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={logout} className="flex-row items-center gap-1.5">
            <LogOut size={14} color="#FF3E90" />
            <Text className="text-[11px] font-black uppercase text-[#FF3E90]">Sign out</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2 mt-2">
          <Shield size={18} color="#FFD43B" />
          <Text className="text-white font-black text-xl uppercase tracking-tight">Admin Panel</Text>
        </View>
        <Text className="text-white/40 text-xs mt-1">{user.email}</Text>

        {/* Stats */}
        <View className="flex-row gap-3 mt-5">
          <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
            <Text className="text-[#FFD43B] font-black text-xl">{products.length}</Text>
            <Text className="text-white/50 text-[10px] font-bold uppercase mt-0.5">Products</Text>
          </View>
          <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
            <Text className="text-[#FFD43B] font-black text-xl">{products.filter(p => p.outOfStock).length}</Text>
            <Text className="text-white/50 text-[10px] font-bold uppercase mt-0.5">Out of stock</Text>
          </View>
          <View className="flex-1 bg-white/5 rounded-2xl p-3 border border-white/10">
            <Text className="text-[#FFD43B] font-black text-xl">{products.filter(p => p.isFeatured).length}</Text>
            <Text className="text-white/50 text-[10px] font-bold uppercase mt-0.5">Featured</Text>
          </View>
        </View>
      </View>

      {/* Quick actions */}
      <View className="flex-row flex-wrap gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.push('/admin/product-form')}
          className="flex-row items-center gap-1.5 bg-[#7D2AE8] px-3 py-2 rounded-xl">
          <Plus size={13} color="#fff" />
          <Text className="text-[11px] font-black uppercase text-white">Add Product</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/admin/bulk-import')}
          className="flex-row items-center gap-1.5 bg-[#112133]/5 px-3 py-2 rounded-xl">
          <UploadCloud size={13} color="#112133" />
          <Text className="text-[11px] font-black uppercase text-[#112133]">Bulk Import</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/admin/catalogs')}
          className="flex-row items-center gap-1.5 bg-[#112133]/5 px-3 py-2 rounded-xl">
          <Sparkles size={13} color="#112133" />
          <Text className="text-[11px] font-black uppercase text-[#112133]">Catalogs</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/admin/catalog-categories')}
          className="flex-row items-center gap-1.5 bg-[#112133]/5 px-3 py-2 rounded-xl">
          <LayoutGrid size={13} color="#112133" />
          <Text className="text-[11px] font-black uppercase text-[#112133]">Categories</Text>
        </Pressable>
      </View>

      {/* Search + stock filter */}
      <View className="px-4 pt-3 pb-2 bg-white">
        <View className="flex-row items-center gap-2 bg-[#F9F8F6] border border-black/10 rounded-xl px-3 py-2.5 mb-2.5">
          <Search size={13} color="#11213360" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor="#11213360"
            className="flex-1 text-xs text-[#112133]"
          />
        </View>
        <View className="flex-row gap-2">
          {STOCK_FILTERS.map(f => (
            <Pressable key={f} onPress={() => setStockFilter(f)}
              className={`px-3 py-1.5 rounded-full ${stockFilter === f ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
              <Text className={`text-[10px] font-black uppercase ${stockFilter === f ? 'text-white' : 'text-[#112133]/60'}`}>{f}</Text>
            </Pressable>
          ))}
          <Pressable onPress={handleRefresh} disabled={loading}
            className="ml-auto flex-row items-center gap-1.5 bg-[#112133]/5 px-3 py-1.5 rounded-full">
            {loading ? <ActivityIndicator size="small" color="#7D2AE8" /> : <RefreshCw size={12} color="#7D2AE8" />}
            <Text className="text-[10px] font-black uppercase text-[#7D2AE8]">Refresh</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
        {filteredProducts.map(p => (
          <View key={p.id} className="bg-white rounded-2xl px-4 py-3 mb-2 border border-black/5 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-black text-[#112133] leading-tight" numberOfLines={1}>{p.title}</Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <Text className="text-[10px] text-[#7D2AE8] font-bold uppercase">{p.brand}</Text>
                <Text className="text-[10px] text-[#112133]/40">₹{p.priceAtRetailer}</Text>
                {p.outOfStock && <View className="bg-red-100 px-1.5 py-0.5 rounded"><Text className="text-[8px] font-black text-red-500 uppercase">OOS</Text></View>}
                {p.isFeatured && <View className="bg-yellow-100 px-1.5 py-0.5 rounded"><Text className="text-[8px] font-black text-yellow-600 uppercase">Featured</Text></View>}
              </View>
            </View>
            <Pressable onPress={() => handleToggleStock(p.id, !!p.outOfStock)} className="w-8 h-8 items-center justify-center">
              {p.outOfStock
                ? <ToggleLeft size={20} color="#11213340" />
                : <ToggleRight size={20} color="#22C55E" />}
            </Pressable>
            <Pressable onPress={() => router.push(`/admin/product-form?id=${p.id}`)}
              className="w-8 h-8 bg-[#112133]/5 rounded-xl items-center justify-center mr-2">
              <Pencil size={13} color="#112133" />
            </Pressable>
            <Pressable onPress={() => handleDelete(p.id, p.title)}
              className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center">
              <Trash2 size={13} color="#EF4444" />
            </Pressable>
          </View>
        ))}
      </ScrollView>

    </SafeAreaView>
  );
}
