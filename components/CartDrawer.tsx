'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/lib/store';

export default function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQty, removeItem, total } = useCartStore();

  const subtotal = total();
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  // Lock background scroll when drawer is open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-md h-full bg-[#0E0E0E] border-l border-[#C5A880]/20 flex flex-col shadow-2xl z-10 overflow-hidden text-[#EAE6DF]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#C5A880]/15 flex items-center justify-between bg-[#121212]/90 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-[#C5A880]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Your Dining Cart
                  </h2>
                  <p className="text-[11px] text-[#EAE6DF]/60">
                    {items.length} unique dish{items.length !== 1 ? 'es' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close cart drawer"
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#EAE6DF]/60 hover:text-[#C5A880] hover:bg-[#C5A880]/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]/50 mb-2">
                    <ShoppingCart className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Your cart is empty
                  </h3>
                  <p className="text-xs text-[#EAE6DF]/60 max-w-xs">
                    Explore our curated tasting menu to add high-protein, calorie-conscious, and artisanal creations.
                  </p>
                  <Link
                    href="/menu"
                    onClick={() => setDrawerOpen(false)}
                    className="mt-3 inline-flex items-center gap-2 bg-[#C5A880] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-5 py-2.5 min-h-[44px] rounded-xl shadow-warm hover:brightness-110 transition-all"
                  >
                    Browse Menu <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                items.map((item) => {
                  const itemSubtotal = item.price * item.qty;
                  const modifierBadge = item.protein >= 30 ? 'High Protein (30g+)' : item.calories < 300 ? 'Low Calorie (<300 cal)' : 'Chef Curated';

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-dark border border-[#C5A880]/15 rounded-2xl p-2.5 sm:p-3.5 flex gap-2.5 sm:gap-3 items-center"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#C5A880]/20 bg-[#121212]">
                        <Image
                          src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>

                      {/* Info & Modifiers */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs sm:text-sm text-[#EAE6DF] truncate">
                          {item.name}
                        </h4>
                        <span className="inline-block text-[9px] text-[#C5A880] font-semibold bg-[#C5A880]/10 px-1.5 py-0.5 rounded-sm mt-0.5">
                          {modifierBadge}
                        </span>

                        {/* Price breakdown formula */}
                        <div className="text-[11px] text-[#EAE6DF]/70 mt-1">
                          ₹{item.price} × {item.qty} ={' '}
                          <span className="text-[#C5A880] font-bold">
                            ₹{itemSubtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls & Remove */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="text-[#EAE6DF]/40 hover:text-rose-400 p-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="inline-flex items-center bg-[#121212] border border-[#C5A880]/40 rounded-full p-0.5 shadow-sm min-h-[32px]">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            aria-label={`Decrease ${item.name} quantity`}
                            className="w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-[#EAE6DF] select-none">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            aria-label={`Increase ${item.name} quantity`}
                            className="w-6 sm:w-7 h-6 sm:h-7 rounded-full flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880] hover:text-[#0A0A0A] transition-colors active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {items.length > 0 && (
              <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#C5A880]/15 bg-[#121212]/95 space-y-3 flex-shrink-0">
                <div className="space-y-1.5 text-xs text-[#EAE6DF]/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-[#EAE6DF] font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="text-[#EAE6DF] font-medium">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#EAE6DF] pt-2 border-t border-[#C5A880]/15 text-sm sm:text-base">
                    <span>Estimated Total</span>
                    <span className="text-[#C5A880] font-display text-base sm:text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="py-3 px-2 min-h-[44px] rounded-xl border border-[#C5A880]/30 hover:border-[#C5A880] text-[#EAE6DF] text-xs font-semibold uppercase tracking-wider text-center transition-all flex items-center justify-center"
                  >
                    Keep Browsing
                  </button>
                  <Link
                    href="/cart"
                    onClick={() => setDrawerOpen(false)}
                    className="py-3 px-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider text-center shadow-warm hover:brightness-110 flex items-center justify-center gap-1.5 transition-all"
                  >
                    Checkout <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
