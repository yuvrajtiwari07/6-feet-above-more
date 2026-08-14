import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Sparkles, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../lib/context/AppContext';
import { useApp } from '../../lib/context/AppContext';

interface AiJob {
  id: string;
  status: string;
  urlsDiscovered: number;
  urlsImported: number;
  urlsFailed: number;
}
interface AiJobItem {
  id: string;
  productId: string | null;
  status: string;
  curatedJson: any;
  previousJson: any;
}

export default function RetagScreen() {
  const { allProducts: products } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [lastJobItems, setLastJobItems] = useState<AiJobItem[]>([]);

  const loadJobs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/retag/jobs');
      setJobs(data.jobs ?? []);
      if (data.jobs?.[0]) {
        const itemsData = await apiFetch(`/api/admin/retag/jobs/${data.jobs[0].id}/items`);
        setLastJobItems(itemsData.items ?? []);
      }
    } catch { /* transient */ }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startRetag = async () => {
    setStarting(true);
    try {
      const body = selectAll ? { productIds: 'all' } : { productIds: [...selected] };
      await apiFetch('/api/admin/retag/jobs', { method: 'POST', body: JSON.stringify(body) });
      setSelected(new Set());
      setSelectAll(false);
      await loadJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setStarting(false);
    }
  };

  const runNow = async () => {
    setTicking(true);
    try {
      await apiFetch('/api/admin/ai-jobs/tick', { method: 'POST' });
      await loadJobs();
    } finally {
      setTicking(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center text-sm font-black uppercase text-[#112133] mr-12">AI Re-tag</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text className="text-[10px] text-[#112133]/50 mb-3">
          Runs old/imported products back through Gemini to fix category, tags, and tall-fit metadata.
          Applies directly since products are already live — every change is logged below.
        </Text>

        <View className="flex-row items-center justify-between bg-white border border-black/10 rounded-xl px-4 py-3 mb-3">
          <Text className="text-xs font-black text-[#112133]">Select all {products.length} products</Text>
          <Switch value={selectAll} onValueChange={(v) => { setSelectAll(v); setSelected(new Set()); }} />
        </View>

        {!selectAll && (
          <View className="bg-white border border-black/10 rounded-xl mb-3" style={{ maxHeight: 260 }}>
            <ScrollView>
              {products.map(p => (
                <Pressable key={p.id} onPress={() => toggle(p.id)} className="flex-row items-center gap-2 px-3 py-2.5 border-b border-black/5">
                  <View className={`w-4 h-4 rounded border ${selected.has(p.id) ? 'bg-[#7D2AE8] border-[#7D2AE8]' : 'border-black/20'}`} />
                  <Text className="text-[11px] text-[#112133] flex-1" numberOfLines={1}>{p.brand} — {p.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="flex-row gap-2 mb-6">
          <Pressable onPress={startRetag} disabled={starting || (!selectAll && selected.size === 0)}
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-1.5 ${(selectAll || selected.size > 0) ? 'bg-[#7D2AE8]' : 'bg-[#112133]/10'}`}>
            <Sparkles size={14} color={(selectAll || selected.size > 0) ? '#fff' : '#112133'} />
            <Text className={`font-black text-xs uppercase ${(selectAll || selected.size > 0) ? 'text-white' : 'text-[#112133]/30'}`}>
              {starting ? 'Starting…' : `Re-tag ${selectAll ? products.length : selected.size}`}
            </Text>
          </Pressable>
          <Pressable onPress={runNow} disabled={ticking} className="py-3.5 px-4 rounded-xl bg-[#112133] items-center flex-row gap-1.5">
            {ticking ? <ActivityIndicator size="small" color="#fff" /> : <Play size={14} color="#fff" />}
            <Text className="text-white font-black text-xs uppercase">Run Now</Text>
          </Pressable>
        </View>

        {jobs.length === 0 && <Text className="text-xs text-[#112133]/40">No retag jobs yet.</Text>}
        {jobs.map((job, idx) => (
          <View key={job.id} className="bg-white rounded-xl border border-black/10 p-3 mb-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-[10px] font-black uppercase text-[#7D2AE8]">{job.status}</Text>
              <View className="flex-row gap-3">
                <Text className="text-[10px] text-[#112133]/60">Total: {job.urlsDiscovered}</Text>
                <Text className="text-[10px] text-green-600">Updated: {job.urlsImported}</Text>
                <Text className="text-[10px] text-red-500">Failed: {job.urlsFailed}</Text>
              </View>
            </View>
            {idx === 0 && lastJobItems.filter(i => i.status === 'approved').slice(0, 15).map(item => (
              <View key={item.id} className="mt-2 bg-[#F9F8F6] rounded-lg px-3 py-2">
                <Text className="text-[10px] font-black text-[#112133]" numberOfLines={1}>{item.productId}</Text>
                <Text className="text-[9px] text-[#112133]/50" numberOfLines={1}>
                  tags: {(item.previousJson?.tags || []).join(', ') || '—'} → {(item.curatedJson?.tags || []).join(', ') || '—'}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
