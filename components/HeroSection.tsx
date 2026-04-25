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
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[700px] h-[700px] rounded-full bg-cyan-500/4 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[350px] h-[350px] rounded-full bg-cyan-500/6 blur-2xl" />
      </div>

      <div className="relative text-center max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1,  y: 0   }}
          transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 glass border border-cyan-500/20
                          rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-cyan-300 font-medium uppercase tracking-wider">
              AI-Powered Fine Dining · Jaipur
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
          <span className="gradient-text">Dine Smart.</span>
          <br />
          <span className="text-white">Eat Better.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Voice-order your macros, split bills with UPI QR codes, and let our AI chef guide
          every bite — welcome to the next generation of dining.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/menu"
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                       px-8 py-3.5 rounded-xl transition-all duration-200 shadow-neon-cyan
                       hover:scale-[1.03] active:scale-100 text-sm uppercase tracking-wide w-full sm:w-auto justify-center">
            Explore Menu <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/booking"
            className="flex items-center gap-2 glass border border-slate-700 hover:border-cyan-500/40
                       text-slate-300 hover:text-white font-medium px-8 py-3.5 rounded-xl
                       transition-all duration-200 hover:shadow-neon-sm text-sm w-full sm:w-auto justify-center">
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
              <p className="text-xl sm:text-2xl font-bold neon-text">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
