'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, MapPin, Menu, X, Zap } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import LocationModal from './LocationModal';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locOpen,  setLocOpen]  = useState(false);
  const count = useCartStore((s) => s.count());

  const links = [
    { href: '/',        label: 'Home'    },
    { href: '/menu',    label: 'Menu'    },
    { href: '/reservation', label: 'Reserve' },
    { href: '/cart',    label: 'Order'   },
  ];

  return (
    <>
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[min(1200px,calc(100vw-1.5rem))] glass-dark rounded-2xl border border-[#C5A880]/15 shadow-warm-lg">
        <div className="px-6 sm:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20
                              flex items-center justify-center group-hover:shadow-warm transition-all duration-300">
                <Zap className="w-4 h-4 text-[#C5A880]" />
              </div>
              <span
                className="font-display text-xl font-bold tracking-widest text-[#EAE6DF] group-hover:text-[#C5A880] transition-colors"
                style={{ fontFamily: 'Cinzel, serif' }}>
                Prathomix
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-10">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-xs font-semibold uppercase tracking-wider text-[#EAE6DF]/75 hover:text-[#C5A880] transition-colors duration-300 relative group py-2">
                  {l.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#C5A880]
                                   group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocOpen(true)}
                className="lift-3d shine-sweep hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#EAE6DF] hover:text-[#0A0A0A]
                           border border-[#C5A880]/25 hover:bg-[#C5A880] rounded-full px-4.5 py-2
                           transition-all duration-300 hover:shadow-warm">
                <MapPin className="w-3.5 h-3.5" />
                Locate Us
              </button>

              <Link href="/cart" className="relative">
                <div className="lift-3d w-10 h-10 rounded-full glass-dark border border-[#C5A880]/15 hover:border-[#C5A880]/30
                                flex items-center justify-center transition-all duration-300 hover:shadow-warm">
                  <ShoppingCart className="w-4 h-4 text-[#EAE6DF]" />
                </div>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#C5A880] text-[#0A0A0A]
                               text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </motion.span>
                )}
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lift-3d md:hidden w-10 h-10 rounded-full glass-dark border border-[#C5A880]/15 flex items-center justify-center text-[#EAE6DF]">
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="md:hidden overflow-hidden border-t border-[#C5A880]/15 glass-dark rounded-b-2xl">
              <div className="px-6 py-6 flex flex-col gap-2">
                {links.map((l) => (
                  <Link key={l.href} href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[#EAE6DF] hover:text-[#C5A880] py-3 px-3 rounded-lg
                               hover:bg-[#C5A880]/5 transition-all duration-200 text-sm font-semibold tracking-wide">
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setLocOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-[#EAE6DF] hover:text-[#C5A880] py-3 px-3
                             rounded-lg hover:bg-[#C5A880]/5 transition-all duration-200 text-sm font-semibold tracking-wide text-left">
                  <MapPin className="w-4 h-4 text-[#C5A880]" /> Locate Us
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <LocationModal isOpen={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}
