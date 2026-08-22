import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Gift, Home, Megaphone, Plus, RefreshCw, Save, Trash2, Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

const emptyOffer = () => ({ id: null, title: '', discount: '', description: '', starts_at: '', ends_at: '', active: true, show_on_homepage: true, show_in_popup: false });
const toInputDate = (value) => { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; const pad = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fromInputDate = (value) => value ? new Date(value).toISOString() : null;

// Turn the selected image into a reasonably small JPEG data URL so the CMS can persist it
// without requiring the admin to deal with image-hosting URLs.
const imageFileToDataUrl = (file, maxSize = 1600, quality = 0.84) => new Promise((resolve, reject) => {
  if (!file || !file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Unable to read the selected image.'));
    img.src = reader.result;
  };
  reader.onerror = () => reject(new Error('Unable to read the selected image.'));
  reader.readAsDataURL(file);
});

export default function ContentManagement({ API, authConfig }) {
  const [offers, setOffers] = useState([]);
  const [offer, setOffer] = useState(emptyOffer());
  const [homepage, setHomepage] = useState({ hero_title: '', hero_subtitle: '', hero_image_url: '' });
  const [announcement, setAnnouncement] = useState({ announcement_text: '', popup_description: '', popup_image_url: '', popup_enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const activeOfferCount = useMemo(() => offers.filter((o) => o.active).length, [offers]);
  const load = async () => { setLoading(true); try { const res = await axios.get(`${API}/admin/cms`, authConfig()); setOffers((res.data.offers || []).map((o) => ({ ...o, starts_at: toInputDate(o.starts_at), ends_at: toInputDate(o.ends_at) }))); setHomepage(res.data.homepage || { hero_title: '', hero_subtitle: '', hero_image_url: '' }); setAnnouncement(res.data.announcement || { announcement_text: '', popup_description: '', popup_image_url: '', popup_enabled: true }); } catch (error) { toast.error(error.response?.data?.detail || 'Failed to load CMS content'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const saveOffer = async () => { if (!offer.title.trim()) return toast.error('Offer title is required'); setSaving(true); try { const payload = { title: offer.title.trim(), discount: offer.discount.trim(), description: offer.description.trim(), starts_at: fromInputDate(offer.starts_at), ends_at: fromInputDate(offer.ends_at), active: !!offer.active, show_on_homepage: !!offer.show_on_homepage, show_in_popup: !!offer.show_in_popup }; if (offer.id) { await axios.put(`${API}/admin/cms/offers/${offer.id}`, payload, authConfig()); toast.success('Offer updated'); } else { await axios.post(`${API}/admin/cms/offers`, payload, authConfig()); toast.success('Offer created'); } setOffer(emptyOffer()); await load(); } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save offer'); } finally { setSaving(false); } };
  const editOffer = (item) => setOffer({ ...item, starts_at: toInputDate(item.starts_at), ends_at: toInputDate(item.ends_at) });
  const deleteOffer = async (id) => { if (!window.confirm('Delete this offer?')) return; try { await axios.delete(`${API}/admin/cms/offers/${id}`, authConfig()); toast.success('Offer deleted'); if (offer.id === id) setOffer(emptyOffer()); await load(); } catch (error) { toast.error(error.response?.data?.detail || 'Failed to delete offer'); } };
  const saveHomepage = async () => { setSaving(true); try { await axios.put(`${API}/admin/cms/homepage`, homepage, authConfig()); toast.success('Homepage content saved'); } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save homepage'); } finally { setSaving(false); } };
  const saveAnnouncement = async () => { setSaving(true); try { await axios.put(`${API}/admin/cms/announcement`, announcement, authConfig()); toast.success('Announcement & popup saved'); } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save announcement'); } finally { setSaving(false); } };

  const handleHeroImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadingHero(true);
    try {
      const dataUrl = await imageFileToDataUrl(file);
      setHomepage((current) => ({ ...current, hero_image_url: dataUrl }));
      toast.success('Hero image ready. Click Save Homepage to publish it.');
    } catch (error) { toast.error(error.message || 'Failed to prepare image'); } finally { setUploadingHero(false); }
  };

  if (loading) return <div className="py-12 text-center text-sm text-gray-500">Loading CMS content…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-2xl font-bold text-gray-900">Content Management</h2><p className="text-sm text-gray-500 mt-1">Control customer-facing promotional content without touching the code.</p></div><div className="flex items-center gap-2"><Badge variant="secondary" className="bg-green-100 text-green-800">{activeOfferCount} active offer{activeOfferCount === 1 ? '' : 's'}</Badge><Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button></div></div>

      <Card><CardHeader><CardTitle className="flex items-center"><Gift className="w-5 h-5 mr-2" />Offers</CardTitle><CardDescription>Create, schedule, enable/disable and decide where each offer appears.</CardDescription></CardHeader><CardContent className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Input placeholder="Offer title *" value={offer.title} onChange={(e) => setOffer({ ...offer, title: e.target.value })} /><Input placeholder="Discount e.g. 50% OFF" value={offer.discount} onChange={(e) => setOffer({ ...offer, discount: e.target.value })} /></div>
        <Textarea placeholder="Offer description" rows={3} value={offer.description} onChange={(e) => setOffer({ ...offer, description: e.target.value })} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input type="datetime-local" value={offer.starts_at} onChange={(e) => setOffer({ ...offer, starts_at: e.target.value })} /><Input type="datetime-local" value={offer.ends_at} onChange={(e) => setOffer({ ...offer, ends_at: e.target.value })} /></div>
        <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={offer.active} onChange={(e) => setOffer({ ...offer, active: e.target.checked })} /> Active</label><label className="flex items-center gap-2"><input type="checkbox" checked={offer.show_on_homepage} onChange={(e) => setOffer({ ...offer, show_on_homepage: e.target.checked })} /> Show on homepage</label><label className="flex items-center gap-2"><input type="checkbox" checked={offer.show_in_popup} onChange={(e) => setOffer({ ...offer, show_in_popup: e.target.checked })} /> Show in popup</label></div>
        <div className="flex gap-2"><Button onClick={saveOffer} disabled={saving}>{offer.id ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{offer.id ? 'Update Offer' : 'Save Offer'}</Button>{offer.id && <Button variant="outline" onClick={() => setOffer(emptyOffer())}>Cancel edit</Button>}</div>
        <div className="border-t pt-4 space-y-3">{offers.length === 0 ? <p className="text-sm text-gray-500">No offers saved yet.</p> : offers.map((item) => <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border p-3 bg-gray-50"><div><div className="flex items-center gap-2"><p className="font-medium">{item.title}</p><Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? 'Active' : 'Disabled'}</Badge>{item.show_in_popup && <Badge variant="outline">Popup</Badge>}</div><p className="text-sm text-gray-600">{item.discount || 'No discount text'}{item.description ? ` · ${item.description}` : ''}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => editOffer(item)}><Save className="w-4 h-4 mr-1" />Edit</Button><Button size="sm" variant="destructive" onClick={() => deleteOffer(item.id)}><Trash2 className="w-4 h-4" /></Button></div></div>)}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center"><Home className="w-5 h-5 mr-2" />Homepage</CardTitle><CardDescription>Manage the hero messaging and image shown to customers.</CardDescription></CardHeader><CardContent className="space-y-4">
        <Input placeholder="Hero title" value={homepage.hero_title || ''} onChange={(e) => setHomepage({ ...homepage, hero_title: e.target.value })} />
        <Textarea placeholder="Hero subtitle" rows={3} value={homepage.hero_subtitle || ''} onChange={(e) => setHomepage({ ...homepage, hero_subtitle: e.target.value })} />
        <div className="space-y-2"><label className="text-sm font-medium text-gray-700">Hero Image</label><div className="flex flex-col sm:flex-row gap-3 sm:items-center"><label className="inline-flex"><input type="file" accept="image/*" className="sr-only" onChange={handleHeroImage} disabled={uploadingHero || saving} /><span className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-gray-800"><Upload className="w-4 h-4 mr-2" />{uploadingHero ? 'Preparing image…' : 'Upload Image'}</span></label>{homepage.hero_image_url && <Button type="button" variant="outline" onClick={() => setHomepage({ ...homepage, hero_image_url: '' })}>Remove Image</Button>}</div><p className="text-xs text-gray-500">Choose a JPG, PNG or WebP image. The image is resized automatically for web use.</p>{homepage.hero_image_url && <div className="mt-2 rounded-lg border bg-gray-50 p-2 max-w-xl"><div className="flex items-center gap-2 text-xs text-gray-500 mb-2"><ImageIcon className="w-4 h-4" />Hero image preview</div><img src={homepage.hero_image_url} alt="Hero preview" className="w-full max-h-64 object-cover rounded-md" /></div>}</div>
        <Button onClick={saveHomepage} disabled={saving || uploadingHero}><Save className="w-4 h-4 mr-2" />Save Homepage</Button>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center"><Megaphone className="w-5 h-5 mr-2" />Announcement & Popup</CardTitle><CardDescription>Control the top announcement banner and opening popup from one place.</CardDescription></CardHeader><CardContent className="space-y-4"><Input placeholder="Top announcement text" value={announcement.announcement_text || ''} onChange={(e) => setAnnouncement({ ...announcement, announcement_text: e.target.value })} /><Textarea placeholder="Popup description" rows={3} value={announcement.popup_description || ''} onChange={(e) => setAnnouncement({ ...announcement, popup_description: e.target.value })} /><Input placeholder="Popup image URL" value={announcement.popup_image_url || ''} onChange={(e) => setAnnouncement({ ...announcement, popup_image_url: e.target.value })} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={announcement.popup_enabled !== false} onChange={(e) => setAnnouncement({ ...announcement, popup_enabled: e.target.checked })} /> <span>{announcement.popup_enabled !== false ? <Eye className="w-4 h-4 inline mr-1" /> : <EyeOff className="w-4 h-4 inline mr-1" />}Enable opening popup</span></label><Button onClick={saveAnnouncement} disabled={saving}><Save className="w-4 h-4 mr-2" />Save Announcement & Popup</Button></CardContent></Card>
    </div>
  );
}
