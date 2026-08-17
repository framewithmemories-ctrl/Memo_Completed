import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Star, ExternalLink, MapPin, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Verified Google Business Profile Place ID for Memories Frames & Gift Shop.
// This prevents the "Read all on Google" button from opening a generic search page.
const GOOGLE_PLACE_ID = 'ChIJ9dQb1b33qDsRTLJ9I1nkuqo';
const GOOGLE_WRITE_REVIEW_URL = 'https://g.page/r/CUyyfSNZ5LqqEAE/review';
const GOOGLE_REVIEWS_URL = `https://search.google.com/local/reviews?placeid=${GOOGLE_PLACE_ID}`;

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const renderStars = (rating) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`w-4 h-4 ${star <= Math.round(safeNumber(rating)) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

export const ReviewSystemEnhanced = () => {
  const [googleData, setGoogleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadGoogleReviews = async () => {
      try {
        const response = await axios.get(`${API}/google-reviews`, { timeout: 10000 });
        if (!cancelled) setGoogleData(response.data || null);
      } catch (error) {
        console.error('Unable to load Google reviews:', error);
        if (!cancelled) setGoogleData(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadGoogleReviews();
    return () => { cancelled = true; };
  }, []);

  // Never render names, review text, rating or review count unless the backend
  // explicitly confirms that the values came from Google.
  const isConfigured = googleData?.configured === true;
  const reviews = isConfigured && Array.isArray(googleData?.reviews) ? googleData.reviews : [];
  const rating = isConfigured ? safeNumber(googleData?.rating) : 0;
  const total = isConfigured ? Math.max(0, Math.floor(safeNumber(googleData?.total))) : 0;
  const googleUrl = isConfigured && googleData?.google_url ? googleData.google_url : GOOGLE_REVIEWS_URL;

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8" data-testid="google-review-system">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-7">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold text-blue-600">G</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Google Reviews</h3>
              <p className="text-sm text-gray-600">Real customer reviews from our Google Business Profile</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-rose-500 hover:bg-rose-600 text-white"
            onClick={() => window.open(GOOGLE_WRITE_REVIEW_URL, '_blank', 'noopener,noreferrer')}
            data-testid="write-google-review"
          >
            <Star className="w-4 h-4 mr-2" />
            Write a Google Review
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => window.open(googleUrl, '_blank', 'noopener,noreferrer')}
            data-testid="read-google-reviews"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read all on Google
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-gray-600">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-rose-500" />
          Loading Google reviews...
        </div>
      ) : !isConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="font-semibold text-gray-900 mb-1">Google reviews are temporarily unavailable here.</p>
          <p className="text-sm text-gray-600 mb-4">We will never show sample or invented reviews. You can read the genuine reviews directly on your Google Business Profile.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              className="bg-rose-500 hover:bg-rose-600 text-white"
              onClick={() => window.open(GOOGLE_WRITE_REVIEW_URL, '_blank', 'noopener,noreferrer')}
            >
              Write a Google Review
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => window.open(GOOGLE_REVIEWS_URL, '_blank', 'noopener,noreferrer')}
            >
              Read Google Reviews
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
            <div className="rounded-xl bg-rose-50 p-5 text-center">
              <div className="text-4xl font-bold text-rose-600">{rating.toFixed(1)}★</div>
              <div className="flex justify-center mt-2">{renderStars(rating)}</div>
              <div className="text-sm text-gray-600 mt-2">Google rating</div>
            </div>
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <div className="text-4xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-600 mt-2">Google reviews</div>
            </div>
            <div className="rounded-xl bg-green-50 p-5 flex flex-col items-center justify-center text-center">
              <MapPin className="w-6 h-6 text-green-600 mb-2" />
              <div className="font-semibold text-gray-900">Memories · Coimbatore</div>
              <div className="text-xs text-gray-600 mt-1">Reviews shown below are supplied by Google.</div>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="google-reviews-section">
              {reviews.slice(0, 6).map((review, index) => (
                <Card key={`${review.author_name || 'google'}-${index}`} className="border-gray-200 bg-gray-50/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className="font-semibold text-gray-900 text-sm truncate">{review.author_name || 'Google customer'}</span>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{review.text || 'Google review'}</p>
                    {review.relative_time && <p className="text-gray-400 text-xs mt-3">{review.relative_time}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-600">
              Google has not returned review text for display right now. Use “Read all on Google” to see the current reviews.
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default ReviewSystemEnhanced;
