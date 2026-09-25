'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Bot, User, X, MessageSquare, Loader2 } from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import DishCard from './DishCard';
import type { Dish } from '@/lib/supabase';
import { getClientSession } from '@/lib/auth';

type ToolResult =
  | { type: 'dishes';  data: Dish[]  }
  | { type: 'booking'; data: Record<string, unknown> }
  | { type: 'metrics'; data: any }
  | { type: 'inventory'; data: any }
  | { type: 'tables'; data: any }
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
    "Hi! I'm MIX, your AI dining assistant 🍽️  I can help you find high-protein dishes, book a table, or answer any menu questions. You can also tap the mic to speak!",
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

      const session = getClientSession();
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: history,
          role: session?.role || 'customer',
        }),
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
        className="fixed bottom-6 right-5 sm:right-6 z-40 w-16 h-16 rounded-[1.2rem] shadow-warm-xl
                   bg-gradient-to-br from-primary-600 to-primary-700
                   flex items-center justify-center text-white">
        {open ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-40
                         w-[calc(100vw-2rem)] sm:w-[380px] h-[min(74vh,640px)] max-h-[calc(100vh-5.5rem)]
                         bg-[#FAF9F6] border border-warm-300 rounded-2xl flex flex-col overflow-hidden shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-warm-200 flex-shrink-0 bg-gradient-to-r from-primary-50 to-warm-100">
              <div className="w-9 h-9 rounded-full bg-primary-600/15 border border-primary-600/30
                              flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-primary-900">MIX — AI Assistant</p>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Online · Powered by PRATHOMIX
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="ml-auto p-1.5 rounded-lg text-gray-500 hover:text-primary-700 hover:bg-black/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#FAF9F6]/80">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                                   ${m.role === 'user'
                                     ? 'bg-primary-600/15 border border-primary-600/25 text-primary-700'
                                     : 'bg-warm-200 border border-warm-300 text-primary-800'}`}>
                    {m.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-primary-700" />
                      : <Bot  className="w-3.5 h-3.5 text-primary-800" />}
                  </div>

                  {/* Bubble + Tool Results */}
                  <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm
                                     ${m.role === 'user'
                                       ? 'chat-user rounded-tr-sm'
                                       : 'chat-ai rounded-tl-sm'}`}>
                      {m.content}
                    </div>

                    {/* Generative UI — Dish Cards */}
                    {m.toolResult?.type === 'dishes' && m.toolResult.data.length > 0 && (
                      <div className="flex flex-col gap-2 w-full max-w-none">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-primary-800 font-semibold">
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
                      <div className="bg-white border border-warm-200 rounded-xl p-3.5 text-xs w-full shadow-sm">
                        <p className="text-primary-700 font-semibold mb-1.5">✅ Booking Confirmed!</p>
                        <p className="text-gray-700">📅 {String(m.toolResult.data.date)} at {String(m.toolResult.data.time)}</p>
                        <p className="text-gray-700">👥 {String(m.toolResult.data.guests)} guests</p>
                        <p className="text-gray-500 mt-1.5">
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
                                  flex items-center justify-center flex-shrink-0 text-primary-800">
                    <Bot className="w-3.5 h-3.5 text-primary-800" />
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
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-wrap bg-[#FAF9F6]/80">
                {[
                  'High protein dishes 40g+',
                  'Low calorie options',
                  'Book a table for 2',
                  "What's on the menu?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-[11px] font-medium text-primary-700 bg-white hover:bg-primary-50
                               border border-primary-300/80 hover:border-primary-500 rounded-full
                               px-3 py-1.5 whitespace-nowrap transition-all duration-150 shadow-xs
                               flex-shrink-0">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-warm-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                {/* Mic Button */}
                <button
                  onClick={listening ? stopListening : startListening}
                  aria-label={listening ? 'Stop listening' : 'Start voice input'}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                               transition-all duration-200 shadow-xs
                               ${listening
                                 ? 'bg-primary-600 text-white mic-active'
                                 : 'bg-warm-50 border border-warm-200 text-gray-600 hover:text-primary-700 hover:border-primary-400'}`}>
                  {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={listening ? '🎤 Listening…' : 'Ask about dishes, macros, book a table…'}
                  className="flex-1 min-w-0 bg-white border border-warm-300
                             focus:border-primary-600 rounded-xl px-3.5 py-2.5 text-sm text-gray-900
                             font-medium placeholder-gray-400 outline-none transition-all duration-200
                             shadow-xs focus:ring-1 focus:ring-primary-500" />

                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700
                             border border-primary-600 text-white
                             flex items-center justify-center transition-all duration-200
                             shadow-sm hover:shadow disabled:opacity-40 flex-shrink-0">
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
