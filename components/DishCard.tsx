'use client';
import Image from 'next/image';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const imgHeight = compact ? 108 : 180;
  const imageDepth = compact ? 26 : 34;

  const shadow = useMemo(() => {
    const lift = hovered ? 1 : 0.72;
    const x = (-tilt.x * 0.55).toFixed(1);
    const y = (16 + Math.abs(tilt.y) * 0.5).toFixed(1);
    return `${x}px ${y}px 34px rgba(44, 44, 44, ${0.12 * lift}), 0 18px 34px rgba(139, 90, 43, ${0.10 * lift}), 0 1px 0 rgba(255, 255, 255, 0.75) inset`;
  }, [hovered, tilt.x, tilt.y]);

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    setTilt({
      x: Math.max(-1, Math.min(1, x)) * 10,
      y: Math.max(-1, Math.min(1, y)) * -8,
    });
  }

  function handleLeave() {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  }

  return (
    <motion.div
      ref={cardRef}
      animate={hovered ? { y: -8 } : { y: [0, -3, 0] }}
      transition={hovered
        ? { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
        : { duration: 6.8, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
      onPointerEnter={() => setHovered(true)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative isolate ${compact ? 'w-48 flex-shrink-0' : 'w-full'}`}>

      <div
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'radial-gradient(circle at 50% 12%, rgba(255,255,255,0.42), transparent 38%)',
          transform: `translateX(${tilt.x * 0.2}%)`,
        }}
      />

      <div
        className="absolute -inset-6 pointer-events-none rounded-[2rem] opacity-0 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(217,119,6,0.12), transparent 64%)',
          filter: 'blur(18px)',
        }}
      />

      <div
        className={`glass rounded-2xl overflow-hidden border border-warm-200 hover:border-primary-400/30
                  transition-all duration-300 flex flex-col relative z-10
                  ${compact ? 'w-48 flex-shrink-0' : 'w-full'}`}>
        {/* Image */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: imgHeight }}>
          <div
            className="absolute inset-0"
            style={{
              transform: `translateZ(${imageDepth}px) translateY(${hovered ? '-3px' : '0px'}) scale(${hovered ? 1.03 : 1})`,
              transition: 'transform 180ms ease-out, box-shadow 180ms ease-out',
              boxShadow: hovered ? '0 24px 40px rgba(44, 44, 44, 0.22)' : '0 14px 28px rgba(44, 44, 44, 0.14)',
            }}>
            <Image
              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
              alt={dish.name}
              fill
              className="object-cover"
              sizes={compact ? '208px' : '(max-width: 768px) 100vw, 33vw'}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/42 via-stone-950/10 to-transparent" />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen"
            style={{
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.60) 45%, transparent 60%)',
              transform: `translateX(${hovered ? tilt.x * 8 : -120}%) rotate(8deg)`,
              opacity: hovered ? 0.82 : 0,
              transition: hovered ? 'transform 150ms linear, opacity 180ms ease-out' : 'opacity 180ms ease-out',
            }}
          />

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end" style={{ transform: `translateZ(${imageDepth + 10}px)` }}>
            {dish.protein >= 30 && (
              <span className="text-[9px] bg-accent-gold/95 text-white font-bold px-1.5 py-0.5 rounded-full leading-tight shadow-warm">
                High Protein
              </span>
            )}
            {dish.calories < 300 && (
              <span className="text-[9px] bg-accent-green/95 text-white font-bold px-1.5 py-0.5 rounded-full leading-tight shadow-warm">
                Low Cal
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1" style={{ transform: 'translateZ(16px)' }}>
          <h3
            className={`font-display font-semibold text-primary-900 leading-snug line-clamp-2 ${compact ? 'text-[11px]' : 'text-sm'}`}
            style={{ fontFamily: 'Cinzel, serif' }}>
            {dish.name}
          </h3>

          {!compact && (
            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">{dish.description}</p>
          )}

          {/* Macro row */}
          <div className={`flex items-center gap-3 text-xs text-stone-600 ${compact ? 'gap-2 text-[10px]' : ''}`}>
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
            <span className={`text-primary-700 font-bold ${compact ? 'text-xs' : 'text-sm'}`}>₹{dish.price}</span>
            <button
              onClick={() => addItem(dish)}
              className={`flex items-center gap-1 bg-white/60 backdrop-blur-xl hover:bg-white/75
                         border border-white/45 hover:border-primary-400/50 text-primary-700
                         font-semibold rounded-lg shadow-[0_10px_22px_rgba(44,44,44,0.08)]
                         transition-all duration-200 hover:shadow-[0_16px_30px_rgba(44,44,44,0.12)] active:scale-95`}
            >
              <ShoppingCart className="w-3 h-3" />
              <span className={compact ? 'text-[10px] px-2 py-1' : 'text-xs px-2.5 py-1.5'}>
                {compact ? 'Add' : 'Add to Cart'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
