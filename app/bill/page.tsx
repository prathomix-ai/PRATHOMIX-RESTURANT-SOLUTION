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
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getLocalOrders } from '@/lib/localOrders';

type PaymentMethod = 'cash' | 'upi' | 'card';

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    placed:     { label: 'Order Confirmed', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    preparing:  { label: 'Preparing',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    ready:      { label: 'Ready to Serve',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    served:     { label: 'Served',          cls: 'bg-[#C5A880]/10 text-[#C5A880] border-[#C5A880]/30' },
    completed:  { label: 'Completed',       cls: 'bg-[#C5A880]/10 text-[#C5A880] border-[#C5A880]/30' },
    cancelled:  { label: 'Cancelled',       cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
    pending_verification: { label: 'Awaiting Confirmation', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
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
  const urlOrderId = searchParams.get('order_id') || searchParams.get('id');
  const urlSessionToken = searchParams.get('session_token');
  const urlTable = searchParams.get('table');

  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [payError, setPayError] = useState('');

  // Resolve best available lookup parameter
  const resolveTarget = useCallback(() => {
    if (urlOrderId) return { type: 'order_id', value: urlOrderId };
    if (urlSessionToken) return { type: 'session_token', value: urlSessionToken };

    if (typeof window !== 'undefined') {
      const storedOrder = localStorage.getItem('prathomix_last_order_id') || sessionStorage.getItem('prathomix_last_order_id');
      if (storedOrder) return { type: 'order_id', value: storedOrder };

      const storedToken = sessionStorage.getItem('prathomix_session_token') || localStorage.getItem('prathomix_session_token');
      if (storedToken) return { type: 'session_token', value: storedToken };

      const localOrders = getLocalOrders();
      if (localOrders.length > 0) {
        return { type: 'order_id', value: localOrders[0].id };
      }
    }

    if (urlTable) return { type: 'table', value: urlTable };
    return null;
  }, [urlOrderId, urlSessionToken, urlTable]);

  const fetchBill = useCallback(async () => {
    const target = resolveTarget();
    if (!target) {
      setError('No active order or dining session found. Please place an order first.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const params = new URLSearchParams();
      if (target.type === 'order_id') {
        params.set('order_id', target.value);
      } else if (target.type === 'session_token') {
        params.set('session_token', target.value);
        if (urlTable) params.set('table', urlTable);
      } else if (target.type === 'table') {
        params.set('table', target.value);
      }

      const res = await fetch(`/api/orders/bill?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Unable to retrieve bill summary.');
      }

      setBillData(data);
      if (data?.bill?.is_paid || data?.bill?.payment_status === 'paid' || data?.order?.payment_status === 'paid') {
        setPaid(true);
      }
    } catch (e: any) {
      setError(e.message || 'Bill unavailable because order is still being processed.');
    } finally {
      setLoading(false);
    }
  }, [resolveTarget, urlTable]);

  useEffect(() => {
    fetchBill();
    // Auto-refresh every 12s to pick up kitchen / payment state updates
    const interval = setInterval(fetchBill, 12000);
    return () => clearInterval(interval);
  }, [fetchBill]);

  async function handlePayBill() {
    if (paying || paid) return;
    setPaying(true);
    setPayError('');

    try {
      const target = resolveTarget();
      const idempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      let payload: Record<string, unknown> = {
        payment_method: paymentMethod,
        bill_idempotency_key: idempotencyKey,
      };

      if (billData?.order?.id) {
        payload.order_id = billData.order.id;
      } else if (billData?.type === 'session' && billData?.session?.session_token) {
        payload.session_token = billData.session.session_token;
        payload.table_number = billData.session.table_number;
      } else if (target?.type === 'order_id') {
        payload.order_id = target.value;
      } else if (target?.type === 'session_token') {
        payload.session_token = target.value;
      }

      const res = await fetch('/api/orders/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment failed. Please retry.');

      setPaid(true);
      await fetchBill();
    } catch (e: any) {
      setPayError(e.message || 'Payment could not be processed.');
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 flex items-center justify-center bg-[#0A0A0A]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 border-2 border-[#C5A880]/20 border-t-[#C5A880] rounded-full animate-spin" />
            <p className="text-[#EAE6DF]/70 text-sm font-medium">Preparing your verified bill…</p>
          </div>
        </main>
      </>
    );
  }

  if (error && !billData) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 flex items-center justify-center px-4 bg-[#0A0A0A]">
          <div className="glass-dark rounded-3xl p-8 text-center max-w-md border border-[#C5A880]/20 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/25 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-[#C5A880]" />
            </div>
            <h2 className="text-xl font-bold text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Bill Pending
            </h2>
            <p className="text-xs text-[#EAE6DF]/60 mb-6 leading-relaxed">
              {error.includes('expired') || error.includes('not found')
                ? 'Bill will be available once your order is confirmed by the restaurant.'
                : error}
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => { setLoading(true); fetchBill(); }}
                className="inline-flex items-center justify-center gap-2 bg-[#C5A880] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-warm hover:brightness-110 transition-all">
                <RefreshCw className="w-3.5 h-3.5" /> Check Again
              </button>
              <Link
                href="/order"
                className="inline-flex items-center justify-center gap-2 bg-[#121212] border border-[#C5A880]/30 text-[#C5A880] font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all">
                View Active Orders
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const isSingleOrder = billData?.type === 'single_order';
  const order = billData?.order;
  const session = billData?.session;
  const orders = billData?.orders || (order ? [order] : []);
  const bill = billData?.bill || { grand_total: 0, subtotal: 0, tax: 0, discount: 0, remaining: 0 };
  const isSettled = paid || bill.is_paid || bill.payment_status === 'paid' || order?.payment_status === 'paid';

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 sm:pt-28 pb-24 px-3 sm:px-6 max-w-3xl mx-auto bg-[#0A0A0A] text-[#EAE6DF]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center shadow-warm">
              <Receipt className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                {isSingleOrder ? 'Order Invoice & Bill' : 'Table Running Bill'}
              </h1>
              <p className="text-xs text-[#EAE6DF]/60 mt-0.5">
                {isSingleOrder
                  ? `Order ${order?.order_number} · ${order?.table_number ? `Table ${order.table_number}` : (order?.order_type || 'Takeaway')}`
                  : `Table ${session?.table_number || urlTable || 'Dine-In'} · ${orders.length} order${orders.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {order?.id && (
              <Link
                href={`/order?id=${order.id}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#C5A880] border border-[#C5A880]/30 hover:border-[#C5A880] px-3 py-1.5 rounded-xl transition-colors">
                <span>Live Tracker</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}

            <button
              onClick={() => { setLoading(true); fetchBill(); }}
              className="w-9 h-9 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880] hover:bg-[#C5A880]/20 transition-colors"
              title="Refresh bill data">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payment Confirmation Banner if paid */}
        {isSettled && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Payment Confirmed · Bill Settled
                </p>
                <p className="text-[11px] text-[#EAE6DF]/70">
                  Total of ₹{bill.grand_total.toFixed(2)} received. Thank you for dining with PRATHOMIX.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              PAID
            </span>
          </motion.div>
        )}

        {/* Orders / Items Breakdown */}
        <div className="space-y-4 mb-6">
          {orders.map((ord: any, idx: number) => {
            const ordItems = ord.items || ord.items_detail || [];
            return (
              <motion.div
                key={ord.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-dark rounded-2xl border border-[#C5A880]/20 p-4 sm:p-5 bg-[#121212]/90">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#C5A880]/15">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-[#C5A880]/60 flex-shrink-0" />
                    <span className="text-xs font-bold text-[#C5A880] font-mono">
                      {ord.order_number || `#${String(ord.id).slice(0, 8).toUpperCase()}`}
                    </span>
                    {ord.created_at && (
                      <span className="text-[10px] text-[#EAE6DF]/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div>
                    {statusBadge(ord.status || 'placed')}
                  </div>
                </div>

                {/* Granular Items Table */}
                <div className="space-y-2 mb-3">
                  {ordItems.length > 0 ? (
                    ordItems.map((item: any, i: number) => {
                      const itemPrice = Number(item.price) || 0;
                      const itemQty = Number(item.qty) || 1;
                      const lineTotal = itemPrice * itemQty;

                      return (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.03] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-[#C5A880] font-bold font-mono text-center">
                              {itemQty}×
                            </span>
                            <span className="text-[#EAE6DF] font-medium">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#EAE6DF]/50">
                              ₹{itemPrice.toFixed(2)}
                            </span>
                            <span className="text-[#EAE6DF] font-mono font-semibold">
                              ₹{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-[#EAE6DF]/60 py-1">Standard Tasting Menu Selection</div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#C5A880]/10 text-xs">
                  <span className="text-[#EAE6DF]/60">Order Subtotal</span>
                  <span className="text-[#C5A880] font-bold font-mono text-sm">
                    ₹{Number(ord.total_amount || ord.subtotal || bill.grand_total).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bill Summary Card */}
        <div className="glass-dark rounded-3xl border border-[#C5A880]/25 p-5 sm:p-6 space-y-4 bg-[#141414]/95 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
            <h3 className="text-base font-bold text-[#EAE6DF] flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
              <Receipt className="w-4 h-4 text-[#C5A880]" /> Grand Summary
            </h3>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${isSettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
              {isSettled ? 'PAID' : 'PAYMENT PENDING'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#EAE6DF]/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#EAE6DF] font-medium font-mono">₹{bill.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span className="text-[#EAE6DF] font-medium font-mono">₹{bill.tax.toFixed(2)}</span>
            </div>
            {bill.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span className="text-[#EAE6DF] font-medium font-mono">₹{bill.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {bill.discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Promotional Discount</span>
                <span className="font-mono">-₹{bill.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-[#EAE6DF] text-base border-t border-[#C5A880]/15 pt-3 mt-2">
              <span>Total Payable</span>
              <span className="text-[#C5A880] text-xl font-display font-bold" style={{ fontFamily: 'Cinzel, serif' }}>
                ₹{bill.grand_total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector & Trigger (Only shown if unpaid) */}
          {!isSettled && (
            <div className="pt-2 border-t border-[#C5A880]/15 space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-[#EAE6DF]/70 uppercase tracking-wider mb-2">
                  Select Payment Method
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
                disabled={paying || bill.grand_total === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm uppercase tracking-wider shadow-warm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {paying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirming Payment…</>
                ) : (
                  <>Pay ₹{bill.grand_total.toFixed(2)} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Link
              href="/menu"
              className="flex-1 py-3 rounded-xl bg-transparent border border-[#C5A880]/20 hover:border-[#C5A880] text-[#EAE6DF]/70 hover:text-[#C5A880] text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
              <Utensils className="w-3.5 h-3.5" /> Continue Ordering
            </Link>

            {order?.id && (
              <Link
                href={`/order?id=${order.id}`}
                className="flex-1 py-3 rounded-xl bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-[#C5A880] text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                Track Food Status
              </Link>
            )}
          </div>
        </div>
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
