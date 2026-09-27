'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BellRing,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  CheckCheck,
  ArrowLeft,
  Volume2,
  VolumeX,
  Flame,
  Layers,
  Utensils,
  ChevronRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, type Order, DEFAULT_RESTAURANT_ID } from '@/lib/supabase';

// High-precision elapsed time formatter
function formatElapsed(timeIso?: string, now = Date.now()) {
  if (!timeIso) return '00:00';
  const start = new Date(timeIso).getTime();
  if (Number.isNaN(start)) return '00:00';
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ReadyToServePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [sortBy, setSortBy] = useState<'oldest' | 'table' | 'priority'>('oldest');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Waiter Identity
  const [waiterName, setWaiterName] = useState('Marco Vance');
  const [waiterId, setWaiterId] = useState('W-1001');

  // Confirmation Modals
  const [confirmModalOrder, setConfirmModalOrder] = useState<Order | null>(null);
  const [qrVerifyModalOrder, setQrVerifyModalOrder] = useState<Order | null>(null);
  const [scannedQrToken, setScannedQrToken] = useState('');
  const [qrErrorMsg, setQrErrorMsg] = useState('');
  const [qrSuccessMsg, setQrSuccessMsg] = useState('');
  const [batchServeTable, setBatchServeTable] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevReadyCountRef = useRef(0);

  // Play browser Web Audio API chime
  const playChime = useCallback(() => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [soundEnabled]);

  // Load waiter identity from local session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('prathomix_user');
      if (raw) {
        try {
          const u = JSON.parse(raw);
          if (u.name) setWaiterName(u.name);
          if (u.employee_code || u.id) setWaiterId(u.employee_code || u.id);
        } catch {}
      }
    }
  }, []);

  // Timer tick for active stopwatches
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch ready and picked up orders
  const fetchServingOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/serve?notifications=true');
      if (res.ok) {
        const payload = await res.json();
        const list: Order[] = payload.orders || [];
        setOrders(list);

        const currentReadyCount = list.filter((o) => o.status === 'ready').length;
        if (currentReadyCount > prevReadyCountRef.current && prevReadyCountRef.current > 0) {
          playChime();
          setToastMessage(`🔔 New Order Ready for Service!`);
          setTimeout(() => setToastMessage(null), 4000);
        }
        prevReadyCountRef.current = currentReadyCount;
      }
    } catch (err) {
      console.error('Fetch serving queue error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [playChime]);

  useEffect(() => {
    fetchServingOrders();
    // Gentle 30-second fallback sync (realtime handles instant updates)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchServingOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchServingOrders]);

  // Listen to Supabase Realtime changes with debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('ready-to-serve-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: RESTAURANT_TABLES.orders },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchServingOrders();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchServingOrders]);

  // Sorted Orders
  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    if (sortBy === 'oldest') {
      return copy.sort((a, b) => {
        const timeA = new Date(a.ready_at || a.created_at || 0).getTime();
        const timeB = new Date(b.ready_at || b.created_at || 0).getTime();
        return timeA - timeB; // Oldest ready first
      });
    }
    if (sortBy === 'table') {
      return copy.sort((a, b) => (a.table_number || 999) - (b.table_number || 999));
    }
    if (sortBy === 'priority') {
      const rank: Record<string, number> = { URGENT: 3, HIGH: 2, NORMAL: 1 };
      return copy.sort((a, b) => (rank[b.priority || 'NORMAL'] || 1) - (rank[a.priority || 'NORMAL'] || 1));
    }
    return copy;
  }, [orders, sortBy]);

  // Table Groups (for multi-order serving)
  const tableOrderGroups = useMemo(() => {
    const map = new Map<number, Order[]>();
    for (const ord of orders) {
      if (ord.table_number) {
        const current = map.get(ord.table_number) || [];
        current.push(ord);
        map.set(ord.table_number, current);
      }
    }
    return map;
  }, [orders]);

  // 1. ACTION: Pick up food from kitchen pass
  async function handlePickup(order: Order) {
    setProcessingId(order.id);
    try {
      const res = await fetch('/api/orders/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pickup',
          order_id: order.id,
          waiter_id: waiterId,
          waiter_name: waiterName,
          user_role: 'waiter',
        }),
      });

      if (res.ok) {
        setToastMessage(`✓ Picked up ${order.order_number || `#${order.id.slice(0, 6)}`} for Table ${order.table_number}`);
        setTimeout(() => setToastMessage(null), 3000);
        await fetchServingOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Pickup failed');
      }
    } catch (err) {
      console.error('Pickup error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  // 2. ACTION: Mark served at table
  async function handleConfirmServe(order: Order, qrTokenOverride?: string) {
    setProcessingId(order.id);
    setQrErrorMsg('');
    try {
      const res = await fetch('/api/orders/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'serve',
          order_id: order.id,
          table_number: order.table_number,
          waiter_id: waiterId,
          waiter_name: waiterName,
          user_role: 'waiter',
          qr_token: qrTokenOverride || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConfirmModalOrder(null);
        setQrVerifyModalOrder(null);
        setScannedQrToken('');
        setToastMessage(`🎉 Order served to Table ${order.table_number}!`);
        setTimeout(() => setToastMessage(null), 3500);
        await fetchServingOrders();
      } else {
        if (qrTokenOverride) {
          setQrErrorMsg(data.error || 'QR validation failed');
        } else {
          alert(data.error || 'Serving failed');
        }
      }
    } catch (err) {
      console.error('Serve confirmation error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  // 3. ACTION: Batch serve all orders for a table
  async function handleBatchServe(tableNum: number) {
    const tableOrders = tableOrderGroups.get(tableNum) || [];
    if (tableOrders.length === 0) return;

    setProcessingId(`batch-${tableNum}`);
    try {
      const res = await fetch('/api/orders/serve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_serve',
          order_ids: tableOrders.map((o) => o.id),
          table_number: tableNum,
          waiter_id: waiterId,
          waiter_name: waiterName,
          user_role: 'waiter',
        }),
      });

      if (res.ok) {
        setBatchServeTable(null);
        setToastMessage(`🎉 All ${tableOrders.length} orders served to Table ${tableNum}!`);
        setTimeout(() => setToastMessage(null), 3500);
        await fetchServingOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Batch serve failed');
      }
    } catch (err) {
      console.error('Batch serve error:', err);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] pb-24 selection:bg-[#C5A880]/30 selection:text-white">
      {/* Toast alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#1A1A1A] border border-[#C5A880]/40 text-[#C5A880] shadow-[0_10px_30px_rgba(0,0,0,0.8)] font-bold text-sm flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#C5A880]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-b border-[#C5A880]/20 px-4 py-3 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/waiter"
              className="p-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] text-[#EAE6DF] transition-all">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg md:text-xl tracking-wide text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  READY TO SERVE
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {orders.filter((o) => o.status === 'ready').length} Ready
                </span>
                {orders.filter((o) => o.status === 'picked_up').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    {orders.filter((o) => o.status === 'picked_up').length} Picked Up
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EAE6DF]/60">
                Captain {waiterName} ({waiterId}) · Pass Pickup &amp; Table Serving
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
              className={`p-2.5 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/40 border-[#C5A880]/10'
              }`}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                setRefreshing(true);
                fetchServingOrders();
              }}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] text-[#C5A880] transition-all">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Filter and Table Multi-Order Ribbon */}
      <section className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#121212] border border-[#C5A880]/20">
          <div className="flex items-center gap-1.5 text-xs text-[#EAE6DF]/70">
            <Filter className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Sort Queue:</span>
            <div className="flex gap-1 ml-1">
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  sortBy === 'oldest'
                    ? 'bg-[#C5A880] text-[#0A0A0A]'
                    : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-white'
                }`}>
                Oldest Ready
              </button>
              <button
                onClick={() => setSortBy('table')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  sortBy === 'table'
                    ? 'bg-[#C5A880] text-[#0A0A0A]'
                    : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-white'
                }`}>
                By Table
              </button>
              <button
                onClick={() => setSortBy('priority')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  sortBy === 'priority'
                    ? 'bg-[#C5A880] text-[#0A0A0A]'
                    : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-white'
                }`}>
                Urgent First
              </button>
            </div>
          </div>

          {/* Quick stats badge */}
          <div className="text-xs text-[#EAE6DF]/60 font-mono">
            {orders.length === 0 ? 'Pass is currently clear' : `${orders.length} orders in queue`}
          </div>
        </div>

        {/* Multi-Order Table Alerts */}
        {Array.from(tableOrderGroups.entries())
          .filter(([_, group]) => group.length > 1)
          .map(([tblNum, group]) => {
            const readyCount = group.filter((o) => o.status === 'ready' || o.status === 'picked_up').length;
            return (
              <div
                key={tblNum}
                className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold text-amber-200">Table {tblNum} has {group.length} active orders</span>
                    <p className="text-amber-200/70 text-[11px]">
                      {readyCount} ready to serve together. Combine pickup for maximum speed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleBatchServe(tblNum)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-all shadow-md">
                  Serve All ({group.length})
                </button>
              </div>
            );
          })}
      </section>

      {/* Main Order Queue Cards */}
      <section className="max-w-6xl mx-auto px-4 mt-5">
        {loading ? (
          <div className="py-20 text-center text-[#EAE6DF]/50">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-[#C5A880]" />
            Loading Ready Orders...
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="py-24 text-center glass-dark rounded-3xl border border-[#C5A880]/20 p-8 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center mx-auto mb-4 text-[#C5A880]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#EAE6DF] mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              All Tables Served
            </h3>
            <p className="text-sm text-[#EAE6DF]/60 mb-6">
              The kitchen pass is clear. No dishes are currently waiting for server pickup.
            </p>
            <Link
              href="/waiter"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] text-[#0A0A0A] font-bold text-xs hover:brightness-110 transition-all">
              Return to Waiter Floor POS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedOrders.map((ord) => {
              const elapsedTimer = formatElapsed(ord.ready_at || ord.created_at, nowTimestamp);
              const isPickedUp = ord.status === 'picked_up';
              const isUrgent = ord.priority === 'URGENT';
              const isHigh = ord.priority === 'HIGH';

              // Check if waiting for pickup > 5 mins
              const readyTime = new Date(ord.ready_at || ord.created_at || 0).getTime();
              const diffMinutes = (nowTimestamp - readyTime) / 60000;
              const isDelayed = !isPickedUp && diffMinutes >= 5;

              return (
                <motion.div
                  key={ord.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-dark rounded-3xl p-5 border transition-all flex flex-col justify-between relative shadow-xl ${
                    isDelayed
                      ? 'border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.25)] bg-[#140b0d]'
                      : isUrgent
                      ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : isPickedUp
                      ? 'border-sky-500/40 bg-[#0c141c]'
                      : 'border-[#C5A880]/30 hover:border-[#C5A880]/60'
                  }`}>
                  {/* Top Destination Table Banner */}
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider block">
                          {ord.order_number || `#${String(ord.id).slice(0, 8)}`}
                        </span>
                        {/* WRONG TABLE PROTECTION: Huge Table Identifier */}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xl md:text-2xl font-black text-white font-mono tracking-tight">
                            {ord.table_number ? `TABLE ${ord.table_number}` : 'TAKEAWAY PASS'}
                          </span>
                          {ord.table_number && (
                            <span className="px-2 py-0.5 rounded-lg bg-[#C5A880]/15 text-[#C5A880] border border-[#C5A880]/30 text-[11px] font-bold">
                              Dine-In
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ready Elapsed Stopwatch */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                          isDelayed
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                            : isPickedUp
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            : 'bg-[#1A1A1A] text-[#C5A880] border-[#C5A880]/30'
                        }`}>
                        <Clock3 className="w-3.5 h-3.5" />
                        <span>Ready {elapsedTimer} ago</span>
                      </div>
                    </div>

                    {/* Delay Alert Callout */}
                    {isDelayed && (
                      <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Order waiting for pickup 5+ minutes! Deliver immediately.</span>
                      </div>
                    )}

                    {/* Priority & Status Tag */}
                    <div className="flex items-center gap-2 mb-3">
                      {isUrgent ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider">
                          🔥 URGENT PRIORITY
                        </span>
                      ) : isHigh ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                          ⚡ HIGH PRIORITY
                        </span>
                      ) : null}

                      {isPickedUp ? (
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold uppercase tracking-wider">
                          En Route to Table
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                          At Kitchen Pass
                        </span>
                      )}
                    </div>

                    {/* Items Detail List */}
                    <div className="space-y-2 p-3 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 mb-4">
                      {(ord.dish_names || []).map((name, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-[#EAE6DF]">{name}</span>
                          <span className="text-[#C5A880] font-mono font-bold">× 1</span>
                        </div>
                      ))}

                      {ord.notes && (
                        <div className="pt-2 border-t border-[#C5A880]/10 text-[11px] text-amber-300/80">
                          <span className="font-bold">Special Note: </span> {ord.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="pt-2 border-t border-[#C5A880]/15">
                    {!isPickedUp ? (
                      /* Phase 1: Pick Up */
                      <button
                        disabled={processingId === ord.id}
                        onClick={() => handlePickup(ord)}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#9E825D] hover:brightness-110 text-[#0A0A0A] font-black text-sm tracking-wide shadow-warm flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <Utensils className="w-4 h-4" /> PICK UP FOOD
                      </button>
                    ) : (
                      /* Phase 2: Arrived at Table & Serve */
                      <div className="flex gap-2">
                        {/* Direct Confirm Served */}
                        <button
                          disabled={processingId === ord.id}
                          onClick={() => setConfirmModalOrder(ord)}
                          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                          <CheckCircle2 className="w-4 h-4" /> MARK AS SERVED
                        </button>

                        {/* Optional Table QR Scan button */}
                        <button
                          title="Verify Table QR Code before serving"
                          onClick={() => {
                            setQrVerifyModalOrder(ord);
                            setScannedQrToken('');
                            setQrErrorMsg('');
                          }}
                          className="px-3.5 py-3.5 rounded-2xl bg-[#1A1A1A] hover:bg-[#242424] text-[#C5A880] border border-[#C5A880]/30 transition-all flex items-center justify-center">
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* CONFIRMATION MODAL: Serve Order */}
      <AnimatePresence>
        {confirmModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-dark rounded-3xl p-6 border border-[#C5A880]/40 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCheck className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="font-display font-bold text-xl text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Confirm Serving
                </h3>
                <p className="text-xs text-[#EAE6DF]/60 mt-1">
                  Order <span className="font-mono text-[#C5A880] font-bold">{confirmModalOrder.order_number || confirmModalOrder.id}</span> will be marked as served for:
                </p>
                <div className="my-3 py-2 px-4 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/30 inline-block">
                  <span className="font-mono text-2xl font-black text-white">
                    TABLE {confirmModalOrder.table_number || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-[#EAE6DF]/50">
                  Please verify that all {confirmModalOrder.dish_names?.length || 0} items are placed in front of the patrons.
                </p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#C5A880]/15">
                <button
                  onClick={() => setConfirmModalOrder(null)}
                  className="flex-1 py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#EAE6DF]/70 font-semibold text-xs transition-all">
                  Cancel
                </button>
                <button
                  disabled={processingId === confirmModalOrder.id}
                  onClick={() => handleConfirmServe(confirmModalOrder)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all">
                  Confirm Served
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPTIONAL TABLE QR SCAN MODAL */}
      <AnimatePresence>
        {qrVerifyModalOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-dark rounded-3xl p-6 border border-[#C5A880]/40 max-w-md w-full shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/20 border border-[#C5A880]/40 text-[#C5A880] flex items-center justify-center mx-auto">
                <QrCode className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h3 className="font-display font-bold text-xl text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Verify Table QR Code
                </h3>
                <p className="text-xs text-[#EAE6DF]/60 mt-1">
                  Wrong Table Protection: Verify you are physically standing at:
                </p>
                <div className="my-2 py-1.5 px-4 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/30 inline-block font-mono text-xl font-black text-white">
                  TABLE {qrVerifyModalOrder.table_number}
                </div>
              </div>

              {/* QR Input or Camera Scan */}
              <div className="space-y-2">
                <label className="text-[11px] text-[#EAE6DF]/70">Enter or Scan Table QR Token:</label>
                <input
                  type="text"
                  placeholder="e.g. prx_qr_... or scan with camera"
                  value={scannedQrToken}
                  onChange={(e) => setScannedQrToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#121212] border border-[#C5A880]/30 text-white font-mono text-xs focus:border-[#C5A880] outline-none"
                />
              </div>

              {qrErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{qrErrorMsg}</span>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-[#C5A880]/15">
                <button
                  onClick={() => setQrVerifyModalOrder(null)}
                  className="flex-1 py-3 rounded-xl bg-[#1A1A1A] hover:bg-[#222] text-[#EAE6DF]/70 font-semibold text-xs transition-all">
                  Cancel
                </button>
                <button
                  disabled={!scannedQrToken || processingId === qrVerifyModalOrder.id}
                  onClick={() => handleConfirmServe(qrVerifyModalOrder, scannedQrToken)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#9E825D] hover:brightness-110 text-[#0A0A0A] font-bold text-xs shadow-md transition-all disabled:opacity-50">
                  Verify &amp; Serve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
