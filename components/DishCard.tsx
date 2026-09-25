'use client';
import Image from 'next/image';
import { memo, useMemo, useRef, useState, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Flame } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import type { Dish } from '@/lib/supabase';

interface Props {
  dish: Dish;
  compact?: boolean;
  /** Stagger index: 0-based. Cards delay by index × 0.18 s for row-cascade reveal. */
  index?: number;
}

function DishCard({ dish, compact = false, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const imgHeight = compact ? 108 : 220;
  const imageDepth = compact ? 26 : 38;

  const shadow = useMemo(() => {
    const lift = hovered ? 1 : 0.72;
    const x = (-tilt.x * 0.7).toFixed(1);
    const y = (18 + Math.abs(tilt.y) * 0.75).toFixed(1);
    // Luxury dark styling shadow
    return `${x}px ${y}px 40px rgba(0, 0, 0, ${0.75 * lift}), 0 24px 44px rgba(197, 168, 128, ${0.06 * lift}), 0 1px 0 rgba(255, 255, 255, 0.04) inset`;
  }, [hovered, tilt.x, tilt.y]);

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    setTilt({
      x: Math.max(-1, Math.min(1, x)) * 8, // Refined tilt angle for high-end feel
      y: Math.max(-1, Math.min(1, y)) * -7,
    });
  }

  function handleLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, scale: 0.96, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      whileHover={{ y: -8, scale: 1.01 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: 0.85,
        delay: index * 0.18,
        ease: [0.25, 1, 0.5, 1], // ease-out-quart
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`dish-card-reveal relative isolate transform-gpu paint-boost ${compact ? 'w-48 flex-shrink-0' : 'w-full'}`}>

      {/* Golden halo background glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl opacity-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'radial-gradient(circle at 50% 12%, rgba(197, 168, 128, 0.12), transparent 45%)',
          transform: `translateX(${tilt.x * 0.15}%)`,
        }}
      />

      <div
        className="absolute -inset-6 pointer-events-none rounded-[2rem] opacity-0 transition-opacity duration-500"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(197, 168, 128, 0.05), transparent 60%)',
          filter: 'blur(24px)',
        }}
      />

      <div
        className={`glass-dark rounded-[2rem] overflow-hidden border border-[#C5A880]/10 hover:border-[#C5A880]/25
                  transition-all duration-500 flex flex-col relative z-10
                  ${compact ? 'w-48 flex-shrink-0' : 'w-full'}`}
        style={{
          transform: `perspective(1400px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateY(${hovered ? -3 : 0}px) scale(${hovered ? 1.015 : 1})`,
          boxShadow: shadow,
        }}>
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005) 36%, rgba(255,255,255,0.02) 100%)',
            opacity: hovered ? 1 : 0.55,
          }}
        />

        {/* Image */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: imgHeight }}>
          <div
            className="absolute left-1/2 bottom-2 h-5 w-3/4 -translate-x-1/2 rounded-full bg-black/50 blur-2xl pointer-events-none"
            style={{
              opacity: hovered ? 0.45 : 0.3,
              transform: `translateX(${tilt.x * 0.7}px) translateY(${hovered ? 6 : 9}px) scale(${hovered ? 1.05 : 1})`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              transform: `translateZ(${imageDepth}px) translateY(${hovered ? '-3px' : '0px'}) scale(${hovered ? 1.03 : 1.005})`,
              transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms cubic-bezier(0.25, 1, 0.5, 1)',
              boxShadow: hovered ? '0 28px 48px rgba(0, 0, 0, 0.6)' : '0 18px 32px rgba(0, 0, 0, 0.4)',
            }}>
            <Image
              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
              alt={dish.name}
              fill
              className="object-cover"
              sizes={compact ? '208px' : '(max-width: 768px) 100vw, 33vw'}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 45%, transparent 60%)',
              transform: `translateX(${hovered ? tilt.x * 5 : -120}%) rotate(8deg)`,
              opacity: hovered ? 0.6 : 0,
              transition: hovered ? 'transform 200ms linear, opacity 200ms ease-out' : 'opacity 200ms ease-out',
            }}
          />

          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end" style={{ transform: `translateZ(${imageDepth + 8}px)` }}>
            {dish.protein >= 30 && (
              <span className="text-[8px] bg-[#C5A880] text-[#0A0A0A] font-bold px-2 py-0.5 rounded-full leading-tight tracking-wider uppercase shadow-md">
                High Protein
              </span>
            )}
            {dish.calories < 300 && (
              <span className="text-[8px] bg-[#8C7355]/90 text-[#EAE6DF] font-bold px-2 py-0.5 rounded-full leading-tight tracking-wider uppercase shadow-md">
                Low Cal
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-3 flex-1" style={{ transform: 'translateZ(12px)' }}>
          <h3
            className={`font-display text-white group-hover:text-[#C5A880] transition-colors duration-300 leading-snug line-clamp-2 ${compact ? 'text-xs' : 'text-lg font-medium'}`}
            style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
            {dish.name}
          </h3>

          {!compact && (
            <p className="text-xs text-[#EAE6DF]/60 line-clamp-3 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {dish.description}
            </p>
          )}

          {/* Macro row */}
          <div className={`flex items-center gap-4 text-xs text-[#EAE6DF]/45 mt-2 ${compact ? 'gap-2 text-[10px]' : ''}`}>
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#C5A880]" />
              {dish.calories} cal
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#8C7355]" />
              {dish.protein}g protein
            </span>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#C5A880]/10">
            <span className={`text-[#C5A880] font-bold ${compact ? 'text-xs' : 'text-base'}`}>₹{dish.price}</span>
            <button
              onClick={() => addItem(dish)}
              className={`flex items-center gap-1.5 bg-transparent border border-[#C5A880]/30 hover:border-[#C5A880]
                         hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A]
                         font-semibold rounded-full shadow-md
                         transition-all duration-300 active:scale-95 lift-3d`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className={compact ? 'text-[9px] px-2 py-1.5' : 'text-[11px] uppercase tracking-wider px-3.5 py-2'}>
                {compact ? 'Add' : 'Add to Cart'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(DishCard, (prev, next) => prev.dish.id === next.dish.id && prev.compact === next.compact);
