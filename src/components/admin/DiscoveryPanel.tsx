// src/components/admin/DiscoveryPanel.tsx
// Admin UI for AI discovery crawl jobs: paste a Myntra/Ajio/Flipkart listing
// or search-results URL, let a background job (driven by GitHub Actions
// hitting /api/admin/ai-jobs/tick every ~10 min, or the "Run now" button
// here) crawl it, curate each product with Gemini, and queue tall-fit
// candidates for review before they go live.

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Play, Pause, X, CheckCircle2, XCircle, Loader2, Ruler } from 'lucide-react';
import { getAccessToken } from '../../supabase';

interface AiJob {
  id: string;
  jobType: 'discovery' | 'retag';
  vertical: string;
  retailer: string | null;
  sourceUrl: string | null;
  status: string;
  urlsDiscovered: number;
  urlsProcessed: number;
  urlsImported: number;
  urlsDuplicate: number;
  urlsRejected: number;
  urlsFailed: number;
  errorMessage: string | null;
  createdAt: string;
}

interface AiJobItem {
  id: string;
  productUrl: string | null;
  status: string;
  curatedJson: any;
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

export const DiscoveryPanel: React.FC = () => {
  const [sourceUrl, setSourceUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<AiJobItem[]>([]);
  const [ticking, setTicking] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const data = await api('/api/admin/discovery/jobs');
      setJobs(data.jobs ?? []);
    } catch { /* transient — next poll will retry */ }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const createJob = async () => {
    if (!sourceUrl.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await api('/api/admin/discovery/jobs', { method: 'POST', body: JSON.stringify({ sourceUrl: sourceUrl.trim(), vertical: 'fashion' }) });
      setSourceUrl('');
      await loadJobs();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const runNow = async () => {
    setTicking(true);
    try {
      await api('/api/admin/ai-jobs/tick', { method: 'POST' });
      await loadJobs();
      if (expandedJobId) await loadReviewItems(expandedJobId);
    } catch { /* surfaced via job.errorMessage on next poll */ }
    finally { setTicking(false); }
  };

  const loadReviewItems = async (jobId: string) => {
    const data = await api(`/api/admin/discovery/jobs/${jobId}/items?status=pending_review`);
    setReviewItems(data.items ?? []);
  };

  const toggleExpand = async (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }
    setExpandedJobId(jobId);
    await loadReviewItems(jobId);
  };

  const approveItem = async (jobId: string, itemId: string) => {
    try {
      await api(`/api/admin/discovery/jobs/${jobId}/items/${itemId}/approve`, { method: 'POST' });
      await loadReviewItems(jobId);
      await loadJobs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const rejectItem = async (jobId: string, itemId: string) => {
    await api(`/api/admin/discovery/jobs/${jobId}/items/${itemId}/reject`, { method: 'POST' });
    await loadReviewItems(jobId);
    await loadJobs();
  };

  const approveAll = async (jobId: string) => {
    await api(`/api/admin/discovery/jobs/${jobId}/approve-all`, { method: 'POST' });
    await loadReviewItems(jobId);
    await loadJobs();
  };

  const pauseResume = async (job: AiJob) => {
    const action = job.status === 'paused' ? 'resume' : 'pause';
    await api(`/api/admin/discovery/jobs/${job.id}/${action}`, { method: 'POST' });
    await loadJobs();
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm('Cancel this crawl job?')) return;
    await api(`/api/admin/discovery/jobs/${jobId}/cancel`, { method: 'POST' });
    await loadJobs();
  };

  return (
    <div>
      <div className="bg-white border border-black/10 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#112133] mb-1 flex items-center gap-2">
          <Search size={15} /> New Crawl
        </h3>
        <p className="text-xs text-[#112133]/50 mb-4">
          Paste a Myntra / Ajio / Flipkart search or category listing URL (e.g. a filtered "shirts" search).
          It'll crawl the listing in the background, run each product through Gemini for tall-fit suitability,
          and queue the good ones here for your review.
        </p>
        <div className="flex gap-2">
          <input
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://www.myntra.com/shirts?f=..."
            className="flex-1 border border-black/10 rounded-xl px-4 py-2.5 text-sm"
          />
          <button
            onClick={createJob}
            disabled={creating || !sourceUrl.trim()}
            className="bg-[#7D2AE8] disabled:opacity-40 text-white rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider"
          >
            {creating ? 'Starting…' : 'Start Crawl'}
          </button>
          <button
            onClick={runNow}
            disabled={ticking}
            className="bg-[#112133] disabled:opacity-40 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
            title="Manually advance the next job by one batch, without waiting for the scheduled run"
          >
            {ticking ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run Now
          </button>
        </div>
        {createError && <p className="text-xs text-red-500 mt-2">{createError}</p>}
      </div>

      <div className="space-y-3">
        {jobs.length === 0 && <p className="text-xs text-[#112133]/40">No crawl jobs yet.</p>}
        {jobs.map(job => (
          <div key={job.id} className="bg-white border border-black/10 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#112133]">{job.retailer}</span>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-[11px] text-[#112133]/50 truncate">{job.sourceUrl}</p>
                {job.errorMessage && <p className="text-[11px] text-amber-600 mt-1">{job.errorMessage}</p>}
              </div>
              <div className="flex gap-3 text-center">
                <Stat label="Found" value={job.urlsDiscovered} />
                <Stat label="Reviewed" value={job.urlsImported} color="text-green-600" />
                <Stat label="Dupe" value={job.urlsDuplicate} color="text-yellow-600" />
                <Stat label="Rejected" value={job.urlsRejected} color="text-red-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggleExpand(job.id)} className="text-[10px] font-black uppercase text-[#7D2AE8] px-2 py-1">
                  {expandedJobId === job.id ? 'Hide' : 'Review'}
                </button>
                {job.status !== 'completed' && job.status !== 'cancelled' && (
                  <button onClick={() => pauseResume(job)} className="p-1.5 rounded-lg hover:bg-black/5" title={job.status === 'paused' ? 'Resume' : 'Pause'}>
                    {job.status === 'paused' ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                )}
                {job.status !== 'completed' && job.status !== 'cancelled' && (
                  <button onClick={() => cancelJob(job.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Cancel">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {expandedJobId === job.id && (
              <div className="border-t border-black/10 bg-[#F9F8F6] p-4">
                {reviewItems.length === 0 ? (
                  <p className="text-xs text-[#112133]/40">Nothing pending review right now.</p>
                ) : (
                  <>
                    <div className="flex justify-end mb-2">
                      <button onClick={() => approveAll(job.id)} className="text-[10px] font-black uppercase text-green-600">Approve all</button>
                    </div>
                    <div className="space-y-2">
                      {reviewItems.map(item => {
                        const c = item.curatedJson?.curated;
                        const s = item.curatedJson?.scraped;
                        const img = (c?.images?.[0]) || (s?.images?.[0]);
                        return (
                          <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-black/5">
                            {img && <img src={img} className="w-12 h-12 object-cover rounded-lg" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#112133] truncate">{c?.title || s?.title}</p>
                              <p className="text-[10px] text-[#112133]/50">{c?.brand} · ₹{c?.price ?? '—'}</p>
                              {c?.tallFit && (
                                <p className="text-[10px] text-[#7D2AE8] flex items-center gap-1 mt-0.5">
                                  <Ruler size={10} /> {(c.tallFit.recommendedHeightRanges || []).join(', ') || 'No height range given'} · {(c.tallFit.highlights || []).join(', ')}
                                </p>
                              )}
                            </div>
                            <button onClick={() => approveItem(job.id, item.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600"><CheckCircle2 size={15} /></button>
                            <button onClick={() => rejectItem(job.id, item.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500"><XCircle size={15} /></button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
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
    <div>
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
