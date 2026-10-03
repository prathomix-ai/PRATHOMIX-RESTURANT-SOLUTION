'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  MapPin,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Calendar,
  Shield,
  Zap,
  Settings,
} from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { getClientSession, clearClientSession, type AuthUser } from '@/lib/auth';
import LocationModal from './LocationModal';
import CartDrawer from './CartDrawer';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const count = useCartStore((s) => s.count());
  const toggleDrawer = useCartStore((s) => s.toggleDrawer);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncUser = () => {
      setUser(getClientSession());
    };
    syncUser();

    window.addEventListener('storage', syncUser);
    window.addEventListener('prathomix_auth_changed', syncUser);

    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('prathomix_auth_changed', syncUser);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const links = [
    { href: '/',            label: 'Home'    },
    { href: '/menu',        label: 'Menu'    },
    { href: '/reservation', label: 'Reserve' },
    { href: '/order',       label: 'Order'   },
  ];

  return (
    <>
      <nav className="fixed top-2.5 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[min(1200px,calc(100vw-0.75rem))] sm:w-[min(1200px,calc(100vw-1.5rem))] glass-dark rounded-2xl border border-[#C5A880]/15 shadow-warm-lg">
        <div className="px-2.5 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-14 sm:h-20">

            {/* Official PRATHOMIX Logo */}
            <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 group flex-shrink-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#0A0A0A] border border-[#C5A880]/30
                              flex items-center justify-center overflow-hidden p-0.5 group-hover:border-[#C5A880]/60 group-hover:shadow-warm transition-all duration-300">
                <Image
                  src="/logo.png"
                  alt="PRATHOMIX Logo"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <span
                className="font-display text-base xs:text-lg sm:text-xl font-bold tracking-wider sm:tracking-widest text-[#EAE6DF] group-hover:text-[#C5A880] transition-colors"
                style={{ fontFamily: 'Cinzel, serif' }}>
                Prathomix
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  data-tour={l.href === '/menu' ? 'customer-menu' : undefined}
                  className="text-xs font-semibold uppercase tracking-wider text-[#EAE6DF]/75 hover:text-[#C5A880] transition-colors duration-300 relative group py-2">
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-[#C5A880] group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {/* Locate Us */}
              <button
                type="button"
                onClick={() => setLocOpen(true)}
                className="lift-3d shine-sweep hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#EAE6DF] hover:text-[#0A0A0A]
                           border border-[#C5A880]/25 hover:bg-[#C5A880] rounded-full px-3.5 py-2
                           transition-all duration-300 hover:shadow-warm">
                <MapPin className="w-3.5 h-3.5" />
                <span>Locate Us</span>
              </button>

              {/* Cart Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => toggleDrawer()}
                data-tour="cart-trigger"
                aria-label={`Open cart with ${count} items`}
                className="relative lift-3d w-8 h-8 sm:w-10 sm:h-10 rounded-full glass-dark border border-[#C5A880]/20 hover:border-[#C5A880]/40
                           flex items-center justify-center transition-all duration-300 hover:shadow-warm">
                <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EAE6DF]" />
                {count > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#C5A880] text-[#0A0A0A]
                               text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                    {count}
                  </motion.span>
                )}
              </button>

              {/* User Authentication Control: Logged-in Name Dropdown vs Sign In */}
              {user ? (
                <div className="relative z-50" ref={userMenuRef} data-tour="customer-profile">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    aria-label={`User menu for ${user.name}`}
                    className="lift-3d flex items-center gap-1 sm:gap-2 h-8 sm:h-10 px-2 sm:px-3 rounded-full glass-dark border border-[#C5A880]/35 hover:border-[#C5A880]/60 text-[#EAE6DF] transition-all duration-300 shadow-sm">
                    <div className="w-5 h-5 rounded-full bg-[#C5A880] text-[#0A0A0A] font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                      {user.name ? user.name.trim()[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold text-[#F5F2EB] max-w-[50px] xs:max-w-[75px] sm:max-w-[110px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#C5A880] transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.16 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#141414]/98 border border-[#C5A880]/30 shadow-2xl backdrop-blur-2xl p-2.5 z-50 text-left">
                        {/* User Header */}
                        <div className="px-2.5 py-2 border-b border-white/10 mb-1.5">
                          <p className="text-xs font-bold text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-stone-400 truncate">{user.email}</p>
                          <div className="mt-1.5 inline-block text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[#C5A880]/15 text-[#C5A880] border border-[#C5A880]/30">
                            {user.role}
                          </div>
                        </div>

                        {/* Role Specific Dashboard */}
                        {user.role !== 'customer' && (
                          <Link
                            href={
                              user.role === 'waiter'
                                ? '/waiter/dashboard'
                                : user.role === 'chef'
                                  ? '/kitchen/dashboard'
                                  : user.role === 'receptionist'
                                    ? '/reception/dashboard'
                                    : '/admin'
                            }
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-stone-200 hover:text-[#C5A880] hover:bg-white/5 transition-all">
                            <Shield className="w-3.5 h-3.5 text-[#C5A880]" />
                            <span>Staff Control Panel</span>
                          </Link>
                        )}

                        <Link
                          href="/reservation"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-stone-200 hover:text-[#C5A880] hover:bg-white/5 transition-all">
                          <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Reserve a Table</span>
                        </Link>

                        <Link
                          href="/cart"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-stone-200 hover:text-[#C5A880] hover:bg-white/5 transition-all">
                          <ShoppingCart className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Cart & Orders</span>
                        </Link>

                        <Link
                          href="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-stone-200 hover:text-[#C5A880] hover:bg-white/5 transition-all">
                          <Settings className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Account & Settings</span>
                        </Link>

                        <div className="my-1 border-t border-white/10" />

                        <button
                          type="button"
                          onClick={() => {
                            clearClientSession();
                            setUser(null);
                            setUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all text-left">
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  title="Sign In or Register"
                  className="lift-3d flex items-center gap-1.5 h-8 sm:h-10 px-2 sm:px-3.5 rounded-full glass-dark border border-[#C5A880]/25 hover:border-[#C5A880]/50 text-[#EAE6DF] hover:text-[#C5A880] text-xs font-semibold transition-all duration-300">
                  <User className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span className="text-[11px] sm:text-xs">Sign In</span>
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="lift-3d md:hidden w-8 h-8 sm:w-10 sm:h-10 rounded-full glass-dark border border-[#C5A880]/20 flex items-center justify-center text-[#EAE6DF]">
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="md:hidden overflow-hidden border-t border-[#C5A880]/15 glass-dark rounded-b-2xl max-h-[calc(100dvh-5rem)] overflow-y-auto">
              <div className="px-5 py-4 flex flex-col gap-2">
                {/* Mobile User Card */}
                {user ? (
                  <div className="p-3 rounded-xl bg-white/5 border border-[#C5A880]/25 mb-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{user.name}</p>
                      <p className="text-[10px] text-stone-400">{user.email}</p>
                      <span className="text-[9px] uppercase tracking-wider text-[#C5A880] font-semibold">{user.role}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearClientSession();
                        setUser(null);
                        setMenuOpen(false);
                      }}
                      className="text-xs text-rose-400 font-semibold px-2 py-1 rounded-lg bg-rose-500/10">
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mb-1">
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 text-center py-2.5 px-3 rounded-xl bg-[#C5A880] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider">
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className="flex-1 text-center py-2.5 px-3 rounded-xl border border-[#C5A880]/40 text-[#C5A880] text-xs font-bold uppercase tracking-wider">
                      Register
                    </Link>
                  </div>
                )}

                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-[#EAE6DF] hover:text-[#C5A880] py-2 px-3 rounded-lg hover:bg-[#C5A880]/5 transition-all duration-200 text-sm font-semibold tracking-wide">
                    {l.label}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setLocOpen(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 text-[#EAE6DF] hover:text-[#C5A880] py-2 px-3 rounded-lg hover:bg-[#C5A880]/5 transition-all duration-200 text-sm font-semibold tracking-wide text-left">
                  <MapPin className="w-4 h-4 text-[#C5A880]" /> Locate Us
                </button>

                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-[#C5A880] hover:text-[#EAE6DF] py-2 px-3 rounded-lg hover:bg-[#C5A880]/10 transition-all duration-200 text-sm font-semibold tracking-wide border-t border-white/5 pt-3">
                  <Shield className="w-4 h-4 text-[#C5A880]" /> Staff & Management OS
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <CartDrawer />
      <LocationModal isOpen={locOpen} onClose={() => setLocOpen(false)} />
    </>
  );
}


