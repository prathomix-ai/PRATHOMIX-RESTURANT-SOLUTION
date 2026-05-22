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
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(1200px,calc(100vw-1.5rem))] glass rounded-[1.75rem] border border-white/50 shadow-warm-lg">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary-600/10 border border-primary-600/20
                              flex items-center justify-center group-hover:shadow-warm transition-all duration-300">
                <Zap className="w-4 h-4 text-primary-600" />
              </div>
              <span
                className="font-display text-lg font-bold gradient-text"
                style={{ fontFamily: 'Cinzel, serif' }}>
                Prathomix
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-sm text-stone-600 hover:text-primary-700 transition-colors duration-200 relative group">
                  {l.label}
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary-700
                                   group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocOpen(true)}
                  className="lift-3d shine-sweep float-y-slow hidden sm:flex items-center gap-1.5 text-xs text-stone-600 hover:text-primary-700
                           border border-warm-200 hover:border-primary-400 rounded-full px-3 py-1.5
                           transition-all duration-200 hover:shadow-warm">
                <MapPin className="w-3.5 h-3.5" />
                Locate Us
              </button>

              <Link href="/cart" className="relative">
                  <div className="lift-3d float-y w-9 h-9 rounded-full glass border border-warm-200 hover:border-primary-400
                                flex items-center justify-center transition-all duration-200 hover:shadow-warm">
                  <ShoppingCart className="w-4 h-4 text-stone-600" />
                </div>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-primary-700 text-white
                               text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </motion.span>
                )}
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lift-3d md:hidden w-9 h-9 rounded-full glass border border-warm-200 flex items-center justify-center text-stone-600">
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
              className="md:hidden overflow-hidden border-t border-warm-200 glass">
              <div className="px-4 py-4 flex flex-col gap-1">
                {links.map((l) => (
                  <Link key={l.href} href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-stone-700 hover:text-primary-700 py-2 px-2 rounded-lg
                               hover:bg-primary-50 transition-all duration-150 text-sm">
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setLocOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-stone-700 hover:text-primary-700 py-2 px-2
                             rounded-lg hover:bg-primary-50 transition-all duration-150 text-sm text-left">
                  <MapPin className="w-4 h-4" /> Locate Us
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
