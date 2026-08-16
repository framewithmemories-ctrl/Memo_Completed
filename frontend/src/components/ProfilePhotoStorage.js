import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Trash2, Download, Eye, Upload, Star, Heart, X, Plus, Grid, List, Search, Filter } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const mapPhoto = (p) => ({
  id: p.id,
  url: p.image_url || (p.image_data ? `data:image/jpeg;base64,${p.image_data}` : ''),
  name: p.name,
  savedAt: p.created_at,
  usageCount: p.usage_count || 0,
  favorite: p.favorite || false,
  dimensions: p.dimensions || {},
  size: p.size,
  tags: Array.isArray(p.tags) ? p.tags : [],
  notes: p.notes || '',
  type: 'image',
});

export const ProfilePhotoStorage = ({ userId, onPhotoSelected }) => {
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const fileInputRef = useRef(null);

  useEffect(() => { if (userId) loadSavedPhotos(); }, [userId]);

  const loadSavedPhotos = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}/photos`);
      const raw = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.photos) ? res.data.photos : []);
      setSavedPhotos(raw.map(mapPhoto));
    } catch (error) {
      console.error('Error loading saved photos:', error);
      setSavedPhotos([]);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsLoading(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        const dataUrl = await new Promise((res, rej) => { const reader = new FileReader(); reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(file); });
        const base64 = dataUrl.split(',')[1];
        const dims = await new Promise((res) => { const img = new Image(); img.onload = () => res({ width: img.width, height: img.height }); img.onerror = () => res({ width: 0, height: 0 }); img.src = dataUrl; });
        await axios.post(`${API}/users/${userId}/photos`, { user_id: userId, name: file.name, image_data: base64, image_url: dataUrl, dimensions: dims, size: parseFloat((file.size / 1024 / 1024).toFixed(2)), tags: ['uploaded'], notes: '' });
        uploaded += 1;
      } catch (err) { console.error('Upload error', err); toast.error(`Failed to upload ${file.name}`); }
    }
    await loadSavedPhotos(); setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploaded > 0) toast.success(`📸 ${uploaded} photo(s) saved to your profile!`, { description: 'You can now reuse them for future orders, on any device.', duration: 3000 });
  };

  const deletePhoto = async (photoId) => {
    try { await axios.delete(`${API}/users/${userId}/photos/${photoId}`); setSavedPhotos((prev) => (Array.isArray(prev) ? prev : []).filter((photo) => photo.id !== photoId)); toast.success('Photo deleted from your collection'); }
    catch { toast.error('Failed to delete photo'); }
  };

  const toggleFavorite = async (photoId) => {
    try { const res = await axios.put(`${API}/users/${userId}/photos/${photoId}/favorite`); setSavedPhotos((prev) => (Array.isArray(prev) ? prev : []).map((photo) => photo.id === photoId ? { ...photo, favorite: res.data.favorite } : photo)); setSelectedPhoto((prev) => (prev && prev.id === photoId ? { ...prev, favorite: res.data.favorite } : prev)); }
    catch { toast.error('Failed to update favorite'); }
  };

  const applyPhotoToOrder = async (photo) => {
    try { await axios.put(`${API}/users/${userId}/photos/${photo.id}/use`); } catch {}
    setSavedPhotos((prev) => (Array.isArray(prev) ? prev : []).map((p) => p.id === photo.id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p));
    onPhotoSelected?.(photo); toast.success(`Using "${photo.name || 'Saved Photo'}" for your order! 🎨`);
  };

  const downloadPhoto = (photo) => {
    try { const link = document.createElement('a'); link.href = photo.url; link.download = photo.name || `memories_photo_${photo.id}.jpg`; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    catch { toast.error('Unable to download photo'); }
  };

  const safePhotos = Array.isArray(savedPhotos) ? savedPhotos : [];
  const filteredPhotos = safePhotos.filter(photo => { const matchesSearch = !searchTerm || (photo.name && photo.name.toLowerCase().includes(searchTerm.toLowerCase())) || (photo.notes && photo.notes.toLowerCase().includes(searchTerm.toLowerCase())); const matchesFilter = filterTag === 'all' || (filterTag === 'favorites' && photo.favorite) || (Array.isArray(photo.tags) && photo.tags.includes(filterTag)); return matchesSearch && matchesFilter; });
  const uniqueTags = [...new Set(safePhotos.flatMap(photo => Array.isArray(photo.tags) ? photo.tags : []))];

  return (
    <Card className="border-purple-200">
      <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center"><Camera className="w-5 h-5 text-purple-600 mr-2" />My Photo Collection</CardTitle><CardDescription>{safePhotos.length} saved photos • Reuse for future orders</CardDescription></div><div className="flex items-center space-x-2"><input ref={fileInputRef} id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} data-testid="photo-upload-input" /><Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading} data-testid="upload-photo-button" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"><Upload className="w-4 h-4 mr-1" />{isLoading ? 'Uploading...' : 'Upload'}</Button><Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>{viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}</Button></div></div></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4"><div className="relative flex-1 min-w-[180px]"><Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" /><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search photos..." className="pl-8" /></div><select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="h-10 rounded-md border px-3 text-sm"><option value="all">All photos</option><option value="favorites">Favorites</option>{uniqueTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></div>
        {filteredPhotos.length === 0 ? <div className="text-center py-10"><ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" /><p className="font-medium text-gray-700">No saved photos yet.</p><p className="text-sm text-gray-500">Upload photos here to reuse them for future Memories orders.</p></div> : <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-2'}>{filteredPhotos.map(photo => <Card key={photo.id} className="overflow-hidden"><div className={viewMode === 'grid' ? '' : 'flex items-center gap-3 p-2'}><img src={photo.url} alt={photo.name || 'Saved photo'} className={viewMode === 'grid' ? 'w-full aspect-square object-cover bg-gray-100' : 'w-20 h-20 rounded object-cover bg-gray-100'} onClick={() => setSelectedPhoto(photo)} /><div className="p-2 min-w-0"><p className="font-medium text-sm truncate">{photo.name || 'Saved photo'}</p><div className="flex gap-1 mt-1"><Button variant="ghost" size="icon" onClick={() => toggleFavorite(photo.id)} aria-label="Favorite"><Heart className={photo.favorite ? 'w-4 h-4 fill-rose-500 text-rose-500' : 'w-4 h-4'} /></Button><Button variant="ghost" size="icon" onClick={() => downloadPhoto(photo)} aria-label="Download"><Download className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => deletePhoto(photo.id)} aria-label="Delete"><Trash2 className="w-4 h-4 text-red-500" /></Button><Button size="sm" onClick={() => applyPhotoToOrder(photo)}>Use</Button></div></div></div></Card>)}</div>}
        {selectedPhoto && <Dialog open={!!selectedPhoto} onOpenChange={(v) => !v && setSelectedPhoto(null)}><DialogContent><DialogHeader><DialogTitle>{selectedPhoto.name || 'Saved photo'}</DialogTitle><DialogDescription>Saved photo preview</DialogDescription></DialogHeader><img src={selectedPhoto.url} alt={selectedPhoto.name || 'Saved photo'} className="max-h-[65vh] w-full object-contain rounded-lg" /><Button onClick={() => { applyPhotoToOrder(selectedPhoto); setSelectedPhoto(null); }}><Star className="w-4 h-4 mr-2" />Use this photo</Button></DialogContent></Dialog>}
      </CardContent>
    </Card>
  );
};

export default ProfilePhotoStorage;
