'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import DishCard from '@/components/DishCard';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { Dish } from '@/lib/supabase';

const CATEGORIES = ['All', 'High Protein', 'Low Cal', 'Vegetarian', 'Main'];

export default function MenuPage() {
  const [dishes,   setDishes]   = useState<Dish[]>([]);
  const [filtered, setFiltered] = useState<Dish[]>([]);
  const [category, setCategory] = useState('All');
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/dishes')
      .then((r) => r.json())
      .then((d) => { setDishes(d); setFiltered(d); setLoading(false); });
  }, []);

  useEffect(() => {
    let f = dishes;
    if (category !== 'All') f = f.filter((d) => d.category === category);
    if (search) f = f.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(f);
  }, [category, search, dishes]);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4 max-w-7xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-2 font-medium">
            Curated for your goals
          </p>
          <h1
            className="font-display text-4xl sm:text-5xl font-bold gradient-text mb-4"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Our Menu
          </h1>
          <p className="text-slate-400 text-sm">
            Filter by nutrition goals · Ask Priya for AI-powered personalized picks
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
              className="w-full pl-10 pr-4 py-2.5 glass border border-slate-700
                         focus:border-cyan-500/50 rounded-xl text-sm text-white
                         placeholder-slate-500 outline-none transition-all focus:shadow-neon-sm" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-slate-500 flex-shrink-0" />
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                             ${category === c
                               ? 'bg-cyan-500/15 border border-cyan-400/60 text-cyan-400 shadow-neon-sm'
                               : 'glass border border-slate-700 text-slate-300 hover:border-cyan-500/30'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 glass rounded-2xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            No dishes match your current filter.
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((dish) => (
              <motion.div key={dish.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
