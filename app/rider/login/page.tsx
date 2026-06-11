'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Shield, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ERROR_TEXT = 'Incorrect PIN/Password. Access denied.';

function setRiderCookie() {
  document.cookie = 'prathomix_staff_role=rider; path=/; max-age=28800; samesite=lax';
}

export default function RiderLogin() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('prathomix_staff_role=rider')) {
      window.location.href = '/rider';
    }
  }, []);

  async function handleLogin() {
    if (!pw.trim()) {
      setPwErr(ERROR_TEXT);
      return;
    }

    setLoading(true);
    setPwErr('');

    try {
      const enteredCode = pw.trim();
      let success = false;
      let riderName = 'Rider Partner';

      // 1. Try DB verify_staff_access RPC
      try {
        const { data, error } = await supabase.rpc('verify_staff_access', {
          p_code: enteredCode,
          p_role: 'rider',
        });
        if (data && !error) {
          success = true;
        }
      } catch (err) {
        console.warn('RPC auth fallback triggered:', err);
      }

      // 2. Fallback check: default passcode 'rider2026'
      if (!success && enteredCode === 'rider2026') {
        success = true;
      }

      // 3. Fallback check: search staff profiles for a rider matching this passcode or employee code
      if (!success) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff_profiles')
          .select('*')
          .or(`passcode.eq.${enteredCode},employee_code.eq.${enteredCode}`);

        if (staffData && staffData.length > 0) {
          const matched = staffData.find((s) => s.role?.toLowerCase()?.includes('rider'));
          if (matched) {
            success = true;
            riderName = matched.name;
            localStorage.setItem('riderName', matched.name);
          }
        }
      }

      if (!success) {
        setPwErr(ERROR_TEXT);
        setPw('');
        return;
      }

      setRiderCookie();
      window.location.href = '/rider';
    } catch (error) {
      console.error('Login error:', error);
      setPwErr(error instanceof Error ? error.message : ERROR_TEXT);
      setPw('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background neon orbs for styling */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#C5A880]/5 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-[#C5A880]/3 blur-[95px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md glass rounded-3xl p-8"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/25 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(197,168,128,0.15)]">
            <Shield className="w-8 h-8 text-[#C5A880]" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#C5A880] mb-2 font-bold">Rider Access</p>
          <h1 className="font-display text-2xl font-bold text-slate-100" style={{ fontFamily: 'Cinzel, serif' }}>
            Rider Login
          </h1>
          <p className="text-xs text-stone-400 mt-2">Prathomix delivery fleet control panel</p>
        </div>

        <div className="relative mb-4">
          <input
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setPwErr('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            type={show ? 'text' : 'password'}
            placeholder="Enter rider PIN/Password"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-[#C5A880]/50 rounded-xl px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:shadow-[0_0_15px_rgba(197,168,128,0.15)]"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {pwErr ? (
          <p className="mb-4 rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2 text-center text-xs text-red-400 font-medium">
            {pwErr}
          </p>
        ) : null}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#C5A880] hover:bg-[#D5C3AE] disabled:bg-slate-800 text-[#0A0A0A] font-bold text-sm transition-all duration-300 shadow-[0_0_15px_rgba(197,168,128,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Authenticating…
            </>
          ) : (
            'Authenticate'
          )}
        </button>

        <div className="mt-6 flex items-center justify-between text-[10px] text-slate-500">
          <span>Direct URL access only.</span>
          <Link href="/" className="hover:text-[#C5A880] transition-colors inline-flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3" /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
