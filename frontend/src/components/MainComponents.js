import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { 
  Upload, 
  Sparkles, 
  Heart, 
  Gift, 
  Star, 
  ShoppingCart, 
  User, 
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
  PhoneCall,
  Instagram,
  Facebook,
  ExternalLink,
  Shirt,
  ThumbsUp,
  Phone
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Smart Call Button Component
const SmartCallButton = ({ className = "", children, phoneNumber = "+918148040148" }) => {
  const handleCall = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.open(`tel:${phoneNumber}`, '_blank');
    } else {
      window.open(`https://wa.me/918148040148?text=Hi! I want to call about your services`, '_blank');
    }
  };

  return (
    <Button className={className} onClick={handleCall}>
      {children}
    </Button>
  );
};

// Business Logo Component
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

// Enhanced Hero Section
export const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const heroImages = [
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1465161191540-aac346fcbaff?auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1505841468529-d99f8d82ef8f?auto=format&fit=crop&w=600&h=400",
    "https://images.unsplash.com/photo-1628313388777-9b9a751dfc6a?auto=format&fit=crop&w=600&h=400"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[700px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-rose-300 to-pink-300 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-orange-300 to-yellow-300 rounded-full opacity-20 animate-pulse delay-1000"></div>
      </div>
      
      {/* Urgent Offer Banner */}
      <div className="relative bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 text-white py-3 text-center animate-gradient">
        <div className="flex items-center justify-center space-x-3 text-sm font-semibold">
          <span>🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉</span>
        </div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fadeInUp">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 animate-pulse">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Since 2020 - Trusted by 1000+ Customers
                </Badge>
                <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  4.9★ Google Rating
                </Badge>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">
                Create 
                <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent"> Beautiful </span>
                Memories with 
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Custom </span>
                Photo Frames
              </h1>
              
              <p className="text-xl text-gray-700 leading-relaxed font-medium">
                <strong>Premium photo frames and personalized gifts</strong><br/>
                Sublimation Printing Specialists • Custom Mugs • T-Shirts • Corporate Gifts<br/>
                <span className="text-rose-600 font-semibold">Located at Keeranatham Road, Coimbatore</span>
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-rose-500 via-pink-500 to-orange-500 hover:from-rose-600 hover:via-pink-600 hover:to-orange-600 text-white font-bold px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                onClick={() => document.getElementById('customizer').scrollIntoView({behavior: 'smooth'})}
              >
                <Upload className="w-6 h-6 mr-3" />
                Start Creating Now
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold px-8 py-6 rounded-2xl hover:shadow-lg transition-all transform hover:scale-105"
                onClick={() => document.getElementById('ai-finder').scrollIntoView({behavior: 'smooth'})}
              >
                <Sparkles className="w-6 h-6 mr-3" />
                AI Gift Finder
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 pt-6">
              <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
                <div className="text-3xl font-bold text-rose-600">1000+</div>
                <div className="text-gray-600 font-medium">Happy Customers</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl backdrop-blur-sm">
                <div className="text-3xl font-bold text-rose-600">4.9★</div>
                <div className="text-gray-600 font-medium">Google Rating</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 pt-4">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                onClick={() => window.open('https://wa.me/918148040148?text=Hi! I want to create custom photo frames', '_blank')}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp Us
              </Button>
              
              <Button 
                variant="outline" 
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-xl"
                onClick={() => window.open('https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu', '_blank')}
              >
                <MapPin className="w-5 h-5 mr-2" />
                Visit Store
              </Button>
            </div>
          </div>
          
          <div className="relative animate-slideInRight">
            <div className="relative w-full max-w-lg mx-auto">
              <div className="aspect-square bg-gradient-to-br from-white to-rose-50 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-700">
                <img 
                  src={heroImages[currentImageIndex]}
                  alt="Beautiful custom photo frames showcase"
                  className="w-full h-full object-cover rounded-2xl shadow-lg transition-all duration-1000"
                />
                
                {/* Image Navigation Dots */}
                <div className="flex justify-center space-x-2 mt-4">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-rose-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                <span className="text-white font-bold text-sm">25% OFF</span>
              </div>
              
              <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <div className="text-center">
                  <div className="text-white font-bold text-xs">FREE</div>
                  <div className="text-white font-bold text-xs">DELIVERY</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Enhanced About Us Section
export const AboutUsSection = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-rose-100 text-rose-800 mb-4">
            <Heart className="w-3 h-3 mr-1" />
            Our Story
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            About 
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent"> Memories </span>
          </h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-900">
                Welcome to Memories - Where Love Meets Craftsmanship
              </h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                Since 2020, we've been Coimbatore's premier destination for premium photo frames and personalized gifts. 
                Located at <strong>19B Kani Illam, Keeranatham Road, Near Ruby School, Saravanampatti</strong>, 
                we specialize in transforming your precious memories into beautiful keepsakes that last a lifetime.
              </p>
              
              <div className="bg-white p-6 rounded-xl shadow-lg border border-rose-100">
                <h4 className="text-xl font-semibold text-rose-600 mb-3">Our Expertise:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <strong>Sublimation Printing</strong> - Crystal-clear, fade-resistant prints
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <strong>Custom Photo Mugs</strong> - Perfect for daily memories
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <strong>Personalized T-Shirts</strong> - Express your unique style
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <strong>Corporate Gifts</strong> - Professional branding solutions
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <strong>Premium Frames</strong> - Handcrafted with love and precision
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-3 gap-6 pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">4.9★</div>
                  <div className="text-gray-600">Google Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">263+</div>
                  <div className="text-gray-600">Happy Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">1000+</div>
                  <div className="text-gray-600">Customers Served</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-rose-100">
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Visit Our Store</h4>
              
              <div className="space-y-4 text-gray-700">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-rose-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Memories - Photo Frames & Customized Gift Shop</div>
                    <div>19B Kani Illam, Keeranatham Road</div>
                    <div>Near Ruby School, Saravanampatti</div>
                    <div>Coimbatore, Tamil Nadu 641035</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-rose-500" />
                  <span className="font-semibold">+91 81480 40148</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-rose-500" />
                  <span>Mon-Sat: 9:30 AM - 9:00 PM • Sunday: Closed</span>
                </div>
                
                <div className="pt-4 space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    onClick={() => window.open('https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu', '_blank')}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => window.open('https://wa.me/918148040148?text=Hi! I want to visit your store', '_blank')}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp for Store Info
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Enhanced Product Grid with FIXED Add to Cart
export const ProductGrid = ({ products }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addToCart } = useCart();
  
  const categories = [
    { name: 'All', icon: <Gift className="w-4 h-4" /> },
    { name: 'Frames', icon: <Camera className="w-4 h-4" /> },
    { name: 'Mugs', icon: <Heart className="w-4 h-4" /> },
    { name: 'T-Shirts', icon: <Shirt className="w-4 h-4" /> },
    { name: 'Acrylic', icon: <Sparkles className="w-4 h-4" /> },
    { name: 'Corporate', icon: <Package className="w-4 h-4" /> }
  ];
  
  const enhancedProducts = [
    ...products,
    {
      id: 'frame-wooden-classic',
      name: 'Classic Wooden Frame',
      description: 'Handcrafted wooden frame perfect for cherished memories',
      category: 'frames',
      base_price: 899,
      image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&h=300',
      sizes: [{ name: '8x10', price_add: 0 }, { name: '12x16', price_add: 300 }],
      materials: [{ name: 'Oak', price_add: 0 }, { name: 'Mahogany', price_add: 200 }],
      colors: [{ name: 'Natural', price_add: 0 }, { name: 'Dark Brown', price_add: 0 }]
    },
    {
      id: 'frame-acrylic-premium',
      name: 'Premium Acrylic Frame',
      description: 'Modern acrylic frame with crystal-clear finish',
      category: 'frames',
      base_price: 1299,
      image_url: 'https://images.unsplash.com/photo-1465161191540-aac346fcbaff?auto=format&fit=crop&w=400&h=300',
      sizes: [{ name: '8x10', price_add: 0 }, { name: '12x16', price_add: 400 }],
      materials: [{ name: 'Clear Acrylic', price_add: 0 }],
      colors: [{ name: 'Clear', price_add: 0 }]
    },
    {
      id: 'mug-custom-photo',
      name: 'Custom Photo Mug',
      description: 'Personalized ceramic mug with your favorite photo',
      category: 'mugs',
      base_price: 349,
      image_url: 'https://images.unsplash.com/photo-1505841468529-d99f8d82ef8f?auto=format&fit=crop&w=400&h=300',
      sizes: [{ name: '11oz', price_add: 0 }, { name: '15oz', price_add: 50 }],
      materials: [{ name: 'Ceramic', price_add: 0 }],
      colors: [{ name: 'White', price_add: 0 }, { name: 'Black', price_add: 25 }]
    },
    {
      id: 'tshirt-custom',
      name: 'Custom Printed T-Shirt',
      description: 'Premium quality cotton t-shirt with sublimation printing',
      category: 't-shirts',
      base_price: 299,
      sizes: [{ name: 'S', price_add: 0 }, { name: 'M', price_add: 0 }, { name: 'L', price_add: 50 }, { name: 'XL', price_add: 100 }],
      materials: [{ name: 'Cotton', price_add: 0 }, { name: 'Cotton Blend', price_add: 50 }],
      colors: [{ name: 'White', price_add: 0 }, { name: 'Black', price_add: 0 }, { name: 'Navy', price_add: 0 }],
      image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=400&h=300'
    },
    {
      id: 'corporate-gifts',
      name: 'Corporate Gift Set',
      description: 'Professional corporate gifting solutions with custom branding',
      category: 'corporate',
      base_price: 999,
      sizes: [{ name: 'Standard Pack', price_add: 0 }, { name: 'Premium Pack', price_add: 500 }],
      materials: [{ name: 'Basic Package', price_add: 0 }, { name: 'Deluxe Package', price_add: 300 }],
      colors: [{ name: 'Corporate Blue', price_add: 0 }, { name: 'Professional Black', price_add: 0 }],
      image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&h=300'
    }
  ];

  // FIXED filtering logic
  const filteredProducts = enhancedProducts.filter(product => {
    if (selectedCategory === 'All') return true;
    
    const categoryLower = selectedCategory.toLowerCase();
    const productCategory = (product.category || '').toLowerCase();
    
    // Handle special case matching
    if (categoryLower === 'frames') {
      return productCategory.includes('frame') || productCategory === 'frames';
    }
    if (categoryLower === 'mugs') {
      return productCategory.includes('mug') || productCategory === 'mugs';
    }
    if (categoryLower === 't-shirts') {
      return productCategory.includes('t-shirt') || productCategory.includes('tshirt') || productCategory === 't-shirts';
    }
    if (categoryLower === 'acrylic') {
      return productCategory.includes('acrylic') || productCategory.includes('led');
    }
    if (categoryLower === 'corporate') {
      return productCategory.includes('corporate');
    }
    
    return productCategory === categoryLower;
  });

  const handleAddToCart = (product) => {
    const success = addToCart(product);
    if (success) {
      // Additional success feedback
      console.log('Product added to cart:', product);
    }
  };

  return (
    <section id="shop" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-rose-100 text-rose-800 mb-4">
            <Hammer className="w-3 h-3 mr-1" />
            Handcrafted Excellence
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Our 
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent"> Product </span>
            Collection
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From premium photo frames to custom t-shirts and corporate gifts - we create personalized memories that last a lifetime
          </p>
        </div>
        
        {/* FIXED Category Filtering Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <Button 
              key={category.name}
              variant={selectedCategory === category.name ? 'default' : 'outline'} 
              className={selectedCategory === category.name 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg' 
                : 'border-rose-200 text-rose-700 hover:bg-rose-50'
              }
              onClick={() => {
                console.log('Filtering by:', category.name);
                setSelectedCategory(category.name);
              }}
            >
              {category.icon}
              <span className="ml-2">{category.name}</span>
            </Button>
          ))}
        </div>
        
        {/* Products Count Indicator */}
        <div className="text-center mb-8">
          <p className="text-gray-600">
            Showing {filteredProducts.length} products 
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.map((product, index) => (
            <Card key={`${product.id}-${index}`} className="group hover:shadow-2xl transition-all duration-300 border-rose-100 hover:border-rose-200 overflow-hidden transform hover:scale-105">
              <div className="relative overflow-hidden">
                <img 
                  src={product.image_url}
                  alt={`${product.name} - Premium quality custom ${product.category}`}
                  className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Badge className="absolute top-3 right-3 bg-rose-500 text-white shadow-lg">
                  <Star className="w-3 h-3 mr-1 fill-white" />
                  4.9
                </Badge>
                <Badge className="absolute top-3 left-3 bg-green-500 text-white shadow-lg animate-pulse">
                  Available Now
                </Badge>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                  {product.name}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {product.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl font-bold text-gray-900">
                    ₹{product.base_price}
                    <span className="text-sm font-normal text-gray-500 ml-1">onwards</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {product.sizes?.length || 2} options
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                      onClick={() => document.getElementById('customizer').scrollIntoView({behavior: 'smooth'})}
                    >
                      <Palette className="w-3 h-3 mr-1" />
                      Customize
                    </Button>
                    <SmartCallButton 
                      className="border-green-200 text-green-700 hover:bg-green-50 text-xs"
                    >
                      <PhoneCall className="w-3 h-3 mr-1" />
                      Call Now
                    </SmartCallButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};