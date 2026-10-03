'use client';
import { useDeferredValue, useEffect, useMemo, useState, Suspense } from 'react';
import nextDynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import DishCard from '@/components/DishCard';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Dish } from '@/lib/supabase';
import { useCartStore } from '@/lib/store';

const ChatInterface = nextDynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => null,
});

const CATEGORIES = ['All', 'High Protein', 'Low Cal', 'Vegetarian', 'Main'];

const normalize = (value: string) => value.trim().toLowerCase();

import { useSearchParams } from 'next/navigation';

// Client-side in-memory cache to prevent refetch waterfalls
let cachedMenuDishes: Dish[] | null = null;
let lastMenuFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  const qrTokenParam = searchParams.get('token');

  const [dishes,   setDishes]   = useState<Dish[]>(() => cachedMenuDishes || []);
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(() => !cachedMenuDishes || cachedMenuDishes.length === 0);
  const [error,    setError]    = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const cartTotal = useCartStore((s) => s.total());
  const cartCount = useCartStore((s) => s.count());
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);

  useEffect(() => {
    if (tableParam) {
      sessionStorage.setItem('prathomix_table', tableParam);

      // Establish secure dining session
      const existingToken = sessionStorage.getItem('prathomix_session_token');
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: Number(tableParam),
          qr_token: qrTokenParam || undefined,
          session_token: existingToken || undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.session?.session_token) {
            sessionStorage.setItem('prathomix_session_token', data.session.session_token);
          }
        })
        .catch(() => {});
    }
  }, [tableParam, qrTokenParam]);

  const gridVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 32, scale: 0.96, rotateX: 8 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.68,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const loadDishes = async (force = false) => {
    const isFresh = cachedMenuDishes && cachedMenuDishes.length > 0 && Date.now() - lastMenuFetchTime < CACHE_TTL_MS;
    if (isFresh && !force) {
      setDishes(cachedMenuDishes);
      setLoading(false);
      return;
    }

    if (!cachedMenuDishes || cachedMenuDishes.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch('/api/dishes');
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to fetch dishes');
      }

      const dishList: Dish[] = Array.isArray(payload) ? payload : [];
      cachedMenuDishes = dishList;
      lastMenuFetchTime = Date.now();
      setDishes(dishList);
    } catch (err: unknown) {
      if (!cachedMenuDishes || cachedMenuDishes.length === 0) {
        setError(err instanceof Error ? err.message : 'Unable to load menu');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDishes();
  }, []);

  const filtered = useMemo(() => {
    let next = normalize(category) === 'all'
      ? dishes
      : dishes.filter((d) => normalize(d.category) === normalize(category));

    const query = normalize(deferredSearch);
    if (query) {
      next = next.filter((d) =>
        [d.name, d.description, d.category]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(query))
      );
    }

    return next;
  }, [category, deferredSearch, dishes]);

  return (
    <>
      <Navbar />
      <main className="pt-20 sm:pt-28 pb-16 px-3.5 sm:px-6 max-w-[96rem] mx-auto">

        {/* Header */}
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-xs text-[#C5A880] uppercase tracking-widest mb-2 font-medium">
            Curated for your goals
          </p>
          <h1
            className="font-display text-3xl sm:text-5xl font-bold gradient-text mb-3 sm:mb-4"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Our Menu
          </h1>
          <p className="text-[#EAE6DF]/60 text-xs sm:text-sm max-w-md mx-auto">
            Filter by nutrition goals · Ask Mix for AI-powered personalized picks
          </p>

          {tableParam && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 sm:mt-5 inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/40 text-[#C5A880] text-xs font-semibold shadow-warm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Table {tableParam} Connected — Orders sent will arrive directly at your table
            </motion.div>
          )}
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A880]/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#121212]/80 border border-[#C5A880]/20
                         focus:border-[#C5A880] rounded-xl text-sm text-[#EAE6DF]
                         placeholder-[#EAE6DF]/40 outline-none transition-all focus:shadow-warm" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full flex-nowrap sm:flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-[#C5A880]/70 flex-shrink-0" />
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`lift-3d px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex-shrink-0 whitespace-nowrap min-h-[38px] sm:min-h-[44px] flex items-center justify-center
                             ${category === c
                                ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-warm'
                                : 'glass-dark border border-[#C5A880]/20 text-[#EAE6DF]/70 hover:border-[#C5A880]/50 hover:text-[#EAE6DF]'}`}>
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mb-4 flex items-center justify-between text-xs text-[#EAE6DF]/50 paint-boost">
          <span>
            {loading
              ? 'Loading menu from Supabase...'
              : `${filtered.length} dishes shown${category !== 'All' ? ` in ${category}` : ''}`}
          </span>
          <span>{dishes.length} total in table</span>
        </div>

        {/* Fluid Responsive Grid — 1 col on small phones, 2 on phablets/tablets, 3-5 on desktop */}
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3.5 sm:gap-5 lg:gap-6 paint-boost">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="glass-dark rounded-2xl sm:rounded-3xl overflow-hidden border border-[#C5A880]/15 p-3 flex flex-col justify-between h-[360px] animate-pulse">
                <div>
                  <div className="w-full h-44 rounded-xl bg-gradient-to-br from-[#1c1c1c] via-[#242424] to-[#171717] mb-3 relative overflow-hidden">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                  </div>
                  <div className="h-3 w-20 rounded bg-[#C5A880]/20 mb-2" />
                  <div className="h-4 w-3/4 rounded bg-white/10 mb-2" />
                  <div className="h-3 w-full rounded bg-white/5 mb-1" />
                  <div className="h-3 w-4/5 rounded bg-white/5" />
                </div>
                <div className="pt-3 border-t border-[#C5A880]/10 flex items-center justify-between mt-auto">
                  <div className="h-5 w-16 rounded bg-[#C5A880]/20" />
                  <div className="h-8 w-20 rounded-full bg-[#C5A880]/25" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 px-4">
            <div className="glass-dark max-w-md mx-auto p-8 rounded-3xl border border-[#C5A880]/20">
              <p className="text-sm text-rose-400 mb-4 font-semibold">Unable to load menu: {error}</p>
              <button
                type="button"
                onClick={() => loadDishes(true)}
                className="inline-flex items-center gap-2 bg-[#C5A880] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-warm hover:brightness-110 transition-all">
                Retry Loading
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#EAE6DF]/50">
            No dishes match your current filter.
          </div>
        ) : (
          <motion.div
            layout
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3.5 sm:gap-5 lg:gap-6 paint-boost">
            {filtered.map((dish, i) => (
              <motion.div key={dish.id} layout variants={itemVariants}>
                <DishCard dish={dish} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* Mobile Sticky Cart Action Bar */}
      {cartCount > 0 && (
        <div className="md:hidden fixed bottom-4 inset-x-3 z-40">
          <button
            type="button"
            onClick={() => toggleDrawer()}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm tracking-wider uppercase shadow-2xl flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#0A0A0A] text-[#C5A880] text-xs font-black flex items-center justify-center">
                {cartCount}
              </span>
              <span>View Cart</span>
            </div>
            <span className="font-display font-black text-base" style={{ fontFamily: 'Cinzel, serif' }}>
              ₹{cartTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      <ChatInterface />
    </>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
        </div>
      }>
      <MenuContent />
    </Suspense>
  );
}
