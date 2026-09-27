'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  ChefHat,
  Coffee,
  Users,
  Compass,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { setClientSession, DEMO_ACCOUNTS, ROLE_REDIRECTS, type AuthUser } from '@/lib/auth';

function getSafeRedirectUrl(target: string | null, userRole: string): string {
  const roleDefault = ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS] || '/';
  if (!target) return roleDefault;

  // Prevent open redirect: target must start with '/' and not '//' or 'http'
  if (!target.startsWith('/') || target.startsWith('//')) {
    return roleDefault;
  }

  // Prevent role escalation redirect (e.g. customer redirected to /admin or waiter to /owner)
  const isProtectedAdmin = target.startsWith('/admin') || target.startsWith('/owner');
  const isProtectedKitchen = target.startsWith('/kitchen') || target.startsWith('/chef');
  const isProtectedWaiter = target.startsWith('/waiter');
  const isProtectedReception = target.startsWith('/reception/dashboard');

  if (isProtectedAdmin && !['owner', 'admin', 'manager', 'accountant'].includes(userRole)) {
    return roleDefault;
  }
  if (isProtectedKitchen && !['chef', 'kitchen', 'owner', 'admin', 'manager'].includes(userRole)) {
    return roleDefault;
  }
  if (isProtectedWaiter && !['waiter', 'owner', 'admin', 'manager'].includes(userRole)) {
    return roleDefault;
  }
  if (isProtectedReception && !['receptionist', 'reception', 'owner', 'admin', 'manager'].includes(userRole)) {
    return roleDefault;
  }

  return target;
}

function UnifiedLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [activeTab, setActiveTab] = useState<'credentials' | 'badge'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLoginSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const payload =
        activeTab === 'credentials'
          ? { email: email.trim(), password }
          : { employee_code: employeeCode.trim().toUpperCase(), passcode };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Invalid credentials. Please verify your details.');
      }

      const user: AuthUser = data.user;
      setClientSession(user);

      // Safe redirect validation (prevents open redirects and role escalation)
      const destination = getSafeRedirectUrl(redirectParam, user.role);
      router.push(destination);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin(roleKey: string) {
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quick_role: roleKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Quick login failed');

      const user: AuthUser = data.user;
      setClientSession(user);

      const destination = getSafeRedirectUrl(redirectParam, user.role);
      router.push(destination);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-28 pb-16 flex items-center justify-center px-4 bg-[#0A0A0A] relative overflow-hidden">
        {/* Ambient golden luxury glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C5A880]/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#8C7355]/5 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-lg relative z-10">

          <div className="glass-dark border border-[#C5A880]/20 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Top golden shimmer accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A880] to-transparent" />

            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-[#C5A880]/35 shadow-warm flex items-center justify-center mx-auto mb-4 overflow-hidden p-2">
                <Image
                  src="/logo.png"
                  alt="PRATHOMIX"
                  width={56}
                  height={56}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] font-semibold mb-1">
                Unified Portal
              </p>
              <h1
                className="font-display text-3xl font-bold text-[#EAE6DF] tracking-wide"
                style={{ fontFamily: 'Cinzel, serif' }}>
                PRATHOMIX Access
              </h1>
              <p className="text-xs text-[#EAE6DF]/60 mt-1.5">
                Sign in to your restaurant operating suite or dining profile
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#121212] border border-[#C5A880]/15 mb-6">
              <button
                type="button"
                onClick={() => { setActiveTab('credentials'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'credentials'
                    ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                    : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                }`}>
                <Mail className="w-3.5 h-3.5" /> Email & Pass
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('badge'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                  activeTab === 'badge'
                    ? 'bg-[#C5A880] text-[#0A0A0A] shadow-md'
                    : 'text-[#EAE6DF]/60 hover:text-[#EAE6DF]'
                }`}>
                <KeyRound className="w-3.5 h-3.5" /> Staff Badge / PIN
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

            {/* Forms */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {activeTab === 'credentials' ? (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@prathomix.tech"
                        className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-4 py-3 pl-11 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none transition-all focus:shadow-warm"
                      />
                      <Mail className="w-4 h-4 text-[#C5A880]/60 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider block">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none transition-all focus:shadow-warm"
                      />
                      <Lock className="w-4 h-4 text-[#C5A880]/60 absolute left-4 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#EAE6DF]/50 hover:text-[#C5A880] transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                      Employee ID / Badge Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                        placeholder="e.g. W-1001 or REC-01"
                        className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-4 py-3 pl-11 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 uppercase font-mono tracking-wider outline-none transition-all focus:shadow-warm"
                      />
                      <Users className="w-4 h-4 text-[#C5A880]/60 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#EAE6DF]/80 uppercase tracking-wider mb-1.5 block">
                      Access Passcode / PIN
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        placeholder="e.g. waiter2026 or 4-digit PIN"
                        className="w-full bg-[#121212]/80 border border-[#C5A880]/20 focus:border-[#C5A880] rounded-xl px-4 py-3 pl-11 pr-11 text-sm text-[#EAE6DF] placeholder-[#EAE6DF]/30 outline-none transition-all focus:shadow-warm"
                      />
                      <KeyRound className="w-4 h-4 text-[#C5A880]/60 absolute left-4 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#EAE6DF]/50 hover:text-[#C5A880] transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-sm tracking-wider uppercase shadow-warm hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" /> Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Role Switcher */}
            <div className="mt-8 pt-6 border-t border-[#C5A880]/15">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-[#C5A880] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#C5A880]" /> Quick Role Demo Login
                </span>
                <span className="text-[10px] text-[#EAE6DF]/50">1-Click Evaluation</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[
                  { role: 'owner', label: 'Owner', icon: Shield },
                  { role: 'admin', label: 'Admin', icon: Compass },
                  { role: 'receptionist', label: 'Reception', icon: Coffee },
                  { role: 'waiter', label: 'Waiter', icon: Users },
                  { role: 'chef', label: 'Kitchen', icon: ChefHat },
                  { role: 'customer', label: 'Customer', icon: Sparkles },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(item.role)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[#121212]/90 border border-[#C5A880]/20 hover:border-[#C5A880] hover:bg-[#C5A880]/10 transition-all text-center group">
                    <item.icon className="w-3.5 h-3.5 text-[#C5A880] mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-semibold text-[#EAE6DF] group-hover:text-[#C5A880] tracking-wide">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sign up links */}
            <div className="mt-6 pt-5 border-t border-[#C5A880]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#EAE6DF]/70">
              <Link
                href="/signup?type=customer"
                className="hover:text-[#C5A880] transition-colors underline-offset-4 hover:underline">
                Create Customer Account
              </Link>
              <Link
                href="/signup?type=owner"
                className="text-[#C5A880] font-semibold hover:brightness-120 transition-all">
                Register Restaurant (Owner) &rarr;
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}

export default function UnifiedLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#C5A880]/30 border-t-[#C5A880] rounded-full animate-spin" />
        </div>
      }>
      <UnifiedLoginContent />
    </Suspense>
  );
}
