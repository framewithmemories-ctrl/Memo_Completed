import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { DragDropPhotoUpload } from "./DragDropPhotoUpload";
import { 
  Sparkles, 
  RotateCcw, 
  Move, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  Palette,
  ShoppingCart,
  Heart,
  Share2,
  Download,
  Eye,
  Layers,
  Settings,
  Camera,
  Frame,
  Image as ImageIcon,
  Crop,
  Filter
} from "lucide-react";

export const AdvancedPhotoCustomizer = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState('wooden');
  const [selectedSize, setSelectedSize] = useState('8x10');
  const [selectedOrientation, setSelectedOrientation] = useState('portrait');
  const [borderThickness, setBorderThickness] = useState('1');
  const [photoTransform, setPhotoTransform] = useState({
    scale: 1,
    rotation: 0,
    x: 0,
    y: 0
  });
  const [imageMetadata, setImageMetadata] = useState({
    width: 0,
    height: 0,
    aspectRatio: 1,
    naturalOrientation: 'portrait'
  });
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    blur: 0
  });
  const { addToCart } = useCart();
  const canvasRef = useRef(null);

  // Enhanced frame styles with overlay templates and scaling support
  const frameStyles = {
    wooden: { 
      name: 'Classic Wooden Frame', 
      color: '#8B4513', 
      price: 0,
      texture: 'wood-grain',
      overlay: 'wooden-texture',
      borderWidth: 15,
      shadowEffect: 'warm-shadow'
    },
    acrylic: { 
      name: 'Modern Acrylic Frame', 
      color: '#E0E0E0', 
      price: 200,
      texture: 'glass',
      overlay: 'glass-reflection',
      borderWidth: 8,
      shadowEffect: 'crystal-shadow'
    },
    metal: { 
      name: 'Sleek Metal Frame', 
      color: '#C0C0C0', 
      price: 150,
      texture: 'metallic',
      overlay: 'metallic-finish',
      borderWidth: 10,
      shadowEffect: 'sharp-shadow'
    },
    led: { 
      name: 'LED Backlit Frame', 
      color: '#FFD700', 
      price: 500,
      texture: 'illuminated',
      overlay: 'led-glow',
      borderWidth: 12,
      shadowEffect: 'glow-shadow'
    },
    mattblack: { 
      name: 'Matt Black Frame', 
      color: '#2C2C2C', 
      price: 300,
      texture: 'matte',
      overlay: 'matte-finish',
      borderWidth: 12,
      shadowEffect: 'soft-shadow'
    },
    design: { 
      name: 'Designer Frame', 
      color: '#D4A574', 
      price: 400,
      texture: 'ornate',
      overlay: 'ornate-pattern',
      borderWidth: 20,
      shadowEffect: 'decorative-shadow'
    },
    vintage: { 
      name: 'Vintage Ornate Frame', 
      color: '#B8860B', 
      price: 350,
      texture: 'antique',
      overlay: 'vintage-pattern',
      borderWidth: 18,
      shadowEffect: 'antique-shadow'
    },
    minimal: { 
      name: 'Minimal Clean Frame', 
      color: '#FFFFFF', 
      price: 250,
      texture: 'clean',
      overlay: 'clean-border',
      borderWidth: 5,
      shadowEffect: 'subtle-shadow'
    }
  };

  // Enhanced size options with orientation support
  const sizes = {
    portrait: {
      '4x6': { name: '4" × 6" (Portrait)', price: 599, width: 4, height: 6, orientation: 'portrait' },
      '5x7': { name: '5" × 7" (Portrait)', price: 699, width: 5, height: 7, orientation: 'portrait' },
      '8x10': { name: '8" × 10" (Portrait)', price: 899, width: 8, height: 10, orientation: 'portrait' },
      '11x14': { name: '11" × 14" (Portrait)', price: 1299, width: 11, height: 14, orientation: 'portrait' },
      '16x20': { name: '16" × 20" (Portrait)', price: 1599, width: 16, height: 20, orientation: 'portrait' }
    },
    landscape: {
      '6x4': { name: '6" × 4" (Landscape)', price: 599, width: 6, height: 4, orientation: 'landscape' },
      '7x5': { name: '7" × 5" (Landscape)', price: 699, width: 7, height: 5, orientation: 'landscape' },
      '10x8': { name: '10" × 8" (Landscape)', price: 899, width: 10, height: 8, orientation: 'landscape' },
      '14x11': { name: '14" × 11" (Landscape)', price: 1299, width: 14, height: 11, orientation: 'landscape' },
      '20x16': { name: '20" × 16" (Landscape)', price: 1599, width: 20, height: 16, orientation: 'landscape' }
    },
    square: {
      '4x4': { name: '4" × 4" (Square)', price: 649, width: 4, height: 4, orientation: 'square' },
      '6x6': { name: '6" × 6" (Square)', price: 749, width: 6, height: 6, orientation: 'square' },
      '8x8': { name: '8" × 8" (Square)', price: 949, width: 8, height: 8, orientation: 'square' },
      '12x12': { name: '12" × 12" (Square)', price: 1349, width: 12, height: 12, orientation: 'square' },
      '16x16': { name: '16" × 16" (Square)', price: 1649, width: 16, height: 16, orientation: 'square' }
    }
  };

  const borderThicknesses = [
    '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2', '2.25', '2.5', '2.75', '3', '3.25', '3.5', '3.75', '4'
  ];

  // Handle photo upload
  const handlePhotoUploaded = (photoData) => {
    setSelectedImage({
      ...photoData,
      base64: photoData.url
    });
    
    // Create image object for orientation detection
    const img = new Image();
    img.onload = () => {
      // Detect orientation and auto-configure
      detectImageOrientation(img);
      
      // Auto-adjust to fit frame after orientation is set
      setTimeout(() => {
        const currentSizeGroup = sizes[selectedOrientation] || sizes.portrait;
        const frameRatio = currentSizeGroup[selectedSize]?.width / currentSizeGroup[selectedSize]?.height;
        const imageRatio = photoData.dimensions.ratio;
        
        // Calculate optimal scale to fit
        let optimalScale = 1;
        if (imageRatio > frameRatio) {
          // Image is wider than frame
          optimalScale = frameRatio / imageRatio;
        } else {
          // Image is taller than frame
          optimalScale = imageRatio / frameRatio;
        }
        
        setPhotoTransform({
          scale: Math.max(0.5, Math.min(2, optimalScale)),
          rotation: 0,
          x: 0,
          y: 0
        });
      }, 100);
    };
    img.src = photoData.url;
    
    toast.success('Photo loaded! Use the tools to customize positioning and effects.');
  };

  // Detect image orientation and set appropriate size options
  const detectImageOrientation = (img) => {
    const aspectRatio = img.width / img.height;
    let detectedOrientation;
    
    if (Math.abs(aspectRatio - 1) < 0.1) {
      detectedOrientation = 'square';
    } else if (aspectRatio > 1.2) {
      detectedOrientation = 'landscape';
    } else {
      detectedOrientation = 'portrait';
    }
    
    setImageMetadata({
      width: img.width,
      height: img.height,
      aspectRatio: aspectRatio,
      naturalOrientation: detectedOrientation
    });
    
    setSelectedOrientation(detectedOrientation);
    
    // Auto-select appropriate size based on orientation
    const firstSizeKey = Object.keys(sizes[detectedOrientation])[2]; // Select 3rd option (usually 8x10 equivalent)
    setSelectedSize(firstSizeKey);
    
    toast.success(`📐 Detected ${detectedOrientation} orientation (${img.width}×${img.height}px)`, {
      description: `Auto-selected ${detectedOrientation} frame sizes`
    });
  };

  // Calculate total price with frame and size
  const calculateTotalPrice = () => {
    const currentSizeGroup = sizes[selectedOrientation] || sizes.portrait;
    const sizePrice = currentSizeGroup[selectedSize]?.price || 0;
    const framePrice = frameStyles[selectedFrame]?.price || 0;
    const borderPrice = parseInt(borderThickness) * 25; // ₹25 per unit thickness
    
    return sizePrice + framePrice + borderPrice;
  };

  // Apply frame overlay styling with scaling
  const getFrameOverlayStyle = () => {
    const currentFrame = frameStyles[selectedFrame];
    const borderWidth = parseInt(borderThickness) * (currentFrame?.borderWidth || 10);
    
    return {
      border: `${borderWidth}px solid ${currentFrame?.color}`,
      boxShadow: getFrameShadowEffect(),
      background: getFrameBackgroundPattern(),
      position: 'relative',
      overflow: 'hidden'
    };
  };

  const getFrameShadowEffect = () => {
    const currentFrame = frameStyles[selectedFrame];
    const shadowEffects = {
      'warm-shadow': '0 8px 25px rgba(139, 69, 19, 0.3), inset 0 0 20px rgba(139, 69, 19, 0.1)',
      'crystal-shadow': '0 8px 32px rgba(224, 224, 224, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.3)',
      'sharp-shadow': '0 4px 20px rgba(192, 192, 192, 0.5), inset 0 0 10px rgba(192, 192, 192, 0.2)',
      'glow-shadow': '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.2)',
      'soft-shadow': '0 6px 20px rgba(44, 44, 44, 0.3), inset 0 0 10px rgba(0, 0, 0, 0.1)',
      'decorative-shadow': '0 10px 30px rgba(212, 165, 116, 0.4), inset 0 0 25px rgba(212, 165, 116, 0.15)',
      'antique-shadow': '0 8px 25px rgba(184, 134, 11, 0.4), inset 0 0 20px rgba(184, 134, 11, 0.1)',
      'subtle-shadow': '0 2px 15px rgba(0, 0, 0, 0.1), inset 0 0 5px rgba(0, 0, 0, 0.05)'
    };
    
    return shadowEffects[currentFrame?.shadowEffect] || shadowEffects['subtle-shadow'];
  };

  const getFrameBackgroundPattern = () => {
    const currentFrame = frameStyles[selectedFrame];
    
    if (!currentFrame?.overlay || currentFrame.overlay === 'clean-border') {
      return currentFrame?.color || '#FFFFFF';
    }
    
    // Generate CSS background patterns for different overlay types
    const patterns = {
      'wooden-texture': `linear-gradient(45deg, ${currentFrame.color} 25%, transparent 25%), 
                        linear-gradient(-45deg, ${currentFrame.color} 25%, transparent 25%)`,
      'glass-reflection': `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)`,
      'metallic-finish': `linear-gradient(45deg, ${currentFrame.color} 0%, rgba(255,255,255,0.3) 50%, ${currentFrame.color} 100%)`,
      'led-glow': `radial-gradient(circle, rgba(255,215,0,0.3) 0%, ${currentFrame.color} 70%)`,
      'matte-finish': currentFrame.color,
      'ornate-pattern': `repeating-linear-gradient(45deg, ${currentFrame.color} 0px, ${currentFrame.color} 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)`,
      'vintage-pattern': `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, ${currentFrame.color} 60%)`
    };
    
    return patterns[currentFrame.overlay] || currentFrame.color;
  };

  // Keep backward compatibility - alias for calculateTotalPrice
  const calculatePrice = () => {
    return calculateTotalPrice();
  };

  // Photo manipulation handlers
  const handlePhotoTransform = (property, value) => {
    setPhotoTransform(prev => ({
      ...prev,
      [property]: value
    }));
  };

  const handleFilterChange = (filter, value) => {
    setFilters(prev => ({
      ...prev,
      [filter]: value
    }));
  };

  // Handle orientation change and update size selection
  const handleOrientationChange = (newOrientation) => {
    setSelectedOrientation(newOrientation);
    
    // Auto-select first available size for new orientation
    const availableSizes = Object.keys(sizes[newOrientation]);
    if (availableSizes.length > 0) {
      // Try to find a similar size, or default to the first one
      const currentSizeName = (sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.name;
      let newSize = availableSizes[0]; // Default to first
      
      // Try to find a similar size by name matching
      if (currentSizeName) {
        const similarSize = availableSizes.find(sizeKey => {
          const sizeName = sizes[newOrientation][sizeKey]?.name;
          return sizeName && sizeName.includes(currentSizeName.split(' ')[0]);
        });
        if (similarSize) {
          newSize = similarSize;
        }
      }
      
      setSelectedSize(newSize);
      toast.success(`📐 Switched to ${newOrientation} orientation`);
    }
  };

  const resetPhotoPosition = () => {
    setPhotoTransform({
      scale: 1,
      rotation: 0,
      x: 0,
      y: 0
    });
    toast.success('Photo position reset');
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sepia: 0,
      blur: 0
    });
    toast.success('Filters reset');
  };

  // Auto-fit photo to frame
  const autoFitPhoto = () => {
    if (!selectedImage) return;
    
    const currentSizeGroup = sizes[selectedOrientation] || sizes.portrait;
    const frameRatio = currentSizeGroup[selectedSize]?.width / currentSizeGroup[selectedSize]?.height;
    const imageRatio = selectedImage.dimensions.ratio;
    
    let newScale = 1;
    if (imageRatio > frameRatio) {
      newScale = 1; // Fill width
    } else {
      newScale = frameRatio / imageRatio; // Fill height
    }
    
    setPhotoTransform({
      scale: newScale,
      rotation: 0,
      x: 0,
      y: 0
    });
    
    toast.success('Photo auto-fitted to frame');
  };

  // Generate frame overlay SVG
  const getFrameOverlay = (frametype) => {
    const frame = frameStyles[frametype];
    if (!frame.overlay) return null;
    
    // Return SVG overlay based on frame type
    switch (frame.overlay) {
      case 'led-glow':
        return (
          <div className="absolute inset-0 rounded-lg shadow-inner border-4 border-yellow-300 animate-pulse opacity-60 pointer-events-none" />
        );
      case 'ornate-pattern':
        return (
          <div className="absolute inset-0 rounded-lg border-8 border-double border-yellow-600 opacity-40 pointer-events-none" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4a574' fill-opacity='0.2'%3E%3Cpath d='M20 0l20 20-20 20L0 20z'/%3E%3C/g%3E%3C/svg%3E")`,
                 backgroundSize: '20px 20px'
               }} />
        );
      case 'vintage-pattern':
        return (
          <div className="absolute inset-0 rounded-lg border-4 border-amber-700 opacity-50 pointer-events-none" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23b8860b' fill-opacity='0.1'%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
                 backgroundSize: '10px 10px'
               }} />
        );
      default:
        return null;
    }
  };

  // Add to cart
  const handleAddToCart = () => {
    if (!selectedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    const customProduct = {
      id: `custom_frame_${Date.now()}`,
      name: `Custom Photo Frame - ${frameStyles[selectedFrame].name}`,
      description: `${(sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.name} with ${borderThickness}" border`,
      base_price: calculatePrice(),
      category: 'frames',
      image_url: selectedImage.url,
      customOptions: {
        frameStyle: frameStyles[selectedFrame].name,
        size: (sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.name,
        borderThickness: `${borderThickness}"`,
        photoTransform,
        filters,
        uploadedImage: selectedImage
      }
    };
    
    addToCart(customProduct, customProduct.customOptions);
  };

  // Share preview
  const sharePreview = async () => {
    if (!selectedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    const shareText = `Check out my custom photo frame design! ${frameStyles[selectedFrame].name} - ${(sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.name} with ${borderThickness}" border. Only ₹${calculatePrice()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Custom Photo Frame Design',
          text: shareText,
          url: window.location.href
        });
        toast.success('Preview shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          navigator.clipboard.writeText(shareText);
          toast.success('Preview details copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Preview details copied to clipboard!');
    }
  };

  // Save design
  const saveDesign = () => {
    if (!selectedImage) {
      toast.error('Please upload an image first');
      return;
    }
    
    const design = {
      id: `design_${Date.now()}`,
      frame: selectedFrame,
      size: selectedSize,
      borderThickness,
      photoTransform,
      filters,
      image: selectedImage,
      price: calculatePrice(),
      timestamp: new Date().toISOString()
    };
    
    const savedDesigns = JSON.parse(localStorage.getItem('memoriesDesigns') || '[]');
    savedDesigns.push(design);
    localStorage.setItem('memoriesDesigns', JSON.stringify(savedDesigns));
    
    toast.success('Design saved to your profile! 💾');
  };

  return (
    <section id="customizer" className="py-20 bg-gradient-to-br from-gray-50 to-rose-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-purple-100 text-purple-800 mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Advanced Photo Customizer
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Create Your Perfect Frame
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Professional photo customizer with drag & drop upload, live 3D preview, advanced positioning controls, 
            and AI-powered recommendations. See exactly how your frame will look before ordering.
          </p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="border-purple-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Upload & Position
                </CardTitle>
                <CardDescription>
                  Drag & drop your photo and customize the positioning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropPhotoUpload
                  onPhotoUploaded={handlePhotoUploaded}
                  maxSize={25}
                  acceptedFormats={['jpg', 'jpeg', 'png', 'heic', 'webp']}
                />
                
                {selectedImage && (
                  <div className="mt-6 space-y-6">
                    {/* Photo Controls */}
                    <Tabs defaultValue="position" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="position" className="text-xs">Position</TabsTrigger>
                        <TabsTrigger value="filters" className="text-xs">Filters</TabsTrigger>
                        <TabsTrigger value="effects" className="text-xs">Effects</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="position" className="space-y-4 mt-4">
                        {/* Scale */}
                        <div>
                          <Label className="text-sm font-medium flex items-center mb-2">
                            <ZoomIn className="w-4 h-4 mr-1" />
                            Scale: {Number(photoTransform.scale ?? 1).toFixed(2)}x
                          </Label>
                          <Slider
                            value={[photoTransform.scale]}
                            onValueChange={(value) => handlePhotoTransform('scale', value[0])}
                            min={0.1}
                            max={3}
                            step={0.1}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Rotation */}
                        <div>
                          <Label className="text-sm font-medium flex items-center mb-2">
                            <RotateCw className="w-4 h-4 mr-1" />
                            Rotation: {photoTransform.rotation}°
                          </Label>
                          <Slider
                            value={[photoTransform.rotation]}
                            onValueChange={(value) => handlePhotoTransform('rotation', value[0])}
                            min={-45}
                            max={45}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Position X */}
                        <div>
                          <Label className="text-sm font-medium flex items-center mb-2">
                            <Move className="w-4 h-4 mr-1" />
                            Horizontal: {photoTransform.x}%
                          </Label>
                          <Slider
                            value={[photoTransform.x]}
                            onValueChange={(value) => handlePhotoTransform('x', value[0])}
                            min={-50}
                            max={50}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Position Y */}
                        <div>
                          <Label className="text-sm font-medium flex items-center mb-2">
                            <Move className="w-4 h-4 mr-1" />
                            Vertical: {photoTransform.y}%
                          </Label>
                          <Slider
                            value={[photoTransform.y]}
                            onValueChange={(value) => handlePhotoTransform('y', value[0])}
                            min={-50}
                            max={50}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button onClick={autoFitPhoto} variant="outline" size="sm">
                            <Crop className="w-3 h-3 mr-1" />
                            Auto Fit
                          </Button>
                          <Button onClick={resetPhotoPosition} variant="outline" size="sm">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Reset
                          </Button>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="filters" className="space-y-4 mt-4">
                        {/* Brightness */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Brightness: {filters.brightness}%
                          </Label>
                          <Slider
                            value={[filters.brightness]}
                            onValueChange={(value) => handleFilterChange('brightness', value[0])}
                            min={0}
                            max={200}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Contrast */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Contrast: {filters.contrast}%
                          </Label>
                          <Slider
                            value={[filters.contrast]}
                            onValueChange={(value) => handleFilterChange('contrast', value[0])}
                            min={0}
                            max={200}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Saturation */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Saturation: {filters.saturation}%
                          </Label>
                          <Slider
                            value={[filters.saturation]}
                            onValueChange={(value) => handleFilterChange('saturation', value[0])}
                            min={0}
                            max={200}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        <Button onClick={resetFilters} variant="outline" size="sm" className="w-full">
                          <Filter className="w-3 h-3 mr-1" />
                          Reset Filters
                        </Button>
                      </TabsContent>
                      
                      <TabsContent value="effects" className="space-y-4 mt-4">
                        {/* Sepia */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Sepia: {filters.sepia}%
                          </Label>
                          <Slider
                            value={[filters.sepia]}
                            onValueChange={(value) => handleFilterChange('sepia', value[0])}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>
                        
                        {/* Blur */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Blur: {filters.blur}px
                          </Label>
                          <Slider
                            value={[filters.blur]}
                            onValueChange={(value) => handleFilterChange('blur', value[0])}
                            min={0}
                            max={10}
                            step={0.5}
                            className="w-full"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Preview Section */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="border-rose-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Live 3D Preview
                </CardTitle>
                <CardDescription>
                  Real-time preview with your customizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden relative">
                  {selectedImage ? (
                    <div className="relative transform transition-all duration-300 hover:scale-105">
                      <div 
                        className="w-80 h-80 rounded-lg shadow-2xl relative overflow-hidden"
                        style={{ 
                          ...getFrameOverlayStyle(),
                          padding: `${parseFloat(borderThickness) * 8}px`
                        }}
                      >
                        <div className="relative w-full h-full overflow-hidden rounded shadow-lg">
                          <img 
                            src={selectedImage.url}
                            alt="Your photo preview"
                            className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
                            style={{
                              transform: `
                                scale(${photoTransform.scale}) 
                                rotate(${photoTransform.rotation}deg) 
                                translateX(${photoTransform.x}%) 
                                translateY(${photoTransform.y}%)
                              `,
                              filter: `
                                brightness(${filters.brightness}%) 
                                contrast(${filters.contrast}%) 
                                saturate(${filters.saturation}%) 
                                sepia(${filters.sepia}%) 
                                blur(${filters.blur}px)
                              `
                            }}
                          />
                        </div>
                        
                        {/* Frame Overlay */}
                        {getFrameOverlay(selectedFrame)}
                      </div>
                      
                      <div className="absolute -inset-2 bg-gradient-to-r from-rose-400 to-pink-400 rounded-xl -z-10 opacity-20"></div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-30" />
                      <p className="text-lg">Upload a photo to see live preview</p>
                      <p className="text-sm text-gray-400">Drag & drop or click upload above</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Configuration Section */}
          <div className="xl:col-span-1 space-y-6">
            <Card className="border-green-200 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Frame Configuration
                </CardTitle>
                <CardDescription>
                  Choose frame style, size, and border thickness
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Frame Style */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Frame Style</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {Object.entries(frameStyles).map(([key, style]) => (
                      <Button
                        key={key}
                        variant={selectedFrame === key ? "default" : "outline"}
                        className={`h-auto p-3 text-left ${selectedFrame === key ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'border-rose-200 hover:bg-rose-50'}`}
                        onClick={() => setSelectedFrame(key)}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div 
                            className="w-8 h-8 rounded border-2 border-gray-300"
                            style={{ backgroundColor: style.color }}
                          ></div>
                          <span className="text-xs font-medium text-center">{style.name}</span>
                          {style.price > 0 && (
                            <span className="text-xs text-green-600">+₹{style.price}</span>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Orientation Selection */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Photo Orientation</Label>
                  <Select value={selectedOrientation} onValueChange={handleOrientationChange}>
                    <SelectTrigger className="border-rose-200 focus:border-rose-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">📱 Portrait (Vertical)</SelectItem>
                      <SelectItem value="landscape">🖼️ Landscape (Horizontal)</SelectItem>
                      <SelectItem value="square">⬜ Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Size Selection */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Frame Size</Label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger className="border-rose-200 focus:border-rose-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sizes[selectedOrientation] || sizes.portrait).map(([key, size]) => (
                        <SelectItem key={key} value={key}>
                          {size.name} - ₹{size.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Border Thickness */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Border Thickness</Label>
                  <Select value={borderThickness} onValueChange={setBorderThickness}>
                    <SelectTrigger className="border-rose-200 focus:border-rose-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {borderThicknesses.map((thickness) => (
                        <SelectItem key={thickness} value={thickness}>
                          {thickness}" border - +₹{parseFloat(thickness) * 50}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Price Summary */}
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-700 font-medium">Total Price:</span>
                    <span className="text-3xl font-bold text-rose-600">₹{calculatePrice()}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Base ({(sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.name}): ₹{(sizes[selectedOrientation] || sizes.portrait)[selectedSize]?.price}</div>
                    {frameStyles[selectedFrame].price > 0 && (
                      <div>Frame Style: +₹{frameStyles[selectedFrame].price}</div>
                    )}
                    <div>Border ({borderThickness}"): +₹{parseInt(borderThickness) * 25}</div>
                    <div className="pt-2 border-t border-rose-200 font-medium">
                      Includes: Professional printing + Free gift wrap + Quality guarantee
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {selectedImage && (
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
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Preview
                      </Button>
                    </div>
                  </div>
                )}
                
                {!selectedImage && (
                  <div className="text-center py-8 text-gray-500">
                    <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Upload a photo to start customizing</p>
                    <p className="text-sm">Use the upload section above</p>
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