'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  CreditCard,
  ChefHat,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Utensils,
  Check,
  Circle,
  Loader2,
  Smartphone,
  Banknote,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { supabase, RESTAURANT_TABLES, type Order } from '@/lib/supabase';
import { getLocalOrders, updateLocalOrderStatus } from '@/lib/localOrders';

type TabType = 'active' | 'completed';

// Dine-In Stages
const DINE_IN_STAGES = [
  { key: 'received',  label: 'Order Received',      desc: 'Sent to restaurant system' },
  { key: 'accepted',  label: 'Restaurant Accepted', desc: 'Verified and queued' },
  { key: 'preparing', label: 'Kitchen Preparing',   desc: 'Freshly handcrafted by chef' },
  { key: 'ready',     label: 'Food Ready',          desc: 'Plated and ready at counter' },
  { key: 'serving',   label: 'Waiter Serving',      desc: 'On its way to your table' },
  { key: 'completed', label: 'Completed',           desc: 'Dining completed' },
];

// Takeaway / Delivery Stages
const DELIVERY_STAGES = [
  { key: 'received',  label: 'Order Placed',        desc: 'Sent to restaurant' },
  { key: 'accepted',  label: 'Order Accepted',      desc: 'Kitchen confirmed' },
  { key: 'preparing', label: 'Preparing Food',      desc: 'Packaging fresh ingredients' },
  { key: 'ready',     label: 'Order Packed',        desc: 'Ready for handoff' },
  { key: 'serving',   label: 'Out for Delivery',    desc: 'Courier dispatched' },
  { key: 'completed', label: 'Delivered',           desc: 'Enjoy your meal' },
];

function getStageIndex(order: Order): number {
  if (order.status === 'cancelled') return -1;
  if (order.status === 'completed') return 5;
  if (order.status === 'served' || order.status === 'picked_up') return 4;
  if (order.status === 'ready') return 3;
  if (order.status === 'preparing') return 2;
  if (order.status === 'placed') return 1;
  return 0; // pending_verification or initial placed
}

function calculateETA(order: Order, nowMs: number) {
  if (order.status === 'completed') return 'Completed';
  if (order.status === 'served') return 'Served to your table';
  if (order.status === 'ready') return 'Ready now!';
  if (order.status === 'cancelled') return 'Order cancelled';

  const createdMs = order.created_at ? new Date(order.created_at).getTime() : nowMs;
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - createdMs) / 60000));
  const estimatedTotalMinutes = 18; // Configurable restaurant default preparation time
  const remaining = Math.max(2, estimatedTotalMinutes - elapsedMinutes);

  if (order.status === 'preparing') {
    return `~${Math.min(remaining, 12)} min remaining`;
  }
  return `Estimated ${remaining} min`;
}

function OrderContent() {
  const searchParams = useSearchParams();
  const highlightOrderId = searchParams.get('id') || searchParams.get('order_id');

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash'>('upi');
  const [payProcessing, setPayProcessing] = useState(false);

  // Live timer tick every 10s for ETA recalculation
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch relevant orders for this customer session/table/local orders
  const loadOrders = useCallback(async () => {
    try {
      const localList = getLocalOrders();
      const localIds = localList.map((o) => o.id);

      const storedLastId = typeof window !== 'undefined'
        ? localStorage.getItem('prathomix_last_order_id') || sessionStorage.getItem('prathomix_last_order_id')
        : null;

      const storedSessionToken = typeof window !== 'undefined'
        ? sessionStorage.getItem('prathomix_session_token') || localStorage.getItem('prathomix_session_token')
        : null;

      const storedTable = typeof window !== 'undefined'
        ? sessionStorage.getItem('prathomix_table') || localStorage.getItem('prathomix_table')
        : null;

      const candidateIds = Array.from(new Set([
        ...(highlightOrderId ? [highlightOrderId] : []),
        ...(storedLastId ? [storedLastId] : []),
        ...localIds,
      ])).filter(Boolean);

      let fetchedOrders: Order[] = [];

      // Query database for known order IDs
      if (candidateIds.length > 0) {
        const { data, error } = await supabase
          .from(RESTAURANT_TABLES.orders)
          .select('*')
          .in('id', candidateIds)
          .order('created_at', { ascending: false });

        if (!error && data) {
          fetchedOrders = data as Order[];
        }
      }

      // If session token or table is known and no orders found yet, query by session/table
      if (fetchedOrders.length === 0 && (storedSessionToken || storedTable)) {
        let query = supabase
          .from(RESTAURANT_TABLES.orders)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (storedSessionToken) {
          query = query.eq('session_id', storedSessionToken);
        } else if (storedTable) {
          query = query.eq('table_number', Number(storedTable));
        }

        const { data } = await query;
        if (data && data.length > 0) {
          fetchedOrders = data as Order[];
        }
      }

      // Merge with local orders fallback if database row is delayed
      if (fetchedOrders.length === 0 && localList.length > 0) {
        fetchedOrders = localList.map((l) => ({
          id: l.id,
          order_number: `#${l.id.slice(0, 8).toUpperCase()}`,
          table_number: l.table_number,
          dish_ids: l.dish_ids,
          dish_names: l.dish_names,
          total_amount: l.total_amount,
          status: l.status as any,
          created_at: l.created_at,
          payment_status: 'pending',
        })) as Order[];
      }

      setOrders(fetchedOrders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [highlightOrderId]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Filtered Supabase Realtime subscription for customer's active orders
  useEffect(() => {
    const activeOrderIds = orders.map((o) => o.id).filter(Boolean);
    if (activeOrderIds.length === 0) return;

    const channelName = `customer-orders-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: RESTAURANT_TABLES.orders,
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated && activeOrderIds.includes(updated.id)) {
            setOrders((prev) =>
              prev.map((ord) => (ord.id === updated.id ? { ...ord, ...updated } : ord))
            );
            updateLocalOrderStatus(updated.id, updated.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orders]);

  // Quick Pay Handler
  async function handleQuickPay(order: Order) {
    setPayProcessing(true);
    try {
      const res = await fetch('/api/orders/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment failed');

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, payment_status: 'paid' } : o))
      );
      setPayingOrderId(null);
    } catch (err: any) {
      alert(err.message || 'Payment failed.');
    } finally {
      setPayProcessing(false);
    }
  }

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled'),
    [orders]
  );

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'cancelled'),
    [orders]
  );

  const displayedOrders = activeTab === 'active' ? activeOrders : completedOrders;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 sm:pt-28 pb-20 px-3 sm:px-6 max-w-4xl mx-auto bg-[#0A0A0A] text-[#EAE6DF]">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#C5A880] font-semibold mb-1">
              Live Kitchen & Dining Tracking
            </p>
            <h1
              className="text-2xl sm:text-4xl font-bold tracking-wide text-[#EAE6DF]"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Your Orders
            </h1>
          </div>

          <button
            onClick={() => { setLoading(true); loadOrders(); }}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-xs font-semibold text-[#C5A880] transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-2 p-1 rounded-2xl bg-[#121212] border border-[#C5A880]/20 max-w-xs mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'active'
                ? 'bg-[#C5A880] text-[#0A0A0A] shadow-warm'
                : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
            }`}>
            Active ({activeOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'completed'
                ? 'bg-[#C5A880] text-[#0A0A0A] shadow-warm'
                : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
            }`}>
            Past ({completedOrders.length})
          </button>
        </div>

        {/* Orders Feed */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass-dark rounded-3xl p-6 sm:p-8 border border-[#C5A880]/15 animate-pulse h-64" />
            ))}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="glass-dark rounded-3xl p-10 text-center border border-[#C5A880]/15 max-w-lg mx-auto">
            <ShoppingBag className="w-12 h-12 text-[#C5A880]/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              {activeTab === 'active' ? 'No Active Orders' : 'No Completed Orders'}
            </h3>
            <p className="text-xs text-[#EAE6DF]/60 mb-6 leading-relaxed">
              {activeTab === 'active'
                ? 'You do not have any active kitchen orders right now. Explore our tasting menu to order.'
                : 'Past completed orders will appear here once settled.'}
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-warm hover:brightness-110 transition-all">
              Browse Menu <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {displayedOrders.map((order) => {
              const currentStage = getStageIndex(order);
              const stages = order.order_type === 'delivery' ? DELIVERY_STAGES : DINE_IN_STAGES;
              const etaText = calculateETA(order, nowMs);
              const isPaid = order.payment_status === 'paid';
              const orderNum = order.order_number || `#PX-${String(order.id).slice(0, 6).toUpperCase()}`;

              // Extract parsed items
              const items = order.items_detail && order.items_detail.length > 0
                ? order.items_detail
                : (order.dish_names || []).map((name) => {
                    const match = name.match(/^(\d+)x\s*(.*)$/);
                    return {
                      name: match ? match[2] : name,
                      qty: match ? Number(match[1]) : 1,
                      price: Math.round(Number(order.total_amount) / (order.dish_names.length || 1)),
                    };
                  });

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-dark rounded-3xl border border-[#C5A880]/20 p-5 sm:p-8 bg-[#121212]/95 shadow-2xl relative overflow-hidden">
                  {/* Top Bar: Order ID, Table, Status Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#C5A880]/15">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-base sm:text-lg font-bold text-[#C5A880]">
                          {orderNum}
                        </span>
                        {order.table_number && (
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/25">
                            Table {order.table_number}
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[#EAE6DF]/60 bg-white/5 px-2 py-0.5 rounded">
                          {order.order_type ? order.order_type.replace('_', ' ') : 'Dine-In'}
                        </span>
                      </div>
                      {order.created_at && (
                        <p className="text-[11px] text-[#EAE6DF]/40 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${isPaid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                        {isPaid ? 'PAID' : 'PAYMENT PENDING'}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[#EAE6DF] font-mono">
                        ₹{Number(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Live Progress Stepper */}
                  {order.status !== 'cancelled' ? (
                    <div className="py-6 sm:py-7">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#C5A880] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Order Progress
                        </span>
                        <span className="text-xs font-semibold text-[#EAE6DF] px-3 py-1 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/30 font-mono">
                          {etaText}
                        </span>
                      </div>

                      {/* Stepper Pipeline */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-3">
                        {stages.map((stage, idx) => {
                          const isDone = currentStage > idx;
                          const isCurrent = currentStage === idx;
                          const isUpcoming = currentStage < idx;

                          return (
                            <div
                              key={stage.key}
                              className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
                                isCurrent
                                  ? 'bg-[#C5A880]/15 border-[#C5A880] shadow-warm'
                                  : isDone
                                    ? 'bg-[#181818] border-[#C5A880]/30 text-[#EAE6DF]'
                                    : 'bg-[#101010]/60 border-white/5 opacity-40'
                              }`}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-mono font-bold text-[#C5A880]">
                                  0{idx + 1}
                                </span>
                                {isDone ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />
                                ) : isCurrent ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-[#C5A880] animate-pulse" />
                                ) : (
                                  <Circle className="w-3 h-3 text-stone-600" />
                                )}
                              </div>
                              <p className={`text-[11px] font-bold leading-tight ${isCurrent ? 'text-[#C5A880]' : 'text-[#EAE6DF]'}`}>
                                {stage.label}
                              </p>
                              <p className="text-[9px] text-[#EAE6DF]/50 mt-0.5 hidden sm:block truncate">
                                {stage.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="my-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-rose-400">Order Cancelled</p>
                        <p className="text-[11px] text-[#EAE6DF]/60">
                          {order.notes || 'This order was cancelled by restaurant staff.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Items Ordered List */}
                  <div className="pt-4 border-t border-[#C5A880]/15">
                    <p className="text-[11px] font-semibold text-[#EAE6DF]/70 uppercase tracking-wider mb-2.5">
                      Items Ordered ({items.length})
                    </p>
                    <div className="space-y-1.5 mb-5">
                      {items.map((item: any, i: number) => {
                        const linePrice = (Number(item.price) || 0) * (Number(item.qty) || 1);
                        return (
                          <div key={i} className="flex items-center justify-between text-xs py-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 text-center font-bold text-[#C5A880] font-mono">
                                {item.qty}×
                              </span>
                              <span className="text-[#EAE6DF] font-medium">{item.name}</span>
                            </div>
                            <span className="text-[#EAE6DF]/70 font-mono">
                              ₹{linePrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#C5A880]/10">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link
                          href={`/bill?order_id=${order.id}`}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#181818] border border-[#C5A880]/30 hover:border-[#C5A880] text-xs font-bold uppercase tracking-wider text-[#C5A880] transition-colors">
                          <Receipt className="w-3.5 h-3.5" /> View Bill
                        </Link>

                        {!isPaid && (
                          <button
                            type="button"
                            onClick={() => setPayingOrderId(payingOrderId === order.id ? null : order.id)}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider shadow-warm hover:brightness-110 transition-all">
                            Pay ₹{Number(order.total_amount).toFixed(2)}
                          </button>
                        )}
                      </div>

                      <Link
                        href="/menu"
                        className="text-xs text-[#EAE6DF]/60 hover:text-[#C5A880] transition-colors flex items-center gap-1">
                        <Utensils className="w-3 h-3" /> Order More Items
                      </Link>
                    </div>

                    {/* Inline Quick Payment Modal for this specific order */}
                    {payingOrderId === order.id && !isPaid && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 p-4 rounded-2xl bg-[#0F0F0F] border border-[#C5A880]/30 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-bold text-[#EAE6DF] uppercase tracking-wider">
                            Choose Payment Method
                          </p>
                          <span className="font-mono text-xs text-[#C5A880] font-bold">
                            Payable: ₹{Number(order.total_amount).toFixed(2)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                            { id: 'card', label: 'Card', icon: CreditCard },
                            { id: 'cash', label: 'Cash', icon: Banknote },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setPaymentMethod(opt.id as any)}
                              className={`py-2 px-1 rounded-xl text-[11px] font-medium border transition-all flex flex-col items-center gap-1 ${
                                paymentMethod === opt.id
                                  ? 'bg-[#C5A880]/15 border-[#C5A880] text-[#C5A880]'
                                  : 'bg-[#121212] border-white/5 text-[#EAE6DF]/50'
                              }`}>
                              <opt.icon className="w-3.5 h-3.5" />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickPay(order)}
                          disabled={payProcessing}
                          className="w-full py-3 rounded-xl bg-[#C5A880] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50">
                          {payProcessing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                          ) : (
                            <>Confirm Payment of ₹{Number(order.total_amount).toFixed(2)}</>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
        </div>
      }>
      <OrderContent />
    </Suspense>
  );
}
