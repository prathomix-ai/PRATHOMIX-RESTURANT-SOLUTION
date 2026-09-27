'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  ChefHat,
  BellRing,
  Clock3,
  CheckCircle2,
  RefreshCw,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Receipt,
  Users,
  Sparkles,
  ArrowRight,
  LogOut,
  Layers,
  ArrowLeftRight,
  Printer,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  Settings,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type Dish, type Order } from '@/lib/supabase';
import { clearClientSession } from '@/lib/auth';
import RoleOnboardingTutorial from './RoleOnboardingTutorial';
import StaffSettingsModal from './StaffSettingsModal';
import StaffPresenceHeartbeat from './StaffPresenceHeartbeat';

const MODIFIERS_LIST = [
  'Extra Spicy 🌶️',
  'Less Spicy 🌶️',
  'No Onion 🧅',
  'No Garlic 🧄',
  'Extra Cheese 🧀',
  'Less Salt 🧂',
  'Gluten-Free 🌾',
  'Dairy-Free 🥛',
];

interface OrderItemDraft {
  dish: Dish;
  qty: number;
  modifiers: string[];
  notes: string;
}

export default function WaiterDashboard() {
  const [activeTab, setActiveTab] = useState<'tables' | 'pos' | 'kots' | 'verify' | 'ready'>('tables');
  const [waiterName, setWaiterName] = useState('Marco Vance');
  const [waiterId, setWaiterId] = useState('W-1001');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectVerifyModal, setRejectVerifyModal] = useState<Order | null>(null);
  const [verifyRejectReason, setVerifyRejectReason] = useState('Customer absent from table / remote QR abuse');

  // Data states
  const [tables, setTables] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // POS State
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dishSearch, setDishSearch] = useState('');
  const [currentTicket, setCurrentTicket] = useState<OrderItemDraft[]>([]);
  const [customizingItem, setCustomizingItem] = useState<OrderItemDraft | null>(null);
  const [submittingKOT, setSubmittingKOT] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Modals
  const [tableModal, setTableModal] = useState<{ type: 'merge' | 'transfer'; tableNum: number } | null>(null);
  const [targetTable, setTargetTable] = useState<number>(2);

  // Load waiter identity
  useEffect(() => {
    const raw = localStorage.getItem('prathomix_user');
    if (raw) {
      try {
        const u = JSON.parse(raw);
        if (u.name) setWaiterName(u.name);
        if (u.employee_code || u.id) setWaiterId(u.employee_code || u.id);
      } catch {}
    }
  }, []);

  // Fetch running orders only (for fast realtime updates without refetching static menu)
  const fetchOrdersOnly = useCallback(async () => {
    try {
      const restId = typeof window !== 'undefined'
        ? localStorage.getItem('prathomix_restaurant_id') || '10000000-0000-0000-0000-000000000001'
        : '10000000-0000-0000-0000-000000000001';

      let query = supabase
        .from(RESTAURANT_TABLES.orders)
        .select('id, restaurant_id, order_number, table_number, dish_names, items_detail, total_amount, status, verification_status, priority, ready_at, notes, special_instructions, waiter_id, waiter_name, created_at')
        .in('status', ['pending_verification', 'placed', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });

      if (restId) {
        query = query.or(`restaurant_id.eq.${restId},restaurant_id.is.null`);
      }

      const { data: orderData } = await query;
      if (orderData) {
        setOrders(orderData as any);
      }
    } catch (err) {
      console.error('Waiter fetch orders error:', err);
    }
  }, []);

  // Fetch initial full data (tables, dishes, orders)
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const restId = typeof window !== 'undefined'
        ? localStorage.getItem('prathomix_restaurant_id') || '10000000-0000-0000-0000-000000000001'
        : '10000000-0000-0000-0000-000000000001';

      // 1. Fetch tables
      const { data: tableData } = await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .select('id, table_number, capacity, section, status')
        .order('table_number', { ascending: true });

      if (tableData && tableData.length > 0) {
        setTables(tableData);
      } else {
        // Fallback default 10 tables
        setTables(
          Array.from({ length: 10 }, (_, i) => ({
            table_number: i + 1,
            capacity: i < 2 ? 2 : i > 7 ? 8 : 4,
            section: i < 4 ? 'Terrace' : i < 8 ? 'Main Dining' : 'VIP Lounge',
            status: i === 1 || i === 3 ? 'occupied' : 'available',
          }))
        );
      }

      // 2. Fetch dishes (cached catalog)
      const { data: dishData } = await supabase
        .from(RESTAURANT_TABLES.dishes)
        .select('id, name, price, category, veg_type, calories, protein, available, image_url')
        .eq('available', true);

      if (dishData && dishData.length > 0) {
        setDishes(dishData as Dish[]);
      }

      // 3. Fetch running orders
      await fetchOrdersOnly();
    } catch (err) {
      console.error('Waiter fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchOrdersOnly]);

  useEffect(() => {
    fetchData();
    // Gentle 30-second fallback sync
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchOrdersOnly();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, fetchOrdersOnly]);

  // Real-time listener for order updates with debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('waiter-orders-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: RESTAURANT_TABLES.orders },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchOrdersOnly();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchOrdersOnly]);

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    dishes.forEach((d) => {
      if (d.category) cats.add(d.category);
    });
    return Array.from(cats);
  }, [dishes]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((d) => {
      const matchCat = selectedCategory === 'All' || d.category === selectedCategory;
      const matchSearch =
        !dishSearch.trim() ||
        d.name.toLowerCase().includes(dishSearch.toLowerCase()) ||
        d.description?.toLowerCase().includes(dishSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [dishes, selectedCategory, dishSearch]);

  // Cart actions
  function addToTicket(dish: Dish) {
    setCurrentTicket((prev) => {
      const existing = prev.find((item) => item.dish.id === dish.id);
      if (existing) {
        return prev.map((item) =>
          item.dish.id === dish.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { dish, qty: 1, modifiers: [], notes: '' }];
    });
  }

  function updateItemQty(dishId: string, delta: number) {
    setCurrentTicket((prev) => {
      return prev
        .map((item) => {
          if (item.dish.id === dishId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItemDraft[];
    });
  }

  function toggleModifier(itemDishId: string, mod: string) {
    setCurrentTicket((prev) =>
      prev.map((item) => {
        if (item.dish.id !== itemDishId) return item;
        const exists = item.modifiers.includes(mod);
        const newMods = exists ? item.modifiers.filter((m) => m !== mod) : [...item.modifiers, mod];
        return { ...item, modifiers: newMods };
      })
    );
  }

  const ticketTotal = useMemo(() => {
    return currentTicket.reduce((sum, item) => sum + item.dish.price * item.qty, 0);
  }, [currentTicket]);

  // Send KOT to Kitchen
  async function handleSendKOT() {
    if (currentTicket.length === 0 || submittingKOT) return;
    setSubmittingKOT(true);
    setFeedbackMsg('');

    try {
      const itemsDetail = currentTicket.map((it) => ({
        id: it.dish.id,
        name: it.dish.name,
        price: it.dish.price,
        qty: it.qty,
        modifiers: it.modifiers,
        notes: it.notes,
      }));

      const dishNames = currentTicket.map((it) => {
        const mods = it.modifiers.length > 0 ? ` (${it.modifiers.join(', ')})` : '';
        return `${it.qty}x ${it.dish.name}${mods}`;
      });

      const payload = {
        order_type: 'dine_in',
        table_number: selectedTable,
        waiter_id: waiterId,
        waiter_name: waiterName,
        dish_ids: currentTicket.map((it) => it.dish.id),
        dish_names: dishNames,
        items_detail: itemsDetail,
        total_amount: ticketTotal * 1.05,
        subtotal: ticketTotal,
        tax_amount: ticketTotal * 0.05,
        status: 'placed',
        payment_status: 'pending',
        notes: `KOT by ${waiterName}`,
        idempotency_key: `kot_${waiterId}_${selectedTable}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to send KOT to kitchen');
      }

      setFeedbackMsg(`KOT sent to Kitchen for Table ${selectedTable}!`);
      setCurrentTicket([]);
      setActiveTab('kots');
      fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error transmitting KOT');
    } finally {
      setSubmittingKOT(false);
    }
  }

  // Separate pending verifications from active KOTs
  const pendingVerifications = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === 'pending_verification' ||
        o.verification_status === 'PENDING_TABLE_VERIFICATION' ||
        o.verification_status === 'HOLD'
    );
  }, [orders]);

  const activeKOTOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status !== 'pending_verification' &&
        o.verification_status !== 'PENDING_TABLE_VERIFICATION' &&
        o.verification_status !== 'HOLD'
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'ready' || o.status === 'picked_up');
  }, [orders]);

  // Handle pickup from pass
  async function handlePickupFood(order: Order) {
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
        setFeedbackMsg(`✓ Picked up ${order.order_number || `#${order.id.slice(0, 6)}`} for Table ${order.table_number}`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle mark served
  async function handleServeFood(order: Order) {
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
        }),
      });
      if (res.ok) {
        setFeedbackMsg(`🎉 Order served to Table ${order.table_number}!`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Handle staff physical presence verification
  async function handleVerifyOrder(orderId: string, action: 'confirm' | 'reject' | 'hold', reason = '') {
    setVerifyingId(orderId);
    try {
      const res = await fetch('/api/orders/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          action,
          reason: reason || verifyRejectReason,
          staff_name: waiterName,
          staff_role: 'waiter',
          staff_id: waiterId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify table order');
      }

      setFeedbackMsg(data.message || (action === 'confirm' ? 'Order confirmed and sent to kitchen!' : 'Order rejected.'));
      setRejectVerifyModal(null);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'Error processing verification');
    } finally {
      setVerifyingId(null);
    }
  }

  // Update order status (e.g. mark served)
  async function handleUpdateOrderStatus(orderId: string, status: string) {
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  function handleLogout() {
    clearClientSession();
    window.location.href = '/login';
  }

  // Calculate table occupancy
  const tableSummary = useMemo(() => {
    const occupied = tables.filter((t) => t.status === 'occupied').length;
    const reserved = tables.filter((t) => t.status === 'reserved').length;
    const available = tables.length - occupied - reserved;
    return { occupied, reserved, available };
  }, [tables]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] pb-20">
      {/* Top Staff Navigation Bar */}
      <header
        data-tour="waiter-dashboard"
        className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-b border-[#C5A880]/20 px-4 py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-base tracking-wide text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  PRATHOMIX POS
                </h1>
                <span className="text-[10px] bg-[#C5A880]/15 text-[#C5A880] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Waiter
                </span>
              </div>
              <p className="text-xs text-[#EAE6DF]/60">
                Server: <span className="text-[#C5A880] font-semibold">{waiterName}</span> ({waiterId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={refreshing}
              title="Refresh Floor Data"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#C5A880]' : ''}`} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Waiter Station Settings & Tutorial"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-rose-500/50 flex items-center justify-center text-[#EAE6DF]/70 hover:text-rose-400 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Role Onboarding Tutorial & Staff Settings Modal */}
      <RoleOnboardingTutorial role="waiter" userId={waiterId} userName={waiterName} />
      <StaffSettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        role="waiter"
        staffName={waiterName}
        staffId={waiterId}
      />
      <StaffPresenceHeartbeat role="waiter" userId={waiterId} userName={waiterName} />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* Urgent Table Verification Alert Banner */}
        {pendingVerifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Physical Table Verification Required ({pendingVerifications.length})
                </p>
                <p className="text-xs text-[#EAE6DF]/70">
                  Remote or QR dine-in order(s) awaiting physical guest confirmation before sending to kitchen.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('verify')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-[#0A0A0A] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto flex-shrink-0 shadow-md">
              Verify Guests Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* Ready to Serve Notification Banner */}
        {readyOrders.filter((o) => o.status === 'ready').length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 animate-pulse">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Food Ready to Serve ({readyOrders.filter((o) => o.status === 'ready').length} Orders at Pass)
                </p>
                <p className="text-xs text-[#EAE6DF]/70">
                  Kitchen has completed cooking. Pick up food from pass and deliver to tables.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('ready')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#0A0A0A] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-md">
                Ready Queue <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <Link
                href="/waiter/ready"
                className="px-3.5 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/30 hover:border-[#C5A880] text-[#C5A880] text-xs font-bold transition-all flex items-center gap-1">
                Full Screen
              </Link>
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs — Horizontal scroll on mobile, 5 cols on tablet/desktop */}
        <div className="flex overflow-x-auto sm:grid sm:grid-cols-5 gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#121212] border border-[#C5A880]/15 mb-6 scrollbar-none">
          {[
            { id: 'tables', tour: 'waiter-tables', label: 'Floor Tables', icon: Layers, badge: tableSummary.occupied },
            {
              id: 'ready',
              tour: 'waiter-ready-queue',
              label: 'Ready to Serve',
              icon: Clock3,
              badge: readyOrders.filter((o) => o.status === 'ready').length || null,
              alert: readyOrders.filter((o) => o.status === 'ready').length > 0,
            },
            {
              id: 'verify',
              tour: 'waiter-verify',
              label: 'Verify Orders',
              icon: ShieldCheck,
              badge: pendingVerifications.length || null,
              alert: pendingVerifications.length > 0,
            },
            { id: 'pos', tour: 'waiter-take-order', label: 'Take Order', icon: Utensils, badge: currentTicket.length || null },
            { id: 'kots', tour: 'waiter-orders', label: 'Active KOTs', icon: BellRing, badge: activeKOTOrders.length || null },
          ].map((tab) => (
            <button
              key={tab.id}
              data-tour={tab.tour}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 sm:py-3 px-3 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] shadow-md'
                  : tab.alert
                  ? 'text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'text-[#EAE6DF]/70 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]'
              }`}>
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id
                      ? 'bg-[#0A0A0A] text-[#C5A880]'
                      : tab.alert
                      ? 'bg-amber-400 text-[#0A0A0A]'
                      : 'bg-[#C5A880]/20 text-[#C5A880]'
                  }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Floor & Tables Map */}
        {activeTab === 'tables' && (
          <div className="space-y-6">
            {/* Occupancy metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-dark border border-[#C5A880]/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#EAE6DF]/60">Available</span>
                <p className="text-2xl font-bold text-emerald-400 mt-0.5">{tableSummary.available}</p>
              </div>
              <div className="glass-dark border border-[#C5A880]/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#EAE6DF]/60">Occupied</span>
                <p className="text-2xl font-bold text-amber-400 mt-0.5">{tableSummary.occupied}</p>
              </div>
              <div className="glass-dark border border-[#C5A880]/15 rounded-2xl p-4 text-center">
                <span className="text-[10px] uppercase tracking-wider text-[#EAE6DF]/60">Reserved</span>
                <p className="text-2xl font-bold text-sky-400 mt-0.5">{tableSummary.reserved}</p>
              </div>
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {tables.map((tbl) => {
                const isSelected = selectedTable === tbl.table_number;
                const statusTone =
                  tbl.status === 'occupied'
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    : tbl.status === 'reserved'
                    ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400';

                return (
                  <div
                    key={tbl.table_number}
                    onClick={() => {
                      setSelectedTable(tbl.table_number);
                    }}
                    className={`glass-dark rounded-2xl p-4 border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'border-[#C5A880] ring-2 ring-[#C5A880]/50 shadow-warm'
                        : 'border-[#C5A880]/15 hover:border-[#C5A880]/40'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-base text-[#EAE6DF]">Table {tbl.table_number}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusTone}`}>
                        {tbl.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-[#EAE6DF]/60 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                        <span>Seats {tbl.capacity || 4} guests</span>
                      </div>
                      <p className="text-[11px] text-[#EAE6DF]/50">{tbl.section || 'Main Dining'}</p>
                    </div>

                    <div className="flex gap-1.5 pt-2 border-t border-[#C5A880]/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(tbl.table_number);
                          setActiveTab('pos');
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-[#C5A880]/15 hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A] text-[10px] font-bold uppercase tracking-wider transition-all text-center">
                        Take Order
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Interactive POS Order Taking */}
        {activeTab === 'pos' && (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Menu browser */}
            <div className="lg:col-span-7 space-y-4">
              {/* Table Bar & Search */}
              <div className="glass-dark rounded-2xl p-4 border border-[#C5A880]/20 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#EAE6DF]/60">Ordering for:</span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                    className="bg-[#121212] border border-[#C5A880]/30 rounded-xl px-3 py-1.5 text-xs font-bold text-[#C5A880] outline-none">
                    {tables.map((t) => (
                      <option key={t.table_number} value={t.table_number}>
                        Table {t.table_number} ({t.section || 'Dining'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex-1 min-w-[150px] xs:min-w-[200px]">
                  <Search className="w-4 h-4 text-[#C5A880]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    placeholder="Search dishes or ingredients..."
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#EAE6DF] placeholder-[#EAE6DF]/40 outline-none"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-md'
                        : 'bg-[#121212] border border-[#C5A880]/20 text-[#EAE6DF]/70 hover:text-[#EAE6DF]'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dishes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
                {filteredDishes.map((dish) => (
                  <div
                    key={dish.id}
                    onClick={() => addToTicket(dish)}
                    className="glass-dark border border-[#C5A880]/15 hover:border-[#C5A880] rounded-2xl p-3 flex gap-3 items-center cursor-pointer transition-all hover:bg-[#121212]/90 group">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1A1A1A] flex-shrink-0 border border-[#C5A880]/10">
                      <img
                        src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-[#EAE6DF] truncate">{dish.name}</h4>
                      <p className="text-[11px] text-[#EAE6DF]/50 mt-0.5">
                        {dish.calories ? `${dish.calories} cal · ` : ''}
                        {dish.protein ? `${dish.protein}g protein` : dish.category}
                      </p>
                      <p className="text-xs font-bold text-[#C5A880] mt-1">₹{dish.price}</p>
                    </div>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-[#C5A880]/15 group-hover:bg-[#C5A880] group-hover:text-[#0A0A0A] text-[#C5A880] flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 cols: Live KOT Ticket Preview */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
                  <div>
                    <h3 className="font-bold text-sm text-[#EAE6DF] flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-[#C5A880]" /> KOT Ticket — Table {selectedTable}
                    </h3>
                    <p className="text-[10px] text-[#EAE6DF]/50">Waitperson: {waiterName}</p>
                  </div>
                  {currentTicket.length > 0 && (
                    <button
                      onClick={() => setCurrentTicket([])}
                      className="text-[11px] text-rose-400 hover:underline">
                      Clear
                    </button>
                  )}
                </div>

                {currentTicket.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#EAE6DF]/50">
                    <Utensils className="w-8 h-8 text-[#C5A880]/30 mx-auto mb-2" />
                    Tap dishes on the menu to add to this table&apos;s ticket
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {currentTicket.map((item) => (
                      <div
                        key={item.dish.id}
                        className="p-3 rounded-xl bg-[#121212] border border-[#C5A880]/15 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-[#EAE6DF]">{item.dish.name}</p>
                            <p className="text-[10px] text-[#C5A880]">₹{item.dish.price} each</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateItemQty(item.dish.id, -1)}
                              className="w-6 h-6 rounded bg-[#1A1A1A] border border-[#C5A880]/20 flex items-center justify-center text-xs">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold">{item.qty}</span>
                            <button
                              onClick={() => updateItemQty(item.dish.id, 1)}
                              className="w-6 h-6 rounded bg-[#1A1A1A] border border-[#C5A880]/20 flex items-center justify-center text-xs">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Modifiers Chips */}
                        <div className="flex flex-wrap gap-1">
                          {MODIFIERS_LIST.map((mod) => {
                            const active = item.modifiers.includes(mod);
                            return (
                              <button
                                key={mod}
                                type="button"
                                onClick={() => toggleModifier(item.dish.id, mod)}
                                className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                                  active
                                    ? 'bg-[#C5A880] text-[#0A0A0A] font-bold border-[#C5A880]'
                                    : 'bg-[#1A1A1A] text-[#EAE6DF]/60 border-[#C5A880]/10 hover:border-[#C5A880]/30'
                                }`}>
                                {mod}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subtotal & Action */}
                {currentTicket.length > 0 && (
                  <div className="pt-3 border-t border-[#C5A880]/15 space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#EAE6DF]">Estimated Total (inc. 5% GST):</span>
                      <span className="text-[#C5A880] font-mono text-sm">₹{(ticketTotal * 1.05).toFixed(2)}</span>
                    </div>

                    <button
                      onClick={handleSendKOT}
                      disabled={submittingKOT}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50">
                      <Send className="w-4 h-4" />
                      {submittingKOT ? 'Firing to Kitchen...' : `Send KOT to Kitchen (Table ${selectedTable})`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Running Orders & KOTs */}
        {activeTab === 'kots' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                Active Kitchen Orders ({orders.length})
              </h3>
              <span className="text-xs text-[#C5A880]">Realtime Kitchen Sync Active</span>
            </div>

            {feedbackMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center font-medium">
                {feedbackMsg}
              </div>
            )}

            {orders.length === 0 ? (
              <div className="py-20 text-center glass-dark rounded-3xl border border-[#C5A880]/15">
                <BellRing className="w-10 h-10 text-[#C5A880]/30 mx-auto mb-2" />
                <p className="text-xs text-[#EAE6DF]/60">No active kitchen orders right now.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((ord) => {
                  const statusColors: Record<string, string> = {
                    placed: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                    preparing: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
                    ready: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 animate-pulse',
                    served: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
                  };

                  return (
                    <div
                      key={ord.id}
                      className="glass-dark border border-[#C5A880]/20 rounded-2xl p-4 space-y-3 relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider">
                            {ord.order_number || `#${String(ord.id).slice(0, 8)}`}
                          </span>
                          <h4 className="font-bold text-base text-[#EAE6DF]">
                            Table {ord.table_number || 'Takeaway'}
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                            statusColors[ord.status] || 'border-stone-500 text-stone-300'
                          }`}>
                          {ord.status}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="p-2.5 rounded-xl bg-[#121212] space-y-1.5 text-xs">
                        {(ord.dish_names || []).map((name, idx) => (
                          <div key={idx} className="flex justify-between text-[#EAE6DF]/80">
                            <span>{name}</span>
                          </div>
                        ))}
                      </div>

                      {ord.notes && <p className="text-[11px] text-[#C5A880]/80 italic">&ldquo;{ord.notes}&rdquo;</p>}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-[#C5A880]/10">
                        {ord.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'served')}
                            className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Served
                          </button>
                        )}
                        {ord.status === 'served' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(ord.id, 'completed')}
                            className="flex-1 py-2 rounded-xl bg-[#C5A880]/20 hover:bg-[#C5A880]/30 border border-[#C5A880]/40 text-[#C5A880] font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
                            <Receipt className="w-3.5 h-3.5" /> Settle / Bill Paid
                          </button>
                        )}
                        <span className="text-[10px] text-[#EAE6DF]/40 self-center">
                          Total: ₹{Number(ord.total_amount || 0).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Physical Table Verifications (Dine-In Fraud Prevention) */}
        {activeTab === 'verify' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-dark border border-[#C5A880]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Physical Table Verifications
                  </h3>
                  <p className="text-xs text-[#EAE6DF]/60">
                    Verify that guests are physically seated at their table before orders are released to the kitchen.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#C5A880] self-start sm:self-auto bg-[#1A1A1A] px-3 py-1.5 rounded-xl border border-[#C5A880]/20">
                Pending: {pendingVerifications.length}
              </span>
            </div>

            {feedbackMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                {feedbackMsg}
              </div>
            )}

            {pendingVerifications.length === 0 ? (
              <div className="py-24 text-center glass-dark rounded-3xl border border-[#C5A880]/15">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="font-bold text-base text-[#EAE6DF] mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                  All Table Orders Verified
                </h4>
                <p className="text-xs text-[#EAE6DF]/60 max-w-sm mx-auto">
                  No remote or unverified QR orders pending. Kitchen is only preparing physically confirmed table tickets.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingVerifications.map((ord) => {
                  const isBusy = verifyingId === ord.id;
                  const isHighRisk = ord.risk_level === 'HIGH' || ord.verification_status === 'HOLD';
                  const isMediumRisk = ord.risk_level === 'MEDIUM';

                  return (
                    <div
                      key={ord.id}
                      className={`glass-dark rounded-2xl p-5 border transition-all space-y-4 relative ${
                        isHighRisk
                          ? 'border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]'
                          : isMediumRisk
                          ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                          : 'border-[#C5A880]/30'
                      }`}>
                      {/* Top Meta */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#C5A880]/15 text-[#C5A880] text-xs font-bold uppercase tracking-wider border border-[#C5A880]/30">
                              Table {ord.table_number || 'QR'}
                            </span>
                            <span className="text-[11px] font-mono text-[#EAE6DF]/60">
                              {ord.order_number || `#${String(ord.id).slice(0, 8)}`}
                            </span>
                          </div>
                          <h4 className="font-bold text-base text-[#EAE6DF] mt-1.5">
                            {ord.customer_name || 'Guest Patron'}
                            {ord.customer_phone ? ` · ${ord.customer_phone}` : ''}
                          </h4>
                        </div>

                        {/* Risk Badge */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${
                              isHighRisk
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : isMediumRisk
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                            {isHighRisk ? <AlertTriangle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                            {isHighRisk ? 'Security Hold' : isMediumRisk ? 'Medium Risk' : 'Standard'}
                          </span>
                        </div>
                      </div>

                      {/* Risk Reasons */}
                      {ord.risk_reasons && ord.risk_reasons.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#C5A880]/10 space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-[#C5A880] font-bold block">
                            Security Signals:
                          </span>
                          {ord.risk_reasons.map((r, i) => (
                            <p key={i} className="text-[11px] text-[#EAE6DF]/70 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {r}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Items summary */}
                      <div className="p-3 rounded-xl bg-[#121212] space-y-1.5 text-xs">
                        <div className="flex justify-between text-[10px] text-[#EAE6DF]/40 uppercase tracking-wider font-semibold pb-1 border-b border-[#C5A880]/10">
                          <span>Items Ordered</span>
                          <span>Total</span>
                        </div>
                        {(ord.dish_names || []).map((name, idx) => (
                          <div key={idx} className="flex justify-between text-[#EAE6DF]/90">
                            <span>{name}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 border-t border-[#C5A880]/10 font-bold text-sm">
                          <span className="text-[#EAE6DF]">Grand Total:</span>
                          <span className="text-[#C5A880]">₹{Number(ord.total_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#C5A880]/15">
                        <button
                          onClick={() => handleVerifyOrder(ord.id, 'confirm')}
                          disabled={isBusy}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50">
                          <UserCheck className="w-4 h-4" />
                          {isBusy ? 'Transmitting...' : 'Confirm Guest Present (Send KOT)'}
                        </button>
                        <button
                          onClick={() => setRejectVerifyModal(ord)}
                          disabled={isBusy}
                          className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all">
                          <UserX className="w-4 h-4" />
                          Reject / Absent
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Ready to Serve Workflow (Kitchen -> Waiter -> Table) */}
        {activeTab === 'ready' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-dark border border-[#C5A880]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Ready to Serve Queue
                  </h3>
                  <p className="text-xs text-[#EAE6DF]/60">
                    Pick up cooked dishes from the kitchen pass and mark them as served at the guest table.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/waiter/ready"
                  className="px-3.5 py-2 rounded-xl bg-[#C5A880] text-[#0A0A0A] font-bold text-xs hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md">
                  <span>Open Full-Screen Mode</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {feedbackMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                {feedbackMsg}
              </div>
            )}

            {readyOrders.length === 0 ? (
              <div className="py-24 text-center glass-dark rounded-3xl border border-[#C5A880]/15">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="font-bold text-base text-[#EAE6DF] mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                  Kitchen Pass is Clear
                </h4>
                <p className="text-xs text-[#EAE6DF]/60 max-w-sm mx-auto">
                  No orders are currently waiting at the kitchen pass. Active orders are still cooking in the kitchen.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyOrders.map((ord) => {
                  const isPickedUp = ord.status === 'picked_up';
                  return (
                    <div
                      key={ord.id}
                      className={`glass-dark rounded-3xl p-5 border transition-all flex flex-col justify-between shadow-xl ${
                        isPickedUp
                          ? 'border-sky-500/40 bg-[#0c141c]'
                          : 'border-[#C5A880]/30 hover:border-[#C5A880]/60'
                      }`}>
                      <div>
                        {/* Table Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider block">
                              {ord.order_number || `#${String(ord.id).slice(0, 8)}`}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xl font-black text-white font-mono">
                                {ord.table_number ? `TABLE ${ord.table_number}` : 'TAKEAWAY PASS'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border ${
                              isPickedUp
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                            {isPickedUp ? 'En Route' : 'Ready to Pick Up'}
                          </span>
                        </div>

                        {/* Items */}
                        <div className="space-y-1.5 p-3 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/15 mb-4 text-xs">
                          {(ord.dish_names || []).map((name, i) => (
                            <div key={i} className="flex justify-between text-[#EAE6DF]">
                              <span className="font-semibold">{name}</span>
                              <span className="text-[#C5A880] font-mono font-bold">× 1</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-[#C5A880]/15">
                        {!isPickedUp ? (
                          <button
                            onClick={() => handlePickupFood(ord)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#9E825D] hover:brightness-110 text-[#0A0A0A] font-black text-xs uppercase tracking-wider shadow-warm flex items-center justify-center gap-2 transition-all">
                            <Utensils className="w-4 h-4" /> Pick Up Food from Pass
                          </button>
                        ) : (
                          <button
                            onClick={() => handleServeFood(ord)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all">
                            <CheckCircle2 className="w-4 h-4" /> Mark as Served at Table
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Verification Modal */}
      <AnimatePresence>
        {rejectVerifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark border border-rose-500/30 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Reject Table Order
                  </h3>
                </div>
                <button
                  onClick={() => setRejectVerifyModal(null)}
                  className="text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-[#EAE6DF]/70">
                Rejecting Order <span className="text-[#C5A880] font-mono">{rejectVerifyModal.order_number || rejectVerifyModal.id}</span> for <span className="font-bold text-white">Table {rejectVerifyModal.table_number}</span>. This order will be cancelled and will NOT reach the kitchen.
              </p>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-[#C5A880] font-semibold block">
                  Select Reason:
                </label>
                {[
                  'Customer absent from table / remote QR abuse',
                  'Accidental duplicate order by guest',
                  'Guest changed mind / left restaurant',
                  'Table occupied by different guests',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setVerifyRejectReason(reason)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      verifyRejectReason === reason
                        ? 'border-rose-500 bg-rose-500/15 text-rose-300 font-semibold'
                        : 'border-[#C5A880]/15 bg-[#121212] text-[#EAE6DF]/70 hover:border-[#C5A880]/30'
                    }`}>
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#C5A880]/15">
                <button
                  onClick={() => setRejectVerifyModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] font-bold text-xs uppercase tracking-wider hover:bg-[#252525] transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => handleVerifyOrder(rejectVerifyModal.id, 'reject', verifyRejectReason)}
                  disabled={verifyingId === rejectVerifyModal.id}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-md">
                  {verifyingId === rejectVerifyModal.id ? 'Processing...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
