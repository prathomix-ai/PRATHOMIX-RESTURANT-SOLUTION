'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Bot, User, X, MessageSquare, Loader2 } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import DishCard from './DishCard';
import type { Dish } from '@/lib/supabase';

type ToolResult =
  | { type: 'dishes';  data: Dish[]  }
  | { type: 'booking'; data: Record<string, unknown> }
  | null;

type Message = {
  id:          string;
  role:        'user' | 'assistant';
  content:     string;
  toolResult?: ToolResult;
};

const INITIAL: Message = {
  id: '0',
  role: 'assistant',
  content:
    "Hi! I'm Mix, your AI dining assistant 🍽️  I can help you find high-protein dishes, book a table, or answer any menu questions. You can also tap the mic to speak!",
};

export default function ChatInterface() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);

  const { listening, startListening, stopListening } = useVoice(handleVoiceResult);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].slice(1).map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: history }),
      });
      const data = await res.json();

      const aiMsg: Message = {
        id:         (Date.now() + 1).toString(),
        role:       'assistant',
        content:    data.message ?? 'Here are my recommendations!',
        toolResult: data.toolResult ?? null,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:      (Date.now() + 1).toString(),
          role:    'assistant',
          content: 'Oops! Something went wrong. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label="Open AI chat"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl shadow-warm-lg
                   bg-gradient-to-br from-primary-600 to-primary-700
                   flex items-center justify-center text-white">
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-20 right-4 sm:right-6 z-40
                       w-[min(82vw,360px)] sm:w-[360px] h-[min(74vh,640px)] max-h-[calc(100vh-5.5rem)]
                       glass border border-warm-200 rounded-2xl flex flex-col overflow-hidden shadow-warm-lg">

            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-warm-200 flex-shrink-0 bg-gradient-to-r from-primary-50 to-warm-50">
              <div className="w-9 h-9 rounded-full bg-primary-600/15 border border-primary-600/30
                              flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-900">Mix — AI Assistant</p>
                <p className="text-xs text-accent-green flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block animate-pulse" />
                  Online · Powered by PRATHOMIX
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-gray-600 hover:text-primary-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                   ${m.role === 'user'
                                     ? 'bg-primary-600/15 border border-primary-600/25'
                                     : 'bg-warm-200  border border-warm-300'}`}>
                    {m.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-primary-600" />
                      : <Bot  className="w-3.5 h-3.5 text-gray-600" />}
                  </div>

                  {/* Bubble + Tool Results */}
                  <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                                     ${m.role === 'user'
                                       ? 'chat-user text-white rounded-tr-sm'
                                       : 'chat-ai   text-gray-700 rounded-tl-sm'}`}>
                      {m.content}
                    </div>

                    {/* Generative UI — Dish Cards */}
                    {m.toolResult?.type === 'dishes' && m.toolResult.data.length > 0 && (
                      <div className="flex flex-col gap-2 w-full max-w-none">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-primary-700 font-semibold">
                          Suggested dishes
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 pr-1 w-full">
                          {m.toolResult.data.map((dish) => (
                            <DishCard key={dish.id} dish={dish} compact />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Booking Confirmation */}
                    {m.toolResult?.type === 'booking' && m.toolResult.data && (
                      <div className="glass border border-warm-200 rounded-xl p-3 text-xs w-full">
                        <p className="text-primary-600 font-semibold mb-1.5">✅ Booking Confirmed!</p>
                        <p className="text-gray-700">📅 {String(m.toolResult.data.date)} at {String(m.toolResult.data.time)}</p>
                        <p className="text-gray-700">👥 {String(m.toolResult.data.guests)} guests</p>
                        <p className="text-gray-600 mt-1.5">
                          ID: #{String(m.toolResult.data.id ?? '').slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-warm-200 border border-warm-300
                                  flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div className="chat-ai rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                    <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 1 && !loading && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-wrap">
                {[
                  'High protein dishes 40g+',
                  'Low calorie options',
                  'Book a table for 2',
                  "What's on the menu?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[11px] text-primary-600 border border-primary-600/25 rounded-full
                               px-3 py-1 whitespace-nowrap hover:bg-primary-600/10 transition-all duration-150
                               flex-shrink-0">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-warm-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Mic Button */}
                <button
                  onClick={listening ? stopListening : startListening}
                  aria-label={listening ? 'Stop listening' : 'Start voice input'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                               transition-all duration-200
                               ${listening
                                 ? 'bg-primary-600 text-white mic-active'
                                 : 'glass border border-warm-200 text-gray-600 hover:text-primary-600 hover:border-primary-400'}`}>
                  {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={listening ? '🎤 Listening…' : 'Ask about dishes, macros, book a table…'}
                  className="flex-1 min-w-0 bg-transparent border border-warm-200
                             focus:border-primary-600/50 rounded-xl px-3 py-2 text-sm text-gray-900
                             placeholder-gray-500 outline-none transition-all duration-200
                             focus:shadow-warm" />

                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-primary-600/10 hover:bg-primary-600/20
                             border border-primary-600/30 hover:border-primary-400/60 text-primary-600
                             flex items-center justify-center transition-all duration-200
                             hover:shadow-warm disabled:opacity-40 flex-shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
