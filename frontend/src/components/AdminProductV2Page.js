import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Search, Plus, ArrowLeft, Eye, Package } from 'lucide-react';
import { toast } from 'sonner';
import { AdminProductV2Editor } from './AdminProductV2Editor';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAdminToken = () => {
  try { return JSON.parse(localStorage.getItem('adminAuth') || '{}').token || ''; } catch { return ''; }
};

const authConfig = () => ({ headers: { Authorization: `Bearer ${getAdminToken()}` } });

const AdminProductV2Page = () => {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error('Unable to load products');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => [p.name, p.sku, p.category, p.subcategory].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [products, query]);

  const previewImage = selected?.media?.primary_image || selected?.image_url || '';
  const previewPrice = Number(selected?.base_price);

  if (!getAdminToken()) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Memories Product Manager</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Please sign in through the existing Memories Admin Panel first.</p>
            <Button className="w-full" onClick={() => { window.location.href = '/admin'; }}>Open Admin Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selected !== null) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-center gap-3">
            <Button variant="outline" onClick={() => setSelected(null)} className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Products</Button>
            <Badge variant="secondary">Visual checkpoint</Badge>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <AdminProductV2Editor
              product={selected.id ? selected : undefined}
              onCancel={() => setSelected(null)}
              onSaved={(saved) => { setSelected(null); loadProducts(); toast.success('Saved. Product list refreshed.'); }}
            />
            <Card className="h-fit xl:sticky xl:top-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Live product preview</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div className="aspect-square bg-slate-100">
                    {previewImage ? <img src={previewImage} alt={selected.name || 'Product preview'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Add a primary image</div>}
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{selected.category || 'Gift'}</p>
                    <h3 className="text-lg font-semibold">{selected.name || 'Product name'}</h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{selected.short_description || selected.description || 'Your short product description will appear here.'}</p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xl font-bold">{Number.isFinite(previewPrice) && previewPrice > 0 ? `₹${previewPrice.toLocaleString('en-IN')}` : '₹—'}</span>
                      {selected.customization?.enabled && <Badge>Customizable</Badge>}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">This is an admin-side visual checkpoint. The public PDP remains unchanged until we approve the storefront design.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Memories Ecommerce</p>
            <h1 className="text-3xl font-bold tracking-tight">Product Manager V2</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage the full product model before we start the catalogue import.</p>
          </div>
          <Button onClick={() => setSelected({})} className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" />Products <Badge variant="secondary">{products.length}</Badge></CardTitle>
            <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, SKU or category" className="pl-9" /></div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading products…</p> : filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No products found.</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((product) => {
                  const image = product.media?.primary_image || product.image_url;
                  return <button key={product.id} type="button" onClick={() => setSelected(product)} className="group overflow-hidden rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="aspect-[4/3] bg-slate-100">{image ? <img src={image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>}</div>
                    <div className="space-y-1 p-4"><div className="flex items-center justify-between gap-2"><h2 className="line-clamp-1 font-semibold">{product.name}</h2><span className="shrink-0 text-sm font-bold">₹{Number(product.base_price || 0).toLocaleString('en-IN')}</span></div><p className="text-xs text-muted-foreground">{product.sku || 'No SKU'} · {product.category || 'Uncategorised'}</p></div>
                  </button>;
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProductV2Page;
