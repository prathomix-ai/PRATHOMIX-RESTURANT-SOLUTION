import { RESTAURANT_SEED_DISHES, RESTAURANT_TABLES, supabase } from '@/lib/supabase';
import { ensureRestaurantDishesSeeded } from '@/lib/restaurantSeed';
import DishCard from './DishCard';
import FeaturedMenuHeader from './FeaturedMenuHeader';
import type { Dish } from '@/lib/supabase';

async function getFeatured(): Promise<Dish[]> {
  try {
    await ensureRestaurantDishesSeeded();

    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.dishes)
      .select('*')
      .eq('available', true)
      .limit(6);

    if (error) {
      console.error('[FeaturedMenu] Failed to load featured dishes:', error);
      return RESTAURANT_SEED_DISHES.slice(0, 6);
    }

    return (data && data.length > 0 ? (data as Dish[]) : RESTAURANT_SEED_DISHES.slice(0, 6)) || [];
  } catch (error) {
    console.error('[FeaturedMenu] Unexpected featured menu failure:', error);
    return RESTAURANT_SEED_DISHES.slice(0, 6);
  }
}

export default async function FeaturedMenu() {
  const dishes = await getFeatured();

  // Helper to generate asymmetrical spacing for an high-end editorial grid
  const getAsymmetricClass = (index: number) => {
    switch (index) {
      case 1: return 'lg:mt-16'; // Column 2 shifted down
      case 4: return 'lg:mt-16';
      case 2: return 'lg:-mt-8'; // Column 3 shifted up slightly
      case 5: return 'lg:-mt-8';
      default: return '';
    }
  };

  return (
    <section className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A0A0A] to-[#121212] paint-boost overflow-hidden">
      <div className="glass-dark max-w-7xl mx-auto rounded-[3rem] border border-[#C5A880]/10 p-8 sm:p-12 lg:p-16 shadow-warm-lg">
        {/* Animated header */}
        <FeaturedMenuHeader />

        {dishes.length === 0 ? (
          <div className="text-center py-24 glass-dark rounded-2xl border border-[#C5A880]/10">
            <p className="text-stone-400 mb-2">No signature dishes found.</p>
            <p className="text-xs text-stone-500">
              Please check connection or seed standard data.
            </p>
          </div>
        ) : (
          /*
           * Asymmetrical Layout:
           * Uses different top margins on columns to break standard grid boxiness,
           * matching high-end editorial style.
           */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 lg:gap-y-20">
            {dishes.map((dish, index) => (
              <div 
                key={dish.id} 
                className={`flex flex-col h-full transition-all duration-300 ${getAsymmetricClass(index)}`}
              >
                <DishCard dish={dish} index={index} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
