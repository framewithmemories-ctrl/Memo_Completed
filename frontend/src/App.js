import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
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
import { UserProfileSimple } from "./components/UserProfileSimple";
import { EnhancedAIGiftFinder } from "./components/EnhancedAIGiftFinder";
import { HeroSection, AboutUsSection, ProductGrid } from "./components/MainComponents";
import { AboutUsPage } from "./components/AboutUsPage";
import { EnhancedCheckoutPage } from "./components/EnhancedCheckoutPage";
import { ReviewSystemEnhanced } from "./components/ReviewSystemEnhanced";
import AdminPanel from "./components/AdminPanel";
import { 
  Upload, 
  Sparkles, 
  Heart, 
  Gift, 
  Star, 
  ShoppingCart, 
  User, 
  Search,
  Menu,
  Phone,
  Mail,
  MapPin,
  Award,
  Palette,
  Camera,
  Zap,
  MessageCircle,
  Clock,
  Shield,
  Truck,
  Users,
  ArrowRight,
  CheckCircle,
  Quote,
  Hammer,
  Package,
  Percent,
  Target,
  TrendingUp,
  ThumbsUp,
  X,
  ChevronDown,
  PhoneCall,
  Instagram,
  Facebook,
  ExternalLink,
  Play,
  Pause,
  Shirt
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// SEO Component with New Branding
const SEOHead = () => (
  <Helmet>
    <title>Memories - Photo Frames & Customized Gift Shop | Coimbatore | Frame with Love and Crafted with Care</title>
    <meta name="description" content="Memories - Premium photo frames & customized gifts in Coimbatore. Sublimation printing, custom mugs, t-shirts, corporate gifts. Visit 19B Kani Illam, Keeranatham Road. Call +91 81480 40148" />
    <meta name="keywords" content="memories photo frames, coimbatore gift shop, sublimation printing, custom mugs, personalized t-shirts, corporate gifts, keeranatham road, photo printing coimbatore" />
    <meta property="og:title" content="Memories - Photo Frames & Customized Gift Shop Coimbatore" />
    <meta property="og:description" content="Frame with Love and Crafted with Care - Premium photo frames and personalized gifts. Sublimation printing specialist in Coimbatore." />
    <meta property="og:image" content="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/t3qf6xi2_NAME.png" />
    <meta property="og:url" content="https://photo-frames-dash.preview.emergentagent.com" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="https://photo-frames-dash.preview.emergentagent.com" />
    <link rel="icon" href="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/6aq8xona_LOGO.png" />
    <script type="application/ld+json">
      {JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Memories - Photo Frames & Customized Gift Shop",
        "description": "Frame with Love and Crafted with Care - Premium photo frames, sublimation printing, and personalized gifts",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "19B Kani Illam, Keeranatham Road, Near Ruby School",
          "addressLocality": "Saravanampatti, Coimbatore",
          "addressRegion": "Tamil Nadu",
          "postalCode": "641035",
          "addressCountry": "IN"
        },
        "telephone": "+91 81480 40148",
        "email": "memories@photogifthub.com",
        "url": "https://photo-frames-dash.preview.emergentagent.com",
        "openingHours": ["Mo-Sa 09:30-21:00"],
        "priceRange": "₹₹",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "263"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "11.0755",
          "longitude": "76.9983"
        }
      })}
    </script>
  </Helmet>
);

// WhatsApp Float Button
const WhatsAppFloat = () => (
  <div className="fixed bottom-6 right-6 z-50 animate-bounce">
    <Button 
      className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-xl hover:shadow-2xl transition-all duration-300 border-4 border-white group"
      onClick={() => window.open('https://wa.me/918148040148?text=Hi! I need help with custom photo frames and gifts', '_blank')}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
    </Button>
    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
  </div>
);

// New Logo Component
const BusinessLogo = ({ size = "w-12 h-12" }) => {
  return (
    <div className={`${size} relative group cursor-pointer`}>
      <img 
        src="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/6aq8xona_LOGO.png"
        alt="Memories Logo"
        className={`${size} object-contain rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105`}
      />
    </div>
  );
};

// Business Name Component (with built-in caption)
const BusinessName = () => {
  return (
    <img 
      src="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/t3qf6xi2_NAME.png"
      alt="Memories - Frame with Love and Crafted with Care"
      className="h-10 object-contain"
    />
  );
};

// Smart Call Button Component
const SmartCallButton = ({ className = "", children, phoneNumber = "+918148040148" }) => {
  const handleCall = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Mobile: Open dialer
      window.open(`tel:${phoneNumber}`, '_blank');
    } else {
      // Desktop: Open WhatsApp
      window.open(`https://wa.me/918148040148?text=Hi! I want to call about your services`, '_blank');
    }
  };

  return (
    <Button className={className} onClick={handleCall}>
      {children}
    </Button>
  );
};

// Cart Icon Component with WORKING Counter and Checkout
const CartIcon = () => {
  const { cartCount } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative group"
        onClick={() => setShowCheckout(true)}
      >
        <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
        {cartCount > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-rose-500 animate-pulse">
            {cartCount}
          </Badge>
        )}
      </Button>
      
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50">
          <EnhancedCheckoutPage onClose={() => setShowCheckout(false)} />
        </div>
      )}
    </>
  );
};

// Enhanced Header Component
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar */}
        <div className="hidden md:flex justify-between items-center py-2 text-sm border-b border-rose-50">
          <div className="flex items-center space-x-6 text-gray-700">
            <SmartCallButton className="flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors cursor-pointer bg-transparent p-0 h-auto">
              <Phone className="w-3 h-3 text-rose-600" />
              <span className="font-semibold text-gray-900">+91 81480 40148</span>
            </SmartCallButton>
            <div className="flex items-center space-x-2 text-gray-700">
              <Clock className="w-3 h-3 text-blue-600" />
              <span className="text-gray-800 font-medium">Mon-Sat 9:30AM-9PM</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <MapPin className="w-3 h-3 text-green-600" />
              <span className="text-gray-800 font-medium">Keeranatham Road, Coimbatore</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800 animate-pulse">
              <Truck className="w-3 h-3 mr-1" />
              Free Delivery Available
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Shield className="w-3 h-3 mr-1" />
              4.9★ Rated Shop
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center justify-between space-x-4 lg:space-x-8">
            <div className="flex items-center space-x-2 md:space-x-3 group cursor-pointer flex-shrink-0">
              <BusinessLogo size="w-10 h-10 md:w-12 md:h-12" />
              <div className="hidden sm:block">
                <BusinessName />
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-6">
              <a href="#home" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#shop" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">
                Shop
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#customizer" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">
                Customize
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="#ai-finder" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">
                Gift Finder
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
              </a>
              <a href="/about" className="text-gray-700 hover:text-rose-600 font-medium transition-colors relative group">
                About Us
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-rose-600 transition-all group-hover:w-full"></span>
              </a>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <SearchComponent />
            </div>
            
            <Badge variant="secondary" className="bg-rose-100 text-rose-800 hidden sm:flex animate-pulse">
              <Gift className="w-3 h-3 mr-1" />
              Free Gift Wrap
            </Badge>
            
            <button 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative group"
              onClick={() => {
                // Load and execute the external profile modal script
                if (!window.openProfileModal) {
                  const script = document.createElement('script');
                  script.src = '/profile-modal.js';
                  script.onload = () => {
                    window.openProfileModal();
                  };
                  document.head.appendChild(script);
                } else {
                  window.openProfileModal();
                }
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <CartIcon />
            
            <SmartCallButton className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white hidden sm:flex">
              <Phone className="w-4 h-4 mr-2" />
              Call Now
            </SmartCallButton>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-rose-100 bg-white/95 backdrop-blur-md">
            <div className="mb-4">
              <SearchComponent />
            </div>
            <nav className="flex flex-col space-y-3">
              <a href="#home" className="text-gray-700 hover:text-rose-600 font-medium py-2 px-4 hover:bg-rose-50 rounded-lg transition-all">Home</a>
              <a href="#shop" className="text-gray-700 hover:text-rose-600 font-medium py-2 px-4 hover:bg-rose-50 rounded-lg transition-all">Shop</a>
              <a href="#customizer" className="text-gray-700 hover:text-rose-600 font-medium py-2 px-4 hover:bg-rose-50 rounded-lg transition-all">Customize</a>
              <a href="#ai-finder" className="text-gray-700 hover:text-rose-600 font-medium py-2 px-4 hover:bg-rose-50 rounded-lg transition-all">Gift Finder</a>
              <a href="/about" className="text-gray-700 hover:text-rose-600 font-medium py-2 px-4 hover:bg-rose-50 rounded-lg transition-all">About Us</a>
              <SmartCallButton className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white mx-4">
                <Phone className="w-4 h-4 mr-2" />
                Call +91 81480 40148
              </SmartCallButton>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

// About Us Popup Component (First Visit)
const AboutUsPopup = () => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('memoriesVisited');
    if (!hasVisited) {
      setTimeout(() => setShowPopup(true), 2000); // Show after 2 seconds
      localStorage.setItem('memoriesVisited', 'true');
    }
  }, []);

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BusinessLogo size="w-8 h-8" />
            <span>Welcome to Memories!</span>
          </DialogTitle>
          <DialogDescription>
            Your trusted partner for premium photo frames and personalized gifts since 2020
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 p-4 rounded-lg border border-rose-200">
            <h3 className="font-semibold text-rose-800 mb-2">🎉 Grand Opening Offers!</h3>
            <ul className="text-sm text-rose-700 space-y-1">
              <li>• 25% OFF on all photo frames</li>
              <li>• Free home delivery</li>
              <li>• Free gift wrapping</li>
              <li>• AI-powered gift recommendations</li>
            </ul>
          </div>
          
          <div className="text-center">
            <p className="text-gray-600 mb-4">Located at Keeranatham Road, Coimbatore</p>
            <div className="space-y-2">
              <Button 
                onClick={() => {
                  document.getElementById('customizer')?.scrollIntoView({behavior: 'smooth'});
                  setShowPopup(false);
                }}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              >
                Start Creating Now
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPopup(false)}
                className="w-full"
              >
                Continue Browsing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Enhanced Photo Customizer with Matt Black and Design Frames
const PhotoCustomizer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState('wooden');
  const [selectedSize, setSelectedSize] = useState('8x10');
  const [borderThickness, setBorderThickness] = useState('1');
  const { addToCart } = useCart();

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        setSelectedImage(response.data);
        setUploadStatus(response.data.message);
        toast.success("Image uploaded successfully! Ready for customization 🎨");
      }
    } catch (error) {
      toast.error("Upload failed. Please try again or call us at +91 81480 40148");
      setUploadStatus("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const frameStyles = {
    wooden: { name: 'Classic Wooden Frame', color: '#8B4513', price: 0 },
    acrylic: { name: 'Modern Acrylic Frame', color: '#E0E0E0', price: 200 },
    metal: { name: 'Sleek Metal Frame', color: '#C0C0C0', price: 150 },
    led: { name: 'LED Backlit Frame', color: '#FFD700', price: 500 },
    mattblack: { name: 'Matt Black Frame', color: '#2C2C2C', price: 300 },
    design: { name: 'Designer Frame', color: '#D4A574', price: 400 }
  };

  const sizes = {
    '8x10': { name: '8" × 10"', price: 899 },
    '12x16': { name: '12" × 16"', price: 1199 },
    '16x20': { name: '16" × 20"', price: 1599 },
    '20x24': { name: '20" × 24"', price: 1999 }
  };

  const borderThicknesses = [
    '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '2.25', '2.5', '2.75', '3', '3.25', '3.5', '3.75', '4'
  ];

  const calculatePrice = () => {
    const basePrice = sizes[selectedSize].price;
    const framePrice = frameStyles[selectedFrame].price;
    const borderPrice = parseFloat(borderThickness) * 50; // ₹50 per 0.25 inch
    return basePrice + framePrice + borderPrice;
  };

  const handleAddToCart = () => {
    if (!selectedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    const customProduct = {
      id: `custom_frame_${Date.now()}`,
      name: `Custom Photo Frame - ${frameStyles[selectedFrame].name}`,
      description: `${sizes[selectedSize].name} with ${borderThickness}" border`,
      base_price: calculatePrice(),
      category: 'frames',
      image_url: selectedImage.image_url || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&h=300',
      customOptions: {
        frameStyle: frameStyles[selectedFrame].name,
        size: sizes[selectedSize].name,
        borderThickness: `${borderThickness}"`,
        uploadedImage: selectedImage
      }
    };
    
    addToCart(customProduct, customProduct.customOptions);
  };

  const sharePreview = () => {
    if (selectedImage) {
      const shareText = `Check out my custom photo frame design! ${frameStyles[selectedFrame].name} - ${sizes[selectedSize].name} with ${borderThickness}" border. Only ₹${calculatePrice()}`;
      
      if (navigator.share) {
        navigator.share({
          title: 'My Custom Photo Frame',
          text: shareText,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(shareText);
        toast.success('Preview details copied to clipboard!');
      }
    }
  };

  const saveDesign = () => {
    if (selectedImage) {
      const design = {
        frame: selectedFrame,
        size: selectedSize,
        borderThickness,
        image: selectedImage,
        price: calculatePrice(),
        timestamp: new Date().toISOString()
      };
      
      const savedDesigns = JSON.parse(localStorage.getItem('savedDesigns') || '[]');
      savedDesigns.push(design);
      localStorage.setItem('savedDesigns', JSON.stringify(savedDesigns));
      
      toast.success('Design saved! 💾');
    }
  };

  return (
    <section id="customizer" className="py-20 bg-gradient-to-br from-gray-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-purple-100 text-purple-800 mb-4">
            <Zap className="w-3 h-3 mr-1" />
            Smart Upload & Live Preview
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Photo Customizer
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your photo and see it transformed into a beautiful custom frame with real-time preview. 
            Our AI ensures perfect quality for printing.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-6">
            <Card className="border-2 border-dashed border-rose-300 bg-rose-50/50 hover:border-rose-400 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="space-y-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Smart Upload</h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">
                      Upload JPG, PNG, or HEIC files up to 25MB. Our AI automatically optimizes your photo for the best print quality.
                      <br/><span className="text-sm text-rose-600 font-medium">💡 Tip: Use high-resolution images (min 2000x2000px) for crisp prints</span>
                    </p>
                  </div>
                  
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload">
                      <Button 
                        asChild 
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <span className="cursor-pointer">
                          {isUploading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 mr-2" />
                              Choose Your Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                  
                  {uploadStatus && (
                    <div className={`p-3 rounded-lg ${uploadStatus.includes('warning') || uploadStatus.includes('Low') ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      <p className="text-sm font-medium">{uploadStatus}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card className="border border-rose-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
                  Live 3D Preview
                </CardTitle>
                <CardDescription>See exactly how your frame will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedImage ? (
                    <div className="relative transform hover:scale-105 transition-transform duration-300">
                      <div 
                        className="w-80 h-80 rounded-lg shadow-2xl"
                        style={{ 
                          backgroundColor: frameStyles[selectedFrame].color,
                          border: selectedFrame === 'led' ? '4px solid #FFD700' : 'none',
                          padding: `${parseFloat(borderThickness) * 8}px`
                        }}
                      >
                        <img 
                          src={`data:image/jpeg;base64,${selectedImage.image_data}`}
                          alt="Your photo preview in custom frame"
                          className="w-full h-full object-cover rounded shadow-lg"
                        />
                        {selectedFrame === 'led' && (
                          <div className="absolute inset-0 rounded-lg shadow-inner border-2 border-yellow-300 animate-pulse"></div>
                        )}
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 to-pink-400 rounded-xl -z-10 opacity-20"></div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <Camera className="w-20 h-20 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Upload a photo to see live preview</p>
                    </div>
                  )}
                </div>
                
                {selectedImage && (
                  <div className="mt-8 space-y-6">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">Frame Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(frameStyles).map(([key, style]) => (
                          <Button
                            key={key}
                            variant={selectedFrame === key ? "default" : "outline"}
                            className={`text-xs ${selectedFrame === key ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'border-rose-200 hover:bg-rose-50'}`}
                            onClick={() => setSelectedFrame(key)}
                          >
                            <div 
                              className="w-4 h-4 rounded mr-2 border"
                              style={{ backgroundColor: style.color }}
                            ></div>
                            <span>{style.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">Size</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="border-rose-200 focus:border-rose-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(sizes).map(([key, size]) => (
                            <SelectItem key={key} value={key}>
                              {size.name} - ₹{size.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-3 block">Border Thickness</label>
                      <Select value={borderThickness} onValueChange={setBorderThickness}>
                        <SelectTrigger className="border-rose-200 focus:border-rose-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {borderThicknesses.map((thickness) => (
                            <SelectItem key={thickness} value={thickness}>
                              {thickness}" border - +₹{parseFloat(thickness) * 50}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-700 font-medium">Total Price:</span>
                        <span className="text-3xl font-bold text-rose-600">₹{calculatePrice()}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Includes: {frameStyles[selectedFrame].name} + {sizes[selectedSize].name} + {borderThickness}" border + Free Gift Wrap
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Button 
                        onClick={handleAddToCart}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-4 text-lg shadow-lg hover:shadow-xl transition-all"
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Add to Cart - ₹{calculatePrice()}
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          onClick={saveDesign}
                          variant="outline" 
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 py-3"
                        >
                          <Heart className="w-4 h-4 mr-2" />
                          Save Design
                        </Button>
                        <Button 
                          onClick={sharePreview}
                          variant="outline" 
                          className="border-blue-200 text-blue-700 hover:bg-blue-50 py-3"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Share Preview
                        </Button>
                      </div>
                      
                      <div className="text-center pt-3">
                        <SmartCallButton className="text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent">
                          <PhoneCall className="w-4 h-4 mr-2" />
                          Need Help? Call +91 81480 40148
                        </SmartCallButton>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

// Enhanced Footer with Correct Location
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-16">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <BusinessLogo size="w-12 h-12" />
              <div>
                <BusinessName />
              </div>
            </div>
            
            <p className="text-gray-300 leading-relaxed">
              Creating beautiful personalized memories since 2020. Your trusted partner for premium photo frames, 
              custom gifts, and sublimation printing in Coimbatore.
            </p>
            
            <div className="flex space-x-4">
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => window.open('https://instagram.com/memories_photoframes', '_blank')}
              >
                <Instagram className="w-5 h-5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => window.open('https://facebook.com/memories.photoframes', '_blank')}
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => window.open('https://wa.me/918148040148', '_blank')}
              >
                <MessageCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3>
            <div className="space-y-3">
              <a href="#shop" className="block text-gray-300 hover:text-white transition-colors">Shop Products</a>
              <a href="#customizer" className="block text-gray-300 hover:text-white transition-colors">Photo Customizer</a>
              <a href="#ai-finder" className="block text-gray-300 hover:text-white transition-colors">AI Gift Finder</a>
              <a href="#about" className="block text-gray-300 hover:text-white transition-colors">About Us</a>
              <Button 
                variant="ghost" 
                className="p-0 text-gray-300 hover:text-white h-auto"
                onClick={() => window.open('https://wa.me/918148040148?text=Hi! I need a bulk order quote', '_blank')}
              >
                Bulk Orders
              </Button>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-rose-400 mt-1 flex-shrink-0" />
                <div className="text-gray-300">
                  <div className="font-medium text-white">Visit Our Store</div>
                  <div>19B Kani Illam, Keeranatham Road</div>
                  <div>Near Ruby School, Saravanampatti</div>
                  <div>Coimbatore, Tamil Nadu 641035</div>
                </div>
              </div>
              
              <SmartCallButton className="flex items-center space-x-3 bg-transparent p-0 h-auto hover:bg-transparent text-gray-300 hover:text-white">
                <Phone className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-medium text-white">Call Us</div>
                  <span className="text-gray-200 hover:text-white transition-colors font-semibold">
                    +91 81480 40148
                  </span>
                </div>
              </SmartCallButton>
              
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-rose-400" />
                <div>
                  <div className="font-medium text-white">Store Hours</div>
                  <div className="text-gray-300">Mon-Sat: 9:30AM - 9:00PM</div>
                  <div className="text-gray-300">Sunday: Closed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Our Services</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Custom Photo Frames</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Sublimation Printing</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Personalized Mugs</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Custom T-Shirts</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Corporate Gifts</span>
              </div>
              
              <div className="pt-4">
                <Button 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white w-full"
                  onClick={() => window.open('https://wa.me/918148040148?text=Hi! I need help with custom gifts', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Get Quote
                </Button>
              </div>
            </div>
            
            {/* Visit Store Button moved here */}
            <div className="pt-6">
              <Button 
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                onClick={() => window.open('https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu', '_blank')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Visit Our Store
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-center md:text-left">
              <p>&copy; 2025 Memories - Photo Frames & Customized Gift Shop. All rights reserved.</p>
              <p className="text-sm mt-1">Proudly serving Coimbatore since 2020 | 4.9★ Google Rating</p>
            </div>
            
            <div className="flex items-center space-x-6 text-gray-400">
              <Badge className="bg-green-100 text-green-800">
                <Shield className="w-3 h-3 mr-1" />
                Secure Payments
              </Badge>
              <Badge className="bg-blue-100 text-blue-800">
                <Truck className="w-3 h-3 mr-1" />
                Free Delivery
              </Badge>
              <Badge className="bg-purple-100 text-purple-800">
                <Award className="w-3 h-3 mr-1" />
                Quality Guaranteed
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Customer Testimonials with Fixed Google Reviews
const TestimonialsSection = () => {
  const testimonials = [
    {
      name: 'Priya Sharma',
      location: 'Saravanampatti',
      rating: 5,
      text: 'Amazing quality frames! The sublimation printing is crystal clear and the wooden frame is beautifully crafted. Highly recommend Memories for all your photo frame needs.',
      image: 'https://images.unsplash.com/photo-1494790108755-2616c0763c65?auto=format&fit=crop&w=150&h=150',
      product: 'Custom Photo Frame'
    },
    {
      name: 'Rajesh Kumar',
      location: 'RS Puram',
      rating: 5,
      text: 'Ordered 50 corporate mugs for our company event. Exceptional quality and delivered on time. The team at Memories is very professional and helpful.',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150',
      product: 'Corporate Mugs'
    },
    {
      name: 'Meera Krishnan',
      location: 'Peelamedu',
      rating: 5,
      text: 'Got custom t-shirts made for my daughter\'s birthday party. The prints are vibrant and the fabric quality is excellent. Kids loved them!',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150',
      product: 'Custom T-Shirts'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-rose-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-green-100 text-green-800 mb-4">
            <ThumbsUp className="w-3 h-3 mr-1" />
            Customer Reviews
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            What Our 
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"> Customers </span>
            Say
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real reviews from real customers who love their personalized memories
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-green-200 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Rating */}
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  {/* Review Text */}
                  <blockquote className="text-gray-700 leading-relaxed">
                    <Quote className="w-5 h-5 text-gray-400 mb-2" />
                    "{testimonial.text}"
                  </blockquote>
                  
                  {/* Product Badge */}
                  <Badge variant="secondary" className="bg-rose-100 text-rose-800">
                    {testimonial.product}
                  </Badge>
                  
                  {/* Customer Info */}
                  <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                    <img 
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {testimonial.location}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fixed Google Reviews CTA */}
        <div className="text-center mt-12">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-green-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">4.9★ on Google Reviews</div>
            </div>
            <p className="text-gray-600 mb-6">Join 263+ happy customers who rated us 5 stars!</p>
            <div className="space-x-4">
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => window.open('https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Read All Reviews
              </Button>
              <Button 
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
                onClick={() => window.open('https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!3m1!5s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!4m16!1m7!3m6!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!2sMemories+-+Photo+Frames+%26+Customized+Gift+Shop!8m2!3d11.0755!4d76.9983!16s%2Fg%2F11s2y8k8qw!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!2sMemories+-+Photo+Frames+%26+Customized+Gift+Shop!8m2!3d11.0755!4d76.9983!10e5!16s%2Fg%2F11s2y8k8qw?hl=en#lrd=0x3ba859410e43c55f:0xd0f1eaeacbc9bf40,3', '_blank')}
              >
                <Star className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API}/products`);
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error("Unable to load products - but you can still browse and call us!");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
        <div className="text-center space-y-6">
          <BusinessLogo size="w-24 h-24" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Memories...</h2>
            <p className="text-gray-600">Your photo frame shop is loading</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SEOHead />
      <Header />
      <AboutUsPopup />
      <HeroSection />
      <ProductGrid products={products} />
      <PhotoCustomizer />
      <EnhancedAIGiftFinder />
      <section id="reviews" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <ReviewSystemEnhanced />
        </div>
      </section>
      <TestimonialsSection />
      <Footer />
      <WhatsAppFloat />
      <Toaster />
    </div>
  );
};

function App() {
  return (
    <CartProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </BrowserRouter>
      </div>
    </CartProvider>
  );
}

export default App;