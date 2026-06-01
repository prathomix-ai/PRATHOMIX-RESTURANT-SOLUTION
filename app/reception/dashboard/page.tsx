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
  Table,
  UtensilsCrossed,
  Users,
  Clock3,
} from 'lucide-react';
import Image from 'next/image';

type ReceptionTab = 'live-desk' | 'menu-management';
type BookingStatus = 'reserved' | 'seated' | 'completed' | 'confirmed' | 'pending' | 'cancelled';
type BookingUpdateStatus = 'seated' | 'completed' | 'cancelled';

const TABLE_COUNT = 10;
const ERROR_TEXT = 'Unable to update booking right now.';

const BOOKING_FLOW: Record<string, { label: string; next: BookingStatus | null }> = {
  reserved: { label: 'Reserved', next: 'seated' },
  confirmed: { label: 'Reserved', next: 'seated' },
  pending: { label: 'Reserved', next: 'seated' },
  seated: { label: 'Guest Arrived/Seated', next: 'completed' },
  completed: { label: 'Completed', next: null },
  cancelled: { label: 'Cancelled', next: null },
};

const normalizeBookingStatus = (status?: string) => {
  const value = String(status ?? '').trim().toLowerCase();
  if (value === 'guest_arrived') return 'seated';
  if (value in BOOKING_FLOW) return value;
  return 'reserved';
};

const formatTimeForInput = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const todayAsDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReceptionDashboardPage() {
  const [tab, setTab] = useState<ReceptionTab>('live-desk');
  const [bookings, setBookings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [savingTableId, setSavingTableId] = useState<number | null>(null);
  const [savingDish, setSavingDish] = useState(false);
  const [savedDish, setSavedDish] = useState(false);
  const [quickSeating, setQuickSeating] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});
  const [tableError, setTableError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    calories: '',
    protein: '',
    image_url: '',
    category: 'Main',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, orderRes, dishRes] = await Promise.all([
        fetch('/api/booking').then((r) => r.json()),
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/dishes').then((r) => r.json()),
      ]);

      setBookings(Array.isArray(bookingRes) ? bookingRes : []);
      setOrders(Array.isArray(orderRes) ? orderRes : []);
      setDishes(Array.isArray(dishRes) ? dishRes : []);
    } catch (error) {
      console.error('Reception dashboard load failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBookings = loadData;

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const booking of bookings) {
      if (booking.table_number != null) nextDrafts[booking.id] = String(booking.table_number);
    }
    setAssignmentDrafts((prev) => ({ ...nextDrafts, ...prev }));
  }, [bookings]);

  const stats = useMemo(() => {
    const guestCount = bookings.reduce((sum, booking: any) => sum + (booking.guests ?? 0), 0);
    const reservedCount = bookings.filter((booking: any) => normalizeBookingStatus(booking.status) === 'reserved').length;
    const occupiedCount = bookings.filter((booking: any) => normalizeBookingStatus(booking.status) === 'seated').length;

    return [
      { label: 'Open bookings', value: bookings.length, icon: CalendarDays },
      { label: 'Reserved', value: reservedCount, icon: ClipboardList },
      { label: 'Occupied', value: occupiedCount, icon: Coffee },
      { label: 'Guests today', value: guestCount, icon: Users },
    ];
  }, [bookings, orders]);

  const availableTables = useMemo(() => {
    return Array.from({ length: TABLE_COUNT }, (_, index) => index + 1).filter((tableNumber) => {
      const activeBooking = bookings.some((booking: any) => Number(booking.table_number) === tableNumber && ['reserved', 'confirmed', 'pending', 'seated'].includes(normalizeBookingStatus(booking.status)));
      return !activeBooking;
    });
  }, [bookings, orders]);

  const tableLayout = useMemo(() => {
    return Array.from({ length: TABLE_COUNT }, (_, index) => {
      const tableNumber = index + 1;
      const seatedBooking = bookings.find((booking: any) => Number(booking.table_number) === tableNumber && normalizeBookingStatus(booking.status) === 'seated');
      const reservedBooking = bookings.find((booking: any) => Number(booking.table_number) === tableNumber && ['confirmed', 'reserved', 'pending'].includes(normalizeBookingStatus(booking.status)));

      if (seatedBooking) {
        return {
          tableNumber,
          status: 'Occupied',
          tone: 'occupied',
          label: seatedBooking.customer_name ?? 'Occupied',
        };
      }

      if (reservedBooking) {
        return {
          tableNumber,
          status: 'Reserved',
          tone: 'reserved',
          label: reservedBooking.customer_name,
        };
      }

      return {
        tableNumber,
        status: 'Available',
        tone: 'available',
        label: 'Open now',
      };
    });
  }, [bookings, orders]);

  const activeTableOrders = useMemo(() => {
    const grouped = new Map<number, any[]>();
    for (const order of orders) {
      const status = String(order.status).toLowerCase();
      if (['completed', 'served'].includes(status)) continue;

      const tableNumber = Number(order.table_number);
      if (!grouped.has(tableNumber)) grouped.set(tableNumber, []);
      grouped.get(tableNumber)!.push(order);
    }

    return Array.from(grouped.entries())
      .map(([tableNumber, tableOrders]) => ({
        tableNumber,
        orders: tableOrders,
        total: tableOrders.reduce((sum: number, order: any) => sum + (Number(order.total_amount) || 0), 0),
      }))
      .sort((a, b) => a.tableNumber - b.tableNumber);
  }, [orders]);

  const filteredActiveTableOrders = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return activeTableOrders;

    return activeTableOrders.filter((entry) => entry.tableNumber.toString().includes(query));
  }, [activeTableOrders, searchQuery]);

  const upcomingBookings = useMemo(() => {
    return bookings.filter((booking: any) => {
      const statusKey = normalizeBookingStatus(booking.status);
      return statusKey !== 'completed' && statusKey !== 'cancelled';
    });
  }, [bookings]);

  async function handleUpdateBooking(bookingId: string, status: BookingUpdateStatus, tableNumber: number | null) {
    const allowedStatuses: BookingUpdateStatus[] = ['seated', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid booking status update.');
    }

    const res = await fetch('/api/booking', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, status, table_number: tableNumber }),
    });

    if (!res.ok) {
      const payload = await res.json();
      const message = payload?.error || ERROR_TEXT;
      alert(message);
      throw new Error(message);
    }
  }

  async function handleAdvanceBookingStatus(booking: any) {
    const selectedTable = Number(booking.table_number ?? assignmentDrafts[booking.id]);
    console.log('Mark Arrived clicked:', { bookingId: booking.id, selectedTable, currentStatus: booking.status });

    const currentStatus = normalizeBookingStatus(booking.status);
    const nextStatus = BOOKING_FLOW[currentStatus]?.next;
    if (!nextStatus) return;

    if (!selectedTable || Number.isNaN(selectedTable)) {
      setTableError('Please assign a table number before seating this booking.');
      return;
    }

    setSavingBookingId(booking.id);
    setTableError('');
    try {
      await handleUpdateBooking(booking.id, 'seated', selectedTable);

      await fetchBookings();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingBookingId(null);
    }
  }

  async function handleCancelNoShow(booking: any) {
    setSavingBookingId(booking.id);
    setTableError('');
    try {
      await handleUpdateBooking(booking.id, 'cancelled', null);

      await loadData();
    } catch (error) {
      console.error('Cancel / no-show failed:', error);
    } finally {
      setSavingBookingId(null);
    }
  }

  async function handleQuickSeating() {
    const tableNumber = availableTables[0];
    if (!tableNumber) {
      setTableError('No available table right now.');
      return;
    }

    setQuickSeating(true);
    setTableError('');
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Walk-in Guest',
          phone: 'walk-in',
          date: todayAsDateInput(),
          time: formatTimeForInput(),
          guests: 1,
          table_number: tableNumber,
          status: 'pending',
          notes: 'Quick seating',
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error || 'Unable to seat walk-in');
      }

      await loadData();
    } catch (error) {
      console.error('Quick seating failed:', error);
    } finally {
      setQuickSeating(false);
    }
  }

  async function handleCheckoutTable(tableNumber: number) {
    const tableOrders = activeTableOrders.find((entry) => entry.tableNumber === tableNumber)?.orders ?? [];
    const tableBooking = bookings.find((booking: any) => Number(booking.table_number) === tableNumber && ['reserved', 'confirmed', 'pending', 'seated'].includes(normalizeBookingStatus(booking.status)));

    setSavingTableId(tableNumber);
    setTableError('');
    try {
      await Promise.all([
        ...tableOrders.map((order: any) => fetch('/api/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.id, status: 'completed' }),
        })),
        tableBooking ? handleUpdateBooking(tableBooking.id, 'completed', null) : Promise.resolve(),
      ]);

      await loadData();
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setSavingTableId(null);
    }
  }

  async function addDish() {
    if (!form.name.trim() || !form.price) return;
    setSavingDish(true);
    try {
      const res = await fetch('/api/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price) || 0,
          calories: parseInt(form.calories) || 0,
          protein: parseFloat(form.protein) || 0,
        }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error || 'Unable to add dish');
      }

      setSavedDish(true);
      setForm({ name: '', description: '', price: '', calories: '', protein: '', image_url: '', category: 'Main' });
      window.setTimeout(() => setSavedDish(false), 2400);
      await loadData();
    } catch (error) {
      console.error('Add dish failed:', error);
    } finally {
      setSavingDish(false);
    }
  }

  return (
    <main className="min-h-screen texture-bg bg-warm-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md mb-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary-600 mb-2">Hidden Route</p>
          <h1 className="font-display text-3xl font-bold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
            Reception Dashboard
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-2xl">
            A calm, operational view for the front desk with live table control and menu management.
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap items-center">
          {([
            { id: 'live-desk', label: 'Live Desk', icon: Table },
            { id: 'menu-management', label: 'Menu Management', icon: UtensilsCrossed },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                ${tab === item.id
                  ? 'bg-primary-600/15 border border-primary-400/50 text-primary-600 shadow-warm'
                  : 'glass border border-warm-200 text-gray-600 hover:border-primary-600/25'}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}

          <button
            onClick={handleQuickSeating}
            disabled={quickSeating}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600/15 border border-primary-600/20 text-primary-700 hover:bg-primary-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {quickSeating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Quick Seating
          </button>

          <button
            onClick={loadData}
            className="text-gray-600 hover:text-primary-600 transition-colors"
            title="Refresh data">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-600' : ''}`} />
          </button>
        </div>

        {tableError ? (
          <p className="mb-4 rounded-lg border border-primary-600/15 bg-primary-600/5 px-3 py-2 text-center text-[11px] text-stone-700">
            {tableError}
          </p>
        ) : null}

        <AnimatePresence mode="wait">
          {tab === 'live-desk' && (
            <motion.div key="live-desk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {stats.map((stat) => (
                  <div key={stat.label} className="glass border border-warm-200 rounded-2xl p-5 shadow-warm-md">
                    <stat.icon className="w-5 h-5 text-primary-600 mb-3" />
                    <p className="text-2xl font-bold text-stone-900">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : stat.value}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="glass border border-warm-200 rounded-2xl p-5 shadow-warm-md mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Live Table Layout
                    </h2>
                  </div>
                  <span className="text-[10px] text-gray-600 border border-warm-200 rounded px-2 py-0.5">
                    Available / Reserved / Occupied
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {tableLayout.map((table) => (
                    <div
                      key={table.tableNumber}
                      className={`rounded-2xl border p-4 shadow-card transition-all duration-200 ${
                        table.tone === 'occupied'
                          ? 'border-stone-900/10 bg-stone-900/5'
                          : table.tone === 'reserved'
                            ? 'border-primary-600/15 bg-primary-600/5'
                            : 'border-emerald-700/10 bg-emerald-600/5'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-stone-900">Table {table.tableNumber}</p>
                        <span className={`text-[10px] rounded-full px-2 py-0.5 border ${
                          table.tone === 'occupied'
                            ? 'border-stone-900/15 text-stone-700'
                            : table.tone === 'reserved'
                              ? 'border-primary-600/15 text-primary-700'
                              : 'border-emerald-700/15 text-emerald-800'
                        }`}>
                          {table.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">{table.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <section className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock3 className="w-5 h-5 text-primary-600" />
                    <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Upcoming Bookings
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3">
                    {upcomingBookings.length === 0 ? (
                      <p className="text-sm text-stone-600">No bookings yet.</p>
                    ) : upcomingBookings.map((booking: any) => {
                      const statusKey = normalizeBookingStatus(booking.status);
                      const statusMeta = BOOKING_FLOW[statusKey] ?? BOOKING_FLOW.reserved;
                      const needsArrivalAction = ['confirmed', 'pending'].includes(statusKey);
                      const currentTable = String(booking.table_number ?? assignmentDrafts[booking.id] ?? '');
                      const tableLocked = booking.table_number != null;

                      return (
                        <div key={booking.id} className="rounded-xl border border-warm-200 bg-warm-50 px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-stone-900 truncate">{booking.customer_name}</p>
                              <p className="text-xs text-stone-500">{booking.date} · {booking.time} · {booking.guests} guests</p>
                              <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500 mt-1">{statusMeta.label}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {statusKey === 'seated' ? (
                                <button
                                  onClick={() => handleCheckoutTable(Number(booking.table_number))}
                                  disabled={!booking.table_number}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/15 bg-emerald-600/5 px-3 py-1 text-[10px] font-semibold text-emerald-800 transition-all hover:bg-emerald-600/10 disabled:opacity-60 disabled:cursor-not-allowed">
                                  <CheckCircle2 className="w-3 h-3" />
                                    Checkout
                                </button>
                              ) : needsArrivalAction ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={currentTable}
                                    disabled={tableLocked}
                                    onChange={(e) => setAssignmentDrafts((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                                    className="bg-warm-50 border border-warm-200 rounded-lg px-2.5 py-1.5 text-[10px] text-stone-700 outline-none disabled:opacity-70 disabled:cursor-not-allowed">
                                    <option value="">Assign table</option>
                                    {[...availableTables, booking.table_number]
                                      .filter((value, index, self) => value != null && self.indexOf(value) === index)
                                      .sort((a, b) => Number(a) - Number(b))
                                      .map((tableNumber) => (
                                        <option key={tableNumber} value={tableNumber}>Table {tableNumber}</option>
                                      ))}
                                  </select>

                                  <button
                                    onClick={() => handleAdvanceBookingStatus(booking)}
                                    disabled={savingBookingId === booking.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-primary-600/15 bg-primary-600/10 px-3 py-1 text-[10px] font-semibold text-primary-700 transition-all hover:bg-primary-600/15 disabled:opacity-60 disabled:cursor-not-allowed">
                                    {savingBookingId === booking.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>
                                      Seat Guest <ChevronRight className="w-3 h-3" />
                                    </>}
                                  </button>
                                  <button
                                    onClick={() => handleCancelNoShow(booking)}
                                    disabled={savingBookingId === booking.id}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-700/20 bg-white px-3 py-1 text-[10px] font-semibold text-rose-700 transition-all hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed">
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] rounded-full border border-emerald-700/15 bg-emerald-600/5 px-3 py-1 text-emerald-800 inline-flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {statusMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {booking.table_number ? <p className="text-xs text-stone-600 mt-2">Table {booking.table_number}</p> : null}
                          {booking.notes ? <p className="text-xs text-stone-600 mt-2">{booking.notes}</p> : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="w-5 h-5 text-primary-600" />
                    <h2 className="font-display text-lg font-semibold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
                      Active Table Orders
                    </h2>
                  </div>

                  <div className="mb-4">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by Table No..."
                      className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3.5 py-2 text-sm text-stone-800 outline-none transition-all placeholder:text-stone-400 focus:border-primary-600/30 focus:bg-white"
                    />
                  </div>

                  <div
                    className="max-h-[500px] overflow-y-auto pr-2 flex flex-col gap-3 active-orders-scrollbar"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#a16207 transparent' }}>
                    {filteredActiveTableOrders.length === 0 ? (
                      <p className="text-sm text-stone-600">No active tables right now.</p>
                    ) : filteredActiveTableOrders.map((entry) => (
                      <div key={entry.tableNumber} className="rounded-xl border border-warm-200 bg-warm-50 px-3 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div>
                            <p className="text-sm font-semibold text-stone-900">Table {entry.tableNumber}</p>
                            <p className="text-[11px] text-stone-500">₹{entry.total.toFixed(2)} total</p>
                          </div>
                          <button
                            onClick={() => handleCheckoutTable(entry.tableNumber)}
                            disabled={savingTableId === entry.tableNumber}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary-600/15 bg-primary-600/10 px-2.5 py-1 text-[10px] font-semibold text-primary-700 transition-all hover:bg-primary-600/15 disabled:opacity-60 disabled:cursor-not-allowed">
                            {savingTableId === entry.tableNumber ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Checkout
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {entry.orders.map((order: any) => (
                            <div key={order.id} className="rounded-lg border border-warm-200 bg-white/70 px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-stone-900 truncate">
                                  {Array.isArray(order.dish_names) ? order.dish_names.join(', ') : '—'}
                                </p>
                                <span className="shrink-0 rounded-full border border-stone-200 bg-warm-50 px-2 py-0.5 text-[10px] text-stone-600">
                                  {order.status}
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-stone-500">Order #{String(order.id).slice(0, 8)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {tab === 'menu-management' && (
            <motion.div key="menu-management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid lg:grid-cols-2 gap-8">
                <div className="glass border border-warm-200 rounded-2xl p-6 shadow-warm-md">
                  <h2 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <PlusCircle className="w-5 h-5 text-primary-600" />
                    Add New Dish
                  </h2>

                  <div className="flex flex-col gap-3.5">
                    {[
                      { k: 'name', label: 'Dish Name *', placeholder: 'e.g. Grilled Salmon', type: 'text' },
                      { k: 'description', label: 'Description', placeholder: 'Brief description…', type: 'text' },
                      { k: 'price', label: 'Price (₹) *', placeholder: '349', type: 'number' },
                      { k: 'calories', label: 'Calories', placeholder: '420', type: 'number' },
                      { k: 'protein', label: 'Protein (g)', placeholder: '38.5', type: 'number' },
                      { k: 'image_url', label: 'Image URL', placeholder: 'https://…', type: 'url' },
                    ].map((field) => (
                      <div key={field.k}>
                        <label className="text-xs text-gray-600 mb-1 block">{field.label}</label>
                        <input
                          value={(form as any)[field.k]}
                          type={field.type}
                          placeholder={field.placeholder}
                          onChange={(e) => setForm((prev) => ({ ...prev, [field.k]: e.target.value }))}
                          className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm" />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-warm-50 border border-warm-200 focus:border-primary-600/50 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-all">
                        {['Main', 'High Protein', 'Low Cal', 'Vegetarian', 'Dessert', 'Drinks'].map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={addDish}
                      disabled={savingDish || !form.name.trim() || !form.price}
                      className="py-3 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {savingDish ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : savedDish ? (
                        '✅ Dish Added!'
                      ) : (
                        <><PlusCircle className="w-4 h-4" /> Add to Menu</>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                    <ShoppingBag className="w-5 h-5 text-primary-600" />
                    Current Menu ({dishes.length})
                  </h2>

                  <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-16 glass rounded-xl animate-pulse border border-warm-200" />
                      ))
                    ) : dishes.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-8">No dishes yet. Add your first one!</p>
                    ) : (
                      dishes.map((dish: any) => (
                        <div
                          key={dish.id}
                          className="glass border border-warm-200 rounded-xl p-3 flex gap-3 items-center hover:border-primary-600/30 transition-all duration-200 shadow-card">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                              alt={dish.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 truncate">{dish.name}</p>
                            <p className="text-xs text-slate-500">₹{dish.price} · {dish.calories} cal · {dish.protein}g protein</p>
                          </div>
                          <span className="text-[10px] bg-primary-600/10 border border-primary-600/15 text-primary-700 px-2 py-0.5 rounded-full flex-shrink-0">
                            {dish.category}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .active-orders-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .active-orders-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .active-orders-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(120, 53, 15, 0.28);
          border-radius: 999px;
        }

        .active-orders-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(120, 53, 15, 0.42);
        }
      `}</style>
    </main>
  );
}