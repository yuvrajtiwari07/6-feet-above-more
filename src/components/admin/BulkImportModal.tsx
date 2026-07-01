import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileText, Link2, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ChevronRight, ClipboardList, FileSpreadsheet, FileType2
} from 'lucide-react';
import { getAccessToken } from '../../supabase';

// ── Types ──────────────────────────────────────────────────────
interface BulkImportResult {
  url: string;
  success: boolean;
  data?: any;
  error?: string;
}

interface Props {
  onClose: () => void;
  onImportComplete: (results: BulkImportResult[]) => void;
}

type InputTab = 'text' | 'file';
type RunStatus = 'idle' | 'running' | 'done';

// ── URL extraction helpers ─────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s,;"'<>\][\)]+/g;

function extractUrlsFromText(raw: string): string[] {
  const urls: string[] = [];
  // Try URL regex first
  const regexMatches = raw.match(URL_REGEX) ?? [];
  if (regexMatches.length > 0) {
    return [...new Set(regexMatches.map(u => u.trim()).filter(Boolean))];
  }
  // Fallback: split by comma or newline
  raw.split(/[\n,]+/).forEach(part => {
    const trimmed = part.trim();
    if (trimmed.startsWith('http')) urls.push(trimmed);
  });
  return [...new Set(urls.filter(Boolean))];
}

// ── File parsers (dynamic imports) ────────────────────────────
async function parseFile(file: File): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'txt' || ext === 'csv') {
    const text = await file.text();
    return extractUrlsFromText(text);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const urls: string[] = [];
    rows.forEach(row => {
      row.forEach(cell => {
        const val = String(cell ?? '').trim();
        if (val.startsWith('http')) urls.push(val);
      });
    });
    return [...new Set(urls)];
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return extractUrlsFromText(result.value);
  }

  throw new Error(`Unsupported file type: .${ext}`);
}

// ── Main Component ─────────────────────────────────────────────
export const BulkImportModal: React.FC<Props> = ({ onClose, onImportComplete }) => {
  const [activeTab, setActiveTab] = useState<InputTab>('text');
  const [textInput, setTextInput] = useState('');
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [urlStatuses, setUrlStatuses] = useState<Map<string, 'pending' | 'processing' | 'done' | 'error'>>(new Map());
  const [results, setResults] = useState<BulkImportResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  // ── URL preview from text input ──────────────────────────────
  const previewUrls = useCallback(() => {
    const urls = extractUrlsFromText(textInput);
    setParsedUrls(urls);
  }, [textInput]);

  // ── File handling ────────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    setFileError('');
    setSelectedFile(file);
    setParsedUrls([]);
    try {
      const urls = await parseFile(file);
      if (urls.length === 0) {
        setFileError('No valid URLs found in this file. Make sure at least one cell/line contains a URL starting with http.');
        return;
      }
      setParsedUrls(urls);
    } catch (err: any) {
      setFileError(err.message ?? 'Failed to parse file.');
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFileSelect(file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileSelect(file);
  };

  // ── Run import ───────────────────────────────────────────────
  const handleRunImport = async () => {
    const rawUrls = activeTab === 'text' ? extractUrlsFromText(textInput) : parsedUrls;
    const limit = activeTab === 'text' ? 50 : 300;
    const urls = rawUrls.slice(0, limit);
    if (urls.length === 0) return;

    abortRef.current = false;
    setRunStatus('running');
    setCurrentIndex(0);
    setResults([]);

    // Initialise all as pending
    const statusMap = new Map<string, 'pending' | 'processing' | 'done' | 'error'>();
    urls.forEach(u => statusMap.set(u, 'pending'));
    setUrlStatuses(new Map(statusMap));

    const allResults: BulkImportResult[] = [];

    // Process in batches of 5 to avoid overwhelming the server
    const BATCH = 5;
    for (let i = 0; i < urls.length; i += BATCH) {
      if (abortRef.current) break;
      const batch = urls.slice(i, i + BATCH);

      // Mark batch as processing
      setUrlStatuses(prev => {
        const next = new Map(prev);
        batch.forEach(u => next.set(u, 'processing'));
        return next;
      });
      setCurrentIndex(i);

      try {
        const token = await getAccessToken();
        const res = await fetch('/api/admin/bulk-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ urls: batch }),
        });

        const body = await res.json();
        const batchResults: BulkImportResult[] = body.results ?? batch.map((url: string) => ({
          url,
          success: false,
          error: body.error ?? 'Server error'
        }));

        // Update statuses
        setUrlStatuses(prev => {
          const next = new Map(prev);
          batchResults.forEach(r => next.set(r.url, r.success ? 'done' : 'error'));
          return next;
        });

        allResults.push(...batchResults);
        setResults([...allResults]);
        setCurrentIndex(i + batch.length);
      } catch (err: any) {
        // Mark entire batch as error
        setUrlStatuses(prev => {
          const next = new Map(prev);
          batch.forEach(u => next.set(u, 'error'));
          return next;
        });
        batch.forEach(u => allResults.push({ url: u, success: false, error: 'Network error' }));
        setResults([...allResults]);
      }
    }

    setRunStatus('done');
  };

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  const maxLimit = activeTab === 'text' ? 50 : 300;
  const rawUrlsReady = activeTab === 'text' ? extractUrlsFromText(textInput) : parsedUrls;
  const urlsReady = rawUrlsReady.slice(0, maxLimit);

  const successfulResults = results.filter(r => r.success);
  const missingAffiliates = successfulResults.filter(r => !r.affiliateGenerated);
  const hasMissingAffiliates = missingAffiliates.length > 0;

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(17,33,51,0.65)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', border: '2px solid rgba(125,42,232,0.18)' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-black/8"
          style={{ background: 'linear-gradient(135deg, #7D2AE8 0%, #5B1CA8 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Upload size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-base uppercase tracking-wider font-grotesk">
                Bulk Upload Products
              </h2>
              <p className="text-white/65 text-xs font-sans mt-0.5">Import up to 50 URLs (text) or 300 URLs (file) at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={runStatus === 'running'}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center transition-all text-white disabled:opacity-40"
            id="bulk-import-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Tabs ── */}
        {runStatus === 'idle' && (
          <div className="flex border-b border-black/8 px-7 pt-4">
            {([
              { key: 'text', label: 'Paste URLs', icon: <ClipboardList size={14} /> },
              { key: 'file', label: 'Upload File', icon: <FileSpreadsheet size={14} /> },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setParsedUrls([]); setFileError(''); setSelectedFile(null); }}
                className={`flex items-center gap-1.5 pb-3 mr-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 font-grotesk ${
                  activeTab === tab.key
                    ? 'border-[#7D2AE8] text-[#7D2AE8]'
                    : 'border-transparent text-black/40 hover:text-black'
                }`}
                id={`bulk-tab-${tab.key}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">

          {/* ── IDLE: Text Input Tab ── */}
          {runStatus === 'idle' && activeTab === 'text' && (
            <div className="space-y-3">
              <p className="text-xs text-black/50 font-sans">
                Paste product URLs separated by <strong>commas</strong> or <strong>new lines</strong>. Supports any retailer (AJIO, Myntra, Zara, H&M, Snitch, etc.)
              </p>
              <textarea
                id="bulk-text-input"
                value={textInput}
                onChange={e => { setTextInput(e.target.value); setParsedUrls([]); }}
                onBlur={previewUrls}
                placeholder={`https://www.ajio.com/product/...\nhttps://www.myntra.com/product/...\nhttps://www.snitch.co.in/products/...`}
                className="w-full h-44 rounded-2xl border border-black/12 bg-[#F8F7FF] p-4 text-xs font-mono text-[#112133] placeholder:text-black/25 resize-none focus:outline-none focus:border-[#7D2AE8]/50 focus:ring-2 focus:ring-[#7D2AE8]/10 transition-all"
                style={{ lineHeight: '1.7' }}
              />
              {textInput.trim() && (
                <button
                  onClick={previewUrls}
                  className="text-xs font-grotesk font-bold text-[#7D2AE8] hover:underline flex items-center gap-1"
                >
                  <ChevronRight size={13} /> Preview detected URLs
                </button>
              )}
            </div>
          )}

          {/* ── IDLE: File Upload Tab ── */}
          {runStatus === 'idle' && activeTab === 'file' && (
            <div className="space-y-3">
              <p className="text-xs text-black/50 font-sans">
                Upload a file with one URL per row/line. Supported formats:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { ext: '.xlsx / .xls', icon: <FileSpreadsheet size={13} className="text-emerald-600" />, label: 'Excel' },
                  { ext: '.csv', icon: <FileText size={13} className="text-blue-500" />, label: 'CSV' },
                  { ext: '.txt', icon: <FileText size={13} className="text-orange-500" />, label: 'Text' },
                  { ext: '.docx', icon: <FileType2 size={13} className="text-indigo-500" />, label: 'Word' },
                ].map(f => (
                  <span key={f.ext} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 text-xs font-grotesk font-bold text-black/60">
                    {f.icon} {f.label} <span className="font-mono text-black/35">{f.ext}</span>
                  </span>
                ))}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-10 ${
                  isDragging
                    ? 'border-[#7D2AE8] bg-[#7D2AE8]/5'
                    : 'border-black/15 hover:border-[#7D2AE8]/40 hover:bg-[#F8F7FF]'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDragging ? 'bg-[#7D2AE8]/15' : 'bg-black/5'}`}>
                  <Upload size={22} className={isDragging ? 'text-[#7D2AE8]' : 'text-black/35'} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#112133] font-grotesk">
                    {selectedFile ? selectedFile.name : 'Drop file here or click to browse'}
                  </p>
                  <p className="text-xs text-black/40 mt-1 font-sans">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Excel, CSV, TXT or Word document'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.docx,.doc"
                  className="hidden"
                  onChange={handleFileInputChange}
                  id="bulk-file-input"
                />
              </div>

              {fileError && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  {fileError}
                </div>
              )}
            </div>
          )}

          {/* ── URL Preview List ── */}
          {runStatus === 'idle' && parsedUrls.length > 0 && (
            <div className="rounded-2xl border border-black/10 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F7FF] border-b border-black/8">
                <span className="text-xs font-black uppercase tracking-wider text-[#7D2AE8] font-grotesk">
                  {parsedUrls.length} URL{parsedUrls.length !== 1 ? 's' : ''} detected
                </span>
                <span className="text-[10px] text-black/40 font-sans">Max {maxLimit} will be processed</span>
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-black/5">
                {parsedUrls.slice(0, maxLimit).map((url, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 hover:bg-black/2 transition-all">
                    <Link2 size={11} className="text-black/30 flex-shrink-0" />
                    <span className="text-[11px] font-mono text-black/55 truncate">{url}</span>
                  </div>
                ))}
                {parsedUrls.length > maxLimit && (
                  <div className="px-4 py-2 text-[11px] text-black/40 font-sans italic">
                    +{parsedUrls.length - maxLimit} more URLs (will be skipped — {maxLimit} max per batch)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── RUNNING: Progress View ── */}
          {runStatus === 'running' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-2">
                <Loader2 size={18} className="text-[#7D2AE8] animate-spin" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-[#112133] font-grotesk">
                      Processing {Math.min(currentIndex + 5, urlsReady.length)} of {urlsReady.length} URLs…
                    </span>
                    <span className="text-[10px] text-black/40">{Math.round((currentIndex / urlsReady.length) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/8 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7D2AE8] to-[#A855F7] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((currentIndex / urlsReady.length) * 100, 95)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-black/5">
                  {urlsReady.map((url, i) => {
                    const status = urlStatuses.get(url) ?? 'pending';
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-shrink-0 w-5">
                          {status === 'pending' && <div className="w-2 h-2 rounded-full bg-black/15 mx-auto" />}
                          {status === 'processing' && <Loader2 size={14} className="text-[#7D2AE8] animate-spin" />}
                          {status === 'done' && <CheckCircle2 size={14} className="text-emerald-500" />}
                          {status === 'error' && <XCircle size={14} className="text-red-400" />}
                        </div>
                        <span className="text-[11px] font-mono text-black/55 truncate flex-1">{url}</span>
                        <span className={`text-[10px] font-grotesk font-bold uppercase tracking-wide flex-shrink-0 ${
                          status === 'done' ? 'text-emerald-500' :
                          status === 'error' ? 'text-red-400' :
                          status === 'processing' ? 'text-[#7D2AE8]' :
                          'text-black/25'
                        }`}>
                          {status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── DONE: Results Summary ── */}
          {runStatus === 'done' && (
            <div className="space-y-4">
              {/* Summary banner */}
              <div className={`flex items-center gap-4 rounded-2xl px-5 py-4 ${
                errorCount === 0
                  ? 'bg-emerald-50 border border-emerald-100'
                  : successCount === 0
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-amber-50 border border-amber-100'
              }`}>
                {errorCount === 0
                  ? <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0" />
                  : successCount === 0
                    ? <XCircle size={22} className="text-red-400 flex-shrink-0" />
                    : <AlertTriangle size={22} className="text-amber-500 flex-shrink-0" />
                }
                <div>
                  <p className="font-black text-sm text-[#112133] font-grotesk">
                    {successCount > 0 && `${successCount} product${successCount !== 1 ? 's' : ''} imported successfully`}
                    {successCount > 0 && errorCount > 0 && ' · '}
                    {errorCount > 0 && `${errorCount} failed`}
                  </p>
                  <p className="text-xs text-black/50 mt-0.5 font-sans">
                    {successCount > 0
                      ? 'Select how you want to proceed with the successfully curated products below.'
                      : 'All URLs failed to import. Check the URLs and try again.'}
                  </p>
                </div>
              </div>

              {/* Affiliate Warning Banner */}
              {hasMissingAffiliates && (
                <div className="flex items-start gap-3 rounded-2xl px-5 py-4 bg-amber-50 border border-amber-200">
                  <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-xs text-[#112133] font-grotesk uppercase tracking-wide">
                      Affiliate Links Not Available
                    </p>
                    <p className="text-xs text-black/60 mt-1 font-sans leading-relaxed">
                      EarnKaro was unable to generate affiliate links for <strong>{missingAffiliates.length}</strong> product{missingAffiliates.length !== 1 ? 's' : ''} (unsupported retailers or API error).
                      You can choose to proceed with all products anyway, or discard them and only import the rest.
                    </p>
                  </div>
                </div>
              )}

              {/* Per-URL results */}
              <div className="rounded-2xl border border-black/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F8F7FF] border-b border-black/8">
                  <span className="text-xs font-black uppercase tracking-wider text-black/50 font-grotesk">Results</span>
                </div>
                <div className="max-h-52 overflow-y-auto divide-y divide-black/5">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {r.success
                          ? <CheckCircle2 size={14} className="text-emerald-500" />
                          : <XCircle size={14} className="text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-black/55 truncate">{r.url}</p>
                        {r.success && r.data?.title && (
                          <p className="text-xs font-bold text-[#112133] mt-0.5 truncate">{r.data.title}</p>
                        )}
                        {!r.success && r.error && (
                          <p className="text-[11px] text-red-400 mt-0.5">{r.error}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {r.success && r.data?.brand && (
                          <span className="text-[10px] font-grotesk font-bold text-[#7D2AE8] bg-[#7D2AE8]/8 px-2 py-0.5 rounded-lg">
                            {r.data.brand}
                          </span>
                        )}
                        {r.success && (
                          r.affiliateGenerated ? (
                            <span className="text-[9px] font-sans font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              Affiliate Link OK
                            </span>
                          ) : (
                            <span className="text-[9px] font-sans font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              No Affiliate Link
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer / Actions ── */}
        <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-black/8 bg-[#FAFAFA]">
          {runStatus === 'idle' && (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black/50 hover:text-black hover:bg-black/5 transition-all font-grotesk"
              >
                Cancel
              </button>
              <button
                onClick={handleRunImport}
                disabled={urlsReady.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all font-grotesk disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                style={{
                  background: urlsReady.length > 0
                    ? 'linear-gradient(135deg, #7D2AE8 0%, #5B1CA8 100%)'
                    : '#ccc'
                }}
                id="bulk-import-run"
              >
                <Upload size={14} />
                Import {urlsReady.length > 0 ? `${Math.min(urlsReady.length, maxLimit)} Product${urlsReady.length !== 1 ? 's' : ''}` : 'Products'}
              </button>
            </>
          )}

          {runStatus === 'running' && (
            <div className="flex items-center gap-2 text-xs text-black/50 font-sans">
              <Loader2 size={13} className="animate-spin text-[#7D2AE8]" />
              Importing… please don't close this window.
            </div>
          )}

          {runStatus === 'done' && (
            <>
              <button
                onClick={() => {
                  setRunStatus('idle');
                  setResults([]);
                  setUrlStatuses(new Map());
                  setTextInput('');
                  setParsedUrls([]);
                  setSelectedFile(null);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-black/50 hover:text-black hover:bg-black/5 transition-all font-grotesk"
              >
                Import More
              </button>
              
              {successCount > 0 ? (
                hasMissingAffiliates ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const supported = results.filter(r => !r.success || r.affiliateGenerated);
                        onImportComplete(supported);
                      }}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shadow-sm"
                      id="bulk-proceed-supported"
                    >
                      Import Supported Only ({successCount - missingAffiliates.length})
                    </button>
                    <button
                      onClick={() => {
                        onImportComplete(results);
                      }}
                      className="px-5 py-2.5 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider transition-all shadow-sm"
                      id="bulk-proceed-all"
                    >
                      Import All ({successCount})
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onImportComplete(results);
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-grotesk font-black uppercase tracking-wider text-white transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                    id="bulk-import-done-success"
                  >
                    <CheckCircle2 size={14} />
                    Done (Add {successCount} Product{successCount !== 1 ? 's' : ''})
                  </button>
                )
              ) : (
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-all font-grotesk shadow-sm"
                  id="bulk-import-done-fail"
                >
                  Close
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
