'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageSquareText,
  Phone,
  Sparkles,
  Table,
  User,
  UtensilsCrossed,
  Users,
} from 'lucide-react';

import Navbar from '@/components/Navbar';
import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => null,
});

type FormState = {
  fullName: string;
  phone: string;
  date: string;
  timeSlot: string;
  guests: string;
  specialRequests: string;
};

type FormErrors = Partial<Record<keyof FormState, string>> & {
  form?: string;
};

const TIME_SLOTS = [
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
];

const GUEST_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1);
const TABLE_COUNT = 10;

function getTodayInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isPastDate(dateValue: string) {
  const selectedDate = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate < today;
}

function formatReservationDate(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function validateForm(form: FormState, selectedTable: string, availableTableNumbers: number[]) {
  const nextErrors: FormErrors = {};

  if (!form.fullName.trim()) nextErrors.fullName = 'Please enter your full name.';

  const phone = form.phone.trim();
  if (!phone) {
    nextErrors.phone = 'Please enter a phone number.';
  } else if (!/^[+()\d\s-]{7,}$/.test(phone)) {
    nextErrors.phone = 'Please enter a valid phone number.';
  }

  if (!form.date) {
    nextErrors.date = 'Please choose a reservation date.';
  } else if (isPastDate(form.date)) {
    nextErrors.date = 'Reservation date cannot be in the past.';
  }

  if (!form.timeSlot) nextErrors.timeSlot = 'Please select a time slot.';

  const guestCount = Number(form.guests);
  if (!form.guests) {
    nextErrors.guests = 'Please select the number of guests.';
  } else if (Number.isNaN(guestCount) || guestCount < 1 || guestCount > 20) {
    nextErrors.guests = 'Guest count must be between 1 and 20.';
  }

  if (form.date && form.timeSlot && !selectedTable) {
    nextErrors.form = 'Please select an available table before confirming your booking.';
  }

  if (form.date && form.timeSlot && selectedTable && !availableTableNumbers.includes(Number(selectedTable))) {
    nextErrors.form = 'Please choose an available table for this slot.';
  }

  return nextErrors;
}

export default function ReservationPage() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    phone: '',
    date: '',
    timeSlot: '19:00',
    guests: '2',
    specialRequests: '',
  });
  const [selectedTable, setSelectedTable] = useState('');
  const [availableTableNumbers, setAvailableTableNumbers] = useState<number[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);

  const minDate = getTodayInputValue();
  const availableTableSet = useMemo(() => new Set(availableTableNumbers), [availableTableNumbers]);
  const validationPreview = useMemo(() => validateForm(form, selectedTable, availableTableNumbers), [form, selectedTable, availableTableNumbers]);
  const canSubmit = Object.keys(validationPreview).length === 0 && !loading;

  const loadAvailability = useCallback(async (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) {
      setAvailableTableNumbers([]);
      setSelectedTable('');
      return;
    }

    setAvailabilityLoading(true);
    try {
      const { data, error } = await supabase
        .from(RESTAURANT_TABLES.bookings)
        .select('table_number, status, date, time')
        .eq('date', dateValue)
        .eq('time', timeValue);

      if (error) throw error;

      const bookedTables = new Set<number>();
      for (const booking of data ?? []) {
        const tableNumber = Number(booking.table_number);
        const status = String(booking.status ?? '').toLowerCase();
        if (tableNumber && ['reserved', 'confirmed', 'pending', 'seated'].includes(status)) {
          bookedTables.add(tableNumber);
        }
      }

      const nextAvailable = Array.from({ length: TABLE_COUNT }, (_, index) => index + 1).filter((tableNumber) => !bookedTables.has(tableNumber));
      setAvailableTableNumbers(nextAvailable);

      setSelectedTable((current) => {
        if (current && nextAvailable.includes(Number(current))) return current;
        return nextAvailable[0] ? String(nextAvailable[0]) : '';
      });
    } catch (error) {
      console.error('Availability lookup failed:', error);
      setAvailableTableNumbers([]);
      setSelectedTable('');
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!form.date || !form.timeSlot) {
      setAvailableTableNumbers([]);
      setSelectedTable('');
      return;
    }

    void loadAvailability(form.date, form.timeSlot);
  }, [form.date, form.timeSlot, loadAvailability]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      delete next.form;
      return next;
    });
  }

  function resetForm() {
    setForm({
      fullName: '',
      phone: '',
      date: '',
      timeSlot: '19:00',
      guests: '2',
      specialRequests: '',
    });
    setSelectedTable('');
    setAvailableTableNumbers([]);
    setErrors({});
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const nextErrors = validateForm(form, selectedTable, availableTableNumbers);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.fullName.trim(),
          phone: form.phone.trim(),
          date: form.date,
          time: form.timeSlot,
          guests: Number(form.guests),
          table_number: Number(selectedTable),
          status: 'confirmed',
          notes: form.specialRequests.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed. Please try again.');

      setSuccess(data);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-28 pb-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="max-w-3xl mx-auto glass border border-warm-200 rounded-[2rem] p-8 sm:p-10 shadow-warm-lg text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-accent-green" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-accent-green font-semibold mb-3">Reservation Confirmed</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary-900 mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
              Your table is ready for you
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto leading-relaxed mb-8">
              We’ve reserved your table and saved your preferences. See you on{' '}
              <span className="text-gray-900 font-semibold">{String(success.date)}</span>
              {' '}at{' '}
              <span className="text-gray-900 font-semibold">{String(success.time)}</span>
              {' '}for Table {String(success.table_number ?? '')}.
            </p>

            <div className="grid sm:grid-cols-4 gap-3 mb-8">
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Booking ID</p>
                <p className="text-sm font-semibold text-gray-900">#{String(success.id ?? '').slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Guests</p>
                <p className="text-sm font-semibold text-gray-900">{String(success.guests)} guest{Number(success.guests) > 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Table</p>
                <p className="text-sm font-semibold text-gray-900">Table {String(success.table_number)}</p>
              </div>
              <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 text-left shadow-warm">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Date</p>
                <p className="text-sm font-semibold text-gray-900">{formatReservationDate(String(success.date))}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={resetForm}
                className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-primary-600 text-white font-semibold shadow-warm hover:bg-primary-700">
                Make Another Reservation
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/menu"
                className="lift-3d shine-sweep inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 glass border border-warm-200 text-gray-700 font-semibold hover:text-primary-600 hover:border-primary-400/30">
                Browse Menu
              </Link>
            </div>
          </motion.div>
        </main>
        <ChatInterface />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <section className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}>
              <div className="inline-flex items-center gap-2 rounded-full glass border border-primary-600/15 px-4 py-2 mb-6 shadow-warm">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <span className="text-xs uppercase tracking-[0.3em] text-primary-700 font-semibold">Elegant Table Reservation</span>
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] text-primary-900 mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
                Book a Table
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl leading-relaxed mb-8">
                Reserve a beautiful dining experience with warm hospitality, curated dishes, and a seamless booking flow designed to feel effortless.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
                <div className="glass border border-warm-200 rounded-2xl p-4 shadow-card lift-3d">
                  <Clock3 className="w-5 h-5 text-primary-600 mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Quick confirmation</p>
                  <p className="text-xs text-gray-600 mt-1">Receive booking details instantly.</p>
                </div>
                <div className="glass border border-warm-200 rounded-2xl p-4 shadow-card lift-3d">
                  <HeartHandshake className="w-5 h-5 text-accent-green mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Warm service</p>
                  <p className="text-xs text-gray-600 mt-1">Every reservation gets personal attention.</p>
                </div>
                <div className="glass border border-warm-200 rounded-2xl p-4 shadow-card lift-3d">
                  <MapPin className="w-5 h-5 text-accent-red mb-2" />
                  <p className="text-sm font-semibold text-gray-900">Jaipur location</p>
                  <p className="text-xs text-gray-600 mt-1">A refined space in the heart of the city.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.66, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <div
                className="relative overflow-hidden min-h-[380px] rounded-[2rem] border border-warm-200 shadow-warm-lg bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80')",
                }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_40%)]" />

                <div className="absolute bottom-5 left-5 right-5 glass border border-white/20 rounded-2xl p-4 text-white shadow-warm-md">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-warm-50/90 mb-1">Restaurant interior preview</p>
                  <p className="text-lg font-semibold leading-snug">
                    A calm, warm dining room ready to welcome your guests.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mt-10">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
            <motion.form
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              className="glass border border-warm-200 rounded-[2rem] p-6 sm:p-8 shadow-warm-lg">
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-primary-700 font-semibold mb-2">Reservation Details</p>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary-900" style={{ fontFamily: 'Cinzel, serif' }}>
                    Tell us about your visit
                  </h2>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-primary-50 border border-primary-600/15 px-3 py-1.5">
                  <UtensilsCrossed className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-semibold text-primary-700">All fields are safe and secure</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Full Name *
                  </label>
                  <input
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName && <p className="text-xs text-accent-red">{errors.fullName}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Number *
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <p className="text-xs text-accent-red">{errors.phone}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Date of Reservation *
                  </label>
                  <input
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    type="date"
                    min={minDate}
                    className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm [color-scheme:light]"
                    aria-invalid={Boolean(errors.date)}
                  />
                  {errors.date && <p className="text-xs text-accent-red">{errors.date}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                    <Clock3 className="w-3.5 h-3.5" /> Time Slot *
                  </label>
                  <select
                    value={form.timeSlot}
                    onChange={(e) => updateField('timeSlot', e.target.value)}
                    className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm"
                    aria-invalid={Boolean(errors.timeSlot)}>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {errors.timeSlot && <p className="text-xs text-accent-red">{errors.timeSlot}</p>}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-1.5 max-w-xs">
                <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Number of Guests *
                </label>
                <select
                  value={form.guests}
                  onChange={(e) => updateField('guests', e.target.value)}
                  className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:shadow-warm"
                  aria-invalid={Boolean(errors.guests)}>
                  {GUEST_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
                {errors.guests && <p className="text-xs text-accent-red">{errors.guests}</p>}
              </div>

              <div className="mt-6 rounded-2xl border border-warm-200 bg-white/25 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-primary-700 font-semibold">Select your table</p>
                    <p className="text-sm text-stone-600">Only tables not already booked for this exact slot are shown as available.</p>
                  </div>
                  {availabilityLoading ? <Loader2 className="w-4 h-4 animate-spin text-primary-600" /> : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Array.from({ length: TABLE_COUNT }, (_, index) => index + 1).map((tableNumber) => {
                    const available = availableTableSet.has(tableNumber);
                    const selected = Number(selectedTable) === tableNumber;
                    return (
                      <button
                        key={tableNumber}
                        type="button"
                        onClick={() => available && setSelectedTable(String(tableNumber))}
                        disabled={!available}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all duration-200 ${
                          selected
                            ? 'bg-primary-600/10 border-primary-600/25 text-primary-800 shadow-warm'
                            : available
                              ? 'bg-emerald-600/5 border-emerald-700/15 text-stone-800 hover:bg-emerald-600/10'
                              : 'bg-stone-100/80 border-stone-200 text-stone-400 cursor-not-allowed'
                        }`}>
                        <p className="text-sm font-semibold">Table {tableNumber}</p>
                        <p className="text-[10px] uppercase tracking-[0.22em] mt-1">
                          {selected ? 'Selected' : available ? 'Available' : 'Booked'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                  <span>{availableTableNumbers.length} tables available for this slot</span>
                  <span>Selection updates live after choosing date and time</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-[0.25em] text-gray-500 font-semibold flex items-center gap-1.5">
                  <MessageSquareText className="w-3.5 h-3.5" /> Special Requests <span className="normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.specialRequests}
                  onChange={(e) => updateField('specialRequests', e.target.value)}
                  placeholder="Dietary needs, birthday celebration, quiet corner, etc."
                  rows={4}
                  className="bg-white/45 backdrop-blur-md border border-white/40 focus:border-primary-600/50 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm resize-none"
                />
              </div>

              {errors.form && (
                <p className="mt-5 text-sm text-accent-red bg-red-50 border border-red-200 rounded-xl p-3">
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-warm-lg lift-3d shine-sweep disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary-600">
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                Past dates are blocked automatically. You’ll receive confirmation once the booking is saved.
              </p>
            </motion.form>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="glass border border-warm-200 rounded-[2rem] p-6 shadow-warm-md">
              <p className="text-xs uppercase tracking-[0.35em] text-primary-700 font-semibold mb-4">
                Reservation Notes
              </p>

              <div className="space-y-4">
                <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 shadow-warm lift-3d">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Ideal for</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Date nights, family dinners, birthday celebrations, and relaxed business meals.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 shadow-warm lift-3d">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Open daily</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    12:00 PM - 11:00 PM · Mi Road, Jaipur
                  </p>
                </div>

                <div className="rounded-2xl bg-white/35 backdrop-blur-md border border-white/40 p-4 shadow-warm lift-3d">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Need something special?</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Add special requests in the form and our team will do their best to accommodate them.
                  </p>
                </div>

                <div className="rounded-2xl bg-primary-50 border border-primary-600/15 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-primary-600" />
                    <p className="text-sm font-semibold text-primary-900">Easy confirmation</p>
                  </div>
                  <p className="text-sm text-primary-800/90 leading-relaxed">
                    Once you confirm, we’ll store your reservation and send the details back instantly.
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>
      </main>
      <ChatInterface />
    </>
  );
}