import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Play, Pause, X, CheckCircle2, XCircle, Ruler } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../lib/context/AppContext';

interface AiJob {
  id: string;
  retailer: string | null;
  sourceUrl: string | null;
  status: string;
  urlsDiscovered: number;
  urlsImported: number;
  urlsDuplicate: number;
  urlsRejected: number;
  errorMessage: string | null;
}
interface AiJobItem {
  id: string;
  productUrl: string | null;
  status: string;
  curatedJson: any;
}

export default function DiscoveryScreen() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<AiJobItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const data = await apiFetch('/api/admin/discovery/jobs');
      setJobs(data.jobs ?? []);
    } catch { /* transient */ }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const createJob = async () => {
    if (!sourceUrl.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/api/admin/discovery/jobs', { method: 'POST', body: JSON.stringify({ sourceUrl: sourceUrl.trim(), vertical: 'fashion' }) });
      setSourceUrl('');
      await loadJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  };

  const runNow = async () => {
    setTicking(true);
    try {
      await apiFetch('/api/admin/ai-jobs/tick', { method: 'POST' });
      await loadJobs();
      if (expandedJobId) await loadReviewItems(expandedJobId);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setTicking(false);
    }
  };

  const loadReviewItems = async (jobId: string) => {
    const data = await apiFetch(`/api/admin/discovery/jobs/${jobId}/items?status=pending_review`);
    setReviewItems(data.items ?? []);
  };

  const toggleExpand = async (jobId: string) => {
    if (expandedJobId === jobId) { setExpandedJobId(null); return; }
    setExpandedJobId(jobId);
    await loadReviewItems(jobId);
  };

  const approveItem = async (jobId: string, itemId: string) => {
    try {
      await apiFetch(`/api/admin/discovery/jobs/${jobId}/items/${itemId}/approve`, { method: 'POST' });
      await loadReviewItems(jobId);
      await loadJobs();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };
  const rejectItem = async (jobId: string, itemId: string) => {
    await apiFetch(`/api/admin/discovery/jobs/${jobId}/items/${itemId}/reject`, { method: 'POST' });
    await loadReviewItems(jobId);
    await loadJobs();
  };
  const approveAll = async (jobId: string) => {
    await apiFetch(`/api/admin/discovery/jobs/${jobId}/approve-all`, { method: 'POST' });
    await loadReviewItems(jobId);
    await loadJobs();
  };
  const pauseResume = async (job: AiJob) => {
    await apiFetch(`/api/admin/discovery/jobs/${job.id}/${job.status === 'paused' ? 'resume' : 'pause'}`, { method: 'POST' });
    await loadJobs();
  };
  const cancelJob = (jobId: string) => {
    Alert.alert('Cancel job', 'Cancel this crawl job?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel job', style: 'destructive', onPress: async () => { await apiFetch(`/api/admin/discovery/jobs/${jobId}/cancel`, { method: 'POST' }); await loadJobs(); } },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center text-sm font-black uppercase text-[#112133] mr-12">AI Discovery</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadJobs(); setRefreshing(false); }} />}
      >
        <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">
          Paste a Myntra / Ajio / Flipkart listing URL
        </Text>
        <TextInput
          value={sourceUrl}
          onChangeText={setSourceUrl}
          placeholder="https://www.myntra.com/shirts?f=..."
          placeholderTextColor="#11213360"
          autoCapitalize="none"
          autoCorrect={false}
          className="bg-white border border-black/10 rounded-xl px-4 py-3 text-xs text-[#112133] mb-3"
        />
        <View className="flex-row gap-2 mb-6">
          <Pressable onPress={createJob} disabled={creating || !sourceUrl.trim()}
            className={`flex-1 py-3.5 rounded-xl items-center flex-row justify-center gap-1.5 ${sourceUrl.trim() ? 'bg-[#7D2AE8]' : 'bg-[#112133]/10'}`}>
            <Search size={14} color={sourceUrl.trim() ? '#fff' : '#112133'} />
            <Text className={`font-black text-xs uppercase ${sourceUrl.trim() ? 'text-white' : 'text-[#112133]/30'}`}>{creating ? 'Starting…' : 'Start Crawl'}</Text>
          </Pressable>
          <Pressable onPress={runNow} disabled={ticking} className="py-3.5 px-4 rounded-xl bg-[#112133] items-center flex-row gap-1.5">
            {ticking ? <ActivityIndicator size="small" color="#fff" /> : <Play size={14} color="#fff" />}
            <Text className="text-white font-black text-xs uppercase">Run Now</Text>
          </Pressable>
        </View>

        {jobs.length === 0 && <Text className="text-xs text-[#112133]/40">No crawl jobs yet.</Text>}
        {jobs.map(job => (
          <View key={job.id} className="bg-white rounded-xl border border-black/10 mb-3 overflow-hidden">
            <View className="p-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-black text-[#112133]">{job.retailer}</Text>
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => pauseResume(job)}>
                    {job.status === 'paused' ? <Play size={14} color="#112133" /> : <Pause size={14} color="#112133" />}
                  </Pressable>
                  <Pressable onPress={() => cancelJob(job.id)}><X size={14} color="#EF4444" /></Pressable>
                </View>
              </View>
              <Text className="text-[10px] text-[#112133]/50" numberOfLines={1}>{job.sourceUrl}</Text>
              <Text className="text-[10px] font-black uppercase text-[#7D2AE8] mt-1">{job.status}</Text>
              {!!job.errorMessage && <Text className="text-[10px] text-amber-600 mt-1">{job.errorMessage}</Text>}
              <View className="flex-row gap-3 mt-2">
                <Text className="text-[10px] text-[#112133]/60">Found: {job.urlsDiscovered}</Text>
                <Text className="text-[10px] text-green-600">Reviewed: {job.urlsImported}</Text>
                <Text className="text-[10px] text-yellow-600">Dupe: {job.urlsDuplicate}</Text>
                <Text className="text-[10px] text-red-500">Rejected: {job.urlsRejected}</Text>
              </View>
              <Pressable onPress={() => toggleExpand(job.id)} className="mt-2">
                <Text className="text-[10px] font-black uppercase text-[#7D2AE8]">{expandedJobId === job.id ? 'Hide review queue' : 'Review queue'}</Text>
              </Pressable>
            </View>

            {expandedJobId === job.id && (
              <View className="border-t border-black/10 bg-[#F9F8F6] p-3">
                {reviewItems.length === 0 ? (
                  <Text className="text-xs text-[#112133]/40">Nothing pending review right now.</Text>
                ) : (
                  <>
                    <Pressable onPress={() => approveAll(job.id)} className="self-end mb-2">
                      <Text className="text-[10px] font-black uppercase text-green-600">Approve all</Text>
                    </Pressable>
                    {reviewItems.map(item => {
                      const c = item.curatedJson?.curated;
                      const s = item.curatedJson?.scraped;
                      const img = c?.images?.[0] || s?.images?.[0];
                      return (
                        <View key={item.id} className="flex-row items-center gap-2 bg-white rounded-lg p-2.5 mb-1.5 border border-black/5">
                          {!!img && <Image source={{ uri: img }} style={{ width: 44, height: 44, borderRadius: 8 }} />}
                          <View className="flex-1">
                            <Text className="text-[11px] font-bold text-[#112133]" numberOfLines={1}>{c?.title || s?.title}</Text>
                            <Text className="text-[9px] text-[#112133]/50">{c?.brand} · ₹{c?.price ?? '—'}</Text>
                            {!!c?.tallFit && (
                              <View className="flex-row items-center gap-1 mt-0.5">
                                <Ruler size={9} color="#7D2AE8" />
                                <Text className="text-[9px] text-[#7D2AE8]" numberOfLines={1}>
                                  {(c.tallFit.recommendedHeightRanges || []).join(', ') || 'No height range given'}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Pressable onPress={() => approveItem(job.id, item.id)} className="p-1.5 rounded-lg bg-green-50">
                            <CheckCircle2 size={16} color="#22C55E" />
                          </Pressable>
                          <Pressable onPress={() => rejectItem(job.id, item.id)} className="p-1.5 rounded-lg bg-red-50">
                            <XCircle size={16} color="#EF4444" />
                          </Pressable>
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
