'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Plus, Sparkles, Check } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { getCustomerRecommendations } from '@/lib/recommendations';
import { RESTAURANT_SEED_DISHES, type Dish } from '@/lib/supabase';

interface Props {
  allDishes?: Dish[];
  compact?: boolean;
}

export default function CompleteYourMeal({ allDishes, compact = false }: Props) {
  const { items, addItem } = useCartStore();
  const pool = allDishes && allDishes.length > 0 ? allDishes : RESTAURANT_SEED_DISHES;

  const recommendations = useMemo(() => {
    if (items.length === 0) return [];
    return getCustomerRecommendations(items, pool, [], 3);
  }, [items, pool]);

  if (items.length === 0 || recommendations.length === 0) return null;

  return (
    <div className="pt-2 pb-1">
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A880]">
          Complete Your Meal
        </span>
      </div>

      <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-3 gap-2.5'}`}>
        {recommendations.map(({ dish, reason }) => (
          <div
            key={dish.id}
            className="glass-dark border border-[#C5A880]/15 hover:border-[#C5A880]/35 rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all bg-[#121212]/90">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-[#C5A880]/20 bg-[#161616]">
                <Image
                  src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'}
                  alt={dish.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#EAE6DF] truncate">{dish.name}</p>
                <p className="text-[10px] text-[#C5A880]/70 truncate">{reason}</p>
                <p className="text-xs font-bold text-[#C5A880]">₹{dish.price}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => addItem(dish)}
              aria-label={`Add ${dish.name} to cart`}
              className="w-7 h-7 rounded-lg bg-[#C5A880]/15 hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A] border border-[#C5A880]/30 flex items-center justify-center transition-colors flex-shrink-0 active:scale-90">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
