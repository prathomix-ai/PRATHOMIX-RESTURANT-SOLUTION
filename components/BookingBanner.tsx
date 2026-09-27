'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Star } from 'lucide-react';
import ParallaxSection from './ParallaxSection';

const MotionLink = motion.create(Link);

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: [0.25, 1, 0.5, 1], // ease-out-quart
    },
  },
};

export default function BookingBanner() {
  return (
    /*
     * ParallaxSection: background image shifting at 0.15 speed for 3D depth,
     * with a very dark overlay to ensure maximum text readability.
     */
    <ParallaxSection
      bgImageUrl="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80"
      speed={0.15}
      overlay="linear-gradient(135deg, rgba(10, 10, 10, 0.9) 0%, rgba(20, 20, 20, 0.8) 50%, rgba(10, 10, 10, 0.95) 100%)"
      className="py-16 sm:py-24 lg:py-32 px-3 sm:px-6 lg:px-8"
    >
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={containerVariants}
        className="max-w-4xl mx-auto text-center relative"
      >
        {/* Subtle background radial glow */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(197, 168, 128, 0.15) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        {/* Inner glass card with fine gold borders */}
        <div className="glass-dark rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-16 relative overflow-hidden border border-[#C5A880]/15 shadow-warm-xl">
          {/* Subtle reflection overlay */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-[2.5rem]"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 40%, rgba(255,255,255,0.02) 100%)',
            }}
          />

          {/* Star row */}
          <motion.div variants={itemVariants} className="flex justify-center gap-1.5 mb-5 sm:mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#C5A880] fill-[#C5A880]" />
            ))}
          </motion.div>

          {/* Calendar icon */}
          <motion.div variants={itemVariants} className="inline-flex mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center">
              <Calendar className="w-5 sm:w-6 h-5 sm:h-6 text-[#C5A880]" />
            </div>
          </motion.div>

          <motion.h2
            variants={itemVariants}
            className="font-display text-2xl sm:text-4xl lg:text-5xl font-medium tracking-wide mb-3 sm:mb-5 text-white"
            style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}
          >
            Securing Your Table
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-stone-300 font-sans text-xs sm:text-base mb-8 sm:mb-10 max-w-md mx-auto leading-relaxed px-2"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            Experience extraordinary gastronomy. Book instantly online, receive prompt SMS confirmation, and step into our curated sanctuary.
          </motion.p>

          <motion.div variants={itemVariants} className="max-w-full">
            <MotionLink
              href="/reservation"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
              className="inline-flex items-center justify-center gap-2 sm:gap-2.5 font-bold px-6 sm:px-10 py-3.5 sm:py-5 rounded-full text-[11px] sm:text-xs
                         uppercase tracking-[0.18em] sm:tracking-[0.25em] hero-btn-primary shine-sweep max-w-full text-center"
            >
              <span>Request Reservation</span>
              <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </MotionLink>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="text-[11px] sm:text-xs text-stone-500 mt-5 sm:mt-6 tracking-wider sm:tracking-widest uppercase font-semibold"
          >
            Mi Road, Jaipur · Open Daily 12:00 PM – 11:00 PM
          </motion.p>
        </div>
      </motion.div>
    </ParallaxSection>
  );
}
