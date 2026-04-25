'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Phone, User, CheckCircle, Loader2, Utensils } from 'lucide-react';

const TIME_SLOTS = ['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

const today = new Date().toISOString().split('T')[0];

export default function BookingPage() {
  const [form, setForm] = useState({
    customer_name: '',
    phone:         '',
    date:          '',
    time:          '19:00',
    guests:        2,
    notes:         '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<Record<string, unknown> | null>(null);
  const [error,   setError]   = useState('');

  function update(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim())         { setError('Please enter your phone number.'); return; }
    if (!form.date)                 { setError('Please select a date.'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/booking', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed. Please try again.');
      setSuccess(data);

      // Mock WhatsApp notification
      await fetch('/api/whatsapp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:   'booking',
          name:   form.customer_name,
          date:   form.date,
          time:   form.time,
          guests: form.guests,
        }),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  /* ── Success Screen ───────────────────────────────── */
  if (success) return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          className="glass neon-border rounded-3xl p-10 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-5" />
          <h2
            className="font-display text-2xl gradient-text mb-3"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Booking Confirmed!
          </h2>
          <p className="text-slate-300 mb-1">
            See you on{' '}
            <span className="text-white font-semibold">{String(success.date)}</span>
            {' '}at{' '}
            <span className="text-white font-semibold">{String(success.time)}</span>
          </p>
          <p className="text-slate-500 text-sm mb-2">
            {String(success.guests)} guest{Number(success.guests) > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-600 mb-6">
            Booking ID: #{String(success.id ?? '').slice(0, 8).toUpperCase()}
          </p>
          <p className="text-xs text-emerald-400/70">📱 WhatsApp confirmation sent (mock)</p>
        </motion.div>
      </main>
      <ChatInterface />
    </>
  );

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 shadow-neon-sm
                            flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-xs text-cyan-400 uppercase tracking-widest mb-2 font-medium">
              Reserve Your Spot
            </p>
            <h1
              className="font-display text-4xl font-bold gradient-text"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Book a Table
            </h1>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="glass neon-border rounded-2xl p-8 flex flex-col gap-5">

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Full Name *
              </label>
              <input
                value={form.customer_name}
                onChange={(e) => update('customer_name', e.target.value)}
                placeholder="Your full name"
                className="bg-transparent border border-slate-700 focus:border-cyan-500/50
                           rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500
                           outline-none transition-all focus:shadow-neon-sm" />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3 h-3" /> Phone Number *
              </label>
              <input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                className="bg-transparent border border-slate-700 focus:border-cyan-500/50
                           rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500
                           outline-none transition-all focus:shadow-neon-sm" />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Date *
                </label>
                <input
                  value={form.date}
                  onChange={(e) => update('date', e.target.value)}
                  type="date"
                  min={today}
                  className="bg-transparent border border-slate-700 focus:border-cyan-500/50
                             rounded-xl px-4 py-3 text-sm text-white outline-none
                             transition-all focus:shadow-neon-sm [color-scheme:dark]" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Time
                </label>
                <select
                  value={form.time}
                  onChange={(e) => update('time', e.target.value)}
                  className="bg-dark-800 border border-slate-700 focus:border-cyan-500/50
                             rounded-xl px-4 py-3 text-sm text-white outline-none
                             transition-all focus:shadow-neon-sm">
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Guests */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Number of Guests
              </label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => update('guests', n)}
                    className={`w-11 h-11 rounded-xl text-sm font-bold transition-all duration-200
                                 ${form.guests === n
                                   ? 'bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400 shadow-neon-sm'
                                   : 'glass border border-slate-700 text-slate-300 hover:border-cyan-500/30'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-wider">
                Special Requests (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Dietary restrictions, occasion, window seat preference…"
                rows={3}
                className="bg-transparent border border-slate-700 focus:border-cyan-500/50
                           rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500
                           outline-none transition-all focus:shadow-neon-sm resize-none" />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20
                            rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold
                         shadow-neon-cyan transition-all duration-200 hover:scale-[1.02] active:scale-100
                         disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 text-sm">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
              ) : (
                'Confirm Reservation'
              )}
            </button>

            <p className="text-xs text-slate-600 text-center">
              A WhatsApp confirmation will be sent to your number.
            </p>
          </form>
        </div>
      </main>
      <ChatInterface />
    </>
  );
}
