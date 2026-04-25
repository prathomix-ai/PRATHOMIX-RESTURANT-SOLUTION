'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import SplitBill from '@/components/SplitBill';
import { useCartStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Trash2, Plus, Minus, Receipt, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CartPage() {
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();
  const [showSplit, setShowSplit] = useState(false);
  const [ordered,  setOrdered]   = useState(false);

  const grandTotal = total() * 1.05; // + 5% GST

  async function placeOrder() {
    try {
      await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dish_ids:     items.map((i) => i.id),
          dish_names:   items.map((i) => i.name),
          total_amount: grandTotal,
          split_count:  1,
        }),
      });
      await fetch('/api/whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:   'order',
          amount: grandTotal,
          dishes: items.map((i) => i.name),
        }),
      });
    } catch (e) {
      console.error('Order error:', e);
    }
    clearCart();
    setOrdered(true);
  }

  /* ── Order Success ─────────────────────────────────── */
  if (ordered) return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass neon-border rounded-3xl p-10 text-center max-w-md">
          <div className="text-6xl mb-5">🎉</div>
          <h2
            className="font-display text-2xl gradient-text mb-3"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Order Placed!
          </h2>
          <p className="text-slate-400 mb-1">Your order is being prepared.</p>
          <p className="text-xs text-emerald-400/80 mb-8">📱 WhatsApp confirmation sent (mock)</p>
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 bg-cyan-500 text-black font-bold
                       px-6 py-3 rounded-xl shadow-neon-cyan hover:bg-cyan-400 transition-all duration-200">
            Order More <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </main>
    </>
  );

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4 max-w-5xl mx-auto">

        <div className="flex items-center gap-3 mb-10">
          <ShoppingCart className="w-6 h-6 text-cyan-400" />
          <h1
            className="font-display text-3xl font-bold gradient-text"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Your Cart
          </h1>
          <span className="text-slate-500 text-sm">
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="text-center py-32">
            <ShoppingCart className="w-16 h-16 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 mb-6">Your cart is empty</p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 glass border border-slate-700
                         hover:border-cyan-500/30 text-slate-300 px-6 py-3 rounded-xl
                         transition-all duration-200 hover:text-cyan-400">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8">

            {/* Items list */}
            <div className="lg:col-span-3 flex flex-col gap-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    exit={{ opacity: 0, x: -30 }}
                    className="glass border border-slate-800 hover:border-slate-700 rounded-2xl
                               p-4 flex gap-4 items-center transition-all duration-200">

                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">₹{item.price} each</p>

                      {/* Qty controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700
                                     flex items-center justify-center transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-5 text-center text-white">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700
                                     flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <p className="text-cyan-400 font-bold text-sm">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <div className="glass neon-border rounded-2xl p-6">
                <h3
                  className="font-display text-lg font-semibold gradient-text mb-4 flex items-center gap-2"
                  style={{ fontFamily: 'Cinzel, serif' }}>
                  <Receipt className="w-5 h-5 text-cyan-400" />
                  Summary
                </h3>

                <div className="space-y-2 mb-5">
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Subtotal</span>
                    <span>₹{total().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>GST (5%)</span>
                    <span>₹{(total() * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white border-t border-slate-800 pt-3 mt-3">
                    <span>Total</span>
                    <span className="neon-text">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                             shadow-neon-cyan transition-all duration-200 hover:scale-[1.02]
                             active:scale-100 text-sm mb-2">
                  Place Order
                </button>

                <button
                  onClick={() => setShowSplit(!showSplit)}
                  className="w-full py-2.5 rounded-xl glass border border-slate-700
                             hover:border-cyan-500/30 text-slate-400 hover:text-cyan-400
                             text-xs font-medium transition-all duration-200">
                  {showSplit ? '▲ Hide Split Bill' : '👥 Split the Bill'}
                </button>
              </div>

              {/* Split Bill */}
              <AnimatePresence>
                {showSplit && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}>
                    <SplitBill
                      total={grandTotal}
                      onConfirm={() => setTimeout(placeOrder, 800)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
