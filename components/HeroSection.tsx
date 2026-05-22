'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

const stats = [
  { value: '4.9★',  label: 'Rating'       },
  { value: '< 2min', label: 'AI Response'  },
  { value: '10+',   label: 'Macro Dishes'  },
  { value: '100%',  label: 'Fresh Daily'   },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden px-4 py-20">
      {/* Elegant ambient gradient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] rounded-full bg-primary-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2
                        w-[500px] h-[500px] rounded-full bg-accent-gold/4 blur-3xl" />
      </div>

      <div className="relative text-center max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1,  y: 0   }}
          transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 glass border border-primary-400/20
                          rounded-full px-4 py-1.5 mb-8 shadow-warm">
            <Zap className="w-3.5 h-3.5 text-primary-600" />
            <span className="text-xs text-primary-700 font-medium uppercase tracking-wider">
              Premium Fine Dining · Jaipur
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{ fontFamily: 'Cinzel, serif' }}>
          <span className="gradient-text">Elegant Dining.</span>
          <br />
          <span className="text-gray-900">Culinary Excellence.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Experience curated menus crafted with precision, order seamlessly, split bills with ease,
          and let our AI sommelier guide your culinary journey — refined dining elevated.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/menu"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold
                       px-8 py-3.5 rounded-xl transition-all duration-200 shadow-warm-lg
                       hover:shadow-warm-lg hover:scale-[1.03] active:scale-100 text-sm uppercase tracking-wide w-full sm:w-auto justify-center">
            Explore Menu <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/reservation"
            className="flex items-center gap-2 glass border border-warm-200 hover:border-primary-400/30
                       text-gray-700 hover:text-primary-600 font-medium px-8 py-3.5 rounded-xl
                       transition-all duration-200 hover:shadow-warm text-sm w-full sm:w-auto justify-center">
            Reserve a Table
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-20">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary-600">{s.value}</p>
              <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
