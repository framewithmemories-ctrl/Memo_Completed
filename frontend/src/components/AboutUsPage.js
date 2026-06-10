import React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  Heart, 
  Star, 
  Award,
  Palette,
  Camera,
  Shield,
  CheckCircle,
  Phone,
  MapPin,
  Clock,
  MessageCircle,
  Gift,
  Sparkles,
  Users,
  Truck,
  ArrowLeft
} from "lucide-react";

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

const BusinessName = () => {
  return (
    <img 
      src="https://customer-assets.emergentagent.com/job_frameify-store/artifacts/t3qf6xi2_NAME.png"
      alt="Memories - Frame with Love and Crafted with Care"
      className="h-16 object-contain mx-auto"
    />
  );
};

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

export const AboutUsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50">
      {/* Back to Home */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Button
          variant="outline"
          onClick={() => { window.location.href = '/'; }}
          className="border-rose-200 text-rose-700 hover:bg-rose-50 bg-white/80"
          data-testid="about-back-home-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            {/* Logo and Business Name - Same Row */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <BusinessLogo size="w-20 h-20" />
              <BusinessName />
            </div>
            <p className="text-xl text-gray-700 mt-4 max-w-3xl mx-auto leading-relaxed">
              A place where treasured moments become unforgettable keepsakes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <Badge className="bg-rose-100 text-rose-800 mb-4">
                  <Heart className="w-3 h-3 mr-1" />
                  About Memories
                </Badge>
                <h1 className="text-4xl font-bold text-gray-900 mb-6">
                  Welcome to 
                  <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent"> Memories </span>
                  Photo Frames and Gifts
                </h1>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Welcome to Memories Photo Frames and Gifts—a place where treasured moments become unforgettable keepsakes. 
                  Dedicated to celebrating life's most precious episodes, we craft personalized photo gifts designed to capture 
                  the true spirit of your memories. Our passion lies in transforming everyday snapshots into stylish masterpieces 
                  that speak from the heart.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">5+</div>
                  <div className="text-gray-600">Years Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">1000+</div>
                  <div className="text-gray-600">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-rose-600">4.9★</div>
                  <div className="text-gray-600">Google Rating</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-rose-100">
                <img 
                  src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&h=400"
                  alt="Custom photo frames showcase"
                  className="w-full h-80 object-cover rounded-2xl shadow-lg"
                />
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                  <span className="text-white font-bold text-sm text-center">Since<br/>2020</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-blue-100 text-blue-800 mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              What We Offer
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Extensive 
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Selection </span>
              & Expert Craftsmanship
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-blue-200 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-gray-900">Extensive Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  Discover a stunning collection of custom photo frames, canvas prints, engraved keepsakes, 
                  and exclusive gift hampers for every special occasion.
                </p>
              </CardContent>
            </Card>

            <Card className="border-rose-200 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-gray-900">Expert Craftsmanship</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  Each piece is expertly designed and hand-finished, blending creativity and precision 
                  for a perfect result every time.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl text-gray-900">Personalized Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">
                  Whether you need a heartfelt gift or a bespoke addition to your home, 
                  our expert team ensures every project matches your vision.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Memories */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-purple-100 text-purple-800 mb-4">
              <Star className="w-3 h-3 mr-1" />
              Why Choose Memories?
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Creativity Meets 
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Craftsmanship </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Creativity Meets Craftsmanship</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Our team of passionate designers takes pride in offering vibrant colours, timeless materials, 
                    and unique designs, making every item a work of art.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Quality Assurance</h3>
                  <p className="text-gray-700 leading-relaxed">
                    From premium frames to luxury canvas prints, you'll experience high-quality and durable materials, 
                    guaranteeing long-lasting memories.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Comprehensive Services</h3>
                  <p className="text-gray-700 leading-relaxed">
                    We specialize in photo albums, restoration, printing, framing, and digital art creation—everything 
                    you need to preserve your story beautifully.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Personal Touch</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Add heartfelt messages, custom doodles, or special engravings for gifts that truly connect with loved ones.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="border-purple-200 shadow-xl">
                <CardContent className="p-8">
                  <div className="text-center space-y-6">
                    {/* Logo and Business Name - Same Row */}
                    <div className="flex items-center justify-center space-x-4">
                      <BusinessLogo size="w-16 h-16" />
                      <BusinessName />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Our Promise</h3>
                      <p className="text-gray-700 leading-relaxed">
                        At Memories, every order is treated with care, dedication, and a deep respect for your memories. 
                        Our top priority is customer satisfaction, offering quick responses, secure payments, 
                        hassle-free delivery, and creative support throughout your journey.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-gray-900">Quick Response</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-gray-900">Secure Payments</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <Truck className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-gray-900">Hassle-Free Delivery</div>
                      </div>
                      <div className="bg-rose-50 p-4 rounded-lg">
                        <Heart className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-gray-900">Creative Support</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Visit Our Store in Coimbatore</h2>
            <p className="text-xl text-gray-300">Experience our craftsmanship firsthand</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 text-center">
                <MapPin className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Our Location</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  19B Kani Illam, Keeranatham Road<br/>
                  Near Ruby School, Saravanampatti<br/>
                  Coimbatore, Tamil Nadu 641035
                </p>
                <Button 
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                  onClick={() => window.open('https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu', '_blank')}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 text-center">
                <Phone className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Contact Us</h3>
                <p className="text-gray-300 text-sm mb-2">
                  <span className="font-semibold text-white text-lg">+91 81480 40148</span>
                </p>
                <p className="text-gray-400 text-sm mb-4">Available for calls & WhatsApp</p>
                <SmartCallButton className="mt-2 bg-green-600 hover:bg-green-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </SmartCallButton>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Store Hours</h3>
                <div className="text-gray-300 text-sm space-y-1">
                  <p><strong>Mon - Sat:</strong> 9:30 AM - 9:00 PM</p>
                  <p><strong>Sunday:</strong> Closed</p>
                </div>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => window.open('https://wa.me/918148040148?text=Hi! I want to visit your store. What are your current hours?', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};