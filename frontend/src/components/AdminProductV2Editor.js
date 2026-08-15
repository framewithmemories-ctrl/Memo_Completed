import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Image as ImageIcon } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_PRODUCT = {
  name: '', sku: '', short_description: '', description: '', category: 'frames', subcategory: '',
  base_price: '', compare_at_price: '', image_url: '',
  sizes: [], materials: [], colors: [], tags: [], occasions: [], recipients: [],
  variants: [],
  customization: { enabled: false, photo_upload: false, min_photos: 0, max_photos: 1, name: false, date: false, message: false, quote: false, logo_upload: false, preview: false },
  media: { primary_image: '', gallery: [], video_url: '' },
  fulfilment: { production_days: 2, pickup_available: true, delivery_available: true },
  marketing: { featured: false, bestseller: false, new_arrival: false, trending: false },
  seo: { title: '', meta_description: '' },
  status: { active: true, published: false },
};

const asList = (value) => Array.isArray(value) ? value : [];
const splitList = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
const joinList = (value) => asList(value).join(', ');

const normalizeProduct = (product = {}) => ({
  ...DEFAULT_PRODUCT,
  ...product,
  base_price: product.base_price ?? '',
  compare_at_price: product.compare_at_price ?? '',
  image_url: product.image_url || product.media?.primary_image || '',
  sizes: asList(product.sizes), materials: asList(product.materials), colors: asList(product.colors),
  tags: asList(product.tags), occasions: asList(product.occasions), recipients: asList(product.recipients),
  variants: asList(product.variants),
  customization: { ...DEFAULT_PRODUCT.customization, ...(product.customization || {}) },
  media: { ...DEFAULT_PRODUCT.media, ...(product.media || {}) },
  fulfilment: { ...DEFAULT_PRODUCT.fulfilment, ...(product.fulfilment || {}) },
  marketing: { ...DEFAULT_PRODUCT.marketing, ...(product.marketing || {}) },
  seo: { ...DEFAULT_PRODUCT.seo, ...(product.seo || {}) },
  status: { ...DEFAULT_PRODUCT.status, ...(product.status || {}) },
});

export const AdminProductV2Editor = ({ product, onSaved, onCancel }) => {
  const [form, setForm] = useState(() => normalizeProduct(product));
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(product?.id);
  const previewPrice = useMemo(() => {
    const price = Number(form.base_price);
    return Number.isFinite(price) && price > 0 ? price : null;
  }, [form.base_price]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setNested = (group, field, value) => setForm((current) => ({ ...current, [group]: { ...current[group], [field]: value } }));

  const addVariant = () => setField('variants', [...form.variants, { id: `variant-${Date.now()}`, name: '', price_delta: 0, sku: '', in_stock: true }]);
  const updateVariant = (index, field, value) => setField('variants', form.variants.map((variant, i) => i === index ? { ...variant, [field]: field === 'price_delta' ? Number(value || 0) : value } : variant));
  const removeVariant = (index) => setField('variants', form.variants.filter((_, i) => i !== index));

  const addGalleryImage = () => setNested('media', 'gallery', [...form.media.gallery, '']);
  const updateGalleryImage = (index, value) => setNested('media', 'gallery', form.media.gallery.map((image, i) => i === index ? value : image));
  const removeGalleryImage = (index) => setNested('media', 'gallery', form.media.gallery.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Product name is required');
    if (!Number.isFinite(Number(form.base_price)) || Number(form.base_price) <= 0) return toast.error('Enter a valid selling price');
    if (!form.image_url.trim() && !form.media.primary_image.trim()) return toast.error('Primary product image is required');

    const payload = {
      ...form,
      base_price: Number(form.base_price),
      compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
      image_url: form.image_url.trim() || form.media.primary_image.trim(),
      sizes: asList(form.sizes), materials: asList(form.materials), colors: asList(form.colors),
      tags: asList(form.tags), occasions: asList(form.occasions), recipients: asList(form.recipients),
      media: { ...form.media, primary_image: form.media.primary_image.trim() || form.image_url.trim(), gallery: asList(form.media.gallery).filter(Boolean) },
    };

    setSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('adminAuth') || '{}').token || ''}` } };
      const response = isEditing
        ? await axios.put(`${API}/admin/products/${product.id}`, payload, config)
        : await axios.post(`${API}/admin/products`, payload, config);
      toast.success(isEditing ? 'Product updated' : 'Product created');
      onSaved?.(response.data);
    } catch (error) {
      const message = error.response?.data?.detail || 'Unable to save product';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Memories Product V2</p>
          <h2 className="text-2xl font-bold tracking-tight">{isEditing ? 'Edit Product' : 'Add Product'}</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Product'}</Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="customization">Customize</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="classification">Discover</TabsTrigger>
          <TabsTrigger value="fulfilment">Fulfilment</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basic"><Card><CardHeader><CardTitle>Basic information</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Product name</Label><Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Customized Instagram Love Frame" /></div>
          <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="MEM-FRM-001" /></div>
          <div className="space-y-2"><Label>Category</Label><Input value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="frames" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Subcategory</Label><Input value={form.subcategory} onChange={(e) => setField('subcategory', e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Short description</Label><Textarea value={form.short_description} onChange={(e) => setField('short_description', e.target.value)} rows={2} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Full description</Label><Textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={6} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="pricing"><Card><CardHeader><CardTitle>Pricing & variants</CardTitle></CardHeader><CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Selling price (₹)</Label><Input type="number" min="1" value={form.base_price} onChange={(e) => setField('base_price', e.target.value)} /></div><div className="space-y-2"><Label>Compare-at / MRP (₹)</Label><Input type="number" min="0" value={form.compare_at_price} onChange={(e) => setField('compare_at_price', e.target.value)} /></div></div>
          {previewPrice && <Badge variant="secondary">Starting price ₹{previewPrice.toLocaleString('en-IN')}</Badge>}
          <div className="space-y-3"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Variants</h3><p className="text-sm text-muted-foreground">Use variants only when the customer chooses a purchasable option with a price difference.</p></div><Button variant="outline" onClick={addVariant} className="gap-2"><Plus className="h-4 w-4" />Add variant</Button></div>
            {form.variants.map((variant, index) => <div key={variant.id || index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-4"><Input placeholder="Variant name" value={variant.name || ''} onChange={(e) => updateVariant(index, 'name', e.target.value)} /><Input type="number" placeholder="Price delta" value={variant.price_delta ?? 0} onChange={(e) => updateVariant(index, 'price_delta', e.target.value)} /><Input placeholder="Variant SKU" value={variant.sku || ''} onChange={(e) => updateVariant(index, 'sku', e.target.value)} /><Button variant="ghost" onClick={() => removeVariant(index)} className="justify-self-start text-destructive"><Trash2 className="mr-2 h-4 w-4" />Remove</Button></div>)}
          </div>
        </CardContent></Card></TabsContent>

        <TabsContent value="customization"><Card><CardHeader><CardTitle>Customization engine</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          {Object.entries({ enabled: 'Enable customization', photo_upload: 'Photo upload', name: 'Customer name', date: 'Special date', message: 'Message', quote: 'Quote', logo_upload: 'Logo upload', preview: 'Live preview' }).map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-lg border p-3"><Label>{label}</Label><Switch checked={Boolean(form.customization[key])} onCheckedChange={(value) => setNested('customization', key, value)} /></div>)}
          <div className="space-y-2"><Label>Minimum photos</Label><Input type="number" min="0" value={form.customization.min_photos} onChange={(e) => setNested('customization', 'min_photos', Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Maximum photos</Label><Input type="number" min="0" value={form.customization.max_photos} onChange={(e) => setNested('customization', 'max_photos', Number(e.target.value))} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="media"><Card><CardHeader><CardTitle>Product media</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Primary image URL</Label><div className="flex gap-2"><Input value={form.media.primary_image || form.image_url} onChange={(e) => { setNested('media', 'primary_image', e.target.value); setField('image_url', e.target.value); }} placeholder="https://…" /><ImageIcon className="mt-2 h-5 w-5 text-muted-foreground" /></div></div>
          <div className="space-y-3"><div className="flex items-center justify-between"><Label>Gallery</Label><Button variant="outline" onClick={addGalleryImage}><Plus className="mr-2 h-4 w-4" />Add image</Button></div>{form.media.gallery.map((image, index) => <div className="flex gap-2" key={`${index}-${image}`}><Input value={image} onChange={(e) => updateGalleryImage(index, e.target.value)} placeholder="Gallery image URL" /><Button variant="ghost" onClick={() => removeGalleryImage(index)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button></div>)}</div>
          <div className="space-y-2"><Label>Video URL (optional)</Label><Input value={form.media.video_url} onChange={(e) => setNested('media', 'video_url', e.target.value)} /></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="classification"><Card><CardHeader><CardTitle>Discovery metadata</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
          {[['tags', 'Tags'], ['occasions', 'Occasions'], ['recipients', 'Recipients'], ['sizes', 'Legacy sizes'], ['materials', 'Materials'], ['colors', 'Colors']].map(([key, label]) => <div className="space-y-2" key={key}><Label>{label}</Label><Input value={joinList(form[key])} onChange={(e) => setField(key, splitList(e.target.value))} placeholder="Separate values with commas" /></div>)}
        </CardContent></Card></TabsContent>

        <TabsContent value="fulfilment"><Card><CardHeader><CardTitle>Fulfilment</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><Label>Production days</Label><Input type="number" min="0" value={form.fulfilment.production_days} onChange={(e) => setNested('fulfilment', 'production_days', Number(e.target.value))} /></div><div className="flex items-center justify-between rounded-lg border p-3"><Label>Pickup available</Label><Switch checked={form.fulfilment.pickup_available} onCheckedChange={(v) => setNested('fulfilment', 'pickup_available', v)} /></div><div className="flex items-center justify-between rounded-lg border p-3"><Label>Delivery available</Label><Switch checked={form.fulfilment.delivery_available} onCheckedChange={(v) => setNested('fulfilment', 'delivery_available', v)} /></div></CardContent></Card></TabsContent>

        <TabsContent value="marketing"><Card><CardHeader><CardTitle>Marketing & publication</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{Object.entries({ featured: 'Featured', bestseller: 'Bestseller', new_arrival: 'New arrival', trending: 'Trending' }).map(([key, label]) => <div key={key} className="flex items-center justify-between rounded-lg border p-3"><Label>{label}</Label><Switch checked={Boolean(form.marketing[key])} onCheckedChange={(v) => setNested('marketing', key, v)} /></div>)}<div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Active</Label><p className="text-xs text-muted-foreground">Keep the product enabled.</p></div><Switch checked={form.status.active} onCheckedChange={(v) => setNested('status', 'active', v)} /></div><div className="flex items-center justify-between rounded-lg border p-3"><div><Label>Published</Label><p className="text-xs text-muted-foreground">Published products can appear in the storefront.</p></div><Switch checked={form.status.published} onCheckedChange={(v) => setNested('status', 'published', v)} /></div></CardContent></Card></TabsContent>

        <TabsContent value="seo"><Card><CardHeader><CardTitle>SEO</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>SEO title</Label><Input value={form.seo.title} onChange={(e) => setNested('seo', 'title', e.target.value)} placeholder="Personalized Anniversary Photo Frame | Memories" /></div><div className="space-y-2"><Label>Meta description</Label><Textarea value={form.seo.meta_description} onChange={(e) => setNested('seo', 'meta_description', e.target.value)} rows={4} placeholder="Describe this product for Google and social sharing." /></div></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProductV2Editor;
