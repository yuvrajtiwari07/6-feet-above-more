import React, { useState } from 'react';
import { CatalogCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import { Plus, Edit2, Trash2, Globe, FileText, CheckCircle, XCircle } from 'lucide-react';

export const CatalogCategoryAdmin: React.FC = () => {
  const { catalogCategories, addCatalogCategory, updateCatalogCategory, deleteCatalogCategory } = useApp();

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setSlug('');
    setDescription('');
    setCoverImage('');
    setSortOrder(0);
    setIsActive(true);
    setError('');
    setShowForm(true);
  };

  const handleOpenEdit = (cat: CatalogCategory) => {
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setCoverImage(cat.coverImage || '');
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setError('');
    setShowForm(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editId) {
      // Auto-generate slug
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
      sortOrder: Number(sortOrder),
      isActive,
    };

    try {
      if (editId) {
        await updateCatalogCategory(editId, payload);
      } else {
        await addCatalogCategory(payload);
      }
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Catalogs inside will have their category set to null/unassigned.')) {
      return;
    }
    try {
      await deleteCatalogCategory(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black font-display uppercase tracking-wider text-black">
            Catalog Categories
          </h2>
          <p className="text-xs text-black/50">Manage landing folders for themed catalogs.</p>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7D2AE8] hover:bg-[#6820C4] text-white rounded-xl text-xs font-grotesk font-black uppercase tracking-wider transition"
          >
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-black/10 rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-black text-lg uppercase text-[#7D2AE8] border-b border-black/5 pb-2">
            {editId ? 'Edit Category' : 'Create Category'}
          </h3>

          {error && (
            <div className="p-3 bg-[#FFD43B] text-black/10 text-[#D5A021] text-xs font-bold rounded-xl border border-[#FFD43B]/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Category Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Streetwear Drops"
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
                placeholder="streetwear-drops"
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
              placeholder="Oversized cuts, drop shoulder box tees and skater silhouettes."
              rows={2}
              className="px-3.5 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Cover Image URL
              </label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                <input
                  type="url"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/15 focus:ring-2 focus:ring-[#7D2AE8] text-xs"
                />
              </div>
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

          <div className="flex items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-black/55 tracking-wider">
                Active Category
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7D2AE8]"></div>
              </label>
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
              {loading ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      {/* Categories List Table */}
      {!showForm && (
        <div className="bg-white border border-black/15 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-black/5 font-grotesk font-black uppercase tracking-wider border-b border-black/10 text-black/60">
              <tr>
                <th className="p-4 w-12">Order</th>
                <th className="p-4">Category Name</th>
                <th className="p-4">Slug</th>
                <th className="p-4">Description</th>
                <th className="p-4 w-24">Status</th>
                <th className="p-4 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {catalogCategories.map(cat => (
                <tr key={cat.id} className="hover:bg-black/[0.01]">
                  <td className="p-4 font-mono font-bold text-black/40">{cat.sortOrder}</td>
                  <td className="p-4 font-bold flex items-center gap-3">
                    {cat.coverImage ? (
                      <img
                        src={cat.coverImage}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-black/5 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center border border-black/5 text-black/30 shrink-0">
                        <FileText size={14} />
                      </div>
                    )}
                    <span className="text-black">{cat.name}</span>
                  </td>
                  <td className="p-4 font-mono text-black/50">{cat.slug}</td>
                  <td className="p-4 text-black/60 line-clamp-1 max-w-xs">{cat.description || '-'}</td>
                  <td className="p-4">
                    {cat.isActive ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/15 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-black/5 text-black/40 border border-black/10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-2 hover:bg-black/5 rounded-lg text-black/60 hover:text-black transition"
                        title="Edit category"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 hover:bg-[#FFD43B] text-black/10 rounded-lg text-black/60 hover:text-[#D5A021] transition"
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {catalogCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-black/30 font-bold uppercase tracking-wider font-grotesk">
                    No catalog categories created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
