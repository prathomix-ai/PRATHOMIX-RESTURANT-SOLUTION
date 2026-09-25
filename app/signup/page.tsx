'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  User,
  Mail,
  Phone,
  Lock,
  Building,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { setClientSession, type AuthUser } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') === 'owner' ? 'owner' : 'customer';

  const [accountType, setAccountType] = useState<'customer' | 'owner'>(defaultType);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Restaurant Owner fields
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [city, setCity] = useState('');
  const [restaurantType, setRestaurantType] = useState('Contemporary Fine Dining');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        account_type: accountType,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        ...(accountType === 'owner' && {
          restaurant_name: restaurantName.trim(),
          restaurant_address: restaurantAddress.trim(),
          city: city.trim(),
          restaurant_type: restaurantType,
        }),
      };

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Registration failed.');
      }

      const user: AuthUser = data.user;
      setClientSession(user);

      router.push(data.redirectTo || (accountType === 'owner' ? '/admin' : '/'));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4 bg-[#0A0A0A] relative overflow-hidden">
        {/* Golden ambiance */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#C5A880]/5 rounded-full blur-[150px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl relative z-10">

          <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A880] to-transparent" />

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/25 shadow-warm flex items-center justify-center mx-auto mb-4">
                {accountType === 'owner' ? (
                  <Building className="w-8 h-8 text-[#C5A880]" />
                ) : (
                  <Sparkles className="w-8 h-8 text-[#C5A880]" />
                )}
              </div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] font-semibold mb-1">
                {accountType === 'owner' ? 'SaaS Onboarding' : 'VIP Dining Club'}
              </p>
              <h1
                className="font-display text-3xl font-bold text-[#EAE6DF] tracking-wide"
                style={{ fontFamily: 'Cinzel, serif' }}>
                {accountType === 'owner' ? 'Launch Your Restaurant' : 'Create Customer Account'}
              </h1>
              <p className="text-xs text-[#EAE6DF]/60 mt-1.5">
                {accountType === 'owner'
                  ? 'Join PRATHOMIX Restaurant OS. Zero-commissions, instant KDS & QR tables.'
                  : 'Enjoy seamless online ordering, table reservations, and exclusive tasting menus.'}
              </p>
            </div>

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#121212] border border-[#C5A880]/15 mb-6">
              <button
                type="button"
                onClick={() => { setAccountType('customer'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                  accountType === 'customer'
                    ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                    : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                }`}>
                <User className="w-3.5 h-3.5" /> Customer Account
              </button>
              <button
                type="button"
                onClick={() => { setAccountType('owner'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                  accountType === 'owner'
                    ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                    : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                }`}>
                <Building className="w-3.5 h-3.5" /> Restaurant Owner
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-xs text-rose-300">
                  {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Restaurant Information (if Owner) */}
              {accountType === 'owner' && (
                <div className="p-4 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-3.5">
                  <p className="text-[10px] uppercase tracking-widest text-[#C5A880] font-bold flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#C5A880]" /> Restaurant Profile
                  </p>

                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                      Restaurant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      placeholder="e.g. The Royal Saffron Bistro"
                      className="w-full bg-[#0A0A0A] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full bg-[#0A0A0A] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                        Cuisine / Concept
                      </label>
                      <select
                        value={restaurantType}
                        onChange={(e) => setRestaurantType(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] outline-none">
                        <option value="Contemporary Fine Dining">Contemporary Fine Dining</option>
                        <option value="Luxury Lounge & Bar">Luxury Lounge & Bar</option>
                        <option value="Modern Indian Bistro">Modern Indian Bistro</option>
                        <option value="Japanese & Asian Fusion">Japanese & Asian Fusion</option>
                        <option value="Artisanal Café & Bakery">Artisanal Café & Bakery</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1 block">
                      Address
                    </label>
                    <input
                      type="text"
                      value={restaurantAddress}
                      onChange={(e) => setRestaurantAddress(e.target.value)}
                      placeholder="e.g. Financial District, High Street"
                      className="w-full bg-[#0A0A0A] border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Owner/Customer Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    {accountType === 'owner' ? 'Owner Full Name *' : 'Your Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Vikramaditya Roy"
                    className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@prathomix.com"
                  className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm tracking-wider uppercase shadow-warm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" /> Creating Your Account...
                  </>
                ) : (
                  <>
                    {accountType === 'owner' ? 'Register Restaurant & Enter OS' : 'Complete Registration'}{' '}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#C5A880]/10 text-center text-xs text-[#EAE6DF]/70">
              Already have an account?{' '}
              <Link href="/login" className="text-[#C5A880] font-semibold hover:underline">
                Sign In to Unified Portal &rarr;
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}
