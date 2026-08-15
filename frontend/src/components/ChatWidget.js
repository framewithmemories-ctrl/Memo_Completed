import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GUEST_KEY = 'memoChatSession';

const getGuestSession = () => {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
};

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm Memo 👋 your gift assistant at Memories. Ask me for gift ideas, product info, pricing, hours or directions — how can I help?",
};

// Deterministic answers for website capabilities and business facts that should never be hallucinated by the LLM.
const getSmartLocalReply = async (text) => {
  const q = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // Account/profile questions: the site DOES support customer accounts.
  if (
    /(open|create|make|register|signup|sign up|join).*(account|profile)/i.test(q) ||
    /(personal|user|customer).*(account|profile)/i.test(q) ||
    /(how).*(login|log in|sign in|register)/i.test(q)
  ) {
    return "Absolutely! Memories has customer accounts. 👤 Click the person/account icon in the top-right corner of the website, then choose Create Account and enter your name, email, password and phone number. Once registered, you can use your profile to track orders, save photos, use your wallet/store credits and manage your account. If you already have an account, choose Sign In instead.";
  }

  // Gift Finder questions: don't claim that it is unavailable or pretend it is WhatsApp-only.
  if (/(gift finder|giftfinder)/i.test(q) && /(work|working|available|use|how|where|find)/i.test(q)) {
    return "Yes! 🎁 Memo's Gift Finder is available on the website. It asks a few questions about who you're gifting, the occasion, interests and budget, then recommends products from the current Memories catalogue. You can open it from the Gift Finder button in the top menu or the Gift Finder section on the homepage.";
  }

  // Memories-first recommendation policy. Never advertise or recommend competing sellers when a customer asks for an item we don't carry.
  // Instead, identify the underlying gifting need and offer the closest Memories solution or customization.
  if (/(outside|other|elsewhere|not.*memories|from.*other).*(gift|product|item)/i.test(q) || /gift.*(outside|other shops|elsewhere)/i.test(q)) {
    return "I’d be happy to help! ❤️ At Memories, we specialize in personalized gifts and meaningful photo-based keepsakes. I’ll first look for something in our own collection that matches what you need, and if we don’t have the exact item, I can suggest the closest Memories alternative or a customized option. Tell me the recipient, occasion and budget, and I’ll find the best fit for you. 🎁";
  }

  // Latest review: use the real approved review data instead of claiming no access.
  if (/(latest|recent|newest|last).*(review|reviews)/i.test(q) || /(review|reviews).*(latest|recent|newest|last)/i.test(q)) {
    try {
      const res = await axios.get(`${API}/reviews?limit=20&offset=0&approved_only=true`);
      const reviews = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
      if (!reviews.length) {
        return "I couldn't find an approved customer review right now. I can still take you to the Reviews section, or you can check our Google reviews from the shop's review area.";
      }
      const latest = [...reviews].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
      const stars = '★'.repeat(Math.max(0, Math.min(5, Number(latest.rating) || 0)));
      const date = latest.created_at ? new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      return `Here’s the latest approved review I found ⭐${stars ? ` ${stars}` : ''}${latest.name ? ` — ${latest.name}` : ''}${date ? ` (${date})` : ''}: “${latest.comment || 'The customer did not leave a written comment.'}”`;
    } catch (e) {
      return "I’m unable to load the latest review at the moment. Please try again in a moment, or check the Reviews section on the website.";
    }
  }

  // Dynamic Sunday/tomorrow questions. This avoids the old fixed-date assumption.
  if (/(tomorrow|today|open|closed).*(shop|store|business)/i.test(q) || /(shop|store).*(tomorrow|today|open|closed)/i.test(q)) {
    const now = new Date();
    const target = /tomorrow/i.test(q) ? new Date(now.getTime() + 86400000) : now;
    const targetWeekday = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(target);
    const closed = targetWeekday === 'Sunday';
    return closed
      ? `No, Boss 😊 Memories is closed on Sunday. We’re open Monday to Saturday, 9:30 AM–9:00 PM. If you meant a different date, tell me the date and I’ll check it for you.`
      : `Yes — Memories is open on ${targetWeekday}, from 9:30 AM to 9:00 PM. 📍 We’re at 19B Kani Illam, Keeranatham Road, Coimbatore.`;
  }

  // Explicit owner recognition should feel personal, but only after the customer says it.
  if (/(i am|i'm|this is).*(dinesh|dinesh sr|dinesh s r)/i.test(q)) {
    return "Of course, Sir! 👋 I know you as Dinesh SR, the owner of Memories, because you just told me. I’ll remember that within this conversation and can speak to you as the owner when we discuss the shop. What would you like me to check?";
  }

  return null;
};

export const ChatWidget = () => {
  const { user, isAuthenticated, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const authCfg = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const currentSession = () => (isAuthenticated && user ? `u-${user.id}` : getGuestSession());

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    if (isAuthenticated && user) {
      axios.get(`${API}/chat/history`, authCfg)
        .then((res) => {
          const hist = res.data?.messages || [];
          setMessages(hist.length ? [WELCOME, ...hist] : [WELCOME]);
        })
        .catch(() => setMessages([WELCOME]));
    } else {
      setMessages([WELCOME]);
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    if (!isAuthenticated) {
      localStorage.removeItem(GUEST_KEY);
      setMessages([WELCOME]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const localReply = await getSmartLocalReply(text);
      if (localReply) {
        setMessages((m) => [...m, { role: 'assistant', content: localReply }]);
        return;
      }

      const res = await axios.post(`${API}/chat`, { session_id: currentSession(), message: text }, authCfg);
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: "Sorry, I couldn't respond right now. Please WhatsApp us at +91 81480 40148 and our team will help!",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="chat-widget-button"
          aria-label="Open chat assistant"
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-rose-500 text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div
          data-testid="chat-widget-panel"
          className="fixed bottom-24 right-6 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-2xl shadow-2xl border border-purple-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-rose-500 text-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold leading-tight">Memo · Gift Assistant</div>
                <div className="text-[11px] text-white/80">
                  {isAuthenticated ? 'Your chats are saved' : 'Usually replies instantly'}
                </div>
              </div>
            </div>
            <button onClick={handleClose} data-testid="chat-close-button" aria-label="Close chat" className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} data-testid={`chat-message-${m.role}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-rose-500 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-white border border-gray-200 text-gray-500 flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memo is typing…
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about gifts, pricing, hours, directions…"
              data-testid="chat-input"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              data-testid="chat-send-button"
              aria-label="Send message"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-rose-500 text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
