'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  CheckCircle2,
  Loader2,
  ArrowRight,
  CreditCard,
  Banknote,
  Smartphone,
  Utensils,
  Clock,
  ChefHat,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

type PaymentMethod = 'cash' | 'upi' | 'card';

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    placed:     { label: 'Sent to Kitchen', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    preparing:  { label: 'Preparing',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    ready:      { label: 'Ready to Serve',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    served:     { label: 'Served',          cls: 'bg-[#C5A880]/10 text-[#C5A880] border-[#C5A880]/30' },
    completed:  { label: 'Completed',       cls: 'bg-[#C5A880]/10 text-[#C5A880] border-[#C5A880]/30' },
    cancelled:  { label: 'Cancelled',       cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    pending_verification: { label: 'Awaiting Verification', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  };
  const badge = map[status] || { label: status, cls: 'bg-white/5 text-white/50 border-white/10' };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

function RunningBillContent() {
  const searchParams = useSearchParams();
  const sessionToken = searchParams.get('session_token') || (typeof window !== 'undefined' ? sessionStorage.getItem('prathomix_session_token') || localStorage.getItem('prathomix_session_token') : null);
  const tableNumber = searchParams.get('table');

  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payError, setPayError] = useState('');

  const fetchBill = useCallback(async () => {
    if (!sessionToken) {
      setError('No active dining session found. Please scan the table QR code.');
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({ session_token: sessionToken });
      if (tableNumber) params.set('table', tableNumber);
      const res = await fetch(`/api/orders/bill?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load bill');
      setBillData(data);
    } catch (e: any) {
      setError(e.message || 'Could not load your running bill');
    } finally {
      setLoading(false);
    }
  }, [sessionToken, tableNumber]);

  useEffect(() => {
    fetchBill();
    // Auto-refresh every 15s to pick up new orders / status changes
    const interval = setInterval(fetchBill, 15000);
    return () => clearInterval(interval);
  }, [fetchBill]);

  async function handlePayBill() {
    if (paying || paid) return;
    setPaying(true);
    setPayError('');

    const idempotencyKey = `bill_${sessionToken?.slice(-8)}_${Date.now()}`;

    try {
      const res = await fetch('/api/orders/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          table_number: billData?.session?.table_number,
          payment_method: paymentMethod,
          bill_idempotency_key: idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment failed');
      setPaid(true);
      // Clear session from storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('prathomix_session_token');
        localStorage.removeItem('prathomix_session_token');
      }
    } catch (e: any) {
      setPayError(e.message || 'Payment could not be processed');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 flex items-center justify-center bg-[#0A0A0A]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-[#C5A880]/20 border-t-[#C5A880] rounded-full animate-spin" />
            <p className="text-[#EAE6DF]/60 text-sm">Loading your running bill…</p>
          </div>
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 flex items-center justify-center px-4 bg-[#0A0A0A]">
          <div className="glass-dark rounded-3xl p-8 text-center max-w-md border border-[#C5A880]/20">
            <Receipt className="w-12 h-12 text-[#C5A880]/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              No Active Bill Found
            </h2>
            <p className="text-sm text-[#EAE6DF]/60 mb-6">{error}</p>
            <Link href="/menu" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl">
              Browse Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (paid) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 flex items-center justify-center px-4 bg-[#0A0A0A] relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-[500px] rounded-full bg-[#C5A880]/8 blur-[120px]" />
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-dark rounded-3xl p-10 text-center max-w-md border border-[#C5A880]/20 shadow-2xl relative z-10">
            <div className="w-20 h-20 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[#C5A880]" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#C5A880] font-bold mb-2">
              Bill Settled
            </p>
            <h2 className="text-3xl font-bold text-[#EAE6DF] mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Thank You!
            </h2>
            <p className="text-sm text-[#EAE6DF]/60 mb-6">
              Your bill has been paid. The table session is now closed. We hope you enjoyed your dining experience at PRATHOMIX.
            </p>
            <div className="p-4 rounded-2xl bg-[#121212] border border-[#C5A880]/15 mb-6 text-left">
              <div className="flex justify-between text-xs text-[#EAE6DF]/70 mb-1">
                <span>Table</span>
                <span className="text-[#EAE6DF] font-bold">Table {billData?.session?.table_number}</span>
              </div>
              <div className="flex justify-between text-xs text-[#EAE6DF]/70">
                <span>Amount Paid</span>
                <span className="text-[#C5A880] font-bold">₹{billData?.bill?.grand_total?.toFixed(2)}</span>
              </div>
            </div>
            <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl">
              Back to Home <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </main>
      </>
    );
  }

  const { session, orders, bill } = billData || {};

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 sm:pt-28 pb-24 px-3 sm:px-6 max-w-3xl mx-auto bg-[#0A0A0A] text-[#EAE6DF]">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Running Bill
              </h1>
              <p className="text-xs text-[#EAE6DF]/50 mt-0.5">
                Table {session?.table_number} · {orders?.length || 0} order{orders?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchBill(); }}
            className="w-9 h-9 rounded-xl bg-[#C5A880]/8 border border-[#C5A880]/15 flex items-center justify-center text-[#C5A880]/60 hover:text-[#C5A880] transition-colors"
            title="Refresh bill">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-3 mb-6">
          {orders?.length === 0 && (
            <div className="glass-dark rounded-2xl border border-[#C5A880]/15 p-8 text-center">
              <ShoppingBag className="w-10 h-10 text-[#C5A880]/20 mx-auto mb-3" />
              <p className="text-[#EAE6DF]/50 text-sm">No orders placed yet for this table session.</p>
              <Link href="/menu" className="inline-flex items-center gap-2 mt-4 text-xs font-semibold text-[#C5A880] hover:text-[#EAE6DF] transition-colors">
                Browse Menu <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
          <AnimatePresence>
            {orders?.map((order: any, idx: number) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-dark rounded-2xl border border-[#C5A880]/15 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-[#C5A880]/50 flex-shrink-0" />
                    <span className="text-xs font-bold text-[#C5A880] font-mono">
                      {order.order_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(order.status)}
                  </div>
                </div>

                {/* Dish items */}
                <div className="space-y-1 mb-3">
                  {order.items_detail?.length > 0
                    ? order.items_detail.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-[#EAE6DF]/80">
                            {item.qty}× {item.name}
                          </span>
                          <span className="text-[#EAE6DF]/60 font-mono">
                            ₹{(Number(item.price) * Number(item.qty)).toFixed(2)}
                          </span>
                        </div>
                      ))
                    : order.dish_names?.map((name: string, i: number) => (
                        <div key={i} className="text-xs text-[#EAE6DF]/70">{name}</div>
                      ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#C5A880]/10">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#EAE6DF]/40">
                    <Clock className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <span className="text-sm font-bold text-[#C5A880]">
                    ₹{Number(order.subtotal || order.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bill Summary + Pay */}
        {orders?.length > 0 && (
          <div className="glass-dark rounded-3xl border border-[#C5A880]/20 p-6 space-y-4 sticky bottom-4">
            <h3 className="text-base font-bold text-[#EAE6DF] flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
              <Receipt className="w-4 h-4 text-[#C5A880]" /> Bill Summary
            </h3>

            <div className="space-y-1.5 text-xs text-[#EAE6DF]/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#EAE6DF]">₹{bill?.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5%)</span>
                <span className="text-[#EAE6DF]">₹{bill?.tax?.toFixed(2)}</span>
              </div>
              {bill?.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Discounts</span>
                  <span>-₹{bill?.discount?.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[#EAE6DF] text-base border-t border-[#C5A880]/15 pt-2 mt-1">
                <span>Grand Total</span>
                <span className="text-[#C5A880] text-lg" style={{ fontFamily: 'Cinzel, serif' }}>
                  ₹{bill?.grand_total?.toFixed(2)}
                </span>
              </div>
              {bill?.paid_amount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Paid</span>
                  <span>₹{bill?.paid_amount?.toFixed(2)}</span>
                </div>
              )}
              {bill?.remaining > 0 && (
                <div className="flex justify-between font-bold text-rose-400">
                  <span>Remaining</span>
                  <span>₹{bill?.remaining?.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment method */}
            <div>
              <p className="text-[11px] font-semibold text-[#EAE6DF]/70 uppercase tracking-wider mb-2">
                Pay via
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'cash', label: 'Cash', icon: Banknote },
                ] as { id: PaymentMethod; label: string; icon: any }[]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === opt.id
                        ? 'bg-[#C5A880]/15 border-[#C5A880] text-[#C5A880]'
                        : 'bg-[#121212] border-[#C5A880]/15 text-[#EAE6DF]/50 hover:text-[#EAE6DF]'
                    }`}>
                    <opt.icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {payError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                {payError}
              </p>
            )}

            <button
              onClick={handlePayBill}
              disabled={paying || bill?.grand_total === 0}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm uppercase tracking-wider shadow-warm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {paying ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing Payment…</>
              ) : (
                <>Pay ₹{bill?.remaining > 0 ? bill?.remaining?.toFixed(2) : bill?.grand_total?.toFixed(2)} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <Link
              href="/menu"
              className="w-full py-2.5 rounded-xl bg-transparent border border-[#C5A880]/20 hover:border-[#C5A880] text-[#EAE6DF]/60 hover:text-[#C5A880] text-xs font-semibold transition-all flex items-center justify-center gap-2">
              <Utensils className="w-3.5 h-3.5" /> Continue Ordering
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

export default function RunningBillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
      </div>
    }>
      <RunningBillContent />
    </Suspense>
  );
}
