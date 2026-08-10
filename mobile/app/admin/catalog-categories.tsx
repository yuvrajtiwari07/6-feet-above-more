import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Pencil, Trash2, LayoutGrid, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '../../lib/context/AppContext';
import { CatalogCategory } from '../../lib/types';

const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-1.5 mt-3">{children}</Text>
);
const Input: React.FC<React.ComponentProps<typeof TextInput>> = (props) => (
  <TextInput placeholderTextColor="#11213360" className="bg-white border border-black/10 rounded-xl px-3.5 py-3 text-sm text-[#112133]" {...props} />
);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export default function CatalogCategoriesAdminScreen() {
  const { catalogCategories, addCatalogCategory, updateCatalogCategory, deleteCatalogCategory, refreshCatalogs } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched || !name) return;
    setSlug(slugify(name));
  }, [name, slugTouched]);

  const openNew = () => {
    setEditId(null);
    setName(''); setSlug(''); setSlugTouched(false); setDescription(''); setCoverImage(''); setSortOrder('0'); setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (c: CatalogCategory) => {
    setEditId(c.id);
    setName(c.name); setSlug(c.slug); setSlugTouched(true); setDescription(c.description ?? '');
    setCoverImage(c.coverImage ?? ''); setSortOrder(String(c.sortOrder)); setIsActive(c.isActive);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Missing name', 'Category name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      };
      if (editId) await updateCatalogCategory(editId, payload);
      else await addCatalogCategory(payload);
      setShowForm(false);
      await refreshCatalogs();
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (c: CatalogCategory) => {
    Alert.alert('Delete category', `Delete "${c.name}"? Catalogs inside will become unassigned, not deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCatalogCategory(c.id); }
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
        <Text className="text-sm font-black uppercase text-[#112133]">Catalog Categories</Text>
        <Pressable onPress={openNew} className="flex-row items-center gap-1.5 bg-[#7D2AE8] px-3 py-2 rounded-xl">
          <Plus size={13} color="#fff" />
          <Text className="text-[11px] font-black uppercase text-white">Add</Text>
        </Pressable>
      </View>

      {showForm && (
        <View className="bg-white border-b-2 border-black/10 px-4 py-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs font-black uppercase text-[#112133]">{editId ? 'Edit Category' : 'New Category'}</Text>
            <Pressable onPress={() => setShowForm(false)}><X size={16} color="#112133" /></Pressable>
          </View>

          <FieldLabel>Name</FieldLabel>
          <Input value={name} onChangeText={setName} placeholder="Formal Wear" />

          <FieldLabel>Slug</FieldLabel>
          <Input value={slug} onChangeText={t => { setSlugTouched(true); setSlug(t); }} autoCapitalize="none" />

          <FieldLabel>Description</FieldLabel>
          <Input value={description} onChangeText={setDescription} multiline numberOfLines={2} style={{ minHeight: 55, textAlignVertical: 'top' }} />

          <FieldLabel>Cover image URL</FieldLabel>
          <Input value={coverImage} onChangeText={setCoverImage} autoCapitalize="none" autoCorrect={false} keyboardType="url" />

          <FieldLabel>Sort order</FieldLabel>
          <Input value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />

          <View className="flex-row items-center justify-between mt-3 mb-1">
            <Text className="text-xs font-bold text-[#112133]">Active</Text>
            <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#22C55E' }} />
          </View>

          <Pressable onPress={handleSave} disabled={saving} className="mt-3 bg-[#7D2AE8] py-3 rounded-xl items-center flex-row justify-center gap-2">
            {saving && <ActivityIndicator size="small" color="#fff" />}
            <Text className="text-white font-black text-xs uppercase">{editId ? 'Save Changes' : 'Create Category'}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {catalogCategories.length === 0 ? (
          <View className="items-center py-16">
            <LayoutGrid size={40} color="#11213330" />
            <Text className="text-[#112133]/40 text-xs font-bold uppercase mt-3">No categories yet</Text>
          </View>
        ) : (
          catalogCategories.map(c => (
            <View key={c.id} className="bg-white rounded-2xl p-4 mb-3 border border-black/5 flex-row items-center">
              <View className="flex-1">
                <Text className="text-sm font-black text-[#112133]">{c.name}</Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-[10px] text-[#112133]/40">/{c.slug}</Text>
                  <View className={`px-1.5 py-0.5 rounded ${c.isActive ? 'bg-green-100' : 'bg-black/5'}`}>
                    <Text className={`text-[8px] font-black uppercase ${c.isActive ? 'text-green-600' : 'text-[#112133]/40'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable onPress={() => openEdit(c)} className="w-8 h-8 bg-[#112133]/5 rounded-xl items-center justify-center mr-2">
                <Pencil size={13} color="#112133" />
              </Pressable>
              <Pressable onPress={() => handleDelete(c)} className="w-8 h-8 bg-red-50 rounded-xl items-center justify-center">
                <Trash2 size={13} color="#EF4444" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
