// src/components/admin/RetagPanel.tsx
// Admin UI to bulk re-classify existing products with Gemini — fixes tags,
// category, and tall-fit metadata on products that are already live (old
// catalog items, or ones imported before curation was this thorough).
// Applies immediately (no review queue, unlike discovery) since it only
// touches metadata on products already published; every change is logged
// with a before/after diff for the last completed run.

import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Play, Loader2 } from 'lucide-react';
import { getAccessToken } from '../../supabase';
import { Product } from '../../types';

interface AiJob {
  id: string;
  status: string;
  urlsDiscovered: number;
  urlsProcessed: number;
  urlsImported: number;
  urlsFailed: number;
  createdAt: string;
}

interface AiJobItem {
  id: string;
  productId: string | null;
  status: string;
  curatedJson: any;
  previousJson: any;
  rejectReason: string | null;
}

async function api(path: string, opts: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const body = await res.json();
  if (!res.ok || body.success === false) throw new Error(body.error || 'Request failed');
  return body;
}

interface Props {
  products: Product[];
}

export const RetagPanel: React.FC<Props> = ({ products }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ticking, setTicking] = useState(false);
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [lastJobItems, setLastJobItems] = useState<AiJobItem[]>([]);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api('/api/admin/retag/jobs');
      setJobs(data.jobs ?? []);
      if (data.jobs?.[0]) {
        const itemsData = await api(`/api/admin/retag/jobs/${data.jobs[0].id}/items`);
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
      await api('/api/admin/retag/jobs', { method: 'POST', body: JSON.stringify(body) });
      setSelected(new Set());
      setSelectAll(false);
      await loadJobs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStarting(false);
    }
  };

  const runNow = async () => {
    setTicking(true);
    try {
      await api('/api/admin/ai-jobs/tick', { method: 'POST' });
      await loadJobs();
    } finally {
      setTicking(false);
    }
  };

  return (
    <div>
      <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#112133] mb-1 flex items-center gap-2">
          <Sparkles size={15} /> Re-tag Existing Products
        </h3>
        <p className="text-xs text-[#112133]/50 mb-4">
          Runs old/imported products back through Gemini to fix category, tags, and tall-fit metadata.
          Applies directly (products are already live) — every change is logged below for review.
        </p>

        <label className="flex items-center gap-2 text-xs font-bold text-[#112133] mb-3">
          <input type="checkbox" checked={selectAll} onChange={e => { setSelectAll(e.target.checked); setSelected(new Set()); }} />
          Select all {products.length} products
        </label>

        {!selectAll && (
          <div className="max-h-64 overflow-y-auto border border-black/10 rounded-xl mb-3">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-xs border-b border-black/5 last:border-0">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="truncate">{p.brand} — {p.title}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={startRetag}
            disabled={starting || (!selectAll && selected.size === 0)}
            className="bg-[#7D2AE8] disabled:opacity-40 text-white rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider"
          >
            {starting ? 'Starting…' : `Re-tag ${selectAll ? products.length : selected.size} Products`}
          </button>
          <button
            onClick={runNow}
            disabled={ticking}
            className="bg-[#112133] disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
          >
            {ticking ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run Now
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 && <p className="text-xs text-[#112133]/40">No retag jobs yet.</p>}
        {jobs.map(job => (
          <div key={job.id} className="bg-white border border-black/10 rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={job.status} />
              <div className="flex-1" />
              <Stat label="Total" value={job.urlsDiscovered} />
              <Stat label="Updated" value={job.urlsImported} color="text-green-600" />
              <Stat label="Failed" value={job.urlsFailed} color="text-red-500" />
            </div>
            {jobs[0].id === job.id && lastJobItems.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {lastJobItems.filter(i => i.status === 'approved').slice(0, 20).map(item => (
                  <div key={item.id} className="text-[11px] bg-[#F9F8F6] rounded-lg px-3 py-2">
                    <span className="font-black text-[#112133]">{item.productId}</span>{' '}
                    <span className="text-[#112133]/50">tags: {(item.previousJson?.tags || []).join(', ') || '—'}</span>
                    <span className="text-[#7D2AE8]"> → {(item.curatedJson?.tags || []).join(', ') || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function Stat({ label, value, color = 'text-[#112133]' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-sm font-black ${color}`}>{value}</p>
      <p className="text-[9px] font-black uppercase text-[#112133]/40">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: 'bg-blue-50 text-blue-600', discovering: 'bg-blue-50 text-blue-600', curating: 'bg-purple-50 text-[#7D2AE8]',
    paused: 'bg-yellow-50 text-yellow-600', completed: 'bg-green-50 text-green-600',
    failed: 'bg-red-50 text-red-500', cancelled: 'bg-black/5 text-[#112133]/50',
  };
  return <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || 'bg-black/5'}`}>{status}</span>;
}
