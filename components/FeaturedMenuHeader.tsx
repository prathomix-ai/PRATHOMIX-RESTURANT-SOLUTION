'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const sectionVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
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

export default function FeaturedMenuHeader() {
  return (
    <motion.div
      className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16"
      variants={sectionVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-2xl">
        <motion.p
          variants={itemVariants}
          className="text-xs text-[#C5A880] uppercase tracking-[0.25em] mb-3 font-semibold"
        >
          Chef&apos;s Selection
        </motion.p>
        <motion.h2
          variants={itemVariants}
          className="font-display text-4xl sm:text-5xl font-medium tracking-wide text-white mb-4"
          style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}
        >
          Signature Offerings
        </motion.h2>
        <motion.p
          variants={itemVariants}
          className="text-[#EAE6DF]/65 text-sm sm:text-base leading-relaxed"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Indulge in a curated anthology of dishes designed for the absolute epicurean. Each plate marries refined textures with complex flavors.
        </motion.p>
      </div>

      <motion.div variants={itemVariants} className="self-start md:self-end">
        <Link
          href="/menu"
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#C5A880] hover:text-[#FAF9F6]
                     transition-colors duration-300 group border-b border-[#C5A880]/30 pb-1.5"
        >
          View Full Menu
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
        </Link>
      </motion.div>
    </motion.div>
  );
}
