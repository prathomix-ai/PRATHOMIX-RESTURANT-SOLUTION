'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type Dish, type Order } from '@/lib/supabase';
import { clearClientSession } from '@/lib/auth';

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
  const [activeTab, setActiveTab] = useState<'tables' | 'pos' | 'kots'>('tables');
  const [waiterName, setWaiterName] = useState('Marco Vance');
  const [waiterId, setWaiterId] = useState('W-1001');

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

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Fetch tables
      const { data: tableData } = await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .select('*')
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

      // 2. Fetch dishes
      const { data: dishData } = await supabase
        .from(RESTAURANT_TABLES.dishes)
        .select('*')
        .eq('available', true);

      if (dishData && dishData.length > 0) {
        setDishes(dishData);
      }

      // 3. Fetch running orders
      const { data: orderData } = await supabase
        .from(RESTAURANT_TABLES.orders)
        .select('*')
        .in('status', ['placed', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });

      if (orderData) {
        setOrders(orderData as any);
      }
    } catch (err) {
      console.error('Waiter fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time listener for order updates
  useEffect(() => {
    const channel = supabase
      .channel('waiter-orders-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: RESTAURANT_TABLES.orders },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

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
    if (currentTicket.length === 0) return;
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
      <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-b border-[#C5A880]/20 px-4 py-3.5 shadow-xl">
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
              onClick={handleLogout}
              title="Logout"
              className="w-9 h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-rose-500/50 flex items-center justify-center text-[#EAE6DF]/70 hover:text-rose-400 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#121212] border border-[#C5A880]/15 mb-6">
          {[
            { id: 'tables', label: 'Floor Tables', icon: Layers, badge: tableSummary.occupied },
            { id: 'pos', label: 'Take Order', icon: Utensils, badge: currentTicket.length || null },
            { id: 'kots', label: 'Active KOTs', icon: BellRing, badge: orders.length || null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] shadow-md'
                  : 'text-[#EAE6DF]/70 hover:text-[#EAE6DF] hover:bg-[#1A1A1A]'
              }`}>
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge != null && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-[#0A0A0A] text-[#C5A880]' : 'bg-[#C5A880]/20 text-[#C5A880]'
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

                <div className="relative flex-1 min-w-[200px]">
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
      </div>
    </main>
  );
}
