'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';

const MotionLink = motion.create(Link);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.95,
      ease: [0.25, 1, 0.5, 1], // Premium ease-out-quart
    },
  },
};

export default function HeroSection() {
  return (
    <section
      className="relative h-screen min-h-[600px] w-full flex items-center justify-center overflow-hidden bg-[#0A0A0A]"
      aria-label="Hero — Prathomix Fine Dining"
    >
      {/* ── Immersive Ken Burns background ── */}
      <div
        aria-hidden
        className="kenburns-bg absolute inset-0 z-0"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=2000&q=90)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'transform',
        }}
      />

      {/* ── Rich dark overlay for moodiness and typography contrast ── */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1]"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(10, 10, 10, 0.45) 0%,
              rgba(10, 10, 10, 0.65) 50%,
              rgba(10, 10, 10, 0.95) 100%
            )
          `,
        }}
      />

      {/* ── Subtle radial gold glow to represent ultra-luxury tier ── */}
      <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div className="hero-orb-1 absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" />
      </div>

      {/* ── Typography & CTA ── */}
      <motion.div
        className="relative z-[3] text-center max-w-5xl mx-auto px-6 flex flex-col items-center justify-center h-full"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Luxury tier indicator */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3 mb-6">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.35em] text-[#C5A880]">
            An Exclusive Culinary Sanctuary
          </span>
        </motion.div>

        {/* Large Elegant Serif Title */}
        <motion.h1
          variants={itemVariants}
          className="font-display text-5xl sm:text-7xl lg:text-[7.5rem] font-medium leading-[1.05] tracking-widest text-white mb-6 uppercase"
          style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}
        >
          Prathomix
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-stone-300 font-sans text-sm sm:text-base md:text-lg max-w-xl mx-auto mb-12 leading-relaxed tracking-wider uppercase"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          A symphony of gastronomy, bespoke artistry, and pure exclusivity in Jaipur.
        </motion.p>

        {/* Single Sleek Gold View Menu Button */}
        <motion.div variants={itemVariants}>
          <MotionLink
            href="/menu"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="group flex items-center justify-center gap-3.5 bg-transparent border border-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A] hover:bg-[#C5A880] font-bold px-10 py-5 rounded-full text-xs uppercase tracking-[0.25em] transition-all duration-500 shadow-lg"
          >
            Explore the Menu 
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </MotionLink>
        </motion.div>
      </motion.div>

      {/* ── Scroll cue bounce ── */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[3]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1.8, duration: 1 }}
        aria-hidden
      >
        <div className="scroll-cue-arrow" />
      </motion.div>
    </section>
  );
}
