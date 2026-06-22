import React, { useState, useEffect } from 'react';
import { Catalog, Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { ProductPickerInline } from './ProductPickerInline';
import { Plus, Edit2, Trash2, Globe, Sparkles, CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { getAccessToken } from '../../supabase';

interface Props {
  onOpenImportModal: (onImportSuccess: (importedProduct: Product) => void) => void;
}

export const CatalogAdmin: React.FC<Props> = ({ onOpenImportModal }) => {
  const {
    catalogs,
    catalogCategories,
    products,
    addCatalog,
    updateCatalog,
    deleteCatalog,
  } = useApp();

  const [adminCatalogs, setAdminCatalogs] = useState<Catalog[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [tagsInput, setTagsInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Affiliate link generation states
  const [genLoading, setGenLoading] = useState(false);

  const fetchAdminCatalogs = async () => {
    setLoadingList(true);
    try {
      const token = await getAccessToken().catch(() => null);
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/catalogs/admin', { headers });
      const data = await res.json();
      if (data.success) {
        setAdminCatalogs(data.catalogs);
      }
    } catch (err) {
      console.error('Failed to fetch admin catalogs list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAdminCatalogs();
  }, [catalogs]);

  const handleOpenAdd = () => {
    setEditId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setCategoryId(catalogCategories[0]?.id || '');
    setCoverImage('');
    setProductIds([]);
    setAffiliateUrl('');
    setIsPublished(true);
    setSortOrder(0);
    setTagsInput('');
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (c: Catalog) => {
    setEditId(c.id);
    setTitle(c.title);
    setSlug(c.slug);
    setDescription(c.description || '');
    setCategoryId(c.categoryId || '');
    setCoverImage(c.coverImage || '');
    setProductIds(c.productIds || []);
    setAffiliateUrl(c.affiliateUrl || '');
    setIsPublished(c.isPublished);
    setSortOrder(c.sortOrder);
    setTagsInput((c.tags || []).join(', '));
    setError('');
    setShowForm(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editId) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      setSlug(generated);
    }
  };

  const handleImportNewProduct = () => {
    onOpenImportModal((importedProduct: Product) => {
      // Callback after product import completes successfully
      // Auto-select the newly imported product
      setProductIds(prev => [...prev, importedProduct.id]);
    });
  };

  const handleGenerateAffiliate = async () => {
    if (!affiliateUrl.trim()) {
      setError('Please paste a base URL to generate affiliate link');
      return;
    }
    setGenLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/admin/generate-affiliate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url: affiliateUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAffiliateUrl(data.affiliateUrl);
      } else {
        setError(data.error || 'Failed to generate affiliate link');
      }
    } catch {
      setError('Failed to reach affiliate service');
    } finally {
      setGenLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const selectedCategory = catalogCategories.find(c => c.id === categoryId);
    if (!selectedCategory) {
      setError('A valid category is required');
      return;
    }

    setLoading(true);
    setError('');

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      categoryId,
      categoryName: selectedCategory.name,
      coverImage: coverImage.trim() || undefined,
      productIds,
      affiliateUrl: affiliateUrl.trim() || undefined,
      isPublished,
      sortOrder: Number(sortOrder),
      tags,
    };

    try {
      if (editId) {
        await updateCatalog(editId, payload);
      } else {
        await addCatalog(payload);
      }
      setShowForm(false);
      fetchAdminCatalogs();
    } catch (err: any) {
      setError(err.message || 'Failed to save catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this catalog?')) {
      return;
    }
    try {
      await deleteCatalog(id);
      fetchAdminCatalogs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete catalog');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black font-display uppercase tracking-wider text-black">
            Catalogs
          </h2>
          <p className="text-xs text-black/50">Assemble custom product edits into layouts.</p>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenAdd}
            disabled={catalogCategories.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7D2AE8] hover:bg-[#6820C4] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition"
          >
            <Plus size={14} /> Add Catalog
          </button>
        )}
      </div>

      {catalogCategories.length === 0 && (
        <div className="p-4 bg-[#FFCC00]/10 text-black border border-[#FFCC00]/25 rounded-2xl text-xs font-semibold">
          ⚠️ You must create at least one Catalog Category before assembling catalogs.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-black/10 rounded-2xl p-6 space-y-5">
          <h3 className="font-display font-black text-lg uppercase text-[#7D2AE8] border-b border-black/5 pb-2">
            {editId ? 'Edit Catalog' : 'Create Catalog'}
          </h3>

          {error && (
            <div className="p-3 bg-[#FF3F6C]/10 text-[#FF3F6C] text-xs font-bold rounded-xl border border-[#FF3F6C]/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Catalog Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="High-Waist Skate Fit Edit"
                required
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Slug (URL Path)
              </label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="skate-fit-edit"
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Skate drop tailored for 6'2+ bodies containing a cargo bottom, box graphic tee, and vulcanized shoes."
              rows={2}
              className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                required
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs bg-white"
              >
                {catalogCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Affiliate URL (EarnKaro Catalog Link)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={affiliateUrl}
                  onChange={e => setAffiliateUrl(e.target.value)}
                  placeholder="https://earnkaro.com/..."
                  className="flex-grow px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
                />
                <button
                  type="button"
                  onClick={handleGenerateAffiliate}
                  disabled={genLoading}
                  className="px-3.5 py-2.5 bg-black hover:bg-black/85 text-white rounded-xl text-xs font-black uppercase transition-all shrink-0"
                >
                  {genLoading ? <Loader2 size={13} className="animate-spin" /> : 'Generate'}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="summer, skate, street"
                className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
              />
            </div>
          </div>

          {/* PRODUCT PICKER */}
          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-black uppercase text-black/55 tracking-wider block">
              Assemble Products
            </label>
            <ProductPickerInline
              products={products}
              selectedIds={productIds}
              onChange={setProductIds}
              onImportNewProduct={handleImportNewProduct}
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Catalog Status
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7D2AE8]"></div>
              </label>
              <span className="text-[10px] font-bold text-black/60 uppercase">
                {isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-black/5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Catalog'}
            </button>
          </div>
        </form>
      )}

      {/* Catalogs Grid List */}
      {!showForm && (
        <div className="bg-[#F9F8F6] border border-black/10 rounded-2xl p-4">
          {loadingList ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin text-[#7D2AE8]" size={24} />
            </div>
          ) : adminCatalogs.length === 0 ? (
            <div className="text-center py-12 text-black/30 font-bold uppercase tracking-wider font-grotesk">
              No catalogs assembled yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminCatalogs.map(c => {
                const count = c.productIds?.length || 0;
                return (
                  <div
                    key={c.id}
                    className="bg-white border-2 border-black/10 rounded-2xl p-4 flex flex-col justify-between hover:border-black/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[8px] bg-black/5 border border-black/10 text-black/60 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                          {c.categoryName}
                        </span>
                        {c.isPublished ? (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">
                            Published
                          </span>
                        ) : (
                          <span className="text-[8px] bg-black/5 text-black/40 px-2 py-0.5 rounded font-black uppercase">
                            Draft
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-black text-sm text-black line-clamp-1 mb-1">{c.title}</h3>
                      <p className="text-[10px] text-black/50 line-clamp-2 leading-relaxed mb-3">{c.description || 'No description'}</p>
                    </div>

                    <div className="border-t border-black/5 pt-3 flex items-center justify-between">
                      <span className="text-[10px] font-black text-black/60 uppercase">
                        {count} {count === 1 ? 'Product' : 'Products'}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 hover:bg-black/5 rounded text-black/60 hover:text-black transition"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 hover:bg-[#FF3F6C]/10 rounded text-black/60 hover:text-[#FF3F6C] transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
