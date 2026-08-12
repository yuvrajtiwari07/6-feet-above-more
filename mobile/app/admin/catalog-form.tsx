import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Wand2 } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useApp, apiFetch } from '../../lib/context/AppContext';
import { ProductPicker } from '../../components/admin/ProductPicker';
import { Catalog } from '../../lib/types';

const FieldLabel: React.FC<{ children: string }> = ({ children }) => (
  <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-1.5 mt-4">{children}</Text>
);
const Input: React.FC<React.ComponentProps<typeof TextInput>> = (props) => (
  <TextInput placeholderTextColor="#11213360" className="bg-white border border-black/10 rounded-xl px-3.5 py-3 text-sm text-[#112133]" {...props} />
);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export default function CatalogFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { allCatalogs: catalogs, allCatalogCategories: catalogCategories, allProducts: products, addCatalog, updateCatalog } = useApp();
  const editing = catalogs.find(c => c.id === id);
  const isEdit = !!editing;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [slug, setSlug] = useState(editing?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? catalogCategories[0]?.id ?? '');
  const [coverImage, setCoverImage] = useState(editing?.coverImage ?? '');
  const [sortOrder, setSortOrder] = useState(editing?.sortOrder ? String(editing.sortOrder) : '0');
  const [affiliateUrl, setAffiliateUrl] = useState(editing?.affiliateUrl ?? '');
  const [tagsText, setTagsText] = useState((editing?.tags ?? []).join(', '));
  const [isPublished, setIsPublished] = useState(editing?.isPublished ?? true);
  const [productIds, setProductIds] = useState<string[]>(editing?.productIds ?? []);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (slugTouched || !title) return;
    setSlug(slugify(title));
  }, [title, slugTouched]);

  const handleGenerateAffiliate = async () => {
    if (!affiliateUrl.trim()) { Alert.alert('Add a URL first', 'Paste the retailer URL to convert into an affiliate link.'); return; }
    setGenerating(true);
    try {
      const data = await apiFetch('/api/admin/generate-affiliate', { method: 'POST', body: JSON.stringify({ url: affiliateUrl.trim() }) });
      if (data.affiliateUrl) setAffiliateUrl(data.affiliateUrl);
    } catch (e: any) {
      Alert.alert('Generation failed', e.message ?? 'Could not generate affiliate link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Catalog title is required.'); return; }
    const category = catalogCategories.find(c => c.id === categoryId);
    if (!category) { Alert.alert('Missing category', 'Select a catalog category first — create one under Catalog Categories if the list is empty.'); return; }

    const payload: Partial<Catalog> = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      description: description.trim() || undefined,
      categoryId,
      categoryName: category.name,
      coverImage: coverImage.trim() || undefined,
      productIds,
      affiliateUrl: affiliateUrl.trim() || undefined,
      isPublished,
      sortOrder: Number(sortOrder) || 0,
      tags: tagsText.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (isEdit) await updateCatalog(editing!.id, payload);
      else await addCatalog(payload);
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="text-sm font-black uppercase text-[#112133]">{isEdit ? 'Edit Catalog' : 'Add Catalog'}</Text>
        <Pressable onPress={handleSave} disabled={saving} className="flex-row items-center gap-1.5 bg-[#7D2AE8] px-3.5 py-2 rounded-xl">
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Save size={13} color="#fff" />}
          <Text className="text-[11px] font-black uppercase text-white">Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <FieldLabel>Title</FieldLabel>
        <Input value={title} onChangeText={setTitle} placeholder="Business Casual Essentials" />

        <FieldLabel>Slug</FieldLabel>
        <Input value={slug} onChangeText={t => { setSlugTouched(true); setSlug(t); }} autoCapitalize="none" />

        <FieldLabel>Description</FieldLabel>
        <Input value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 70, textAlignVertical: 'top' }} />

        <FieldLabel>Category</FieldLabel>
        {catalogCategories.length === 0 ? (
          <Text className="text-xs text-red-500 mt-1">No catalog categories yet — create one first under Catalog Categories.</Text>
        ) : (
          <View className="flex-row flex-wrap">
            {catalogCategories.map(c => (
              <Pressable key={c.id} onPress={() => setCategoryId(c.id)}
                className={`px-3 py-1.5 rounded-full mr-2 mb-2 ${categoryId === c.id ? 'bg-[#7D2AE8]' : 'bg-[#112133]/5'}`}>
                <Text className={`text-[10px] font-black uppercase ${categoryId === c.id ? 'text-white' : 'text-[#112133]/60'}`}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <FieldLabel>Cover image URL</FieldLabel>
        <Input value={coverImage} onChangeText={setCoverImage} autoCapitalize="none" autoCorrect={false} keyboardType="url" />

        <FieldLabel>Sort order</FieldLabel>
        <Input value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />

        <FieldLabel>Whole-catalog affiliate URL</FieldLabel>
        <View className="flex-row gap-2">
          <Input value={affiliateUrl} onChangeText={setAffiliateUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" style={{ flex: 1 }} />
          <Pressable onPress={handleGenerateAffiliate} disabled={generating}
            className="px-4 items-center justify-center rounded-xl bg-[#112133]/5">
            {generating ? <ActivityIndicator size="small" color="#7D2AE8" /> : <Wand2 size={16} color="#7D2AE8" />}
          </Pressable>
        </View>

        <FieldLabel>Tags (comma separated)</FieldLabel>
        <Input value={tagsText} onChangeText={setTagsText} placeholder="office, essentials" />

        <View className="flex-row items-center justify-between mt-4 bg-white rounded-xl px-4 py-3 border border-black/5">
          <Text className="text-xs font-bold text-[#112133]">Published</Text>
          <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: '#22C55E' }} />
        </View>

        <View className="mt-5">
          <ProductPicker products={products} selectedIds={productIds} onChange={setProductIds}
            onImportNewProduct={() => router.push('/admin/product-form')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
