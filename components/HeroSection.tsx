'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';

const MotionLink = motion.create(Link);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96, rotateX: 8 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

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
                        w-[600px] h-[600px] rounded-full bg-primary-400/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2
                        w-[500px] h-[500px] rounded-full bg-accent-gold/6 blur-3xl" />
      </div>

      <motion.div
        className="relative text-center max-w-4xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="show">
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <div className="inline-flex items-center gap-2 glass border border-primary-400/20
                          rounded-full px-4 py-1.5 mb-8 shadow-warm float-y">
            <Zap className="w-3.5 h-3.5 text-primary-600" />
            <span className="text-xs text-stone-700 font-medium uppercase tracking-wider">
              Premium Fine Dining · Jaipur
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{ fontFamily: 'Cinzel, serif' }}>
          <span className="gradient-text">Elegant Dining.</span>
          <br />
          <span className="text-stone-900">Culinary Excellence.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          variants={itemVariants}
          className="text-stone-600 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Experience curated menus crafted with precision, order seamlessly, split bills with ease,
          and let our AI sommelier guide your culinary journey — refined dining elevated.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <MotionLink
            href="/menu"
            whileHover={{ scale: 1.06, y: -6 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="lift-3d shine-sweep float-y flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-bold
                       px-8 py-3.5 rounded-xl shadow-warm-lg text-sm uppercase tracking-wide w-full sm:w-auto justify-center">
            Explore Menu <ArrowRight className="w-4 h-4" />
          </MotionLink>
          <MotionLink
            href="/reservation"
            whileHover={{ scale: 1.06, y: -6 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="lift-3d shine-sweep float-y-delayed flex items-center gap-2 glass border border-warm-200 hover:border-primary-400/30
                       text-stone-700 hover:text-primary-700 font-medium px-8 py-3.5 rounded-xl
                       shadow-warm text-sm w-full sm:w-auto justify-center">
            Reserve a Table
          </MotionLink>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-20">
          {stats.map((s) => (
            <motion.div key={s.label} variants={itemVariants} className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-primary-600">{s.value}</p>
              <p className="text-xs text-stone-600 mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
