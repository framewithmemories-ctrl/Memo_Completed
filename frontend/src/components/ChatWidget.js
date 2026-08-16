import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Loader2, ShoppingCart, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GUEST_KEY = 'memoChatSession';

const getGuestSession = () => {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
};

const WELCOME = { role: 'assistant', content: "Hi! I'm Memo 👋 your gift assistant at Memories. Tell me who you're gifting, the occasion and your budget — I'll help you find something from our collection." };

const getSmartLocalReply = async (text) => {
  const q = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^(hi|hii|hello|hey|hey memo|good morning|good afternoon|good evening)[!. ]*$/i.test(q)) return "Hi! 👋 I'm Memo, your Memories gift assistant. Tell me who you're gifting, the occasion and your budget, and I'll suggest something from our collection. 🎁";
  if (/^(how are you|how r u|how are u|how's it going)[?!. ]*$/i.test(q)) return "I'm doing great! 😊 I'm ready to help you find a thoughtful gift from Memories. Who are you shopping for?";
  if (/^(thanks|thank you|thank u|thx)[!. ]*$/i.test(q)) return "You're very welcome! ❤️ Whenever you need a gift idea, just ask Memo.";
  if (/^(help|what can you do|what do you do)[?!. ]*$/i.test(q)) return "I can help with Memories products, prices, gift ideas, our Gift Finder, shop timings, reviews and orders. Tell me the occasion, recipient and budget and we'll start. 🎁";
  if (/(open|create|make|register|signup|sign up|join).*(account|profile)/i.test(q) || /(personal|user|customer).*(account|profile)/i.test(q) || /(how).*(login|log in|sign in|register)/i.test(q)) return "Absolutely! Memories has customer accounts. 👤 Click the person/account icon in the top-right corner, then choose Create Account and enter your name, email, password and phone number. You can then track orders, save photos, use your wallet/store credits and manage important dates.";
  if (/(gift finder|giftfinder)/i.test(q) && /(work|working|available|use|how|where|find)/i.test(q)) return "Yes! 🎁 Memo's Gift Finder is available on the website. It asks about who you're gifting, the occasion, interests and budget, then recommends products from the current Memories catalogue. Open it from the Gift Finder button in the top menu.";
  if (/(outside|other|elsewhere|not.*memories|from.*other).*(gift|product|item)/i.test(q) || /gift.*(outside|other shops|elsewhere)/i.test(q)) return "I’d love to help you find the closest match from Memories first. 🎁 We specialise in personalised photo frames, customised gifts and sublimation products, so tell me what you need, who it’s for and your budget — I’ll suggest the best options we actually offer.";
  if (/(latest|recent|newest|last).*(review|reviews)/i.test(q) || /(review|reviews).*(latest|recent|newest|last)/i.test(q)) {
    try {
      const res = await axios.get(`${API}/reviews?limit=20&offset=0&approved_only=true`, { timeout: 8000 });
      const reviews = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
      if (!reviews.length) return "I couldn't find an approved customer review right now. You can still check the Reviews section on our website.";
      const latest = [...reviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
      const stars = '★'.repeat(Math.max(0, Math.min(5, Number(latest.rating) || 0)));
      const date = latest.created_at ? new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `Here’s the latest approved review I found ⭐${stars ? ` ${stars}` : ''}${latest.name ? ` — ${latest.name}` : ''}${date ? ` (${date})` : ''}: “${latest.comment || 'The customer did not leave a written comment.'}”`;
    } catch { return "I’m unable to load the latest review at the moment. Please try again in a moment, or check the Reviews section on the website."; }
  }
  if (/(tomorrow|today|open|closed).*(shop|store|business)/i.test(q) || /(shop|store).*(tomorrow|today|open|closed)/i.test(q)) {
    const now = new Date();
    const target = /tomorrow/i.test(q) ? new Date(now.getTime() + 86400000) : now;
    const targetWeekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(target);
    return targetWeekday === 'Sunday' ? "No, Boss 😊 Memories is closed on Sunday. We’re open Monday to Saturday, 9:30 AM–9:00 PM." : `Yes — Memories is open on ${targetWeekday}, from 9:30 AM to 9:00 PM. 📍 We’re at 19B Kani Illam, Keeranatham Road, Coimbatore.`;
  }
  if (/(i am|i'm|this is).*(dinesh|dinesh sr|dinesh s r)/i.test(q)) return "Of course, Sir! 👋 I know you as Dinesh SR because you just told me. I’ll remember that within this conversation and can speak to you as the owner when we discuss the shop. What would you like me to check?";
  return null;
};

const parseBudget = (text) => {
  const matches = [...text.matchAll(/(?:₹|rs\.?\s*|inr\s*)([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/gi)];
  const values = matches.map(m => Number(m[1].replace(/,/g, ''))).filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
};

const chooseCatalogueProducts = (products, userText, assistantText = '') => {
  const safeProducts = Array.isArray(products) ? products : [];
  if (!safeProducts.length) return [];
  const combined = `${userText} ${assistantText}`.toLowerCase();
  const budget = parseBudget(userText);
  const keywordGroups = [['frame', ['frame', 'photo', 'memory', 'picture']], ['mug', ['mug', 'coffee', 'cup']], ['t-shirt', ['shirt', 't-shirt', 'tee', 'wear']], ['corporate', ['corporate', 'office', 'employee', 'bulk', 'company']], ['acrylic', ['acrylic', 'modern', 'premium']]];
  const scored = safeProducts.map((p, index) => {
    const hay = `${p.name || ''} ${p.description || ''} ${p.category || ''}`.toLowerCase();
    let score = 0;
    keywordGroups.forEach(([_, words]) => { if (words.some(w => combined.includes(w)) && words.some(w => hay.includes(w))) score += 5; });
    if ((p.name || '').toLowerCase() && combined.includes((p.name || '').toLowerCase())) score += 20;
    if (budget != null) { const price = Number(p.base_price || 0); if (price <= budget) score += 4; else score -= Math.min(6, (price - budget) / Math.max(100, budget) * 6); }
    score += Math.max(0, 1 - index * 0.02);
    return { p, score };
  });
  const positive = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
  const source = positive.length ? positive : scored.sort((a, b) => Number(a.p.base_price || 0) - Number(b.p.base_price || 0));
  return source.slice(0, 3).map(x => x.p);
};

const getCatalogueFallbackReply = (text, products) => {
  const picks = chooseCatalogueProducts(products, text);
  if (!picks.length) return "I'm here to help with Memories gifts. 🎁 Tell me who the gift is for, the occasion and your budget, and I'll suggest something from our collection.";
  const names = picks.map(p => `${p.name} (from ₹${Number(p.base_price || 0).toLocaleString('en-IN')})`);
  return `Absolutely! Based on what you asked, I'd start with ${names.join(', ')}. 🎁 These are from the Memories collection. If you tell me a little more about the recipient or occasion, I can narrow it down further.`;
};

const ProductCards = ({ products, onView, onAdd }) => {
  if (!Array.isArray(products) || !products.length) return null;
  return <div className="mt-3 space-y-2" data-testid="memo-product-recommendations"><div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">From the Memories collection</div>{products.map((p) => <div key={p.id} className="bg-white border border-rose-100 rounded-xl p-2.5 shadow-sm"><div className="flex gap-2.5"><img src={p.image_url || p.media?.primary_image} alt={p.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100 flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><div className="min-w-0 flex-1"><div className="font-semibold text-gray-800 text-xs leading-snug">{p.name}</div><div className="text-rose-600 font-bold text-sm mt-0.5">From ₹{Number(p.base_price || 0).toLocaleString('en-IN')}</div><div className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{p.description}</div></div></div><div className="flex gap-1.5 mt-2"><button onClick={() => onView(p)} className="flex-1 h-7 rounded-lg border border-gray-200 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"><ExternalLink className="w-3 h-3" /> View</button><button onClick={() => onAdd(p)} className="flex-1 h-7 rounded-lg bg-rose-500 text-white text-[10px] font-semibold hover:bg-rose-600 flex items-center justify-center gap-1"><ShoppingCart className="w-3 h-3" /> Add to cart</button></div></div>)}</div>;
};

export const ChatWidget = () => {
  const { user, isAuthenticated, token } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogue, setCatalogue] = useState([]);
  const [recommendations, setRecommendations] = useState({});
  const scrollRef = useRef(null);
  const currentSession = () => (isAuthenticated && user ? `u-${user.id}` : getGuestSession());
  const authCfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

  useEffect(() => { axios.get(`${API}/products`, { timeout: 10000 }).then(res => setCatalogue(Array.isArray(res.data) ? res.data : (res.data?.products || []))).catch(() => setCatalogue([])); }, []);
  useEffect(() => { if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, open, recommendations]);
  useEffect(() => {
    if (!open) return;
    if (isAuthenticated && user) {
      axios.get(`${API}/chat/history`, authCfg).then((res) => { const hist = Array.isArray(res.data?.messages) ? res.data.messages : []; setMessages(hist.length ? [WELCOME, ...hist] : [WELCOME]); }).catch(() => setMessages([WELCOME]));
    } else setMessages([WELCOME]);
  }, [open, isAuthenticated, user, token]);

  const handleClose = () => { setOpen(false); if (!isAuthenticated) { try { localStorage.removeItem(GUEST_KEY); } catch {} setMessages([WELCOME]); setRecommendations({}); } };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userIndex = messages.length;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput(''); setLoading(true);
    try {
      let reply = await getSmartLocalReply(text);
      if (!reply) {
        try {
          const res = await axios.post(`${API}/chat`, { session_id: currentSession(), message: text }, { ...authCfg, timeout: 12000 });
          reply = typeof res.data?.reply === 'string' && res.data.reply.trim() ? res.data.reply.trim() : null;
        } catch (backendError) { console.warn('Memo backend unavailable; using catalogue fallback.', backendError); }
      }
      if (!reply) reply = getCatalogueFallbackReply(text, catalogue);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      const picks = chooseCatalogueProducts(catalogue, text, reply);
      if (picks.length) setRecommendations(prev => ({ ...prev, [userIndex]: picks }));
    } catch (e) {
      console.error('Memo response failed:', e);
      setMessages((m) => [...m, { role: 'assistant', content: getCatalogueFallbackReply(text, catalogue) }]);
    } finally { setLoading(false); }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const viewProduct = (p) => { navigate(`/product/${p.slug || p.id}`); setOpen(false); };
  const addProduct = (p) => addToCart(p);

  return <>
    {!open && <button onClick={() => setOpen(true)} data-testid="chat-widget-button" aria-label="Open chat assistant" className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-rose-500 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"><MessageCircle className="w-6 h-6" /></button>}
    {open && <div data-testid="chat-widget-panel" className="fixed bottom-24 right-6 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[620px] bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"><div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle className="w-4 h-4" /></div><div><div className="font-semibold leading-tight">Memo · Gift Assistant</div><div className="text-[11px] text-white/80">{isAuthenticated ? 'Your chats are saved' : 'Memories catalogue assistant'}</div></div></div><button onClick={handleClose} data-testid="chat-close-button" aria-label="Close chat" className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button></div><div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">{messages.map((m, i) => <div key={i} data-testid={`chat-message-${m.role}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className="max-w-[88%]"><div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-rose-500 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>{m.content}</div>{m.role === 'assistant' && recommendations[i - 1] && <ProductCards products={recommendations[i - 1]} onView={viewProduct} onAdd={addProduct} />}</div></div>)}{loading && <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl bg-white border border-gray-200 text-gray-500 flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Memo is typing…</div></div>}</div><div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Ask for a gift, budget, product…" data-testid="chat-input" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-300" /><button onClick={send} disabled={loading || !input.trim()} data-testid="chat-send-button" aria-label="Send message" className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-rose-500 text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"><Send className="w-4 h-4" /></button></div></div>}
  </>;
};

export default ChatWidget;
