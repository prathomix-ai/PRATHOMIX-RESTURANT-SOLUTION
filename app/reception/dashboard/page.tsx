'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coffee,
  Loader2,
  MapPin,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Table as TableIcon,
  UtensilsCrossed,
  Users,
  Clock3,
  LogOut,
  Phone,
  UserPlus,
  AlertTriangle,
  X,
  Brush,
  Receipt,
  UserCheck,
  Settings,
} from 'lucide-react';
import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID, type Booking } from '@/lib/supabase';
import { clearClientSession } from '@/lib/auth';
import RoleOnboardingTutorial from '@/components/RoleOnboardingTutorial';
import StaffSettingsModal from '@/components/StaffSettingsModal';
import StaffPresenceHeartbeat from '@/components/StaffPresenceHeartbeat';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'billing';

const TABLE_COUNT = 10;

const STATUS_CONFIG: Record<TableStatus, { label: string; badgeClass: string; cardClass: string }> = {
  available: {
    label: 'Available',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    cardClass: 'border-emerald-500/20 hover:border-emerald-500/40',
  },
  occupied: {
    label: 'Occupied',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    cardClass: 'border-amber-500/30 hover:border-amber-500/50',
  },
  reserved: {
    label: 'Reserved',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    cardClass: 'border-sky-500/20 hover:border-sky-500/40',
  },
  cleaning: {
    label: 'Cleaning',
    badgeClass: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
    cardClass: 'border-purple-500/20 hover:border-purple-500/40',
  },
  billing: {
    label: 'Billing',
    badgeClass: 'border-[#C5A880]/30 bg-[#C5A880]/10 text-[#C5A880]',
    cardClass: 'border-[#C5A880]/30 hover:border-[#C5A880]',
  },
};

export default function ReceptionDashboardPage() {
  const [activeTab, setActiveTab] = useState<'floor' | 'bookings' | 'walkin'>('floor');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Walk-in / Reservation form modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState('19:00');
  const [formGuests, setFormGuests] = useState(2);
  const [formTable, setFormTable] = useState<number>(1);
  const [formNotes, setFormNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Selected table action modal
  const [actionTable, setActionTable] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const restId = typeof window !== 'undefined'
        ? localStorage.getItem('prathomix_restaurant_id') || '10000000-0000-0000-0000-000000000001'
        : '10000000-0000-0000-0000-000000000001';

      // Load bookings from yesterday onwards (limit 100) to avoid downloading entire historical database
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      let bookingQuery = supabase
        .from(RESTAURANT_TABLES.bookings)
        .select('id, name, customer_name, phone, guests, date, time, table_number, status, special_requests, created_at')
        .gte('date', yesterday)
        .order('date', { ascending: true })
        .limit(100);

      let orderQuery = supabase
        .from(RESTAURANT_TABLES.orders)
        .select('id, order_number, table_number, status, total_amount, created_at')
        .in('status', ['placed', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false })
        .limit(60);

      let tableQuery = supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .select('id, table_number, capacity, section, status')
        .order('table_number', { ascending: true });

      if (restId) {
        bookingQuery = bookingQuery.or(`restaurant_id.eq.${restId},restaurant_id.is.null`);
        orderQuery = orderQuery.or(`restaurant_id.eq.${restId},restaurant_id.is.null`);
      }

      const [bookingRes, orderRes, tableRes] = await Promise.all([
        bookingQuery,
        orderQuery,
        tableQuery,
      ]);

      if (bookingRes.data) setBookings(bookingRes.data as any);
      if (orderRes.data) setOrders(orderRes.data);

      if (tableRes.data && tableRes.data.length > 0) {
        setTables(tableRes.data);
      } else {
        // Fallback default
        setTables(
          Array.from({ length: TABLE_COUNT }, (_, i) => ({
            table_number: i + 1,
            capacity: i < 2 ? 2 : i > 7 ? 8 : 4,
            section: i < 4 ? 'Terrace' : i < 8 ? 'Main Hall' : 'VIP Lounge',
            status: i === 1 || i === 4 ? 'occupied' : i === 2 ? 'reserved' : 'available',
          }))
        );
      }
    } catch (err) {
      console.error('Reception load data failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Gentle 30-second fallback sync
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Real-time listener for bookings & tables with debouncing
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const channel = supabase
      .channel('reception-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: RESTAURANT_TABLES.bookings }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadData();
        }, 350);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: RESTAURANT_TABLES.orders }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadData();
        }, 350);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Table status updater
  async function updateTableStatus(tableNum: number, status: TableStatus) {
    try {
      await supabase
        .from(RESTAURANT_TABLES.restaurantTables)
        .update({ status })
        .eq('table_number', tableNum)
        .eq('restaurant_id', DEFAULT_RESTAURANT_ID);

      setTables((prev) =>
        prev.map((t) => (t.table_number === tableNum ? { ...t, status } : t))
      );
      setActionTable(null);
    } catch (err) {
      console.error('Failed to update table status:', err);
    }
  }

  // Quick Walk-in seating
  async function handleQuickWalkIn(tableNum: number) {
    try {
      await updateTableStatus(tableNum, 'occupied');
      // Create walk-in booking record
      await supabase.from(RESTAURANT_TABLES.bookings).insert({
        restaurant_id: DEFAULT_RESTAURANT_ID,
        customer_name: 'Walk-In Guest',
        phone: 'Walk-In',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        guests: 2,
        table_number: tableNum,
        status: 'seated',
        notes: 'Front Desk Quick Seating',
      });
      loadData();
    } catch (err) {
      console.error('Quick walk-in error:', err);
    }
  }

  // Create new reservation or walk-in
  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    setSubmittingBooking(true);
    try {
      const payload = {
        restaurant_id: DEFAULT_RESTAURANT_ID,
        customer_name: formName.trim(),
        phone: formPhone.trim(),
        date: formDate,
        time: formTime,
        guests: Number(formGuests),
        table_number: Number(formTable),
        status: activeTab === 'walkin' ? 'seated' : 'confirmed',
        notes: formNotes.trim() || null,
      };

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create reservation');
      }

      if (activeTab === 'walkin' && formTable) {
        await updateTableStatus(formTable, 'occupied');
      } else if (formTable) {
        await updateTableStatus(formTable, 'reserved');
      }

      setModalOpen(false);
      setFormName('');
      setFormPhone('');
      setFormNotes('');
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Error booking reservation');
    } finally {
      setSubmittingBooking(false);
    }
  }

  // Advance booking status (e.g. seat guest)
  async function handleAdvanceBooking(booking: Booking, nextStatus: 'seated' | 'completed' | 'cancelled') {
    try {
      await fetch('/api/booking', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: booking.id,
          status: nextStatus,
          table_number: booking.table_number,
        }),
      });

      if (nextStatus === 'seated' && booking.table_number) {
        await updateTableStatus(booking.table_number, 'occupied');
      } else if (nextStatus === 'completed' && booking.table_number) {
        await updateTableStatus(booking.table_number, 'cleaning');
      }

      loadData();
    } catch (err) {
      console.error('Update booking error:', err);
    }
  }

  function handleLogout() {
    clearClientSession();
    window.location.href = '/login';
  }

  // Summary statistics
  const stats = useMemo(() => {
    const totalGuests = bookings.reduce((sum, b) => sum + (b.guests || 0), 0);
    const seatedCount = tables.filter((t) => t.status === 'occupied').length;
    const reservedCount = tables.filter((t) => t.status === 'reserved').length;
    const availableCount = tables.filter((t) => t.status === 'available').length;

    return { totalGuests, seatedCount, reservedCount, availableCount };
  }, [bookings, tables]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] pb-16">
      {/* Top Reception Header */}
      <header
        data-tour="reception-header"
        className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-xl border-b border-[#C5A880]/20 px-3 sm:px-4 py-2.5 sm:py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] flex-shrink-0">
              <TableIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-sm sm:text-base tracking-wide text-[#EAE6DF] truncate" style={{ fontFamily: 'Cinzel, serif' }}>
                  RECEPTION &amp; CONCIERGE
                </h1>
                <span className="text-[9px] sm:text-[10px] bg-[#C5A880]/15 text-[#C5A880] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                  Front Desk
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-[#EAE6DF]/60 hidden xs:block truncate">Live Floor Plan · Seating Control · Guest Bookings</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setActiveTab('walkin');
                setModalOpen(true);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm hover:brightness-110 transition-all">
              <UserPlus className="w-3.5 h-3.5" /> Fast Walk-in
            </button>

            <button
              onClick={loadData}
              disabled={refreshing}
              title="Refresh Floor Data"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin text-[#C5A880]' : ''}`} />
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              title="Reception Settings"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-[#C5A880] flex items-center justify-center text-[#EAE6DF]/70 hover:text-[#C5A880] transition-all">
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              onClick={handleLogout}
              title="Exit Reception"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 hover:border-rose-500/40 flex items-center justify-center text-[#EAE6DF]/70 hover:text-rose-400 transition-all">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5 space-y-5 sm:space-y-6 pb-safe">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
          <div data-tour="reception-available-table" className="glass-dark border border-[#C5A880]/20 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <TableIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-emerald-400">{stats.availableCount}</p>
              <span className="text-[10px] sm:text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider block">Available Tables</span>
            </div>
          </div>

          <div data-tour="reception-occupied-table" className="glass-dark border border-[#C5A880]/20 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-amber-400">{stats.seatedCount}</p>
              <span className="text-[10px] sm:text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider block">Seated Guests</span>
            </div>
          </div>

          <div className="glass-dark border border-[#C5A880]/20 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-sky-400">{stats.reservedCount}</p>
              <span className="text-[10px] sm:text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider block">Reserved</span>
            </div>
          </div>

          <div className="glass-dark border border-[#C5A880]/20 rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880] flex-shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-bold text-[#C5A880]">{stats.totalGuests}</p>
              <span className="text-[10px] sm:text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider block">Today&apos;s Covers</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-[#C5A880]/15 pb-2 overflow-x-auto scrollbar-none">
          <button
            data-tour="reception-table-map"
            onClick={() => setActiveTab('floor')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0 whitespace-nowrap ${
              activeTab === 'floor'
                ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
            }`}>
            <TableIcon className="w-4 h-4" /> Live Floor Layout
          </button>
          <button
            data-tour="reception-reservations"
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 min-h-[44px] flex-shrink-0 whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
            }`}>
            <CalendarDays className="w-4 h-4" /> Reservations List ({bookings.length})
          </button>
          <button
            data-tour="reception-walkin"
            onClick={() => {
              setActiveTab('walkin');
              setModalOpen(true);
            }}
            className="ml-auto px-3.5 sm:px-4 py-2 rounded-xl bg-[#121212] border border-[#C5A880]/30 hover:border-[#C5A880] text-[#C5A880] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 min-h-[44px] flex-shrink-0 whitespace-nowrap transition-all">
            <PlusCircle className="w-4 h-4" /> New Booking
          </button>
        </div>

        {/* View 1: Live Interactive Floor Layout with Internal Scroll Containment */}
        {activeTab === 'floor' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#EAE6DF]/60">
              <span>Interactive table control — Click table for status update or quick seating</span>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {Object.entries(STATUS_CONFIG).map(([stKey, cfg]) => (
                  <span key={stKey} className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full border ${cfg.badgeClass}`} />
                    <span className="capitalize text-[11px] sm:text-xs">{cfg.label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="table-scroll-container">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {tables.map((tbl) => {
                  const currentStatus: TableStatus = (tbl.status?.toLowerCase() || 'available') as TableStatus;
                  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.available;

                  return (
                    <motion.div
                      key={tbl.table_number}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setActionTable(tbl)}
                      className={`glass-dark rounded-2xl p-3 sm:p-4 border transition-all cursor-pointer relative group ${cfg.cardClass}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm sm:text-base text-[#EAE6DF]">Table {tbl.table_number}</span>
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-[#EAE6DF]/60 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Seats {tbl.capacity || 4} guests</span>
                        </div>
                        <p className="text-[11px] text-[#EAE6DF]/50">{tbl.section || 'Main Dining'}</p>
                      </div>

                      {/* Quick status bar */}
                      <div className="flex gap-1 pt-2 border-t border-[#C5A880]/10">
                        {currentStatus === 'available' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickWalkIn(tbl.table_number);
                            }}
                            className="w-full py-2 min-h-[38px] sm:min-h-[44px] rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center">
                            Seat Walk-in
                          </button>
                        ) : currentStatus === 'occupied' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTableStatus(tbl.table_number, 'billing');
                            }}
                            className="w-full py-2 min-h-[38px] sm:min-h-[44px] rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center">
                            Request Bill
                          </button>
                        ) : currentStatus === 'cleaning' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTableStatus(tbl.table_number, 'available');
                            }}
                            className="w-full py-2 min-h-[38px] sm:min-h-[44px] rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center">
                            Cleaned &amp; Ready
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTableStatus(tbl.table_number, 'available');
                            }}
                            className="w-full py-2 min-h-[38px] sm:min-h-[44px] rounded-lg bg-[#C5A880]/15 hover:bg-[#C5A880]/30 text-[#C5A880] font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center">
                            Set Available
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* View 2: Upcoming Bookings List */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                All Guest Bookings ({bookings.length})
              </h3>
              <span className="text-xs text-[#C5A880]">Sorted by date &amp; time</span>
            </div>

            {bookings.length === 0 ? (
              <div className="py-20 text-center glass-dark rounded-3xl border border-[#C5A880]/15">
                <CalendarDays className="w-10 h-10 text-[#C5A880]/30 mx-auto mb-2" />
                <p className="text-xs text-[#EAE6DF]/60">No reservations logged yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {bookings.map((b) => {
                  const isSeated = b.status === 'seated';
                  const isConfirmed = b.status === 'confirmed' || b.status === 'reserved';

                  return (
                    <div
                      key={b.id}
                      className="glass-dark border border-[#C5A880]/20 rounded-2xl p-4 space-y-3 relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-[#EAE6DF] truncate">{b.customer_name}</h4>
                          <p className="text-xs text-[#C5A880] mt-0.5 flex items-center gap-1.5">
                            <Phone className="w-3 h-3" /> {b.phone}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isSeated
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                              : isConfirmed
                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                              : 'border-stone-500/30 bg-stone-500/10 text-stone-300'
                          }`}>
                          {b.status}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#121212] space-y-1 text-xs text-[#EAE6DF]/70">
                        <div className="flex justify-between">
                          <span>Date &amp; Time:</span>
                          <span className="text-[#EAE6DF] font-semibold">{b.date} · {b.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Party Size:</span>
                          <span className="text-[#EAE6DF] font-semibold">{b.guests} Guests</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Assigned Table:</span>
                          <span className="text-[#C5A880] font-bold">
                            {b.table_number ? `Table ${b.table_number}` : 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {b.notes && (
                        <p className="text-[11px] text-[#C5A880]/80 italic">&ldquo;{b.notes}&rdquo;</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 border-t border-[#C5A880]/10">
                        {isConfirmed && (
                          <button
                            onClick={() => handleAdvanceBooking(b, 'seated')}
                            className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all">
                            <UserCheck className="w-3.5 h-3.5" /> Seat Guest
                          </button>
                        )}
                        {isSeated && (
                          <button
                            onClick={() => handleAdvanceBooking(b, 'completed')}
                            className="flex-1 py-1.5 rounded-xl bg-[#C5A880]/20 hover:bg-[#C5A880] text-[#C5A880] hover:text-[#0A0A0A] font-bold text-xs flex items-center justify-center gap-1 transition-all">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete Visit
                          </button>
                        )}
                        <button
                          onClick={() => handleAdvanceBooking(b, 'cancelled')}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Detail / Action Modal */}
      <AnimatePresence>
        {actionTable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-dark border border-[#C5A880]/30 rounded-3xl p-6 max-w-sm w-full space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#C5A880]/15">
                <div>
                  <h3 className="font-bold text-base text-[#EAE6DF]">
                    Table {actionTable.table_number} Controls
                  </h3>
                  <p className="text-xs text-[#EAE6DF]/60">
                    Section: {actionTable.section} · Seats {actionTable.capacity}
                  </p>
                </div>
                <button
                  onClick={() => setActionTable(null)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] text-[#EAE6DF]/60 uppercase tracking-wider block mb-2 font-semibold">
                  Update Table Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'available', label: 'Available', color: 'emerald' },
                    { id: 'occupied', label: 'Occupied', color: 'amber' },
                    { id: 'reserved', label: 'Reserved', color: 'sky' },
                    { id: 'cleaning', label: 'Cleaning', color: 'purple' },
                    { id: 'billing', label: 'Billing', color: 'gold' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => updateTableStatus(actionTable.table_number, st.id as TableStatus)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        actionTable.status === st.id
                          ? 'bg-[#C5A880] text-[#0A0A0A] border-[#C5A880]'
                          : 'bg-[#121212] border-[#C5A880]/20 text-[#EAE6DF]/70 hover:text-[#EAE6DF]'
                      }`}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Reservation / Walk-In Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-dark border border-[#C5A880]/30 rounded-3xl p-6 max-w-md w-full space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C5A880] font-bold">Concierge Entry</p>
                  <h3 className="font-display font-bold text-lg text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    {activeTab === 'walkin' ? 'Fast Walk-in Seating' : 'Create Reservation'}
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-[#EAE6DF]/60 hover:text-[#EAE6DF]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBooking} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Guest Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Rahul Singhal"
                      className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Date</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Time</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Guests</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={formGuests}
                      onChange={(e) => setFormGuests(Number(e.target.value))}
                      className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-2 py-2 text-xs text-[#EAE6DF] outline-none font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Assign Table</label>
                  <select
                    value={formTable}
                    onChange={(e) => setFormTable(Number(e.target.value))}
                    className="w-full bg-[#121212] border border-[#C5A880]/30 rounded-xl px-3 py-2 text-xs text-[#C5A880] font-bold outline-none">
                    {tables.map((tbl) => (
                      <option key={tbl.table_number} value={tbl.table_number}>
                        Table {tbl.table_number} ({tbl.section}) — {tbl.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#EAE6DF]/70 block mb-1">Special Notes / Occasion</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Window seat, Anniversary, Quiet table"
                    className="w-full bg-[#121212] border border-[#C5A880]/20 rounded-xl px-3 py-2 text-xs text-[#EAE6DF] outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-xs text-[#EAE6DF]">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {submittingBooking ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Confirm &amp; Seat
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reception Onboarding Guided Tour */}
      <RoleOnboardingTutorial role="receptionist" />

      {/* Receptionist Dedicated Settings */}
      <StaffSettingsModal
        role="receptionist"
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Realtime Staff Presence Heartbeat */}
      <StaffPresenceHeartbeat role="receptionist" userId="REC-01" userName="Elena Rostova" />
    </main>
  );
}