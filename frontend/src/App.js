/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { CartProvider, useCart } from "./context/CartContext";
import { SearchComponent } from "./components/SearchComponent";
import { AuthProvider } from "./context/AuthContext";
import { AccountButton } from "./components/AccountButton";
import { EnhancedAIGiftFinder } from "./components/EnhancedAIGiftFinder";
import { HeroSection, AboutUsSection, ProductGrid } from "./components/MainComponents";
import { AboutUsPage } from "./components/AboutUsPage";
import { ProductDetailPage } from "./components/ProductDetailPage";
import { EnhancedCheckoutPage } from "./components/EnhancedCheckoutPage";
import { ReviewSystemEnhanced } from "./components/ReviewSystemEnhanced";
import AdminPanel from "./components/AdminPanel";
import ShopMegaMenu from "./components/ShopMegaMenu";
import ChatWidget from "./components/ChatWidget";
import { 
  Upload, Sparkles, Heart, Gift, Star, ShoppingCart, User, Search, Menu, Phone, Mail, MapPin, Award, Palette, Camera, Zap, MessageCircle, Clock, Shield, Truck, Users, ArrowRight, CheckCircle, Quote, Hammer, Package, Percent, Target, TrendingUp, ThumbsUp, X, ChevronDown, PhoneCall, Instagram, Facebook, ExternalLink, Play, Pause, Shirt
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SEOHead = () => (
  <Helmet>
    <title>Memories - Photo Frames & Customized Gift Shop | Coimbatore | Frame with Love and Crafted with Care</title>
    <meta name="description" content="Memories - Premium photo frames & customized gifts in Coimbatore. Sublimation printing, custom mugs, t-shirts, corporate gifts. Visit 19B Kani Illam, Keeranatham Road. Call +91 81480 40148" />
    <meta name="keywords" content="memories photo frames, coimbatore gift shop, sublimation printing, custom mugs, personalized t-shirts, corporate gifts, keeranatham road, photo printing coimbatore" />
    <meta property="og:title" content="Memories - Photo Frames & Customized Gift Shop Coimbatore" />
    <meta property="og:description" content="Frame with Love and Crafted with Care - Premium photo frames and personalized gifts. Sublimation printing specialist in Coimbatore." />
    <meta property="og:image" content="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/t3qf6xi2_NAME.png" />
    <meta property="og:url" content="https://memoriesngifts.com" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://memoriesngifts.com" />
    <link rel="icon" href="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/6aq8xona_LOGO.png" />
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Memories - Photo Frames & Customized Gift Shop",
        "description": "Frame with Love and Crafted with Care - Premium photo frames, sublimation printing, and personalized gifts",
        "address": {"@type": "PostalAddress", "streetAddress": "19B Kani Illam, Keeranatham Road, Near Ruby School", "addressLocality": "Saravanampatti, Coimbatore", "addressRegion": "Tamil Nadu", "postalCode": "641035", "addressCountry": "IN"},
        "telephone": "+91 81480 40148", "email": "memories@photogifthub.com", "url": "https://memoriesngifts.com", "openingHours": ["Mo-Sa 09:30-21:00"], "priceRange": "₹₹",
        "aggregateRating": {"@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "263"},
        "geo": {"@type": "GeoCoordinates", "latitude": "11.0755", "longitude": "76.9983"}
      })}
    </script>
  </Helmet>
);

const WhatsAppFloat = () => (
  <div className="fixed bottom-6 right-6 z-50 animate-bounce">
    <Button className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-white group" onClick={() => window.open('https://wa.me/918148040148?text=Hi! I need help with custom photo frames and gifts', '_blank')} aria-label="Chat on WhatsApp">
      <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
    </Button>
    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
  </div>
);

const BusinessLogo = ({ size = "w-12 h-12" }) => (
  <div className={`${size} relative group cursor-pointer`}>
    <img src="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/6aq8xona_LOGO.png" alt="Memories Logo" className={`${size} object-contain rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`} />
  </div>
);

const BusinessName = () => (
  <img src="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/t3qf6xi2_NAME.png" alt="Memories - Frame with Love and Crafted with Care" className="h-10 object-contain" />
);

const SmartCallButton = ({ className = "", children, phoneNumber = "+918148040148" }) => {
  const handleCall = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) window.open(`tel:${phoneNumber}`, '_blank');
    else window.open(`https://wa.me/918148040148?text=Hi! I want to call about your services`, '_blank');
  };
  return <Button className={className} onClick={handleCall}>{children}</Button>;
};

const CartIcon = () => {
  const { cartCount } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  return (
    <>
      <Button variant="ghost" size="icon" className="relative group" onClick={() => setShowCheckout(true)}>
        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {cartCount > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-rose-500 animate-pulse">{cartCount}</Badge>}
      </Button>
      {showCheckout && <EnhancedCheckoutPage onClose={() => setShowCheckout(false)} />}
    </>
  );
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hidden md:flex justify-between items-center py-2 text-sm border-b border-rose-50">
          <div className="flex items-center space-x-6 text-gray-700">
            <SmartCallButton className="flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors cursor-pointer bg-transparent p-0 h-auto"><Phone className="w-3 h-3 text-rose-600" /><span className="font-semibold text-gray-900">+91 81480 40148</span></SmartCallButton>
            <div className="flex items-center space-x-2 text-gray-700"><Clock className="w-3 h-3 text-blue-600" /><span className="text-gray-800 font-medium">Mon-Sat 9:30AM-9PM</span></div>
            <div className="flex items-center space-x-2 text-gray-700"><MapPin className="w-3 h-3 text-green-600" /><span className="text-gray-800 font-medium">Keeranatham Road, Coimbatore</span></div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Shield className="w-3 h-3 mr-1" />4.9★ Rated Shop</Badge>
          </div>
        </div>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center justify-between space-x-4 lg:space-x-8">
            <div className="flex items-center space-x-2 md:space-x-3 group cursor-pointer flex-shrink-0"><BusinessLogo size="w-10 h-10 md:w-12 md:h-12" /><div className="hidden sm:block"><BusinessName /></div></div>
            <nav className="hidden md:flex space-x-4 lg:space-x-6 whitespace-nowrap">
              <a href="#home" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">Home</a><ShopMegaMenu />
              <a href="#customizer" className="text-gray-700 hover:text-rose-600 font-medium transition-colors">Customize</a>
              <a href="#ai-finder" className="text-gray-700 hover:text-rose-600 font-medium transition-colors">Gift Finder</a>
              <a href="/about" className="text-gray-700 hover:text-rose-600 font-medium transition-colors">About Us</a>
            </nav>
          </div>
          <div className="flex items-center space-x-3 lg:space-x-4">
            <div className="hidden 2xl:block w-56"><SearchComponent /></div>
            <Badge variant="secondary" className="bg-rose-100 text-rose-800 hover:bg-rose-100 hidden 2xl:flex animate-pulse"><Gift className="w-3 h-3 mr-1" />Free Gift Wrap</Badge>
            <AccountButton /><CartIcon />
            <SmartCallButton className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white hidden lg:flex"><Phone className="w-4 h-4 mr-2" />Call Now</SmartCallButton>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}><Menu className="w-5 h-5" /></Button>
          </div>
        </div>
        {isMenuOpen && <div className="md:hidden py-4 border-t border-rose-100 bg-white/95 backdrop-blur-md"><div className="mb-4"><SearchComponent /></div><nav className="flex flex-col space-y-3"><a href="#home" className="text-gray-700 font-medium py-2 px-4">Home</a><a href="#shop" className="text-gray-700 font-medium py-2 px-4">Shop</a><a href="#customizer" className="text-gray-700 font-medium py-2 px-4">Customize</a><a href="#ai-finder" className="text-gray-700 font-medium py-2 px-4">Gift Finder</a><a href="/about" className="text-gray-700 font-medium py-2 px-4">About Us</a><SmartCallButton className="bg-gradient-to-r from-rose-500 to-pink-500 text-white mx-4"><Phone className="w-4 h-4 mr-2" />Call +91 81480 40148</SmartCallButton></nav></div>}
      </div>
    </header>
  );
};

const AboutUsPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome');
    if (!hasSeenWelcome) { setTimeout(() => setShowPopup(true), 2000); localStorage.setItem('has_seen_welcome', 'true'); }
  }, []);
  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center space-x-2"><BusinessLogo size="w-8 h-8" /><span>Welcome to Memories!</span></DialogTitle><DialogDescription>Your trusted partner for premium photo frames and personalized gifts since 2020</DialogDescription></DialogHeader><div className="space-y-4"><div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200"><h3 className="font-semibold text-rose-800 mb-2">🎉 Grand Opening Offers!</h3><ul className="text-sm text-rose-700 space-y-1"><li>• 25% OFF on all photo frames</li><li>• Free home delivery</li><li>• Free gift wrapping</li><li>• AI-powered gift recommendations</li></ul></div><div className="text-center"><p className="text-gray-600 mb-4">Located at Keeranatham Road, Coimbatore</p><div className="space-y-2"><Button onClick={() => { document.getElementById('customizer')?.scrollIntoView({behavior: 'smooth'}); setShowPopup(false); }} className="w-full bg-gradient-to-r from-rose-500 to-pink-500">Start Creating Now</Button><Button variant="outline" onClick={() => setShowPopup(false)} className="w-full">Continue Browsing</Button></div></div></div></DialogContent>
    </Dialog>
  );
};

const TestimonialsSection = () => null;

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`, { timeout: 6000 });
        if (!cancelled) setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching products:', error);
        if (!cancelled) toast.error("Products are taking longer to load. You can still browse and call us!");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <SEOHead /><Header /><AboutUsPopup /><HeroSection /><ProductGrid products={products} /><PhotoCustomizer /><EnhancedAIGiftFinder />
      <section id="reviews" className="py-16 bg-gray-50"><div className="container mx-auto px-4"><ReviewSystemEnhanced /></div></section>
      <TestimonialsSection /><Footer /><WhatsAppFloat /><ChatWidget />
    </div>
  );
};

const PhotoCustomizer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState('wooden');
  const [selectedSize, setSelectedSize] = useState('8x10');
  const [borderThickness, setBorderThickness] = useState('1');
  const { addToCart } = useCart();
  const handleImageUpload = async (event) => { const file = event.target.files[0]; if (!file) return; setIsUploading(true); const formData = new FormData(); formData.append('file', file); try { const response = await axios.post(`${API}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); if (response.data.success) { setSelectedImage(response.data); setUploadStatus(response.data.message); toast.success("Image uploaded successfully! Ready for customization 🎨"); } } catch (error) { toast.error("Upload failed. Please try again or call us at +91 81480 40148"); setUploadStatus("Upload failed. Please try again."); } finally { setIsUploading(false); } };
  const frameStyles = { wooden: { name: 'Classic Wooden Frame', color: '#8B4513', price: 0 }, acrylic: { name: 'Modern Acrylic Frame', color: '#E0E0E0', price: 200 }, metal: { name: 'Sleek Metal Frame', color: '#C0C0C0', price: 150 }, led: { name: 'LED Backlit Frame', color: '#FFD700', price: 500 }, mattblack: { name: 'Matt Black Frame', color: '#2C2C2C', price: 300 }, design: { name: 'Designer Frame', color: '#D4A574', price: 400 } };
  const sizes = { '8x10': { name: '8" × 10"', price: 899 }, '12x16': { name: '12" × 16"', price: 1199 }, '16x20': { name: '16" × 20"', price: 1599 }, '20x24': { name: '20" × 24"', price: 1999 } };
  const borderThicknesses = ['0.5','0.75','1','1.25','1.5','1.75','2','2.25','2.5','2.75','3','3.25','3.5','3.75','4'];
  const calculatePrice = () => sizes[selectedSize].price + frameStyles[selectedFrame].price + parseFloat(borderThickness) * 50;
  const handleAddToCart = () => { if (!selectedImage) { toast.error('Please upload an image first'); return; } const customProduct = { id: `custom_frame_${Date.now()}`, name: `Custom Photo Frame - ${frameStyles[selectedFrame].name}`, description: `${sizes[selectedSize].name} with ${borderThickness}" border`, base_price: calculatePrice(), category: 'frames', image_url: selectedImage.image_url || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&h=300', customOptions: { frameStyle: frameStyles[selectedFrame].name, size: sizes[selectedSize].name, borderThickness: `${borderThickness}"`, uploadedImage: selectedImage } }; addToCart(customProduct, customProduct.customOptions); };
  return null;
};

const Footer = () => (
  <footer className="bg-gray-900 text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-16"><div className="space-y-6"><div className="flex items-center space-x-3"><BusinessLogo size="w-12 h-12" /><div><BusinessName /></div></div><p className="text-gray-300 leading-relaxed">Creating beautiful personalized memories since 2020. Your trusted partner for premium photo frames, custom gifts, and sublimation printing in Coimbatore.</p><div className="flex space-x-4"><Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => window.open('https://instagram.com/memories_photoframes', '_blank')}><Instagram className="w-5 h-5" /></Button><Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => window.open('https://facebook.com/memories.photoframes', '_blank')}><Facebook className="w-5 h-5" /></Button><Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-gray-800" onClick={() => window.open('https://wa.me/918148040148', '_blank')}><MessageCircle className="w-5 h-5" /></Button></div></div><div><h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3><div className="space-y-3"><a href="#shop" className="block text-gray-300 hover:text-white transition-colors">Shop Products</a><a href="#customizer" className="block text-gray-300 hover:text-white transition-colors">Photo Customizer</a><a href="#ai-finder" className="block text-gray-300 hover:text-white transition-colors">AI Gift Finder</a><a href="#about" className="block text-gray-300 hover:text-white transition-colors">About Us</a></div></div><div><h3 className="text-lg font-semibold text-white mb-6">Contact Info</h3><div className="space-y-4"><div className="flex items-start space-x-3"><MapPin className="w-5 h-5 text-rose-400 mt-1 flex-shrink-0" /><div className="text-gray-300"><div className="font-medium text-white">Visit Our Store</div><div>19B Kani Illam, Keeranatham Road</div><div>Near Ruby School, Saravanampatti</div><div>Coimbatore, Tamil Nadu 641035</div></div></div><SmartCallButton className="flex items-center space-x-3 bg-transparent p-0 h-auto hover:bg-transparent text-gray-300 hover:text-white"><Phone className="w-5 h-5 text-rose-400" /><div><div className="font-medium text-white">Call Us</div><span className="text-gray-200 hover:text-white transition-colors font-semibold">+91 81480 40148</span></div></SmartCallButton><div className="flex items-center space-x-3"><Clock className="w-5 h-5 text-rose-400" /><div><div className="font-medium text-white">Store Hours</div><div className="text-gray-300">Mon-Sat: 9:30AM - 9:00PM</div><div className="text-gray-300">Sunday: Closed</div></div></div></div></div><div><h3 className="text-lg font-semibold text-white mb-6">Our Services</h3><div className="space-y-3 text-gray-300"><div className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Custom Photo Frames</span></div><div className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Sublimation Printing</span></div><div className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Personalized Mugs</span></div><div className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Custom T-Shirts</span></div><div className="flex items-center space-x-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Corporate Gifts</span></div><div className="pt-4"><Button className="bg-gradient-to-r from-rose-500 to-pink-500 text-white w-full" onClick={() => window.open('https://wa.me/918148040148?text=Hi! I need help with custom gifts', '_blank')}><MessageCircle className="w-4 h-4 mr-2" />Get Quote</Button></div><div className="pt-6"><Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => window.open('https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw', '_blank')}><MapPin className="w-4 h-4 mr-2" />Visit Our Store</Button></div></div></div></div><div className="border-t border-gray-800 py-8"><div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"><div className="text-gray-400 text-center md:text-left"><p>&copy; 2025 Memories - Photo Frames & Customized Gift Shop. All rights reserved.</p><p className="text-sm mt-1">Proudly serving Coimbatore since 2020 | 4.9★ Google Rating</p></div><div className="flex items-center space-x-6 text-gray-400"><Badge className="bg-green-100 text-green-800"><Shield className="w-3 h-3 mr-1" />Secure Payments</Badge><Badge className="bg-blue-100 text-blue-800"><Truck className="w-3 h-3 mr-1" />Free Delivery</Badge><Badge className="bg-purple-100 text-purple-800"><Award className="w-3 h-3 mr-1" />Quality Guaranteed</Badge></div></div></div></div></footer>
);

function App() {
  return (
    <HelmetProvider><AuthProvider><CartProvider><div className="App"><Toaster /><BrowserRouter><Routes><Route path="/" element={<Home />} /><Route path="/about" element={<AboutUsPage />} /><Route path="/product/:slug" element={<ProductDetailPage />} /><Route path="/admin" element={<AdminPanel />} /></Routes></BrowserRouter></div></CartProvider></AuthProvider></HelmetProvider>
  );
}

export default App;
