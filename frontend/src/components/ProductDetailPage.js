import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  ShoppingCart, Star, Upload, X, Loader2, ArrowLeft, Truck, Store, Clock, ImageOff,
} from 'lucide-react';
import { useCart } from '../context/CartContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [photos, setPhotos] = useState([]); // {image_data, dimensions}
  const [uploading, setUploading] = useState(false);
  const [custom, setCustom] = useState({ name: '', date: '', message: '', quote: '', logo: null });
  const [adding, setAdding] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await axios.get(`${API}/products/${slug}`);
      const p = res.data;
      setProduct(p);
      const primary = (p.media && p.media.primary_image) || p.image_url;
      setActiveImage(primary);
      if (p.variants && p.variants.length > 0) setSelectedVariant(p.variants[0]);
      // related + reviews (best-effort, non-blocking)
      axios.get(`${API}/products`).then((r) => {
        setRelated(
          (r.data || [])
            .filter((x) => x.id !== p.id && x.category === p.category)
            .slice(0, 4)
        );
      }).catch(() => {});
      axios.get(`${API}/reviews`, { params: { product_id: p.id, approved_only: true, limit: 5 } })
        .then((r) => setReviews(Array.isArray(r.data?.reviews) ? r.data.reviews : []))
        .catch(() => {});
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else toast.error('Could not load product. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchProduct(); window.scrollTo(0, 0); }, [fetchProduct]);

  const cfg = product?.customization || {};
  const currentPrice = product
    ? product.base_price + (selectedVariant ? (selectedVariant.price_delta || 0) : 0)
    : 0;
  const gallery = product
    ? [((product.media && product.media.primary_image) || product.image_url), ...((product.media && product.media.gallery) || [])].filter(Boolean)
    : [];

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (photos.length >= (cfg.max_photos || 1)) {
      toast.error(`You can upload up to ${cfg.max_photos} photo(s).`);
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setPhotos((prev) => [...prev, res.data]);
        toast.success('Photo uploaded');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setCustom((c) => ({ ...c, logo: res.data }));
        toast.success('Logo uploaded');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Logo upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const validateCustomization = () => {
    if (product.variants && product.variants.length > 0 && !selectedVariant) {
      toast.error('Please select an option.');
      return false;
    }
    if (cfg.enabled) {
      if (cfg.photo_upload && photos.length < (cfg.min_photos || 0)) {
        toast.error(`Please upload at least ${cfg.min_photos} photo(s).`);
        return false;
      }
      if (cfg.name && !custom.name.trim()) { toast.error('Please enter a name.'); return false; }
      if (cfg.date && !custom.date) { toast.error('Please select a date.'); return false; }
      if (cfg.message && !custom.message.trim()) { toast.error('Please enter a message.'); return false; }
      if (cfg.quote && !custom.quote.trim()) { toast.error('Please enter a quote.'); return false; }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (adding) return;
    if (!validateCustomization()) return;
    setAdding(true);
    try {
      const customOptions = {
        variantName: selectedVariant ? selectedVariant.name : null,
        photos: photos.map((p) => p.image_data),
        photoCount: photos.length,
      };
      if (cfg.name && custom.name) customOptions.name = custom.name;
      if (cfg.date && custom.date) customOptions.date = custom.date;
      if (cfg.message && custom.message) customOptions.message = custom.message;
      if (cfg.quote && custom.quote) customOptions.quote = custom.quote;
      if (cfg.logo_upload && custom.logo) customOptions.logo = custom.logo.image_data;

      addToCart(product, customOptions, {
        variantId: selectedVariant ? selectedVariant.id : null,
        price: currentPrice,
        image: activeImage,
      });
      toast.success('Added to cart!', {
        action: { label: 'View Cart', onClick: () => navigate('/') },
      });
    } finally {
      setTimeout(() => setAdding(false), 600);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" data-testid="pdp-loading">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6" data-testid="pdp-not-found">
        <ImageOff className="w-12 h-12 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h1>
        <p className="text-gray-600 mb-6">The product you're looking for isn't available.</p>
        <Button onClick={() => navigate('/')} className="bg-rose-500 hover:bg-rose-600 text-white" data-testid="pdp-back-to-shop">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
        </Button>
      </div>
    );
  }

  const ful = product.fulfilment || {};
  const seoTitle = (product.seo && product.seo.title) || `${product.name} | Memories`;
  const seoDesc = (product.seo && product.seo.meta_description) || product.short_description || product.description;

  return (
    <div className="min-h-screen bg-white" data-testid="product-detail-page">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 text-rose-600 hover:bg-rose-50" data-testid="pdp-back">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Shop
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* LEFT: Gallery */}
          <div>
            <div className="rounded-2xl overflow-hidden border border-rose-100 shadow-sm bg-rose-50/30">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-[420px] object-cover"
                data-testid="pdp-main-image"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 mt-4 flex-wrap" data-testid="pdp-gallery">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      activeImage === img ? 'border-rose-500' : 'border-transparent hover:border-rose-200'
                    }`}
                    aria-label={`View image ${i + 1}`}
                    data-testid={`pdp-thumb-${i}`}
                  >
                    <img src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Info */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {product.marketing?.bestseller && <Badge className="bg-amber-500 text-white">Bestseller</Badge>}
              {product.marketing?.new_arrival && <Badge className="bg-green-500 text-white">New</Badge>}
              {product.marketing?.trending && <Badge className="bg-rose-500 text-white">Trending</Badge>}
            </div>

            <h1 className="text-3xl font-bold text-gray-900" data-testid="pdp-name">{product.name}</h1>

            {reviews.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}</span>
                <span>({reviews.length} reviews)</span>
              </div>
            )}

            {product.short_description && (
              <p className="text-gray-600 mt-3" data-testid="pdp-short-desc">{product.short_description}</p>
            )}

            <div className="flex items-end gap-3 mt-5">
              <span className="text-3xl font-bold text-gray-900" data-testid="pdp-price">₹{currentPrice}</span>
              {product.compare_at_price && product.compare_at_price > currentPrice && (
                <span className="text-lg text-gray-400 line-through mb-1" data-testid="pdp-compare-price">
                  ₹{product.compare_at_price}
                </span>
              )}
            </div>

            {/* Variant selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="mt-6" data-testid="pdp-variants">
                <Label className="text-sm font-semibold text-gray-900">Options</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${
                        selectedVariant?.id === v.id
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                      }`}
                      data-testid={`pdp-variant-${v.id}`}
                    >
                      {v.name}{v.price_delta ? ` (+₹${v.price_delta})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Customization Engine */}
            {cfg.enabled && (
              <div className="mt-7 p-5 rounded-2xl border border-rose-100 bg-rose-50/40" data-testid="pdp-customization">
                <h3 className="font-semibold text-gray-900 mb-4">Personalize Your Gift</h3>

                {cfg.photo_upload && (
                  <div className="mb-5">
                    <Label className="text-sm text-gray-700">
                      Upload Photos {cfg.min_photos ? `(min ${cfg.min_photos}, max ${cfg.max_photos})` : `(max ${cfg.max_photos})`}
                    </Label>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {photos.map((p, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-rose-200" data-testid={`pdp-photo-${i}`}>
                          <img src={`data:image/jpeg;base64,${p.image_data}`} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
                            aria-label="Remove photo"
                            data-testid={`pdp-remove-photo-${i}`}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {photos.length < (cfg.max_photos || 1) && (
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-rose-300 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50" data-testid="pdp-add-photo">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <Upload className="w-5 h-5 text-rose-500" />}
                          <span className="text-[10px] text-rose-600 mt-1">Add Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} data-testid="pdp-photo-input" />
                        </label>
                      )}
                    </div>
                  </div>
                )}

                {cfg.name && (
                  <div className="mb-4">
                    <Label htmlFor="c-name" className="text-sm text-gray-700">Name</Label>
                    <Input id="c-name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} maxLength={60} placeholder="e.g. Dinesh & Keerthana" className="mt-1" data-testid="pdp-name-input" />
                  </div>
                )}
                {cfg.date && (
                  <div className="mb-4">
                    <Label htmlFor="c-date" className="text-sm text-gray-700">Special Date</Label>
                    <Input id="c-date" type="date" value={custom.date} onChange={(e) => setCustom({ ...custom, date: e.target.value })} className="mt-1" data-testid="pdp-date-input" />
                  </div>
                )}
                {cfg.message && (
                  <div className="mb-4">
                    <Label htmlFor="c-msg" className="text-sm text-gray-700">Message</Label>
                    <Textarea id="c-msg" value={custom.message} onChange={(e) => setCustom({ ...custom, message: e.target.value })} maxLength={300} rows={3} placeholder="Your heartfelt message" className="mt-1" data-testid="pdp-message-input" />
                  </div>
                )}
                {cfg.quote && (
                  <div className="mb-4">
                    <Label htmlFor="c-quote" className="text-sm text-gray-700">Quote</Label>
                    <Input id="c-quote" value={custom.quote} onChange={(e) => setCustom({ ...custom, quote: e.target.value })} maxLength={200} placeholder="A favourite quote" className="mt-1" data-testid="pdp-quote-input" />
                  </div>
                )}
                {cfg.logo_upload && (
                  <div className="mb-2">
                    <Label className="text-sm text-gray-700">Logo</Label>
                    <div className="flex items-center gap-3 mt-1">
                      {custom.logo && <img src={`data:image/jpeg;base64,${custom.logo.image_data}`} alt="Logo" className="w-14 h-14 object-contain border rounded" />}
                      <label className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-sm cursor-pointer hover:bg-rose-50" data-testid="pdp-logo-add">
                        Upload Logo
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add to cart */}
            <Button
              onClick={handleAddToCart}
              disabled={adding || uploading}
              className="w-full mt-7 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg h-12 text-base"
              data-testid="pdp-add-to-cart"
            >
              {adding ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShoppingCart className="w-5 h-5 mr-2" />}
              Add to Cart — ₹{currentPrice}
            </Button>

            {/* Fulfilment */}
            <div className="grid grid-cols-3 gap-3 mt-6 text-center" data-testid="pdp-fulfilment">
              <div className="p-3 rounded-xl bg-gray-50">
                <Clock className="w-5 h-5 mx-auto text-rose-500" />
                <p className="text-xs text-gray-600 mt-1">{ful.production_days || 3} day production</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <Store className="w-5 h-5 mx-auto text-rose-500" />
                <p className="text-xs text-gray-600 mt-1">{ful.pickup_available === false ? 'No pickup' : 'Pickup available'}</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <Truck className="w-5 h-5 mx-auto text-rose-500" />
                <p className="text-xs text-gray-600 mt-1">{ful.delivery_available === false ? 'No delivery' : 'Delivery available'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Product Details</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line" data-testid="pdp-description">{product.description}</p>
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {product.tags.map((t) => <Badge key={t} variant="secondary" className="bg-rose-50 text-rose-700">{t}</Badge>)}
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="mt-12 max-w-3xl" data-testid="pdp-reviews">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
            <div className="space-y-4">
              {reviews.map((r, i) => (
                <Card key={i} className="border-rose-100">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{r.name}</span>
                      <div className="flex">
                        {[...Array(r.rating)].map((_, k) => <Star key={k} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{r.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12" data-testid="pdp-related">
            <h2 className="text-xl font-bold text-gray-900 mb-4">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((rp) => (
                <Card
                  key={rp.id}
                  className="cursor-pointer group hover:shadow-lg transition-all border-rose-100 overflow-hidden"
                  onClick={() => navigate(`/product/${rp.slug || rp.id}`)}
                  data-testid={`pdp-related-${rp.id}`}
                >
                  <img src={(rp.media && rp.media.primary_image) || rp.image_url} alt={rp.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{rp.name}</p>
                    <p className="text-rose-600 font-bold text-sm mt-1">₹{rp.base_price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
