import React, { useEffect, useState } from 'react';
import { productsApi } from '../../api/billingApi.js';
import { Package, Plus, Trash2, Search, Tag, DollarSign, Layers, ChevronRight, X } from 'lucide-react';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [toast, setToast] = useState(null);

  // Modals state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);

  // Product Form State
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    type: 'SERVICE',
    salesPrice: '',
    costPrice: '',
    description: '',
  });

  // Variant Form State
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    additionalPrice: '0',
    description: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
        ...(search && { search }),
        ...(typeFilter && { type: typeFilter }),
      };
      const res = await productsApi.list(params);
      setProducts(res.data.items || res.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, typeFilter]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await productsApi.create({
        name: productForm.name,
        sku: productForm.sku || undefined,
        type: productForm.type,
        salesPrice: parseFloat(productForm.salesPrice),
        costPrice: productForm.costPrice ? parseFloat(productForm.costPrice) : 0,
        description: productForm.description || undefined,
      });
      showToast('Product created successfully');
      setIsAddProductOpen(false);
      setProductForm({ name: '', sku: '', type: 'SERVICE', salesPrice: '', costPrice: '', description: '' });
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to create product', 'error');
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!selectedProductForVariant) return;
    try {
      await productsApi.addVariant(selectedProductForVariant.id, {
        name: variantForm.name,
        sku: variantForm.sku,
        additionalPrice: parseFloat(variantForm.additionalPrice || '0'),
        description: variantForm.description || undefined,
      });
      showToast(`Variant added to ${selectedProductForVariant.name}`);
      setSelectedProductForVariant(null);
      setVariantForm({ name: '', sku: '', additionalPrice: '0', description: '' });
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to add variant', 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      showToast('Product deleted');
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete product', 'error');
    }
  };

  const handleDeleteVariant = async (productId, variantId) => {
    if (!window.confirm('Delete this variant?')) return;
    try {
      await productsApi.deleteVariant(productId, variantId);
      showToast('Variant removed');
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to remove variant', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-800'
              : 'bg-emerald-950 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-purple-500"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <Package className="w-3.5 h-3.5" /> Product Catalog
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Products & Configurable Variants</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage subscription-eligible goods and services with pricing attributes.
            </p>
          </div>
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Product Types</option>
          <option value="SERVICE">Services</option>
          <option value="GOODS">Physical Goods</option>
        </select>
      </div>

      {/* Products Table */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-white">No products found</p>
          <p className="text-xs text-slate-500 mt-1">Add your first subscription product or variant.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="glass-panel rounded-2xl border border-slate-800 p-5 hover:border-slate-700 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base">{prod.name}</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-400">
                        {prod.type}
                      </span>
                      {prod.sku && (
                        <span className="text-xs font-mono text-slate-500">SKU: {prod.sku}</span>
                      )}
                    </div>
                    {prod.description && (
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">{prod.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Base Price</div>
                    <div className="font-mono text-lg font-bold text-emerald-400">
                      ${Number(prod.salesPrice).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-500">Cost Price</div>
                    <div className="font-mono text-sm text-slate-400">
                      ${Number(prod.costPrice || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                    <button
                      onClick={() => setSelectedProductForVariant(prod)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Variant
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Variants Section */}
              {prod.variants && prod.variants.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Configurable Variants ({prod.variants.length}):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {prod.variants.map((v) => {
                      const addPrice = Number(v.additionalPrice || 0);
                      const effective = Number(prod.salesPrice) + addPrice;
                      return (
                        <div
                          key={v.id}
                          className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-200">{v.name}</div>
                            <div className="font-mono text-slate-500 text-[11px]">
                              {v.sku} &bull; +${addPrice.toFixed(2)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-semibold">
                              ${effective.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleDeleteVariant(prod.id, v.id)}
                              className="text-slate-600 hover:text-rose-400 transition"
                              title="Delete Variant"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Product */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" /> Create Product
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise ERP License"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">SKU / Code</label>
                  <input
                    type="text"
                    placeholder="ERP-BASE-01"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="SERVICE">SERVICE</option>
                    <option value="GOODS">GOODS</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sales Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1200.00"
                    value={productForm.salesPrice}
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="400.00"
                    value={productForm.costPrice}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Comprehensive cloud ERP solution..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Variant */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" /> Add Configurable Variant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adding to {selectedProductForVariant.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForVariant(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddVariant} className="space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Variant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odoo Brand Connector"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Variant SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="ERP-ODOO-560"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Additional Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="560.00"
                    value={variantForm.additionalPrice}
                    onChange={(e) => setVariantForm({ ...variantForm, additionalPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <span className="text-slate-500">Effective Variant Price:</span>{' '}
                <span className="font-mono text-cyan-300 font-bold">
                  $
                  {(
                    Number(selectedProductForVariant.salesPrice) +
                    parseFloat(variantForm.additionalPrice || '0')
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedProductForVariant(null)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  Add Variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
