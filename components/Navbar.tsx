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
    { href: '/booking', label: 'Reserve' },
    { href: '/cart',    label: 'Order'   },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30
                              flex items-center justify-center group-hover:shadow-neon-sm transition-all duration-300">
                <Zap className="w-4 h-4 text-cyan-400" />
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
                  className="text-sm text-slate-400 hover:text-cyan-400 transition-colors duration-200 relative group">
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-cyan-400
                                   group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400
                           border border-slate-700 hover:border-cyan-500/40 rounded-full px-3 py-1.5
                           transition-all duration-200 hover:shadow-neon-sm">
                <MapPin className="w-3.5 h-3.5" />
                Locate Us
              </button>

              <Link href="/cart" className="relative">
                <div className="w-9 h-9 rounded-full glass border border-slate-700 hover:border-cyan-500/40
                                flex items-center justify-center transition-all duration-200 hover:shadow-neon-sm">
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                </div>
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-cyan-500 text-black
                               text-[10px] font-bold rounded-full flex items-center justify-center">
                    {count}
                  </motion.span>
                )}
              </Link>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-9 h-9 rounded-full glass border border-slate-700 flex items-center justify-center">
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
              className="md:hidden overflow-hidden border-t border-white/5 glass-dark">
              <div className="px-4 py-4 flex flex-col gap-1">
                {links.map((l) => (
                  <Link key={l.href} href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-slate-300 hover:text-cyan-400 py-2 px-2 rounded-lg
                               hover:bg-white/5 transition-all duration-150 text-sm">
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setLocOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 text-slate-300 hover:text-cyan-400 py-2 px-2
                             rounded-lg hover:bg-white/5 transition-all duration-150 text-sm text-left">
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
