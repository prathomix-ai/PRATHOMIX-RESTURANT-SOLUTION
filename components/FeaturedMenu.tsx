import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DishCard from './DishCard';
import type { Dish } from '@/lib/supabase';

async function getFeatured(): Promise<Dish[]> {
  const { data } = await supabase
    .from('dishes')
    .select('*')
    .eq('available', true)
    .limit(6);
  return (data as Dish[]) || [];
}

export default async function FeaturedMenu() {
  const dishes = await getFeatured();

  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs text-cyan-400 uppercase tracking-widest mb-2 font-medium">
            Chef&apos;s Selection
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl font-bold gradient-text"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Featured Dishes
          </h2>
        </div>
        <Link
          href="/menu"
          className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300
                     transition-colors duration-200 group">
          Full Menu
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {dishes.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl border border-slate-800">
          <p className="text-slate-400 mb-2">No dishes found.</p>
          <p className="text-xs text-slate-600">
            Run <code className="text-cyan-500/70">supabase/schema.sql</code> in your Supabase SQL Editor to seed sample data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
    </section>
  );
}
