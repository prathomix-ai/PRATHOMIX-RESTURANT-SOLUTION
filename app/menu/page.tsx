'use client';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import DishCard from '@/components/DishCard';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Dish } from '@/lib/supabase';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => null,
});

const CATEGORIES = ['All', 'High Protein', 'Low Cal', 'Vegetarian', 'Main'];

const normalize = (value: string) => value.trim().toLowerCase();

export default function MenuPage() {
  const [dishes,   setDishes]   = useState<Dish[]>([]);
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

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

  useEffect(() => {
    let mounted = true;

    async function loadDishes() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/dishes', { cache: 'no-store' });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload?.error || 'Failed to fetch dishes');
        }

        const dishList: Dish[] = Array.isArray(payload) ? payload : [];

        if (!mounted) return;
        setDishes(dishList);
      } catch (err: unknown) {
        if (!mounted) return;
        setDishes([]);
        setError(err instanceof Error ? err.message : 'Unable to load menu');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDishes();

    return () => {
      mounted = false;
    };
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
      <main className="pt-24 pb-16 px-4 max-w-[96rem] mx-auto">

        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-xs text-primary-600 uppercase tracking-widest mb-2 font-medium">
            Curated for your goals
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-4"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Our Menu
          </h1>
          <p className="text-stone-500 text-sm">
            Filter by nutrition goals · Ask Mix for AI-powered personalized picks
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search dishes…"
              className="w-full pl-10 pr-4 py-2.5 glass border border-warm-200
                         focus:border-primary-400/50 rounded-xl text-sm text-primary-900
                         placeholder-stone-400 outline-none transition-all focus:shadow-warm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-stone-500 flex-shrink-0" />
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`lift-3d px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300
                             ${category === c
                               ? 'bg-primary-600/10 border border-primary-400/40 text-primary-700 shadow-warm'
                               : 'glass border border-warm-200 text-stone-600 hover:border-primary-400/30 hover:text-primary-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mb-4 flex items-center justify-between text-xs text-stone-500 paint-boost">
          <span>
            {loading
              ? 'Loading menu from Supabase...'
              : `${filtered.length} dishes shown${category !== 'All' ? ` in ${category}` : ''}`}
          </span>
          <span>{dishes.length} total in table</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 paint-boost">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 glass rounded-2xl animate-pulse border border-slate-800 float-y-slow" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 text-amber-900">
            Could not load dishes: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            No dishes match your current filter.
          </div>
        ) : (
          <motion.div layout variants={gridVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5 paint-boost">
            {filtered.map((dish) => (
              <motion.div key={dish.id} layout variants={itemVariants}>
                <DishCard dish={dish} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <ChatInterface />
    </>
  );
}
