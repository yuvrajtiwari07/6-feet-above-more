import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UploadCloud, CheckCircle2, XCircle, Copy } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../lib/context/AppContext';
import { useApp } from '../../lib/context/AppContext';

const MAX_URLS = 300;
const BATCH = 5;

type UrlStatus = 'pending' | 'processing' | 'done' | 'error';
type BulkResult = { url: string; success: boolean; savedId?: string; duplicate?: boolean; noAffiliate?: boolean; error?: string };

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s,;"'<>\][\)]+/g) ?? [];
  return Array.from(new Set(matches));
}

export default function BulkImportScreen() {
  const { refetchProducts } = useApp();
  const [textInput, setTextInput] = useState('');
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [statuses, setStatuses] = useState<Record<string, UrlStatus>>({});
  const [results, setResults] = useState<BulkResult[]>([]);

  const parsedUrls = useMemo(() => extractUrls(textInput).slice(0, MAX_URLS), [textInput]);

  const summary = useMemo(() => ({
    saved: results.filter(r => r.success && r.savedId).length,
    duplicate: results.filter(r => !r.success && r.duplicate).length,
    failed: results.filter(r => !r.success && !r.duplicate).length,
    noAffiliate: results.filter(r => r.success && r.noAffiliate).length,
  }), [results]);

  const run = async () => {
    if (parsedUrls.length === 0) return;
    setRunStatus('running');
    setResults([]);
    const initial: Record<string, UrlStatus> = {};
    parsedUrls.forEach(u => { initial[u] = 'pending'; });
    setStatuses(initial);

    const allResults: BulkResult[] = [];
    for (let i = 0; i < parsedUrls.length; i += BATCH) {
      const batch = parsedUrls.slice(i, i + BATCH);
      setStatuses(prev => { const next = { ...prev }; batch.forEach(u => { next[u] = 'processing'; }); return next; });
      try {
        const data = await apiFetch('/api/admin/bulk-import', { method: 'POST', body: JSON.stringify({ urls: batch }) });
        const batchResults: BulkResult[] = data.results ?? [];
        allResults.push(...batchResults);
        setStatuses(prev => {
          const next = { ...prev };
          batchResults.forEach(r => { next[r.url] = r.success ? 'done' : 'error'; });
          return next;
        });
      } catch (e: any) {
        batch.forEach(u => allResults.push({ url: u, success: false, error: e.message ?? 'Request failed' }));
        setStatuses(prev => { const next = { ...prev }; batch.forEach(u => { next[u] = 'error'; }); return next; });
      }
      setResults([...allResults]);
    }
    setRunStatus('done');
    const savedCount = allResults.filter(r => r.success && r.savedId).length;
    if (savedCount > 0) await refetchProducts();
  };

  const reset = () => {
    setRunStatus('idle');
    setResults([]);
    setStatuses({});
    setTextInput('');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9F8F6]" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-2 px-4 py-3 bg-white border-b border-black/10">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1.5">
          <ArrowLeft size={18} color="#112133" />
          <Text className="text-sm font-black uppercase tracking-wide text-[#112133]">Back</Text>
        </Pressable>
        <Text className="flex-1 text-center text-sm font-black uppercase text-[#112133] mr-12">Bulk Import</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {runStatus === 'idle' && (
          <>
            <Text className="text-[10px] font-black uppercase tracking-widest text-[#112133]/50 mb-2">
              Paste product URLs (one or more per line, up to {MAX_URLS})
            </Text>
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              multiline
              numberOfLines={10}
              placeholder={'https://www.myntra.com/...\nhttps://www.ajio.com/...'}
              placeholderTextColor="#11213360"
              autoCapitalize="none"
              autoCorrect={false}
              className="bg-white border border-black/10 rounded-2xl px-4 py-4 text-xs text-[#112133]"
              style={{ minHeight: 180, textAlignVertical: 'top' }}
            />
            <Text className="text-[10px] text-[#112133]/40 mt-2">{parsedUrls.length} URL{parsedUrls.length === 1 ? '' : 's'} detected</Text>

            <Pressable onPress={run} disabled={parsedUrls.length === 0}
              className={`mt-5 py-4 rounded-2xl flex-row items-center justify-center gap-2 ${parsedUrls.length > 0 ? 'bg-[#7D2AE8]' : 'bg-[#112133]/10'}`}>
              <UploadCloud size={16} color={parsedUrls.length > 0 ? '#fff' : '#112133'} />
              <Text className={`font-black text-sm uppercase ${parsedUrls.length > 0 ? 'text-white' : 'text-[#112133]/30'}`}>
                Import {parsedUrls.length || ''} Products
              </Text>
            </Pressable>
          </>
        )}

        {runStatus !== 'idle' && (
          <>
            {runStatus === 'running' && (
              <View className="flex-row items-center gap-2 mb-4">
                <ActivityIndicator size="small" color="#7D2AE8" />
                <Text className="text-xs font-bold text-[#112133]">
                  Processing {results.length} / {parsedUrls.length}...
                </Text>
              </View>
            )}

            {runStatus === 'done' && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                <View className="bg-green-50 rounded-xl px-3 py-2 flex-1 min-w-[45%]">
                  <Text className="text-lg font-black text-green-600">{summary.saved}</Text>
                  <Text className="text-[9px] font-black uppercase text-green-600/70">Saved</Text>
                </View>
                <View className="bg-yellow-50 rounded-xl px-3 py-2 flex-1 min-w-[45%]">
                  <Text className="text-lg font-black text-yellow-600">{summary.duplicate}</Text>
                  <Text className="text-[9px] font-black uppercase text-yellow-600/70">Already existed</Text>
                </View>
                <View className="bg-red-50 rounded-xl px-3 py-2 flex-1 min-w-[45%]">
                  <Text className="text-lg font-black text-red-500">{summary.failed}</Text>
                  <Text className="text-[9px] font-black uppercase text-red-500/70">Failed</Text>
                </View>
                <View className="bg-[#112133]/5 rounded-xl px-3 py-2 flex-1 min-w-[45%]">
                  <Text className="text-lg font-black text-[#112133]">{summary.noAffiliate}</Text>
                  <Text className="text-[9px] font-black uppercase text-[#112133]/50">No affiliate link</Text>
                </View>
              </View>
            )}

            {parsedUrls.map(u => {
              const st = statuses[u] ?? 'pending';
              const result = results.find(r => r.url === u);
              return (
                <View key={u} className="flex-row items-center gap-2 bg-white rounded-xl px-3 py-2.5 mb-1.5 border border-black/5">
                  {st === 'processing' && <ActivityIndicator size="small" color="#7D2AE8" />}
                  {st === 'done' && <CheckCircle2 size={14} color="#22C55E" />}
                  {st === 'error' && <XCircle size={14} color="#EF4444" />}
                  {st === 'pending' && <Copy size={14} color="#11213340" />}
                  <View className="flex-1">
                    <Text className="text-[10px] text-[#112133]" numberOfLines={1}>{u}</Text>
                    {!!result?.error && <Text className="text-[9px] text-red-500 mt-0.5" numberOfLines={1}>{result.error}</Text>}
                    {!!result?.duplicate && <Text className="text-[9px] text-yellow-600 mt-0.5">Already exists</Text>}
                  </View>
                </View>
              );
            })}

            {runStatus === 'done' && (
              <Pressable onPress={reset} className="mt-5 py-4 rounded-2xl bg-[#112133] items-center">
                <Text className="text-white font-black text-xs uppercase">Import More</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
