'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Loader2, RefreshCw, ChefHat, CheckCircle2, ArrowRightCircle, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function minutesAgo(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function statusTone(status) {
  switch (status) {
    case 'preparing':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'ready':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'served':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200';
  }
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  async function fetchOrders() {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['placed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const channel = supabase.channel('realtime:orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' },
      () => { fetchOrders(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateOrderStatus(orderId, status) {
    setSavingId(orderId);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to update order');
      }

      await fetchOrders();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update order');
    } finally {
      setSavingId('');
    }
  }

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const pendingCount = orders.filter((order) => order.status === 'placed').length;
  const activeCount = orders.filter((order) => ['placed', 'preparing', 'ready'].includes(order.status)).length;
  const servedCount = orders.filter((order) => order.status === 'served' || order.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#f6efe3] text-stone-900 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-700">
              <ChefHat className="h-3.5 w-3.5" /> Kitchen Live Board
            </div>
            <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>
            <p className="mt-1 text-sm text-stone-600">Track incoming orders, move them through prep, and mark them served.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchOrders}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-50">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
              <span className="font-semibold">Pending:</span> {pendingCount}
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
              <span className="font-semibold">Active:</span> {activeCount}
            </div>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm">
              <span className="font-semibold">Served:</span> {servedCount}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {['all', 'placed', 'preparing', 'ready', 'served', 'completed'].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                filter === value ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}>
              {value}
            </button>
          ))}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-3xl border border-stone-200 bg-white py-16 text-stone-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading kitchen board…
          </div>
        ) : visibleOrders.length ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleOrders.map((order) => {
              const orderAge = minutesAgo(order.created_at);
              const busy = savingId === order.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Order #{String(order.id).slice(0, 8)}</p>
                      <h2 className="mt-1 text-xl font-semibold">Table {order.table_number ?? '—'}</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1">
                      <Clock3 className="h-4 w-4" /> {orderAge} min ago
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1">
                      <BellRing className="h-4 w-4" /> Split: {order.split_count ?? 1}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {(order.items ?? order.dish_names ?? []).map((dish, index) => {
                      const dishName = typeof dish === 'string' ? dish : dish?.name ?? dish?.title ?? 'Item';

                      return (
                      <div key={`${order.id}-${index}`} className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                        <span className="font-medium text-stone-800">{dishName}</span>
                        <span className="text-stone-500">Item {index + 1}</span>
                      </div>
                    );})}
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3 text-sm">
                    <span className="font-medium text-amber-900">Total</span>
                    <span className="font-semibold text-amber-900">₹{Number(order.total_price ?? order.total_amount ?? 0).toFixed(2)}</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || order.status === 'preparing'}
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightCircle className="h-4 w-4" />} Preparing
                    </button>
                    <button
                      type="button"
                      disabled={busy || order.status === 'ready'}
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60">
                      <CheckCircle2 className="h-4 w-4" /> Ready
                    </button>
                    <button
                      type="button"
                      disabled={busy || order.status === 'served'}
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60">
                      <BellRing className="h-4 w-4" /> Served
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white py-16 text-center text-stone-500">
            No orders match this filter.
          </div>
        )}
      </div>
    </div>
  );
}