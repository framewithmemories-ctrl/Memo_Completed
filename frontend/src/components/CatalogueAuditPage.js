import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowLeft, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const adminToken = () => {
  try { return JSON.parse(localStorage.getItem('adminAuth') || '{}').token || ''; } catch { return ''; }
};

const config = () => ({ headers: { Authorization: `Bearer ${adminToken()}` } });

const classify = (p) => {
  const missing = [];
  if (!p?.name?.trim()) missing.push('name');
  if (!p?.sku?.trim()) missing.push('SKU');
  if (!(Number(p?.base_price) > 0)) missing.push('price');
  if (!(p?.media?.primary_image || p?.image_url)) missing.push('image');
  if (!p?.category?.trim()) missing.push('category');
  if (!p?.slug?.trim()) missing.push('slug');
  const hasSeo = Boolean(p?.seo?.title || p?.seo?.description || p?.seo?.keywords?.length);
  const hasCustomization = Boolean(p?.customization?.enabled);
  if (missing.length >= 3) return { label: 'Invalid', tone: 'destructive', missing, hasSeo, hasCustomization };
  if (missing.length) return { label: 'Needs cleanup', tone: 'secondary', missing, hasSeo, hasCustomization };
  return { label: 'Ready', tone: 'default', missing, hasSeo, hasCustomization };
};

const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const CatalogueAuditPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // Read-only audit: ask the existing catalogue API for a large page. No writes or migrations.
      const response = await axios.get(`${API}/products?limit=1000`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.products || []);
      setProducts(data);
      setLoadedAt(new Date());
      toast.success(`Audited ${data.length} products`);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Unable to load catalogue');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (!adminToken()) return; load(); }, []);

  const audit = useMemo(() => {
    const rows = products.map((p) => ({ p, result: classify(p) }));
    const names = new Map(); const skus = new Map(); const slugs = new Map();
    rows.forEach(({ p }) => {
      const add = (map, value) => { if (!value) return; map.set(value, [...(map.get(value) || []), p]); };
      add(names, p.name?.trim().toLowerCase());
      add(skus, p.sku?.trim().toLowerCase());
      add(slugs, p.slug?.trim().toLowerCase());
    });
    const duplicateIds = new Set();
    [names, skus, slugs].forEach((map) => map.forEach((items) => { if (items.length > 1) items.forEach((p) => duplicateIds.add(p.id)); }));
    const counts = rows.reduce((acc, { p, result }) => {
      acc[result.label] = (acc[result.label] || 0) + 1;
      if (result.missing.includes('SKU')) acc.missingSku++;
      if (result.missing.includes('image')) acc.missingImage++;
      if (result.missing.includes('price')) acc.missingPrice++;
      if (result.missing.includes('category')) acc.missingCategory++;
      if (result.missing.includes('slug')) acc.missingSlug++;
      if (!result.hasSeo) acc.noSeo++;
      if (!result.hasCustomization) acc.noCustomization++;
      acc.status[p?.status?.published === true ? 'Published' : 'Unpublished']++;
      acc.categories[p?.category || 'Uncategorised'] = (acc.categories[p?.category || 'Uncategorised'] || 0) + 1;
      return acc;
    }, { missingSku: 0, missingImage: 0, missingPrice: 0, missingCategory: 0, missingSlug: 0, noSeo: 0, noCustomization: 0, status: {}, categories: {} });
    const duplicates = { names: [...names.entries()].filter(([, v]) => v.length > 1), skus: [...skus.entries()].filter(([, v]) => v.length > 1), slugs: [...slugs.entries()].filter(([, v]) => v.length > 1) };
    return { rows, counts, duplicateIds, duplicates };
  }, [products]);

  const downloadCsv = () => {
    const header = ['id','name','sku','slug','category','base_price','image','published','customization_enabled','seo_present','classification','missing_fields'];
    const lines = [header.map(csvEscape).join(',')];
    audit.rows.forEach(({ p, result }) => lines.push([
      p.id, p.name, p.sku, p.slug, p.category, p.base_price,
      p.media?.primary_image || p.image_url, p.status?.published === true, result.hasCustomization, result.hasSeo,
      result.label, result.missing.join('|')
    ].map(csvEscape).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `memories-catalogue-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (!adminToken()) return <div className="min-h-screen flex items-center justify-center p-6"><Card className="max-w-md w-full"><CardHeader><CardTitle>Admin authentication required</CardTitle></CardHeader><CardContent><Button onClick={() => { window.location.href = '/admin'; }}>Open Admin</Button></CardContent></Card></div>;

  const topCategories = Object.entries(audit.counts.categories).sort((a,b) => b[1]-a[1]).slice(0, 12);

  return <div className="min-h-screen bg-slate-50 p-4 md:p-6">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><Button variant="outline" className="mb-3 gap-2" onClick={() => { window.location.href='/admin'; }}><ArrowLeft className="h-4 w-4"/>Back to Admin</Button><h1 className="text-3xl font-bold">Catalogue Audit</h1><p className="text-sm text-muted-foreground mt-1">Read-only inspection of the existing Memories product catalogue.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading} className="gap-2"><RefreshCw className="h-4 w-4"/>{loading ? 'Auditing…' : 'Refresh Audit'}</Button><Button onClick={downloadCsv} disabled={!products.length} className="gap-2"><Download className="h-4 w-4"/>Download CSV</Button></div>
      </div>

      <div className="rounded-xl border bg-white p-4 flex gap-3 items-start"><ShieldCheck className="h-5 w-5 text-green-600 mt-0.5"/><div><p className="font-medium">Read-only safety gate</p><p className="text-sm text-muted-foreground">This screen does not create, update, delete, publish, archive or migrate products.</p>{loadedAt && <p className="text-xs text-muted-foreground mt-1">Last audited: {loadedAt.toLocaleString()}</p>}</div></div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        {['Ready','Needs cleanup','Invalid'].map((label) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold">{audit.counts[label] || 0}</p></CardContent></Card>)}
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dup names</p><p className="text-2xl font-bold">{audit.duplicates.names.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Dup SKUs</p><p className="text-2xl font-bold">{audit.duplicates.skus.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">No image</p><p className="text-2xl font-bold">{audit.counts.missingImage}</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Data quality</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3">{[['Missing SKU',audit.counts.missingSku],['Missing image',audit.counts.missingImage],['Missing price',audit.counts.missingPrice],['Missing category',audit.counts.missingCategory],['Missing slug',audit.counts.missingSlug],['No SEO',audit.counts.noSeo],['No customization',audit.counts.noCustomization]].map(([k,v]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-semibold">{v}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Catalogue categories</CardTitle></CardHeader><CardContent className="space-y-2">{topCategories.length ? topCategories.map(([name,count]) => <div key={name} className="flex justify-between border-b pb-2 last:border-0"><span>{name}</span><Badge variant="secondary">{count}</Badge></div>) : <p className="text-sm text-muted-foreground">No products loaded.</p>}</CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle>Duplicate groups</CardTitle></CardHeader><CardContent className="grid gap-6 md:grid-cols-3"><div><h3 className="font-medium mb-2">Names ({audit.duplicates.names.length})</h3>{audit.duplicates.names.slice(0,10).map(([key,items]) => <p key={key} className="text-sm truncate" title={key}>{key} <span className="text-muted-foreground">×{items.length}</span></p>)}</div><div><h3 className="font-medium mb-2">SKUs ({audit.duplicates.skus.length})</h3>{audit.duplicates.skus.slice(0,10).map(([key,items]) => <p key={key} className="text-sm truncate" title={key}>{key} <span className="text-muted-foreground">×{items.length}</span></p>)}</div><div><h3 className="font-medium mb-2">Slugs ({audit.duplicates.slugs.length})</h3>{audit.duplicates.slugs.slice(0,10).map(([key,items]) => <p key={key} className="text-sm truncate" title={key}>{key} <span className="text-muted-foreground">×{items.length}</span></p>)}</div></CardContent></Card>

      <Card><CardHeader><CardTitle>Products requiring attention</CardTitle></CardHeader><CardContent><div className="overflow-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Product</th><th className="p-2">SKU</th><th className="p-2">Category</th><th className="p-2">Status</th><th className="p-2">Issues</th></tr></thead><tbody>{audit.rows.filter(({result,p}) => result.label !== 'Ready' || audit.duplicateIds.has(p.id)).slice(0,200).map(({p,result}) => <tr key={p.id} className="border-b"><td className="p-2 max-w-xs truncate">{p.name || 'Unnamed'}</td><td className="p-2">{p.sku || '—'}</td><td className="p-2">{p.category || '—'}</td><td className="p-2"><Badge variant={result.tone}>{result.label}</Badge></td><td className="p-2">{[...result.missing, audit.duplicateIds.has(p.id) ? 'duplicate review' : ''].filter(Boolean).join(', ') || '—'}</td></tr>)}</tbody></table></div></CardContent></Card>
    </div>
  </div>;
};

export default CatalogueAuditPage;
