import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from '@/lib/supabase';
import { ensureRestaurantDishesSeeded } from '@/lib/restaurantSeed';
import DishCard from './DishCard';
import type { Dish } from '@/lib/supabase';

async function getFeatured(): Promise<Dish[]> {
  await ensureRestaurantDishesSeeded();

  const { data } = await supabase
    .from(RESTAURANT_TABLES.dishes)
    .select('*')
    .eq('available', true)
    .limit(6);
  return (data && data.length > 0 ? (data as Dish[]) : RESTAURANT_SEED_DISHES.slice(0, 6)) || [];
}

export default async function FeaturedMenu() {
  const dishes = await getFeatured();

  return (
    <section className="py-20 px-4 paint-boost">
      <div className="float-surface max-w-7xl mx-auto rounded-[2.5rem] p-6 sm:p-8 lg:p-10">
      <div className="flex items-end justify-between mb-10">
        <div>
          <p className="text-xs text-primary-600 uppercase tracking-widest mb-2 font-medium">
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
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700
                     transition-colors duration-200 group">
          Full Menu
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {dishes.length === 0 ? (
        <div className="text-center py-24 glass rounded-2xl border border-warm-200">
          <p className="text-gray-600 mb-2">No dishes found.</p>
          <p className="text-xs text-gray-500">
            Run <code className="text-primary-600">supabase/schema.sql</code> in your Supabase SQL Editor to seed sample data.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
