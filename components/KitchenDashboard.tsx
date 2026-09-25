'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat,
  Clock3,
  Flame,
  CheckCircle2,
  RefreshCw,
  BellRing,
  AlertTriangle,
  XCircle,
  Timer,
  Play,
  CheckCheck,
  Volume2,
  VolumeX,
  LogOut,
  UtensilsCrossed,
  Filter,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, type Order } from '@/lib/supabase';
import { clearClientSession } from '@/lib/auth';

function formatElapsedTimer(createdAt?: string, now = Date.now()) {
  if (!createdAt) return '00:00';
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return '00:00';
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getDelayTone(createdAt?: string, now = Date.now()) {
  if (!createdAt) return 'normal';
  const start = new Date(createdAt).getTime();
  const diffMinutes = (now - start) / 60000;
  if (diffMinutes > 20) return 'critical'; // Red/Crimson
  if (diffMinutes > 10) return 'warning';  // Amber
  return 'normal';                        // Emerald/Gold
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState('Ingredient unavailable');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Live timer tick every second for stopwatches
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch kitchen orders
  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .in('status', ['placed', 'preparing', 'ready', 'completed', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(60);

      if (data) {
        // DEFENSIVE SAFEGUARD: Only verified orders reach the kitchen display
        const verifiedOnly = (data as any[]).filter(
          (o) =>
            o.status !== 'pending_verification' &&
            o.verification_status !== 'PENDING_TABLE_VERIFICATION' &&
            o.verification_status !== 'HOLD'
        );
        setOrders(verifiedOnly);
      }
    } catch (err) {
      console.error('KDS fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time listener for incoming KOTs
  useEffect(() => {
    const channel = supabase
      .channel('kds-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: RESTAURANT_TABLES.orders },
        (payload) => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Status progression action
  async function handleAdvanceStatus(orderId: string, nextStatus: 'preparing' | 'ready' | 'completed' | 'cancelled', priority?: 'NORMAL' | 'HIGH' | 'URGENT') {
    setProcessingId(orderId);
    try {
      if (nextStatus === 'ready') {
        // Use dedicated serving endpoint to trigger waiter notifications & time tracking
        await fetch('/api/orders/serve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ready',
            order_id: orderId,
            priority: priority || 'NORMAL',
            user_role: 'chef',
          }),
        });
      } else {
        const updateData: Record<string, unknown> = { status: nextStatus };
        if (nextStatus === 'cancelled' && rejectReason) {
          updateData.notes = `Rejected by Kitchen: ${rejectReason}`;
        }

        await fetch('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId, ...updateData }),
        });
      }

      setRejectModalOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error('KDS status advance error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  function handleLogout() {
    clearClientSession();
    window.location.href = '/login';
  }

  // Group orders into 4 KDS Kanban columns (Verified KOTs only)
  const kanbanColumns = useMemo(() => {
    const verified = orders.filter(
      (o) =>
        o.status !== 'pending_verification' &&
        o.verification_status !== 'PENDING_TABLE_VERIFICATION' &&
        o.verification_status !== 'HOLD'
    );
    const newPlaced = verified.filter((o) => o.status === 'placed');
    const preparing = verified.filter((o) => o.status === 'preparing');
    const ready = verified.filter((o) => o.status === 'ready' || o.status === 'picked_up');
    const completed = verified.filter((o) => o.status === 'completed' || o.status === 'served').slice(0, 10);

    return {
      placed: newPlaced,
      preparing,
      ready,
      completed,
    };
  }, [orders]);

  function renderOrderCard(ord: Order, columnType: string) {
    const timerText = formatElapsedTimer(ord.created_at, nowTimestamp);
    const delay = getDelayTone(ord.created_at, nowTimestamp);

    const cardDelayStyle =
      delay === 'critical'
        ? 'border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
        : delay === 'warning'
        ? 'border-amber-500/50'
        : 'border-[#C5A880]/20';

    const busy = processingId === ord.id;

    return (
      <motion.div
        key={ord.id}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-dark rounded-2xl p-4 border transition-all ${cardDelayStyle} space-y-3 relative`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider block">
              {ord.order_number || `#${String(ord.id).slice(0, 8)}`}
            </span>
            <h4 className="font-bold text-base text-[#EAE6DF]">
              {ord.table_number ? `Table ${ord.table_number}` : ord.order_type === 'delivery' ? '🛵 Delivery' : '🛍️ Takeaway'}
            </h4>
          </div>

          {/* Cooking Stopwatch */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
              delay === 'critical'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : delay === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#1A1A1A] text-[#C5A880] border-[#C5A880]/20'
            }`}>
            <Clock3 className="w-3.5 h-3.5" />
            <span>{timerText}</span>
          </div>
        </div>

        {/* Dishes list with modifiers */}
        <div className="space-y-1.5 p-2.5 rounded-xl bg-[#121212]/90 border border-[#C5A880]/10 text-xs">
          {(ord.dish_names || []).map((name, i) => (
            <div key={i} className="flex justify-between text-[#EAE6DF]">
              <span className="font-semibold">{name}</span>
            </div>
          ))}
        </div>

        {/* Kitchen Notes */}
        {ord.notes && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
            <span className="font-bold">Note: </span> {ord.notes}
          </div>
        )}

        {/* Action Buttons */}
        {columnType !== 'completed' && (
          <div className="flex gap-2 pt-2 border-t border-[#C5A880]/10">
            {columnType === 'placed' && (
              <>
                <button
                  disabled={busy}
                  onClick={() => handleAdvanceStatus(ord.id, 'preparing')}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md">
                  <Play className="w-3.5 h-3.5 fill-current" /> Start Cooking
                </button>
                <button
                  disabled={busy}
                  onClick={() => setRejectModalOrder(ord)}
                  className="px-2.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs transition-all">
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}

            {columnType === 'preparing' && (
              <div className="w-full space-y-2">
                <button
                  disabled={busy}
                  onClick={() => handleAdvanceStatus(ord.id, 'ready', ord.priority || 'NORMAL')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md">
                  <CheckCircle2 className="w-4 h-4" /> Mark Ready for Server
                </button>
              </div>
            )}

            {columnType === 'ready' && (
              <div className="w-full space-y-2">
                {ord.status === 'picked_up' ? (
                  <div className="w-full p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
                    <div className="flex items-center justify-between font-semibold">
                      <span>🍽️ Picked up by {ord.picked_up_by || ord.waiter_name || 'Waiter'}</span>
                      <span className="font-mono text-[10px] text-sky-300">Table {ord.table_number}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-amber-300/90 font-medium px-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Awaiting Server Pickup
                    </span>
                    {ord.ready_at && (
                      <span className="font-mono text-xs font-bold text-[#C5A880]">
                        {formatElapsedTimer(ord.ready_at, nowTimestamp)}
                      </span>
                    )}
                  </div>
                )}

                <button
                  disabled={busy}
                  onClick={() => handleAdvanceStatus(ord.id, 'completed')}
                  className="w-full py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#C5A880]/20 text-[#C5A880] font-bold text-xs border border-[#C5A880]/30 flex items-center justify-center gap-1.5 transition-all">
                  <CheckCheck className="w-3.5 h-3.5" /> Direct Pass Serve
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-b border-[#C5A880]/20 px-4 py-3 shadow-xl">
        <div className="max-w-[98rem] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C5A880]/20 to-[#8C7355]/30 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880] shadow-warm">
              <Flame className="w-5 h-5 text-[#C5A880]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg tracking-wide text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  KITCHEN DISPLAY SYSTEM (KDS)
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-xs text-[#EAE6DF]/60">
                Back of House · Realtime Ticket Stream · Active Cook Timers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick counters */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                New: {kanbanColumns.placed.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                Cooking: {kanbanColumns.preparing.length}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Ready: {kanbanColumns.ready.length}
              </span>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#C5A880]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={fetchOrders}
              disabled={refreshing}
              title="Refresh tickets"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#C5A880]' : ''}`} />
            </button>

            <button
              onClick={handleLogout}
              title="Exit KDS"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-rose-500/40 flex items-center justify-center text-[#EAE6DF]/70 hover:text-rose-400 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 4-Column Kanban KDS Layout */}
      <div className="max-w-[98rem] mx-auto px-4 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* Column 1: NEW / PLACED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#121212] border border-amber-500/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-300">
                  1. New Orders ({kanbanColumns.placed.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50">Action required</span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {kanbanColumns.placed.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-[#C5A880]/10 bg-[#121212]/50 text-xs text-[#EAE6DF]/40">
                  No pending tickets
                </div>
              ) : (
                kanbanColumns.placed.map((ord) => renderOrderCard(ord, 'placed'))
              )}
            </div>
          </div>

          {/* Column 2: PREPARING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#121212] border border-sky-500/30">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-sky-400 animate-pulse" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-sky-300">
                  2. Preparing ({kanbanColumns.preparing.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50">Live timers</span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {kanbanColumns.preparing.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-[#C5A880]/10 bg-[#121212]/50 text-xs text-[#EAE6DF]/40">
                  No orders currently cooking
                </div>
              ) : (
                kanbanColumns.preparing.map((ord) => renderOrderCard(ord, 'preparing'))
              )}
            </div>
          </div>

          {/* Column 3: READY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#121212] border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
                  3. Ready for Server ({kanbanColumns.ready.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50">Pickup</span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {kanbanColumns.ready.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-[#C5A880]/10 bg-[#121212]/50 text-xs text-[#EAE6DF]/40">
                  No tickets waiting for pickup
                </div>
              ) : (
                kanbanColumns.ready.map((ord) => renderOrderCard(ord, 'ready'))
              )}
            </div>
          </div>

          {/* Column 4: COMPLETED / SERVED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#121212] border border-[#C5A880]/20">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-[#C5A880]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#C5A880]">
                  4. Dispatched ({kanbanColumns.completed.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#EAE6DF]/50">Recent History</span>
            </div>

            <div className="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {kanbanColumns.completed.length === 0 ? (
                <div className="py-16 text-center rounded-2xl border border-[#C5A880]/10 bg-[#121212]/50 text-xs text-[#EAE6DF]/40">
                  Completed orders appear here
                </div>
              ) : (
                kanbanColumns.completed.map((ord) => renderOrderCard(ord, 'completed'))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Order Modal */}
      <AnimatePresence>
        {rejectModalOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark border border-rose-500/30 rounded-3xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Cancel / Reject Ticket</h3>
              </div>
              <p className="text-xs text-[#EAE6DF]/70">
                Order for Table {rejectModalOrder.table_number || 'Takeaway'} will be marked cancelled.
              </p>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/60 block mb-1">Reason for cancellation</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-[#121212] border border-[#C5A880]/30 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none">
                  <option value="Ingredient 86d / out of stock">Ingredient 86d / out of stock</option>
                  <option value="Kitchen overloaded / delay">Kitchen overloaded / delay</option>
                  <option value="Customer requested cancellation">Customer requested cancellation</option>
                  <option value="Duplicate order ticket">Duplicate order ticket</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOrder(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF]">
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(rejectModalOrder.id, 'cancelled')}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors">
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}