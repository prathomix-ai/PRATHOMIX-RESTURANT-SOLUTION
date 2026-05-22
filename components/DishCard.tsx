'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Flame } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import type { Dish } from '@/lib/supabase';

interface Props {
  dish: Dish;
  compact?: boolean;
}

export default function DishCard({ dish, compact = false }: Props) {
  const addItem = useCartStore((s) => s.addItem);

  const imgHeight = compact ? 110 : 180;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={`glass rounded-2xl overflow-hidden border border-warm-200 hover:border-primary-400/30
                  hover:shadow-warm-md transition-all duration-300 flex flex-col
                  ${compact ? 'w-52 flex-shrink-0' : 'w-full'}`}>

      {/* Image */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ height: imgHeight }}>
        <Image
          src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
          alt={dish.name}
          fill
          className="object-cover"
          sizes={compact ? '208px' : '(max-width: 768px) 100vw, 33vw'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {dish.protein >= 30 && (
            <span className="text-[9px] bg-accent-gold text-white font-bold px-1.5 py-0.5 rounded-full leading-tight">
              High Protein
            </span>
          )}
          {dish.calories < 300 && (
            <span className="text-[9px] bg-accent-green text-white font-bold px-1.5 py-0.5 rounded-full leading-tight">
              Low Cal
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3
          className="font-display text-sm font-semibold text-primary-900 leading-snug line-clamp-2"
          style={{ fontFamily: 'Cinzel, serif' }}>
          {dish.name}
        </h3>

        {!compact && (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{dish.description}</p>
        )}

        {/* Macro row */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-primary-600" />
            {dish.calories} cal
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-accent-gold" />
            {dish.protein}g protein
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-primary-600 font-bold text-sm">₹{dish.price}</span>
          <button
            onClick={() => addItem(dish)}
            className="flex items-center gap-1 bg-primary-600/10 hover:bg-primary-600/20
                       border border-primary-600/25 hover:border-primary-400/60 text-primary-600
                       text-xs font-semibold px-2.5 py-1.5 rounded-lg
                       transition-all duration-200 hover:shadow-warm active:scale-95">
            <ShoppingCart className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
