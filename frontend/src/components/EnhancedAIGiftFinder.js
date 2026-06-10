/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { DragDropPhotoUpload } from "./DragDropPhotoUpload";
import { 
  Sparkles, 
  Heart, 
  Gift, 
  Star, 
  ShoppingCart, 
  Users,
  ArrowRight,
  Award,
  Package,
  Percent,
  Target,
  Camera,
  Zap,
  Palette,
  Brain,
  Lightbulb,
  CheckCircle,
  Wand2,
  Upload,
  Image as ImageIcon
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Enhanced AI Gift Finder with Contextual Intelligence
export const EnhancedAIGiftFinder = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const { addToCart } = useCart();

  // Enhanced contextual questions with AI logic
  const questions = [
    {
      id: 'occasion',
      question: 'What\'s the special occasion?',
      subtitle: 'This helps our AI understand the emotional context',
      options: [
        { 
          value: 'birthday', 
          label: 'Birthday Celebration 🎂', 
          icon: <Gift className="w-5 h-5" />,
          keywords: ['celebration', 'personal', 'fun', 'memorable'],
          ageContext: true
        },
        { 
          value: 'anniversary', 
          label: 'Anniversary Love 💕', 
          icon: <Heart className="w-5 h-5" />,
          keywords: ['romantic', 'sentimental', 'precious', 'together'],
          romantic: true
        },
        { 
          value: 'wedding', 
          label: 'Wedding Celebration 💒', 
          icon: <Users className="w-5 h-5" />,
          keywords: ['elegant', 'memorable', 'special', 'traditional'],
          formal: true
        },
        { 
          value: 'graduation', 
          label: 'Graduation Achievement 🎓', 
          icon: <Award className="w-5 h-5" />,
          keywords: ['achievement', 'proud', 'milestone', 'success'],
          achievement: true
        },
        { 
          value: 'corporate', 
          label: 'Corporate Event 💼', 
          icon: <Package className="w-5 h-5" />,
          keywords: ['professional', 'branded', 'quality', 'impressive'],
          business: true
        },
        { 
          value: 'just_because', 
          label: 'Just Because 😊', 
          icon: <Sparkles className="w-5 h-5" />,
          keywords: ['thoughtful', 'surprise', 'caring', 'spontaneous'],
          spontaneous: true
        }
      ]
    },
    {
      id: 'recipient',
      question: 'Who will receive this gift?',
      subtitle: 'Understanding your relationship helps personalize recommendations',
      options: [
        { 
          value: 'romantic_partner', 
          label: 'Romantic Partner 💑', 
          icon: <Heart className="w-5 h-5" />,
          preferences: ['romantic', 'intimate', 'personal', 'meaningful']
        },
        { 
          value: 'family_parent', 
          label: 'Parent/Grandparent 👨‍👩‍👧‍👦', 
          icon: <Users className="w-5 h-5" />,
          preferences: ['traditional', 'sentimental', 'family', 'respectful']
        },
        { 
          value: 'family_sibling', 
          label: 'Sibling/Cousin 👫', 
          icon: <Users className="w-5 h-5" />,
          preferences: ['fun', 'personal', 'casual', 'trendy']
        },
        { 
          value: 'close_friend', 
          label: 'Close Friend 🤝', 
          icon: <Heart className="w-5 h-5" />,
          preferences: ['fun', 'memorable', 'unique', 'thoughtful']
        },
        { 
          value: 'colleague', 
          label: 'Colleague/Boss 🤝', 
          icon: <Package className="w-5 h-5" />,
          preferences: ['professional', 'appropriate', 'quality', 'respectful']
        },
        { 
          value: 'child', 
          label: 'Child/Teen 👶', 
          icon: <Star className="w-5 h-5" />,
          preferences: ['colorful', 'fun', 'cute', 'playful']
        }
      ]
    },
    {
      id: 'budget',
      question: 'What\'s your budget range?',
      subtitle: 'We\'ll find the perfect gift within your comfort zone',
      options: [
        { 
          value: 'budget_conscious', 
          label: 'Budget Friendly (₹200-₹500) 💰', 
          icon: <Percent className="w-5 h-5" />,
          range: [200, 500],
          suggestion: 'Great value gifts that still make an impact'
        },
        { 
          value: 'mid_range', 
          label: 'Mid Range (₹500-₹1000) 💳', 
          icon: <Target className="w-5 h-5" />,
          range: [500, 1000],
          suggestion: 'Perfect balance of quality and affordability'
        },
        { 
          value: 'premium', 
          label: 'Premium (₹1000-₹2000) 🏆', 
          icon: <Award className="w-5 h-5" />,
          range: [1000, 2000],
          suggestion: 'High-quality gifts that show you care'
        },
        { 
          value: 'luxury', 
          label: 'Luxury (₹2000+) 💎', 
          icon: <Star className="w-5 h-5" />,
          range: [2000, 10000],
          suggestion: 'Exceptional gifts for exceptional people'
        }
      ]
    },
    {
      id: 'style_preference',
      question: 'What style resonates with them?',
      subtitle: 'Their personality will guide our AI recommendations',
      options: [
        { 
          value: 'classic_traditional', 
          label: 'Classic & Traditional 🏛️', 
          icon: <Camera className="w-5 h-5" />,
          traits: ['timeless', 'elegant', 'sophisticated', 'refined']
        },
        { 
          value: 'modern_trendy', 
          label: 'Modern & Trendy ✨', 
          icon: <Zap className="w-5 h-5" />,
          traits: ['contemporary', 'innovative', 'stylish', 'current']
        },
        { 
          value: 'artistic_creative', 
          label: 'Artistic & Creative 🎨', 
          icon: <Palette className="w-5 h-5" />,
          traits: ['unique', 'expressive', 'colorful', 'imaginative']
        },
        { 
          value: 'minimal_clean', 
          label: 'Minimal & Clean 🎯', 
          icon: <Target className="w-5 h-5" />,
          traits: ['simple', 'clean', 'understated', 'functional']
        },
        { 
          value: 'luxury_premium', 
          label: 'Luxury & Premium 👑', 
          icon: <Star className="w-5 h-5" />,
          traits: ['exclusive', 'high-end', 'prestigious', 'premium']
        }
      ]
    }
  ];

  const aiThinkingMessages = [
    "🧠 Analyzing your preferences...",
    "✨ Understanding the emotional context...",
    "🎯 Matching products to personality...",
    "💡 Calculating perfect combinations...",
    "🎨 Considering aesthetic preferences...",
    "💖 Finding the most meaningful options...",
    "🏆 Ranking by suitability score...",
    "🎁 Preparing personalized recommendations..."
  ];

  const handleAnswer = (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        generateAIRecommendations(newAnswers);
      }, 100);
    }
  };

  const generateAIRecommendations = async (userAnswers) => {
    setIsLoading(true);
    
    // Show thinking process
    let messageIndex = 0;
    const thinkingInterval = setInterval(() => {
      if (messageIndex < aiThinkingMessages.length) {
        setAiThinking(aiThinkingMessages[messageIndex]);
        messageIndex++;
      }
    }, 600);

    try {
      // Try backend AI first
      const response = await axios.post(`${API}/gift-suggestions`, {
        answers: userAnswers,
        contextual: true,
        aiEnhanced: true,
        previewPhoto: previewPhoto ? {
          url: previewPhoto.url,
          dimensions: previewPhoto.dimensions,
          analysis: previewPhoto.analysis
        } : null
      });
      
      if (response.data.suggestions) {
        // Check if suggestions is a string (LLM response) or array (structured)
        if (typeof response.data.suggestions === 'string') {
          // Convert string response to structured format for display
          const stringResponse = response.data.suggestions;
          const mockStructuredSuggestions = [
            {
              product: {
                id: 'ai-llm-suggestion-1',
                name: 'AI Recommended Gift Set',
                description: 'Personalized gifts curated by our AI based on your preferences',
                base_price: 899,
                image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&h=300',
                category: 'ai-curated'
              },
              reasoning: 'Our AI analyzed your preferences and suggests these personalized options',
              confidence: 92,
              aiTag: '🤖 AI Curated Selection',
              llmResponse: stringResponse
            }
          ];
          setSuggestions(mockStructuredSuggestions);
        } else {
          // Handle array of structured suggestions
          setSuggestions(response.data.suggestions);
        }
      } else {
        throw new Error('No backend suggestions');
      }
    } catch (error) {
      console.error('AI suggestions error:', error);
      
      // ENHANCED FALLBACK: Contextual AI Logic with Photo Analysis
      const aiSuggestions = generateContextualSuggestions(userAnswers);
      setSuggestions(aiSuggestions);
    } finally {
      clearInterval(thinkingInterval);
      setIsLoading(false);
      setAiThinking('');
    }
  };

  // Enhanced AI Logic for Gift Recommendations
  const generateContextualSuggestions = (answers) => {
    const occasion = questions[0].options.find(opt => opt.value === answers.occasion);
    const recipient = questions[1].options.find(opt => opt.value === answers.recipient);
    const budget = questions[2].options.find(opt => opt.value === answers.budget);
    const style = questions[3].options.find(opt => opt.value === answers.style_preference);

    // AI Product Database with Contextual Scoring
    const productDatabase = [
      {
        id: 'ai-romantic-frame',
        name: 'Romantic Couple Photo Frame',
        description: 'Heart-shaped wooden frame perfect for romantic memories',
        category: 'frames',
        base_price: 899,
        image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&h=300',
        tags: ['romantic', 'couples', 'sentimental', 'wooden', 'heart'],
        occasions: ['anniversary', 'wedding', 'just_because'],
        recipients: ['romantic_partner'],
        styles: ['classic_traditional', 'luxury_premium'],
        budgetRanges: ['mid_range', 'premium']
      },
      {
        id: 'ai-family-collage',
        name: 'Family Memory Collage Frame',
        description: 'Multi-photo frame for displaying precious family moments',
        category: 'frames',
        base_price: 1299,
        image_url: 'https://images.unsplash.com/photo-1465161191540-aac346fcbaff?auto=format&fit=crop&w=400&h=300',
        tags: ['family', 'multiple', 'memories', 'traditional', 'collage'],
        occasions: ['birthday', 'anniversary', 'just_because'],
        recipients: ['family_parent', 'family_sibling'],
        styles: ['classic_traditional', 'artistic_creative'],
        budgetRanges: ['premium', 'luxury']
      },
      {
        id: 'ai-corporate-frame',
        name: 'Professional Achievement Frame',
        description: 'Elegant corporate frame for achievements and team photos',
        category: 'corporate',
        base_price: 1599,
        image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=400&h=300',
        tags: ['professional', 'achievement', 'corporate', 'elegant', 'branded'],
        occasions: ['corporate', 'graduation'],
        recipients: ['colleague'],
        styles: ['classic_traditional', 'minimal_clean', 'luxury_premium'],
        budgetRanges: ['premium', 'luxury']
      },
      {
        id: 'ai-fun-mug',
        name: 'Personalized Fun Mug',
        description: 'Colorful custom mug with photo and fun design',
        category: 'mugs',
        base_price: 399,
        image_url: 'https://images.unsplash.com/photo-1505841468529-d99f8d82ef8f?auto=format&fit=crop&w=400&h=300',
        tags: ['fun', 'colorful', 'daily', 'personal', 'gift'],
        occasions: ['birthday', 'just_because'],
        recipients: ['close_friend', 'family_sibling', 'child'],
        styles: ['modern_trendy', 'artistic_creative'],
        budgetRanges: ['budget_conscious', 'mid_range']
      },
      {
        id: 'ai-led-frame',
        name: 'LED Illuminated Frame',
        description: 'Modern LED frame that lights up your memories',
        category: 'acrylic',
        base_price: 1899,
        image_url: 'https://images.unsplash.com/photo-1628313388777-9b9a751dfc6a?auto=format&fit=crop&w=400&h=300',
        tags: ['led', 'modern', 'technology', 'illuminated', 'premium'],
        occasions: ['birthday', 'corporate', 'graduation'],
        recipients: ['romantic_partner', 'close_friend', 'colleague'],
        styles: ['modern_trendy', 'luxury_premium', 'minimal_clean'],
        budgetRanges: ['luxury']
      }
    ];

    // AI Scoring Algorithm
    const scoredProducts = productDatabase.map(product => {
      let score = 0;
      let reasoning = [];

      // Occasion match (40% weight)
      if (product.occasions.includes(answers.occasion)) {
        score += 40;
        reasoning.push(`Perfect for ${occasion?.label?.toLowerCase()}`);
      }

      // Recipient match (30% weight)
      if (product.recipients.includes(answers.recipient)) {
        score += 30;
        reasoning.push(`Ideal for ${recipient?.label?.toLowerCase()}`);
      }

      // Budget match (20% weight)
      if (product.budgetRanges.includes(answers.budget)) {
        score += 20;
        reasoning.push(`Fits within your ${budget?.label?.toLowerCase()}`);
      }

      // Style match (10% weight)
      if (product.styles.includes(answers.style_preference)) {
        score += 10;
        reasoning.push(`Matches ${style?.label?.toLowerCase()} aesthetic`);
      }

      // Photo Analysis Bonus (if preview photo uploaded)
      if (previewPhoto && previewPhoto.dimensions) {
        const { width, height } = previewPhoto.dimensions;
        const ratio = width / height;
        
        if (ratio > 1.3 && product.tags.includes('landscape')) {
          score += 15;
          reasoning.push('Perfect match for your landscape photo');
        } else if (ratio < 0.8 && product.tags.includes('portrait')) {
          score += 15;
          reasoning.push('Perfect match for your portrait photo');
        } else if (Math.abs(ratio - 1) < 0.2 && product.tags.includes('square')) {
          score += 15;
          reasoning.push('Perfect match for your square photo');
        } else if (product.category === 'frames') {
          score += 10;
          reasoning.push('Great frame option for your uploaded photo');
        }
      }

      // Contextual bonuses
      if (occasion?.romantic && product.tags.includes('romantic')) {
        score += 15;
        reasoning.push('Enhanced romantic appeal');
      }

      if (occasion?.business && product.tags.includes('professional')) {
        score += 15;
        reasoning.push('Professional presentation quality');
      }

      return {
        product,
        score: Math.min(100, score), // Cap at 100
        reasoning: reasoning.join(', '),
        confidence: Math.min(95, score + 5),
        aiTag: generateSmartTag(product, answers, previewPhoto)
      };
    });

    // Sort by score and return top 3
    return scoredProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => ({
        product: item.product,
        reasoning: item.reasoning || 'This gift matches your preferences perfectly',
        confidence: item.confidence,
        aiTag: item.aiTag
      }));
  };

  const generateSmartTag = (product, answers, photoData = null) => {
    const occasion = answers.occasion;
    const budget = answers.budget;
    
    // Photo-based tags
    if (photoData && photoData.dimensions) {
      const ratio = photoData.dimensions.width / photoData.dimensions.height;
      if (ratio > 1.3 && product.category === 'frames') {
        return '📸 Perfect for Your Landscape Photo';
      }
      if (ratio < 0.8 && product.category === 'frames') {
        return '📸 Perfect for Your Portrait Photo';
      }
      if (Math.abs(ratio - 1) < 0.2 && product.category === 'frames') {
        return '📸 Perfect for Your Square Photo';
      }
    }
    
    if (occasion === 'anniversary' && product.tags.includes('romantic')) {
      return '💕 Perfect for Anniversary';
    }
    if (occasion === 'corporate' && product.tags.includes('professional')) {
      return '💼 Corporate Excellence';
    }
    if (budget === 'luxury' && product.base_price > 1500) {
      return '👑 Luxury Choice';
    }
    if (budget === 'budget_conscious' && product.base_price < 500) {
      return '💰 Great Value';
    }
    
    return '🎁 AI Recommended';
  };

  // FIXED: Add to cart from AI suggestions
  const handleAddToCart = (suggestion) => {
    try {
      const success = addToCart(suggestion.product, {
        aiRecommendation: true,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        smartTag: suggestion.aiTag,
        previewPhoto: previewPhoto?.url || null
      });
      if (success) {
        toast.success(`${suggestion.product.name} added to cart! 🛒`, {
          description: `AI Confidence: ${suggestion.confidence}% • ${suggestion.aiTag}`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  };

  // Handle photo upload for preview
  const handlePhotoUploaded = (photoData) => {
    setPreviewPhoto(photoData);
    toast.success('Preview photo uploaded! This will enhance your gift recommendations. 📸');
  };

  // Reset quiz with photo
  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setSuggestions([]);
    setIsLoading(false);
    setAiThinking('');
    setPreviewPhoto(null);
    setShowPhotoUpload(false);
  };

  return (
    <>
      <section id="ai-finder" className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-purple-100 text-purple-800 mb-4">
              <Brain className="w-3 h-3 mr-1" />
              AI-Powered Intelligence
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Smart AI Gift Finder
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our advanced AI understands context, relationships, and preferences to suggest the perfect personalized gift. 
              It's like having a gift expert who knows exactly what works.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Card className="border-purple-200 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                {!isOpen && suggestions.length === 0 && (
                  <div className="text-center space-y-8">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <Brain className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                        <Lightbulb className="w-4 h-4 text-yellow-900" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-4">Discover the Perfect Gift</h3>
                      <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                        Our AI considers occasion context, relationship dynamics, personal style, and budget to recommend gifts 
                        that truly resonate. Get personalized suggestions in just 4 smart questions.
                      </p>
                      
                      {/* Photo Upload Option */}
                      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Camera className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold text-purple-900">Optional: Upload Preview Photo</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            {showPhotoUpload ? 'Hide Upload' : 'Add Photo'}
                          </Button>
                        </div>
                        <p className="text-sm text-purple-700 mb-3">
                          Upload a photo to get more personalized recommendations based on the image style and context.
                        </p>
                        
                        {showPhotoUpload && (
                          <div className="mt-4">
                            <DragDropPhotoUpload
                              onPhotoUploaded={handlePhotoUploaded}
                              maxSize={10}
                              className="border-purple-300"
                              enableProfileIntegration={false}
                            />
                          </div>
                        )}
                        
                        {previewPhoto && (
                          <div className="mt-3 flex items-center space-x-3 p-3 bg-white rounded-lg border border-purple-300">
                            <img
                              src={previewPhoto.url}
                              alt="Preview"
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-purple-900">Photo added to AI analysis</div>
                              <div className="text-sm text-purple-700">{previewPhoto.name}</div>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <Wand2 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <div className="font-semibold text-purple-900">Contextual AI</div>
                          <div className="text-sm text-purple-700">Understands emotions & relationships</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <div className="font-semibold text-blue-900">Smart Matching</div>
                          <div className="text-sm text-blue-700">Matches personality & preferences</div>
                        </div>
                        <div className="text-center p-4 bg-rose-50 rounded-lg">
                          <CheckCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
                          <div className="font-semibold text-rose-900">Confidence Score</div>
                          <div className="text-sm text-rose-700">AI rates each recommendation</div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setIsOpen(true)}
                      className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white font-bold px-12 py-6 text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105"
                    >
                      <Brain className="w-6 h-6 mr-3" />
                      Start AI Gift Finder
                    </Button>
                  </div>
                )}

                {isOpen && suggestions.length === 0 && (
                  <div className="space-y-8">
                    {/* Enhanced Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span className="font-medium">Question {currentStep + 1} of {questions.length}</span>
                        <span className="text-purple-600 font-semibold">{Math.round(((currentStep + 1) / questions.length) * 100)}% Complete</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 h-3 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    {!isLoading && (
                      <div className="space-y-6">
                        <div className="text-center">
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            {questions[currentStep]?.question}
                          </h3>
                          <p className="text-gray-600">
                            {questions[currentStep]?.subtitle}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {questions[currentStep]?.options.map((option) => (
                            <Button
                              key={option.value}
                              variant="outline"
                              className="h-auto p-6 text-left whitespace-normal border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                              onClick={() => handleAnswer(questions[currentStep].id, option.value)}
                            >
                              <div className="flex items-center space-x-4 w-full">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center group-hover:from-purple-200 group-hover:to-pink-200 transition-all">
                                  {option.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 mb-1">{option.label}</div>
                                  {option.suggestion && (
                                    <div className="text-xs text-gray-600">{option.suggestion}</div>
                                  )}
                                </div>
                                <ArrowRight className="w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isLoading && (
                      <div className="text-center space-y-6">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Brain className="w-8 h-8 text-purple-500 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold text-gray-900">AI is thinking...</p>
                          {aiThinking && (
                            <p className="text-purple-600 font-medium animate-pulse">{aiThinking}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsOpen(false);
                          resetQuiz();
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">AI Found Perfect Matches! 🎯</h3>
                      <p className="text-gray-600">Our AI analyzed your preferences and found these personalized recommendations</p>
                    </div>

                    <div className="space-y-6">
                      {suggestions.map((suggestion, index) => (
                        <Card key={index} className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-xl transition-all">
                          <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-6">
                              <img 
                                src={suggestion.product.image_url}
                                alt={suggestion.product.name}
                                className="w-full lg:w-32 h-32 object-cover rounded-lg shadow-md"
                              />
                              
                              <div className="flex-1 space-y-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-900">{suggestion.product.name}</h4>
                                    <p className="text-gray-600 mt-1">{suggestion.product.description}</p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800 animate-pulse">
                                    {suggestion.confidence}% AI Match
                                  </Badge>
                                </div>
                                
                                {suggestion.aiTag && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                    {suggestion.aiTag}
                                  </Badge>
                                )}
                                
                                <div className="bg-white/80 p-4 rounded-lg border border-green-200">
                                  <div className="flex items-start space-x-2">
                                    <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div className="font-semibold text-gray-900 mb-1">Why AI Chose This:</div>
                                      <p className="text-sm text-gray-700">{suggestion.reasoning}</p>
                                      
                                      {/* Display LLM Response if available */}
                                      {suggestion.llmResponse && (
                                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                          <div className="font-semibold text-purple-900 mb-2 flex items-center">
                                            <Brain className="w-4 h-4 mr-2" />
                                            AI Detailed Recommendations:
                                          </div>
                                          <div className="text-sm text-purple-800 whitespace-pre-wrap">
                                            {suggestion.llmResponse.substring(0, 500)}
                                            {suggestion.llmResponse.length > 500 && '...'}
                                          </div>
                                          {suggestion.llmResponse.length > 500 && (
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                              className="text-purple-600 hover:text-purple-700 mt-2 p-0"
                                              onClick={() => {
                                                // Show full response in modal or expand
                                                alert(suggestion.llmResponse);
                                              }}
                                            >
                                              View Full AI Analysis →
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="text-3xl font-bold text-gray-900">₹{suggestion.product.base_price}</div>
                                  <div className="space-x-3">
                                    <Button 
                                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                      onClick={() => document.getElementById('customizer')?.scrollIntoView({behavior: 'smooth'})}
                                    >
                                      <Palette className="w-4 h-4 mr-2" />
                                      Customize This
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      className="border-green-200 text-green-700 hover:bg-green-50"
                                      onClick={() => handleAddToCart(suggestion)}
                                    >
                                      <ShoppingCart className="w-4 h-4 mr-2" />
                                      Add to Cart
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="text-center space-y-4">
                      <Button 
                        onClick={() => {
                          resetQuiz();
                          setIsOpen(true);
                        }}
                        variant="outline"
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        <Brain className="w-4 h-4 mr-2" />
                        Find Another Gift with AI
                      </Button>
                      
                      <p className="text-sm text-gray-600">
                        Need help personalizing your gift? 
                        <Button 
                          variant="ghost" 
                          className="text-green-600 hover:text-green-700 ml-1 p-0"
                          onClick={() => window.open('https://wa.me/918148040148?text=Hi! The AI recommended some gifts and I need help personalizing them', '_blank')}
                        >
                          Chat with our gift experts →
                        </Button>
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};