'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight } from 'lucide-react';

const MotionLink = motion.create(Link);

const itemVariants = {
  hidden: { opacity: 0, y: 26, scale: 0.96, rotateX: 8 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function BookingBanner() {
  return (
    <section className="py-16 px-4 paint-boost">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.35 }}
        className="max-w-4xl mx-auto glass border border-warm-200 rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden shadow-warm-lg">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/5 via-transparent to-transparent pointer-events-none" />

        <motion.div variants={itemVariants} className="inline-flex">
          <Calendar className="w-10 h-10 text-primary-600 mx-auto mb-5 float-y" />
        </motion.div>

        <motion.h2
          variants={itemVariants}
          className="font-display text-3xl sm:text-4xl font-bold gradient-text mb-4"
          style={{ fontFamily: 'Cinzel, serif' }}>
          Reserve Your Table
        </motion.h2>

        <motion.p variants={itemVariants} className="text-stone-600 mb-8 max-w-md mx-auto leading-relaxed">
           Book instantly online, receive a WhatsApp confirmation, and let Mix handle the rest.
          No waiting, no calls.
        </motion.p>

        <MotionLink
          href="/reservation"
          variants={itemVariants}
          whileHover={{ scale: 1.07, y: -6 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="lift-3d shine-sweep float-y-delayed inline-flex items-center gap-2 bg-primary-700 hover:bg-primary-800 text-white font-bold
                     px-8 py-3.5 rounded-xl shadow-warm-lg text-sm">
          Book Now — It&apos;s Free
          <ArrowRight className="w-4 h-4" />
        </MotionLink>

        <motion.p variants={itemVariants} className="text-xs text-stone-600 mt-4">
          Open daily · 12:00 PM – 11:00 PM · Mi Road, Jaipur
        </motion.p>
      </motion.div>
    </section>
  );
}
