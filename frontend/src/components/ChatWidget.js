import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getSessionId = () => {
  let id = localStorage.getItem('memoChatSession');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('memoChatSession', id);
  }
  return id;
};

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm Memo 👋 your gift assistant at Memories. Ask me for gift ideas, product info, pricing or delivery — how can I help?",
};

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(getSessionId());
  const scrollRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && !loadedRef.current) {
      loadedRef.current = true;
      axios.get(`${API}/chat/${sessionId.current}`)
        .then((res) => {
          const hist = res.data?.messages || [];
          if (hist.length > 0) setMessages([WELCOME, ...hist]);
        })
        .catch(() => {});
    }
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { session_id: sessionId.current, message: text });
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
                <div className="text-[11px] text-white/80">Usually replies instantly</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} data-testid="chat-close-button" aria-label="Close chat" className="p-1 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} data-testid={`chat-message-${m.role}`} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-rose-500 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
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
              placeholder="Ask about gifts, pricing, delivery…"
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
