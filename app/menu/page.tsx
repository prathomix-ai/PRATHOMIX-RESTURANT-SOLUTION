'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import DishCard from '@/components/DishCard';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Dish } from '@/lib/supabase';

const CATEGORIES = ['All', 'High Protein', 'Low Cal', 'Vegetarian', 'Main'];

const normalize = (value: string) => value.trim().toLowerCase();

export default function MenuPage() {
  const [dishes,   setDishes]   = useState<Dish[]>([]);
  const [filtered, setFiltered] = useState<Dish[]>([]);
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

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
    hidden: { opacity: 0, y: 28, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.55,
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
        setFiltered(dishList);
      } catch (err: unknown) {
        if (!mounted) return;
        setDishes([]);
        setFiltered([]);
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

  useEffect(() => {
    let f = normalize(category) === 'all'
      ? [...dishes]
      : dishes.filter((d) => normalize(d.category) === normalize(category));

    if (search) {
      const query = normalize(search);
      f = f.filter((d) =>
        [d.name, d.description, d.category]
          .filter(Boolean)
          .some((field) => normalize(String(field)).includes(query))
      );
    }

    setFiltered(f);
  }, [category, search, dishes]);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4 max-w-[96rem] mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
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
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                             ${category === c
                               ? 'bg-primary-600/10 border border-primary-400/40 text-primary-700 shadow-warm'
                               : 'glass border border-warm-200 text-stone-600 hover:border-primary-400/30 hover:text-primary-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-stone-500">
          <span>
            {loading
              ? 'Loading menu from Supabase...'
              : `${filtered.length} dishes shown${category !== 'All' ? ` in ${category}` : ''}`}
          </span>
          <span>{dishes.length} total in table</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 glass rounded-2xl animate-pulse border border-slate-800" />
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
          <motion.div layout variants={gridVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-5">
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
