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
  User,
  UtensilsCrossed,
  Users,
  ShieldCheck,
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
    date: getTodayInputValue(),
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
      date: getTodayInputValue(),
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
      <div className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] relative overflow-hidden">
        <Navbar />
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C5A880]/10 rounded-full blur-[140px] pointer-events-none" />

        <main className="min-h-screen pt-32 pb-16 px-4 relative z-10 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-3xl mx-auto bg-[#121212]/95 border border-[#C5A880]/30 rounded-[2rem] p-8 sm:p-12 shadow-2xl text-center backdrop-blur-xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#C5A880] font-semibold mb-3">Reservation Confirmed</p>
            <h1
              className="font-display text-3xl sm:text-5xl font-medium text-white mb-4 uppercase"
              style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
              Your Table is Ready
            </h1>
            <p className="text-stone-300 max-w-xl mx-auto leading-relaxed mb-8 text-sm sm:text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              We have reserved your table with warm anticipation. We look forward to welcoming you on{' '}
              <span className="text-white font-semibold">{String(success.date)}</span>
              {' '}at{' '}
              <span className="text-[#C5A880] font-semibold">{String(success.time)}</span>
              {' '}for Table {String(success.table_number ?? '')}.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <div className="rounded-2xl bg-[#181818]/90 border border-white/10 p-4 text-left shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-[#C5A880] mb-1 font-semibold">Booking ID</p>
                <p className="text-sm font-bold text-white tracking-wider">#{String(success.id ?? '').slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="rounded-2xl bg-[#181818]/90 border border-white/10 p-4 text-left shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-[#C5A880] mb-1 font-semibold">Guests</p>
                <p className="text-sm font-semibold text-white">{String(success.guests)} Guest{Number(success.guests) > 1 ? 's' : ''}</p>
              </div>
              <div className="rounded-2xl bg-[#181818]/90 border border-white/10 p-4 text-left shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-[#C5A880] mb-1 font-semibold">Table</p>
                <p className="text-sm font-semibold text-white">Table {String(success.table_number)}</p>
              </div>
              <div className="rounded-2xl bg-[#181818]/90 border border-white/10 p-4 text-left shadow-lg">
                <p className="text-[10px] uppercase tracking-widest text-[#C5A880] mb-1 font-semibold">Date</p>
                <p className="text-sm font-semibold text-white">{formatReservationDate(String(success.date))}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={resetForm}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-[#C5A880]/20 hover:scale-[1.02]">
                <span>Make Another Reservation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 bg-transparent border border-[#C5A880]/40 text-[#C5A880] hover:bg-[#C5A880]/10 font-bold text-xs uppercase tracking-widest transition-all duration-300">
                Browse Menu
              </Link>
            </div>
          </motion.div>
        </main>
        <ChatInterface />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] relative overflow-hidden">
      <Navbar />

      {/* Luxury ambient light orbs */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-[#C5A880]/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-[#8C7355]/6 rounded-full blur-[140px] pointer-events-none" />

      <main className="min-h-screen pt-28 sm:pt-32 pb-20 relative z-10 pb-safe">
        <section className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
            {/* Header Content */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}>
              <div className="inline-flex items-center gap-2.5 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/25 px-4 py-1.5 mb-5 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                <span className="text-[11px] uppercase tracking-[0.3em] text-[#C5A880] font-bold">Elegant Table Reservation</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium leading-[1.02] tracking-tight text-white mb-6 uppercase"
                style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
                Book a Table
              </h1>

              <p
                className="text-base sm:text-lg text-stone-300 max-w-xl leading-relaxed mb-8"
                style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Reserve a bespoke dining experience with warm hospitality, curated culinary artistry, and a seamless booking flow designed to feel effortless.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl">
                <div className="bg-[#141414]/90 border border-[#C5A880]/15 hover:border-[#C5A880]/35 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-300">
                  <Clock3 className="w-5 h-5 text-[#C5A880] mb-2" />
                  <p className="text-sm font-semibold text-stone-100">Quick Confirmation</p>
                  <p className="text-xs text-stone-400 mt-1">Receive booking details instantly.</p>
                </div>
                <div className="bg-[#141414]/90 border border-[#C5A880]/15 hover:border-[#C5A880]/35 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-300">
                  <HeartHandshake className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold text-stone-100">Warm Service</p>
                  <p className="text-xs text-stone-400 mt-1">Every reservation gets personal attention.</p>
                </div>
                <div className="bg-[#141414]/90 border border-[#C5A880]/15 hover:border-[#C5A880]/35 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all duration-300">
                  <MapPin className="w-5 h-5 text-[#C5A880] mb-2" />
                  <p className="text-sm font-semibold text-stone-100">Jaipur Location</p>
                  <p className="text-xs text-stone-400 mt-1">A refined space in the heart of the city.</p>
                </div>
              </div>
            </motion.div>

            {/* Restaurant Interior Preview */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.66, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
              <div
                className="relative overflow-hidden min-h-[380px] sm:min-h-[420px] rounded-[2rem] border border-[#C5A880]/20 shadow-2xl bg-cover bg-center"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80')",
                }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(197,168,128,0.12),transparent_50%)]" />

                <div className="absolute bottom-5 left-5 right-5 bg-[#0A0A0A]/85 border border-[#C5A880]/25 rounded-2xl p-4 sm:p-5 text-white backdrop-blur-md shadow-2xl">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] font-bold mb-1">Restaurant Interior Preview</p>
                  <p
                    className="text-base sm:text-lg font-medium leading-snug text-stone-100"
                    style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
                    A calm, warm dining room ready to welcome your guests in pure luxury.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Form and Notes Section */}
        <section className="max-w-7xl mx-auto px-3 sm:px-6 mt-10 sm:mt-16">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start">
            {/* Reservation Form */}
            <motion.form
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              className="bg-[#121212]/95 border border-[#C5A880]/20 rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 lg:p-9 shadow-2xl backdrop-blur-xl relative">
              
              {/* Subtle top edge border shimmer */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#C5A880]/40 to-transparent" />

              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#C5A880] font-bold mb-2">Reservation Details</p>
                  <h2
                    className="font-display text-2xl sm:text-3xl font-medium text-white uppercase"
                    style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
                    Tell Us About Your Visit
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/20 px-3.5 py-1.5 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                  <span className="text-xs font-semibold text-[#C5A880]">All fields are safe and secure</span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#C5A880]" /> Full Name *
                  </label>
                  <input
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    placeholder="e.g. Alexander Vance"
                    autoComplete="name"
                    className="w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition-all duration-200"
                    aria-invalid={Boolean(errors.fullName)}
                  />
                  {errors.fullName && <p className="text-xs text-rose-400 font-medium">{errors.fullName}</p>}
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#C5A880]" /> Phone Number *
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition-all duration-200"
                    aria-invalid={Boolean(errors.phone)}
                  />
                  {errors.phone && <p className="text-xs text-rose-400 font-medium">{errors.phone}</p>}
                </div>

                {/* Date */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-[#C5A880]" /> Date of Reservation *
                  </label>
                  <input
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    type="date"
                    min={minDate}
                    className="[color-scheme:dark] w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 outline-none transition-all duration-200"
                    aria-invalid={Boolean(errors.date)}
                  />
                  {errors.date && <p className="text-xs text-rose-400 font-medium">{errors.date}</p>}
                </div>

                {/* Time Slot */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                    <Clock3 className="w-3.5 h-3.5 text-[#C5A880]" /> Time Slot *
                  </label>
                  <select
                    value={form.timeSlot}
                    onChange={(e) => updateField('timeSlot', e.target.value)}
                    className="[color-scheme:dark] w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 outline-none transition-all duration-200 cursor-pointer"
                    aria-invalid={Boolean(errors.timeSlot)}>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value} className="bg-[#181818] text-stone-100">
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {errors.timeSlot && <p className="text-xs text-rose-400 font-medium">{errors.timeSlot}</p>}
                </div>
              </div>

              {/* Number of Guests */}
              <div className="mt-5 flex flex-col gap-2 max-w-xs">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#C5A880]" /> Number of Guests *
                </label>
                <select
                  value={form.guests}
                  onChange={(e) => updateField('guests', e.target.value)}
                  className="[color-scheme:dark] w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 outline-none transition-all duration-200 cursor-pointer"
                  aria-invalid={Boolean(errors.guests)}>
                  {GUEST_OPTIONS.map((count) => (
                    <option key={count} value={count} className="bg-[#181818] text-stone-100">
                      {count} {count === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
                {errors.guests && <p className="text-xs text-rose-400 font-medium">{errors.guests}</p>}
              </div>

              {/* Table Selector Box */}
              <div className="mt-7 rounded-2xl border border-white/10 bg-[#161616]/90 p-4 sm:p-5 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#C5A880] font-bold">Select Your Table</p>
                    <p className="text-xs text-stone-400 mt-1">Live table availability for your selected date and time slot.</p>
                  </div>
                  {availabilityLoading ? (
                    <div className="flex items-center gap-2 text-xs text-[#C5A880]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C5A880]" />
                      <span>Checking tables...</span>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                  {Array.from({ length: TABLE_COUNT }, (_, index) => index + 1).map((tableNumber) => {
                    const available = availableTableSet.has(tableNumber);
                    const selected = Number(selectedTable) === tableNumber;
                    return (
                      <button
                        key={tableNumber}
                        type="button"
                        onClick={() => available && setSelectedTable(String(tableNumber))}
                        disabled={!available}
                        className={`rounded-xl border px-2.5 sm:px-3.5 py-2.5 sm:py-3 min-h-[44px] text-left transition-all duration-200 ${
                          selected
                            ? 'bg-gradient-to-r from-[#C5A880] to-[#b59870] border-[#C5A880] text-[#0A0A0A] font-bold shadow-lg shadow-[#C5A880]/25 scale-[1.02]'
                            : available
                              ? 'bg-[#1e1e1e] border-emerald-500/30 text-stone-200 hover:border-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300'
                              : 'bg-[#121212]/80 border-white/5 text-stone-600 cursor-not-allowed opacity-60'
                        }`}>
                        <p className={`text-xs sm:text-sm font-semibold ${selected ? 'text-[#0A0A0A]' : ''}`}>Table {tableNumber}</p>
                        <p className={`text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1 ${
                          selected ? 'text-[#0A0A0A]/90 font-bold' : available ? 'text-emerald-400 font-medium' : 'text-stone-600'
                        }`}>
                          {selected ? 'Selected' : available ? 'Available' : 'Booked'}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-stone-400 pt-3 border-t border-white/5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>{availableTableNumbers.length} tables available for this slot</span>
                  </span>
                  <span className="text-stone-500">Instant real-time sync with host desk</span>
                </div>
              </div>

              {/* Special Requests */}
              <div className="mt-6 flex flex-col gap-2">
                <label className="text-xs uppercase tracking-[0.25em] text-stone-300 font-semibold flex items-center gap-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-[#C5A880]" /> Special Requests <span className="normal-case tracking-normal text-stone-500 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.specialRequests}
                  onChange={(e) => updateField('specialRequests', e.target.value)}
                  placeholder="Dietary preferences, anniversary celebration, window booth request, etc."
                  rows={3}
                  className="w-full bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/40 rounded-xl px-4 py-3.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition-all duration-200 resize-none"
                />
              </div>

              {errors.form && (
                <div className="mt-5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 flex items-center gap-2">
                  <span>{errors.form}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-7 w-full inline-flex items-center justify-center gap-3 rounded-xl px-6 py-4 bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs sm:text-sm uppercase tracking-[0.22em] shadow-lg shadow-[#C5A880]/20 hover:shadow-[#C5A880]/35 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
                    <span>Securing Table...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-stone-400 text-center mt-4">
                Instant confirmation saved to our guest directory · No advance deposit required
              </p>
            </motion.form>

            {/* Sidebar Notes */}
            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.68, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="bg-[#121212]/95 border border-[#C5A880]/20 rounded-[2rem] p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
              
              <p className="text-xs uppercase tracking-[0.35em] text-[#C5A880] font-bold mb-4">
                Reservation Notes
              </p>

              <div className="space-y-4">
                <div className="rounded-2xl bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 p-4 sm:p-5 shadow-lg transition-all">
                  <p className="text-sm font-semibold text-stone-100 mb-1">Ideal For</p>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Date nights, family gatherings, celebratory dinners, and relaxed executive meals.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 p-4 sm:p-5 shadow-lg transition-all">
                  <p className="text-sm font-semibold text-stone-100 mb-1">Hours & Location</p>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Open Daily · 12:00 PM – 11:30 PM<br />
                    MI Road, Ashok Nagar, Jaipur
                  </p>
                </div>

                <div className="rounded-2xl bg-[#181818]/90 border border-white/10 hover:border-[#C5A880]/30 p-4 sm:p-5 shadow-lg transition-all">
                  <p className="text-sm font-semibold text-stone-100 mb-1">Bespoke Requests</p>
                  <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
                    Add notes for wine pairings, allergy precautions, or special cake service and our maître d' will accommodate.
                  </p>
                </div>

                {/* Highlight Card — Luxury Gold Tint instead of stark white */}
                <div className="rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/30 p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center gap-2.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />
                    <p className="text-sm font-bold text-[#C5A880]">Seamless Verification</p>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                    Once confirmed, your reservation is instantaneously dispatched to the dining room floor and saved to your profile.
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        </section>
      </main>

      <ChatInterface />
    </div>
  );
}