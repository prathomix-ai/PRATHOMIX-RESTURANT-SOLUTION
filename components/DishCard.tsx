'use client';
import Image from 'next/image';
import { memo, useMemo, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Flame, Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import type { Dish } from '@/lib/supabase';

interface Props {
  dish: Dish;
  compact?: boolean;
  /** Stagger index: 0-based. Cards delay by index × 0.18 s for row-cascade reveal. */
  index?: number;
}

function DishCard({ dish, compact = false, index = 0 }: Props) {
  const cartItem = useCartStore((s) => s.items.find((i) => i.id === dish.id));
  const qty = cartItem?.qty || 0;
  const addItem = useCartStore((s) => s.addItem);
  const updateQty = useCartStore((s) => s.updateQty);

  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const imageDepth = compact ? 20 : 30;

  const shadow = useMemo(() => {
    const lift = hovered ? 1 : 0.72;
    const x = (-tilt.x * 0.7).toFixed(1);
    const y = (14 + Math.abs(tilt.y) * 0.6).toFixed(1);
    // Luxury dark styling shadow
    return `${x}px ${y}px 32px rgba(0, 0, 0, ${0.75 * lift}), 0 16px 36px rgba(197, 168, 128, ${0.06 * lift}), 0 1px 0 rgba(255, 255, 255, 0.04) inset`;
  }, [hovered, tilt.x, tilt.y]);

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    // Disable 3D tilt calculation on touch devices for fluid 60fps mobile scrolling
    if (event.pointerType === 'touch') return;

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    setTilt({
      x: Math.max(-1, Math.min(1, x)) * 6,
      y: Math.max(-1, Math.min(1, y)) * -5,
    });
  }

  function handleLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.01 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.65,
        delay: Math.min(index * 0.08, 0.4),
        ease: [0.25, 1, 0.5, 1],
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setHovered(true);
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`dish-card-reveal relative isolate transform-gpu paint-boost ${compact ? 'w-44 sm:w-48 flex-shrink-0' : 'w-full h-full'}`}
      data-tour={index === 0 ? 'product-card' : undefined}>

      {/* Golden halo background glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl sm:rounded-3xl opacity-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'radial-gradient(circle at 50% 12%, rgba(197, 168, 128, 0.12), transparent 50%)',
          transform: `translateX(${tilt.x * 0.15}%)`,
        }}
      />

      <div
        className={`glass-dark rounded-2xl sm:rounded-3xl overflow-hidden border border-[#C5A880]/15 hover:border-[#C5A880]/30
                  transition-all duration-300 flex flex-col relative z-10 h-full
                  ${compact ? 'w-44 sm:w-48 flex-shrink-0' : 'w-full'}`}
        style={{
          transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateY(${hovered ? -2 : 0}px)`,
          boxShadow: shadow,
        }}>
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005) 36%, rgba(255,255,255,0.02) 100%)',
            opacity: hovered ? 1 : 0.55,
          }}
        />

        {/* Image — Balanced, responsive height */}
        <div className={`relative overflow-hidden flex-shrink-0 w-full ${compact ? 'h-24' : 'h-32 xs:h-36 sm:h-44 md:h-48'}`}>
          <div
            className="absolute left-1/2 bottom-2 h-4 w-3/4 -translate-x-1/2 rounded-full bg-black/60 blur-xl pointer-events-none"
            style={{
              opacity: hovered ? 0.45 : 0.25,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              transform: `translateZ(${imageDepth}px) scale(${hovered ? 1.03 : 1})`,
              transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1)',
            }}>
            <Image
              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}
              alt={dish.name}
              fill
              className="object-cover"
              sizes={compact ? '192px' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end pointer-events-none">
            {dish.protein >= 30 && (
              <span className="text-[8px] bg-[#C5A880] text-[#0A0A0A] font-bold px-2 py-0.5 rounded-full leading-tight tracking-wider uppercase shadow-md">
                High Protein
              </span>
            )}
            {dish.calories < 300 && (
              <span className="text-[8px] bg-[#8C7355]/95 text-[#EAE6DF] font-bold px-2 py-0.5 rounded-full leading-tight tracking-wider uppercase shadow-md">
                Low Cal
              </span>
            )}
          </div>
        </div>

        {/* Content — Compact padding, perfectly balanced & fluid */}
        <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-2.5 flex-1 min-w-0">
          <h3
            className={`font-display text-white group-hover:text-[#C5A880] transition-colors duration-300 leading-snug line-clamp-2 break-words ${compact ? 'text-xs' : 'text-sm sm:text-base md:text-lg font-medium'}`}
            style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
            {dish.name}
          </h3>

          {!compact && dish.description && (
            <p className="text-[11px] sm:text-xs text-[#EAE6DF]/60 line-clamp-2 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {dish.description}
            </p>
          )}

          {/* Macro row */}
          <div className={`flex items-center gap-3 text-[11px] sm:text-xs text-[#EAE6DF]/50 mt-0.5 ${compact ? 'gap-2 text-[10px]' : ''}`}>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#C5A880] flex-shrink-0" />
              <span>{dish.calories} cal</span>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#8C7355] flex-shrink-0" />
              <span>{dish.protein}g prot</span>
            </span>
          </div>

          {/* Price + Quantity Controls CTA with flex-wrap fallback */}
          <div className="flex items-center justify-between mt-auto pt-2.5 sm:pt-3 border-t border-[#C5A880]/15 gap-2 flex-wrap sm:flex-nowrap">
            <span className={`text-[#C5A880] font-bold ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
              ₹{dish.price}
            </span>

            {qty === 0 ? (
              <button
                type="button"
                data-tour={index === 0 ? "add-to-cart" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  addItem(dish);
                }}
                aria-label={`Add ${dish.name} to cart`}
                className={`flex items-center justify-center gap-1.5 bg-transparent border border-[#C5A880]/35 hover:border-[#C5A880]
                           hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A]
                           font-semibold rounded-full shadow-md
                           transition-all duration-200 active:scale-95 lift-3d
                           ${compact ? 'text-[9px] px-2.5 py-1.5 min-h-[32px]' : 'text-[10px] sm:text-[11px] uppercase tracking-wider px-3 sm:px-3.5 py-2 sm:py-2.5 min-h-[40px] sm:min-h-[44px]'}`}
              >
                <ShoppingCart className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                <span>{compact ? 'Add' : 'Add to Cart'}</span>
              </button>
            ) : (
              <div
                data-tour={index === 0 ? "cart-stepper" : undefined}
                className="inline-flex items-center bg-[#121212]/95 border border-[#C5A880]/50 rounded-full p-0.5 shadow-md min-h-[38px] sm:min-h-[44px]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQty(dish.id, qty - 1);
                  }}
                  aria-label={`Decrease quantity of ${dish.name}`}
                  className={`rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90 ${
                    compact ? 'w-6 h-6' : 'w-7 sm:w-8 h-7 sm:h-8'
                  }`}
                >
                  <Minus className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                </button>
                <span className={`text-center font-bold text-[#EAE6DF] select-none ${
                  compact ? 'w-5 text-[11px]' : 'w-6 sm:w-7 text-xs sm:text-sm'
                }`}>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQty(dish.id, qty + 1);
                  }}
                  aria-label={`Increase quantity of ${dish.name}`}
                  className={`rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90 ${
                    compact ? 'w-6 h-6' : 'w-7 sm:w-8 h-7 sm:h-8'
                  }`}
                >
                  <Plus className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(DishCard);
