import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Star, ExternalLink, MapPin, Loader2 } from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';
const GOOGLE_WRITE_REVIEW_URL = 'https://g.page/r/CUyyfSNZ5LqqEAE/review';
const GOOGLE_BUSINESS_URL = 'https://www.google.com/maps/search/?api=1&query=Memories%20Photo%20Frames%20Coimbatore';

const renderStars = (rating) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map((star) => <Star key={star} className={`w-4 h-4 ${star <= Math.round(Number(rating) || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
  </div>
);

export const FixedReviewSystem = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API_BASE}/api/google-reviews`, { timeout: 10000 })
      .then((response) => { if (!cancelled) setData(response.data || null); })
      .catch((error) => { console.error('Google reviews unavailable:', error); if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const live = data?.configured === true;
  const reviews = live && Array.isArray(data?.reviews) ? data.reviews : [];
  const rating = live ? Number(data?.rating || 0) : 0;
  const total = live ? Number(data?.total || 0) : 0;

  return (
    <section className="py-16 bg-white" data-testid="fixed-google-reviews">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
          <div><h2 className="text-3xl font-bold text-gray-900">Google Reviews</h2><p className="text-gray-600 mt-1">Real reviews from Memories customers on Google.</p></div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-rose-500 hover:bg-rose-600 text-white" onClick={() => window.open(GOOGLE_WRITE_REVIEW_URL, '_blank', 'noopener,noreferrer')}><Star className="w-4 h-4 mr-2" />Write a Google Review</Button>
            <Button variant="outline" className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-gray-900" onClick={() => window.open(live && data?.google_url ? data.google_url : GOOGLE_BUSINESS_URL, '_blank', 'noopener,noreferrer')}><ExternalLink className="w-4 h-4 mr-2" />Read all on Google</Button>
          </div>
        </div>

        {loading ? <div className="py-10 text-center text-gray-600"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3 text-rose-500" />Loading Google reviews...</div> : !live ? (
          <Card className="border-amber-200 bg-amber-50"><CardContent className="p-6 text-center"><p className="font-semibold text-gray-900">Google reviews are not currently available for display on the website.</p><p className="text-sm text-gray-600 mt-1 mb-4">No sample, placeholder or fabricated reviews are shown.</p><Button variant="outline" className="border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-gray-900" onClick={() => window.open(GOOGLE_BUSINESS_URL, '_blank', 'noopener,noreferrer')}>Open Google Reviews</Button></CardContent></Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7"><Card><CardContent className="p-5 text-center"><div className="text-4xl font-bold text-rose-600">{rating.toFixed(1)}★</div><div className="flex justify-center mt-2">{renderStars(rating)}</div><div className="text-sm text-gray-600 mt-2">Google rating</div></CardContent></Card><Card><CardContent className="p-5 text-center"><div className="text-4xl font-bold text-gray-900">{Math.max(0, Math.floor(total))}</div><div className="text-sm text-gray-600 mt-2">Google reviews</div></CardContent></Card><Card><CardContent className="p-5 text-center"><MapPin className="w-6 h-6 text-green-600 mx-auto mb-2" /><div className="font-semibold text-gray-900">Memories · Coimbatore</div><div className="text-xs text-gray-600 mt-1">Review content is supplied by Google.</div></CardContent></Card></div>
            {reviews.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{reviews.slice(0,6).map((review,index)=><Card key={`${review.author_name || 'google'}-${index}`} className="border-gray-200"><CardContent className="p-5"><div className="flex items-start justify-between gap-3 mb-3"><span className="font-semibold text-gray-900 text-sm truncate">{review.author_name || 'Google customer'}</span>{renderStars(review.rating)}</div><p className="text-gray-700 text-sm leading-relaxed">{review.text || ''}</p>{review.relative_time && <p className="text-gray-400 text-xs mt-3">{review.relative_time}</p>}</CardContent></Card>)}</div> : <Card><CardContent className="p-6 text-center text-gray-600">Google has not returned review text for display right now. Use “Read all on Google” to see the current reviews.</CardContent></Card>}
          </>
        )}
      </div>
    </section>
  );
};

export default FixedReviewSystem;
