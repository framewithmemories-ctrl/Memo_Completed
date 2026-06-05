import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { 
  Star, 
  Heart, 
  ThumbsUp, 
  MessageCircle, 
  Camera, 
  Send,
  Filter,
  ChevronDown,
  CheckCircle,
  Award,
  Users,
  TrendingUp,
  ExternalLink,
  Pin,
  Loader2
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ReviewSystemEnhanced = () => {
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({
    total_reviews: 0,
    average_rating: 0,
    rating_distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 }
  });
  const [newReview, setNewReview] = useState({
    name: '',
    rating: 5,
    comment: '',
    photos: []
  });
  const [filterRating, setFilterRating] = useState('all');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 10,
    hasMore: true
  });
  const [googleData, setGoogleData] = useState({
    configured: false,
    rating: 4.9,
    total: 263,
    google_url: 'https://www.google.com/maps/search/Memories+Photo+Frames+Coimbatore',
    reviews: []
  });

  // Load reviews from API on mount
  useEffect(() => {
    loadReviews();
    loadReviewStats();
    loadGoogleReviews();
  }, []);

  const loadGoogleReviews = async () => {
    try {
      const res = await axios.get(`${API}/google-reviews`);
      setGoogleData(res.data);
    } catch (error) {
      console.error('Error loading Google reviews:', error);
    }
  };

  // Reload when filter changes
  useEffect(() => {
    setPagination({ offset: 0, limit: 10, hasMore: true });
    loadReviews(true);
  }, [filterRating]);

  const loadReviews = async (reset = false) => {
    try {
      setIsLoading(true);
      const offset = reset ? 0 : pagination.offset;
      
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
        approved_only: 'true'
      });
      
      if (filterRating !== 'all') {
        params.append('rating_filter', filterRating);
      }
      
      const response = await axios.get(`${API}/reviews?${params}`);
      
      if (reset) {
        setReviews(response.data.reviews);
      } else {
        setReviews(prev => [...prev, ...response.data.reviews]);
      }
      
      setPagination(prev => ({
        ...prev,
        offset: offset + pagination.limit,
        hasMore: response.data.has_more
      }));
      
      // Update stats if available
      if (response.data.rating_stats) {
        setReviewStats(response.data.rating_stats);
      }
      
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error("Unable to load reviews from server, showing sample reviews");
      
      // Fallback to sample data if API fails
      setReviews([
        {
          id: '1',
          name: 'Priya Sharma',
          rating: 5,
          comment: 'Amazing quality frames! The sublimation printing is crystal clear and the wooden frame is beautifully crafted.',
          created_at: new Date().toISOString()
        },
        {
          id: '2', 
          name: 'Rajesh Kumar',
          rating: 5,
          comment: 'Ordered corporate mugs for our company event. Exceptional quality and delivered on time. Very professional!',
          created_at: new Date().toISOString()
        }
      ]);
      setReviewStats({
        total_reviews: 2,
        average_rating: 5.0,
        rating_distribution: { "5": 2, "4": 0, "3": 0, "2": 0, "1": 0 }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReviewStats = async () => {
    try {
      const response = await axios.get(`${API}/reviews/stats`);
      setReviewStats(response.data);
    } catch (error) {
      console.error('Error loading review stats:', error);
      // Keep default stats
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    
    if (!newReview.name.trim() || !newReview.comment.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData = {
        name: newReview.name.trim(),
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        photos: newReview.photos
      };

      await axios.post(`${API}/reviews`, reviewData);
      
      toast.success("Thank you for your review! It will appear shortly after approval. 🌟");
      
      // Reset form
      setNewReview({
        name: '',
        rating: 5,
        comment: '',
        photos: []
      });
      setShowReviewForm(false);
      
      // Reload reviews to show the new one
      loadReviews(true);
      loadReviewStats();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => onRatingChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const filteredReviews = filterRating === 'all' 
    ? reviews 
    : reviews.filter(review => review.rating === parseInt(filterRating));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Customer Reviews</h3>
            <p className="text-gray-600">What our customers say about Memories</p>
          </div>
        </div>
        
        <Dialog open={showReviewForm} onOpenChange={setShowReviewForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white">
              <MessageCircle className="w-4 h-4 mr-2" />
              Write Review
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Share your experience with Memories Photo Frames & Gifts
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={submitReview} className="space-y-6">
              <div>
                <Label htmlFor="reviewer-name">Your Name</Label>
                <Input
                  id="reviewer-name"
                  value={newReview.name}
                  onChange={(e) => setNewReview({...newReview, name: e.target.value})}
                  placeholder="Enter your name"
                  required
                />
              </div>
              
              <div>
                <Label>Rating</Label>
                <div className="flex items-center space-x-2 mt-2">
                  {renderStars(newReview.rating, true, (rating) => 
                    setNewReview({...newReview, rating})
                  )}
                  <span className="text-sm text-gray-600">({newReview.rating} star{newReview.rating !== 1 ? 's' : ''})</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="review-comment">Your Review</Label>
                <Textarea
                  id="review-comment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-rose-600 mb-2">
            {reviewStats.average_rating.toFixed(1)}
          </div>
          <div className="flex justify-center mb-2">
            {renderStars(Math.round(reviewStats.average_rating))}
          </div>
          <div className="text-gray-600 text-sm">
            {reviewStats.total_reviews} review{reviewStats.total_reviews !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 w-8">{stars}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ 
                    width: `${reviewStats.total_reviews > 0 
                      ? (reviewStats.rating_distribution[stars.toString()] / reviewStats.total_reviews) * 100 
                      : 0}%` 
                  }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 w-8">
                {reviewStats.rating_distribution[stars.toString()] || 0}
              </span>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">{Number(googleData.rating).toFixed(1)}★</div>
          <div className="text-gray-600 text-sm">Google Rating</div>
          <div className="text-gray-500 text-xs mb-3">Based on {googleData.total}+ reviews</div>
          <Button
            variant="outline"
            size="sm"
            className="border-green-200 text-green-700 hover:bg-green-50"
            onClick={() => window.open(googleData.google_url, '_blank')}
            data-testid="read-all-google-reviews"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read all reviews on Google
          </Button>
        </div>
      </div>

      {/* Live Google Reviews */}
      {googleData.reviews && googleData.reviews.length > 0 && (
        <div className="mb-8" data-testid="google-reviews-section">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-2" />
              Reviews from Google
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {googleData.reviews.slice(0, 6).map((g, idx) => (
              <Card key={idx} className="border-gray-200 bg-gray-50/50" data-testid="google-review-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-sm truncate">{g.author_name}</span>
                    <div className="flex">{renderStars(g.rating)}</div>
                  </div>
                  <p className="text-gray-700 text-sm line-clamp-4">{g.text}</p>
                  <p className="text-gray-400 text-xs">{g.relative_time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter by rating:</span>
        </div>
        <div className="flex space-x-2">
          {['all', '5', '4', '3', '2', '1'].map((rating) => (
            <Button
              key={rating}
              variant={filterRating === rating ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRating(rating)}
              className={filterRating === rating ? "bg-rose-500 hover:bg-rose-600" : ""}
            >
              {rating === 'all' ? 'All' : `${rating}★`}
            </Button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {isLoading && reviews.length === 0 ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-rose-500" />
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : filteredReviews.length > 0 ? (
          <>
            {filteredReviews.map((review) => (
              <Card key={review.id} className="border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {review.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{review.name}</h4>
                          <div className="flex items-center space-x-2">
                            {renderStars(review.rating)}
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Verified Customer
                            </Badge>
                            {review.pinned && (
                              <Badge className="bg-rose-100 text-rose-700" data-testid="pinned-review-badge">
                                <Pin className="w-3 h-3 mr-1" /> Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                      
                      {review.photos && review.photos.length > 0 && (
                        <div className="flex space-x-2">
                          {review.photos.map((photo, index) => (
                            <img 
                              key={index}
                              src={photo} 
                              alt={`Review photo ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg shadow-sm"
                            />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <button className="flex items-center space-x-1 hover:text-rose-600 transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Helpful</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {pagination.hasMore && !isLoading && (
              <div className="text-center">
                <Button 
                  onClick={() => loadReviews(false)}
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Load More Reviews
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h3>
            <p className="text-gray-600 mb-6">Be the first to share your experience!</p>
            <Button 
              onClick={() => setShowReviewForm(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              Write the First Review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};