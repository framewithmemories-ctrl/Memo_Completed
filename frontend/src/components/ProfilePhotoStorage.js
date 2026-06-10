/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Eye, 
  Upload,
  Star,
  Heart,
  X,
  Plus,
  Grid,
  List,
  Search,
  Filter
} from "lucide-react";

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
  tags: p.tags || [],
  notes: p.notes || '',
  type: 'image',
});

export const ProfilePhotoStorage = ({ userId, onPhotoSelected }) => {
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const fileInputRef = useRef(null);

  // Load saved photos from backend on mount
  useEffect(() => {
    if (userId) {
      loadSavedPhotos();
    }
  }, [userId]);

  const loadSavedPhotos = async () => {
    try {
      const res = await axios.get(`${API}/users/${userId}/photos`);
      setSavedPhotos((res.data || []).map(mapPhoto));
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
        const dataUrl = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        const base64 = dataUrl.split(',')[1];
        const dims = await new Promise((res) => {
          const img = new Image();
          img.onload = () => res({ width: img.width, height: img.height });
          img.onerror = () => res({ width: 0, height: 0 });
          img.src = dataUrl;
        });
        await axios.post(`${API}/users/${userId}/photos`, {
          user_id: userId,
          name: file.name,
          image_data: base64,
          image_url: dataUrl,
          dimensions: dims,
          size: parseFloat((file.size / 1024 / 1024).toFixed(2)),
          tags: ['uploaded'],
          notes: '',
        });
        uploaded += 1;
      } catch (err) {
        console.error('Upload error', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    await loadSavedPhotos();
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (uploaded > 0) {
      toast.success(`📸 ${uploaded} photo(s) saved to your profile!`, {
        description: 'You can now reuse them for future orders, on any device.',
        duration: 3000,
      });
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/users/${userId}/photos/${photoId}`);
      setSavedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      toast.success('Photo deleted from your collection');
    } catch (error) {
      toast.error('Failed to delete photo');
    }
  };

  const toggleFavorite = async (photoId) => {
    try {
      const res = await axios.put(`${API}/users/${userId}/photos/${photoId}/favorite`);
      setSavedPhotos((prev) => prev.map((photo) =>
        photo.id === photoId ? { ...photo, favorite: res.data.favorite } : photo
      ));
      setSelectedPhoto((prev) => (prev && prev.id === photoId ? { ...prev, favorite: res.data.favorite } : prev));
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  };

  const usePhotoForOrder = async (photo) => {
    try {
      await axios.put(`${API}/users/${userId}/photos/${photo.id}/use`);
    } catch (error) {
      // non-blocking
    }
    setSavedPhotos((prev) => prev.map((p) =>
      p.id === photo.id ? { ...p, usageCount: (p.usageCount || 0) + 1 } : p
    ));
    onPhotoSelected?.(photo);
    toast.success(`Using "${photo.name || 'Saved Photo'}" for your order! 🎨`);
  };

  const downloadPhoto = (photo) => {
    try {
      const link = document.createElement('a');
      link.href = photo.url;
      link.download = photo.name || `memories_photo_${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Unable to download photo');
    }
  };

  const filteredPhotos = savedPhotos.filter(photo => {
    const matchesSearch = !searchTerm || 
      (photo.name && photo.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (photo.notes && photo.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterTag === 'all' || 
      (filterTag === 'favorites' && photo.favorite) ||
      (photo.tags && photo.tags.includes(filterTag));
    
    return matchesSearch && matchesFilter;
  });

  const uniqueTags = [...new Set(savedPhotos.flatMap(photo => photo.tags || []))];

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 text-purple-600 mr-2" />
              My Photo Collection
            </CardTitle>
            <CardDescription>
              {savedPhotos.length} saved photos • Reuse for future orders
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              data-testid="photo-upload-input"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              data-testid="upload-photo-button"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Upload className="w-4 h-4 mr-1" />
              {isLoading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {savedPhotos.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter */}
            <div className="sm:w-48">
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Photos</option>
                <option value="favorites">Favorites</option>
                {uniqueTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {savedPhotos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved photos yet</h3>
            <p className="text-gray-600 mb-4">
              Upload photos and save them to your profile for easy reuse in future orders
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isLoading ? 'Uploading...' : 'Upload First Photo'}
            </Button>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No photos match your search criteria</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
            : "space-y-4"
          }>
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className={viewMode === 'grid' ? "" : "flex items-center space-x-4 p-4 border rounded-lg"}>
                {viewMode === 'grid' ? (
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <div className="relative aspect-square">
                      <img
                        src={photo.url}
                        alt={photo.name || 'Saved photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => usePhotoForOrder(photo)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Favorite Badge */}
                      {photo.favorite && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-red-500 text-white">
                            <Heart className="w-3 h-3 fill-current" />
                          </Badge>
                        </div>
                      )}
                      
                      {/* Usage Count */}
                      {photo.usageCount > 0 && (
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="text-xs">
                            Used {photo.usageCount}x
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-3">
                      <p className="font-medium text-sm truncate">
                        {photo.name || 'Untitled Photo'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(photo.savedAt).toLocaleDateString()}
                      </p>
                      {photo.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {photo.tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <img
                      src={photo.url}
                      alt={photo.name || 'Saved photo'}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{photo.name || 'Untitled Photo'}</h4>
                        {photo.favorite && <Heart className="w-4 h-4 text-red-500 fill-current" />}
                      </div>
                      <p className="text-sm text-gray-600">{photo.notes}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(photo.savedAt).toLocaleDateString()}
                        </span>
                        {photo.usageCount > 0 && (
                          <span className="text-xs text-gray-500">Used {photo.usageCount} times</span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => usePhotoForOrder(photo)}>
                        Use
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedPhoto(photo)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.name || 'Photo Details'}</DialogTitle>
            <DialogDescription>
              Saved on {selectedPhoto && new Date(selectedPhoto.savedAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="space-y-6">
              <div className="relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.name || 'Photo'}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Dimensions:</span>
                  <p className="text-gray-600">
                    {selectedPhoto.dimensions?.width} × {selectedPhoto.dimensions?.height}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Size:</span>
                  <p className="text-gray-600">{selectedPhoto.size}MB</p>
                </div>
                <div>
                  <span className="font-medium">Usage:</span>
                  <p className="text-gray-600">{selectedPhoto.usageCount || 0} times</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-gray-600">{selectedPhoto.type}</p>
                </div>
              </div>
              
              {selectedPhoto.notes && (
                <div>
                  <span className="font-medium">Notes:</span>
                  <p className="text-gray-600 mt-1">{selectedPhoto.notes}</p>
                </div>
              )}
              
              {selectedPhoto.tags && (
                <div>
                  <span className="font-medium">Tags:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedPhoto.tags.map(tag => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => usePhotoForOrder(selectedPhoto)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Use for Order
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleFavorite(selectedPhoto.id)}
                  className="flex-1"
                >
                  <Heart className={`w-4 h-4 mr-2 ${selectedPhoto.favorite ? 'fill-current text-red-500' : ''}`} />
                  {selectedPhoto.favorite ? 'Remove Favorite' : 'Add Favorite'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadPhoto(selectedPhoto)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    deletePhoto(selectedPhoto.id);
                    setSelectedPhoto(null);
                  }}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Expose save function to parent components
ProfilePhotoStorage.savePhoto = (photoData, tags = [], notes = '') => {
  // This would be called from parent components to save photos
  console.log('Save photo function called', photoData);
};