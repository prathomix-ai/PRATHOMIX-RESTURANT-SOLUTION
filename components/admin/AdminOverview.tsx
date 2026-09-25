'use client';

import { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Utensils,
  Bike,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  BarChart2,
  ChevronDown,
} from 'lucide-react';
import type { Order, Dish, InventoryItem } from '@/lib/supabase';

interface Props {
  orders: Order[];
  dishes: Dish[];
  inventory: InventoryItem[];
  bookingsCount: number;
}

export default function AdminOverview({ orders, dishes, inventory, bookingsCount }: Props) {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'month'>('today');

  // Filter orders by date range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((o) => {
      if (!o.created_at) return true;
      const orderDate = new Date(o.created_at);
      if (dateFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (dateFilter === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (dateFilter === '30days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      if (dateFilter === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [orders, dateFilter]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalRev = filteredOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const completedOrders = filteredOrders.filter((o) => o.status !== 'cancelled');
    const aov = completedOrders.length > 0 ? totalRev / completedOrders.length : 0;

    const dineInOrders = filteredOrders.filter((o) => o.order_type === 'dine_in' || o.table_number);
    const deliveryOrders = filteredOrders.filter((o) => o.order_type === 'delivery');
    const takeawayOrders = filteredOrders.filter((o) => o.order_type === 'takeaway');

    const dineInRev = dineInOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const deliveryRev = deliveryOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const takeawayRev = takeawayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const cancelledCount = filteredOrders.filter((o) => o.status === 'cancelled').length;
    const lowStockCount = inventory.filter((item) => item.current_stock <= item.min_stock).length;

    return {
      totalRev,
      orderCount: filteredOrders.length,
      aov,
      dineInRev,
      deliveryRev,
      takeawayRev,
      cancelledCount,
      lowStockCount,
    };
  }, [filteredOrders, inventory]);

  // Top selling dishes
  const topDishes = useMemo(() => {
    const map = new Map<string, { count: number; rev: number }>();
    filteredOrders.forEach((o) => {
      (o.dish_names || []).forEach((name) => {
        const cleanName = name.replace(/^\d+x\s*/, '').replace(/\s*\([^)]*\)/, '').trim();
        const existing = map.get(cleanName) || { count: 0, rev: 0 };
        map.set(cleanName, { count: existing.count + 1, rev: existing.rev });
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2
            className="font-display text-2xl font-bold text-[#EAE6DF] tracking-wide"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Executive Dashboard
          </h2>
          <p className="text-xs text-[#EAE6DF]/60">
            Realtime revenue streams, operational efficiency, and guest volume
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#121212] border border-[#C5A880]/20">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: 'month', label: 'This Month' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all ${
                dateFilter === item.id
                  ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-sm'
                  : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
              }`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-5 shadow-warm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#EAE6DF]/60">
            <span className="uppercase tracking-wider font-semibold">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-[#C5A880]" />
          </div>
          <p className="text-2xl font-bold text-[#C5A880] font-display" style={{ fontFamily: 'Cinzel, serif' }}>
            ₹{metrics.totalRev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Zero Commission Direct
          </span>
        </div>

        <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-5 shadow-warm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#EAE6DF]/60">
            <span className="uppercase tracking-wider font-semibold">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-[#EAE6DF]">{metrics.orderCount}</p>
          <span className="text-[10px] text-[#EAE6DF]/60">Avg Value: ₹{metrics.aov.toFixed(0)}</span>
        </div>

        <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-5 shadow-warm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#EAE6DF]/60">
            <span className="uppercase tracking-wider font-semibold">Reservations</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#EAE6DF]">{bookingsCount}</p>
          <span className="text-[10px] text-emerald-400 font-semibold">Front Desk Managed</span>
        </div>

        <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-5 shadow-warm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#EAE6DF]/60">
            <span className="uppercase tracking-wider font-semibold">Stock Alerts</span>
            <AlertTriangle className={`w-4 h-4 ${metrics.lowStockCount > 0 ? 'text-amber-400' : 'text-stone-400'}`} />
          </div>
          <p className={`text-2xl font-bold ${metrics.lowStockCount > 0 ? 'text-amber-400' : 'text-[#EAE6DF]'}`}>
            {metrics.lowStockCount}
          </p>
          <span className="text-[10px] text-[#EAE6DF]/60">
            {metrics.lowStockCount > 0 ? 'Action required in Inventory' : 'Stock levels optimal'}
          </span>
        </div>
      </div>

      {/* Sales by Channel & Top Dishes */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Channel Breakdown */}
        <div className="lg:col-span-6 glass-dark border border-[#C5A880]/20 rounded-3xl p-6 shadow-xl space-y-5">
          <h3
            className="font-display font-bold text-base text-[#EAE6DF] flex items-center gap-2"
            style={{ fontFamily: 'Cinzel, serif' }}>
            <BarChart2 className="w-4 h-4 text-[#C5A880]" /> Sales by Service Channel
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#EAE6DF]">
                  <Utensils className="w-3.5 h-3.5 text-[#C5A880]" /> Dine-In (Table Service)
                </span>
                <span className="text-[#C5A880]">₹{metrics.dineInRev.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#121212] overflow-hidden">
                <div
                  className="h-full bg-[#C5A880] rounded-full"
                  style={{ width: `${metrics.totalRev > 0 ? (metrics.dineInRev / metrics.totalRev) * 100 : 50}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#EAE6DF]">
                  <Bike className="w-3.5 h-3.5 text-sky-400" /> Direct Delivery (Zero Aggregator Fee)
                </span>
                <span className="text-sky-400">₹{metrics.deliveryRev.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#121212] overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${metrics.totalRev > 0 ? (metrics.deliveryRev / metrics.totalRev) * 100 : 30}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-[#EAE6DF]">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Takeaway &amp; Pickup
                </span>
                <span className="text-emerald-400">₹{metrics.takeawayRev.toFixed(0)}</span>
              </div>
              <div className="h-2 rounded-full bg-[#121212] overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${metrics.totalRev > 0 ? (metrics.takeawayRev / metrics.totalRev) * 100 : 20}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/10 flex items-center justify-between text-xs text-[#EAE6DF]/70">
            <span>Aggregator Commission Saved:</span>
            <span className="text-emerald-400 font-bold">~₹{(metrics.totalRev * 0.22).toFixed(0)} (22%)</span>
          </div>
        </div>

        {/* Top Selling Dishes */}
        <div className="lg:col-span-6 glass-dark border border-[#C5A880]/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3
            className="font-display font-bold text-base text-[#EAE6DF] flex items-center gap-2"
            style={{ fontFamily: 'Cinzel, serif' }}>
            <Sparkles className="w-4 h-4 text-[#C5A880]" /> Top Performing Dishes
          </h3>

          {topDishes.length === 0 ? (
            <p className="text-xs text-[#EAE6DF]/50 py-8 text-center">No order history for this range.</p>
          ) : (
            <div className="space-y-3">
              {topDishes.map((dish, i) => (
                <div
                  key={dish.name}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#121212] border border-[#C5A880]/10">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#C5A880]/15 text-[#C5A880] text-xs font-bold flex items-center justify-center">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-xs text-[#EAE6DF]">{dish.name}</span>
                  </div>
                  <span className="text-xs text-[#C5A880] font-bold">{dish.count} ordered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
