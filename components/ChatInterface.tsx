'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Bot, User, X, MessageSquare, Loader2, ChevronDown } from 'lucide-react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);

  const { listening, startListening, stopListening } = useVoice(handleVoiceResult);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, loading]);

  // Clean up any ongoing request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    // Stop any existing request
    stopGenerating();

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    const aiMsgId = (Date.now() + 1).toString();

    // Create placeholder for assistant response
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiMsgId, role: 'assistant', content: '', toolResult: null },
    ]);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const history = [...messages, userMsg].slice(1).map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      const session = getClientSession();
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream, application/json',
        },
        body: JSON.stringify({
          messages: history,
          role: session?.role || 'customer',
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch AI response');
      }

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && res.body) {
        // SSE streaming response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let toolRes: ToolResult = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'tool' && parsed.toolResult) {
                  toolRes = parsed.toolResult;
                } else if (parsed.type === 'chunk' && typeof parsed.text === 'string') {
                  accumulated += parsed.text;
                } else if (parsed.type === 'done') {
                  // generation completed
                }

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId
                      ? { ...m, content: accumulated, toolResult: toolRes }
                      : m
                  )
                );
              } catch {}
            }
          }
        }
      } else {
        // JSON fallback
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: data.message ?? 'Here are my recommendations!',
                  toolResult: data.toolResult ?? null,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        // User aborted: Preserve whatever was received so far
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === aiMsgId) {
              const preserved = m.content.trim()
                ? m.content
                : '[Response stopped]';
              return { ...m, content: preserved };
            }
            return m;
          })
        );
      } else {
        // Real failure
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: 'Oops! Something went wrong. Please try again in a moment.',
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        data-tour="customer-ai"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={open ? { rotate: 0 } : { rotate: 0 }}
        aria-label={open ? 'Minimize AI chat' : 'Open AI chat'}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-3.5 sm:right-6 z-40
                   w-13 h-13 sm:w-16 sm:h-16 min-w-[52px] min-h-[52px] rounded-2xl
                   flex items-center justify-center text-[#0A0A0A] overflow-hidden"
        style={{
          background: open
            ? 'linear-gradient(135deg, #8C7355 0%, #6E5940 100%)'
            : 'linear-gradient(135deg, #C5A880 0%, #8C7355 100%)',
          boxShadow: open
            ? '0 8px 30px rgba(110,89,64,0.4), 0 1px 0 rgba(255,255,255,0.15) inset'
            : '0 8px 30px rgba(197,168,128,0.35), 0 1px 0 rgba(255,255,255,0.2) inset',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
        }}>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, y: -8, scale: 0.7 }}
              animate={{ opacity: 1, y: 0,  scale: 1   }}
              exit={{    opacity: 0, y:  8, scale: 0.7 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}>
              <ChevronDown className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, y: 8,  scale: 0.7 }}
              animate={{ opacity: 1, y: 0,  scale: 1   }}
              exit={{    opacity: 0, y: -8, scale: 0.7 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}>
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-0 sm:bottom-20 left-0 sm:left-auto right-0 sm:right-6 z-40
                       w-full sm:w-[390px] md:w-[420px] h-[92dvh] sm:h-[620px] max-h-[100dvh]
                       flex flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl"
            style={{
              background: 'rgba(10, 10, 10, 0.92)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              border: '1px solid rgba(197, 168, 128, 0.18)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.85), 0 1px 0 rgba(255,255,255,0.06) inset',
            }}>

            {/* Header */}
            <div
              className="flex items-center gap-3 p-3.5 sm:p-4 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(197,168,128,0.18)', background: 'rgba(15,15,15,0.7)' }}>
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(197,168,128,0.12)',
                  border: '1px solid rgba(197,168,128,0.3)',
                }}>
                <Bot className="w-4 h-4" style={{ color: '#C5A880' }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: '#EAE6DF', fontFamily: 'Montserrat, sans-serif' }}>
                  MIX — AI Concierge
                </p>
                <p className="text-[11px] sm:text-xs font-medium flex items-center gap-1.5" style={{ color: '#C5A880' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: '#C5A880' }} />
                  Online · Powered by PRATHOMIX
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ color: 'rgba(197,168,128,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(197,168,128,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-3.5 sm:p-4 flex flex-col gap-3.5 scroll-smooth chat-scroll"
              style={{ background: 'rgba(8,8,8,0.5)' }}>
              {messages.map((m) => {
                // Skip empty assistant placeholder while streaming (typing indicator handles it)
                if (m.role === 'assistant' && !m.content && !m.toolResult) return null;
                return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={m.role === 'user'
                      ? { background: 'rgba(197,168,128,0.15)', border: '1px solid rgba(197,168,128,0.3)' }
                      : { background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(197,168,128,0.2)' }}>
                    {m.role === 'user'
                      ? <User className="w-3.5 h-3.5" style={{ color: '#C5A880' }} />
                      : <Bot  className="w-3.5 h-3.5" style={{ color: '#C5A880' }} />}
                  </div>

                  {/* Bubble + Tool Results */}
                  <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {m.content && (
                      <div className={`rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed break-words max-w-full overflow-hidden
                                       ${m.role === 'user'
                                         ? 'chat-user rounded-tr-sm'
                                         : 'chat-ai rounded-tl-sm'}`}>
                        {m.content}
                      </div>
                    )}

                    {/* Generative UI — Dish Cards */}
                    {m.toolResult?.type === 'dishes' && m.toolResult.data.length > 0 && (
                      <div className="flex flex-col gap-2 w-full max-w-none">
                        <p className="text-[10px] uppercase tracking-[0.25em] font-semibold" style={{ color: '#C5A880' }}>
                          Suggested dishes
                        </p>
                        <div className="flex gap-2.5 overflow-x-auto pb-2 pr-1 w-full max-w-full">
                          {m.toolResult.data.map((dish) => (
                            <DishCard key={dish.id} dish={dish} compact />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Booking Confirmation */}
                    {m.toolResult?.type === 'booking' && m.toolResult.data && (
                      <div
                        className="rounded-xl p-3 text-xs w-full"
                        style={{
                          background: 'rgba(197,168,128,0.08)',
                          border: '1px solid rgba(197,168,128,0.2)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        }}>
                        <p className="font-semibold mb-1" style={{ color: '#C5A880' }}>✅ Booking Confirmed!</p>
                        <p style={{ color: '#EAE6DF' }}>📅 {String(m.toolResult.data.date)} at {String(m.toolResult.data.time)}</p>
                        <p style={{ color: '#EAE6DF' }}>👥 {String(m.toolResult.data.guests)} guests</p>
                        <p className="mt-1" style={{ color: 'rgba(197,168,128,0.6)' }}>
                          ID: #{String(m.toolResult.data.id ?? '').slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                );})}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2.5 items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(20,20,20,0.8)', border: '1px solid rgba(197,168,128,0.2)' }}>
                    <Bot className="w-3.5 h-3.5" style={{ color: '#C5A880' }} />
                  </div>
                  <div className="chat-ai rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'rgba(197,168,128,0.7)' }}>
                      MIX is typing
                    </span>
                    <span className="flex gap-1 items-center">
                      {[0,1,2].map(i => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full inline-block"
                          style={{
                            background: '#C5A880',
                            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length === 1 && !loading && (
              <div
                className="px-3.5 pb-2 pt-1.5 flex gap-1.5 overflow-x-auto flex-wrap flex-shrink-0"
                style={{ borderTop: '1px solid rgba(197,168,128,0.1)', background: 'rgba(10,10,10,0.6)' }}>
                {[
                  'High protein dishes 40g+',
                  'Low calorie options',
                  'Book a table for 2',
                  "What's on the menu?",
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-[11px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap transition-all duration-150 flex-shrink-0"
                    style={{
                      background: 'rgba(197,168,128,0.08)',
                      border: '1px solid rgba(197,168,128,0.25)',
                      color: '#C5A880',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(197,168,128,0.18)';
                      e.currentTarget.style.borderColor = 'rgba(197,168,128,0.5)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'rgba(197,168,128,0.08)';
                      e.currentTarget.style.borderColor = 'rgba(197,168,128,0.25)';
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div
              className="p-2.5 sm:p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0"
              style={{ borderTop: '1px solid rgba(197,168,128,0.15)', background: 'rgba(10,10,10,0.8)' }}>
              <div className="flex items-center gap-2">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  aria-label={listening ? 'Stop listening' : 'Start voice input'}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={listening
                    ? { background: 'linear-gradient(135deg, #C5A880, #8C7355)', color: '#0A0A0A' }
                    : { background: 'rgba(197,168,128,0.08)', border: '1px solid rgba(197,168,128,0.2)', color: 'rgba(197,168,128,0.7)' }}>
                  {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={listening ? '🎤 Listening…' : 'Ask dishes, macros, bookings…'}
                  className="flex-1 min-w-0 rounded-xl px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm font-medium outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(197,168,128,0.06)',
                    border: '1px solid rgba(197,168,128,0.2)',
                    color: '#EAE6DF',
                    caretColor: '#C5A880',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(197,168,128,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(197,168,128,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(197,168,128,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
                />

                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0"
                  style={{
                    background: input.trim() && !loading
                      ? 'linear-gradient(135deg, #C5A880 0%, #8C7355 100%)'
                      : 'rgba(197,168,128,0.12)',
                    color: input.trim() && !loading ? '#0A0A0A' : 'rgba(197,168,128,0.35)',
                    boxShadow: input.trim() && !loading ? '0 4px 16px rgba(197,168,128,0.2)' : 'none',
                  }}>
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        input::placeholder { color: rgba(197,168,128,0.35); }
      `}</style>
    </>
  );
}
