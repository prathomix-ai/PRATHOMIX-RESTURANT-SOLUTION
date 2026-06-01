'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Shield, Sparkles } from 'lucide-react';

import { supabase } from '@/lib/supabase';

const ERROR_TEXT = 'Incorrect password. Access denied.';

function setKitchenCookie() {
  document.cookie = 'prathomix_staff_role=kitchen; path=/; max-age=28800; samesite=lax';
}

function clearKitchenCookie() {
  document.cookie = 'prathomix_staff_role=; path=/; max-age=0; samesite=lax';
}

export default function KitchenLogin() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document.cookie.includes('prathomix_staff_role=kitchen')) {
      window.location.href = '/kitchen/dashboard';
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
      const currentRole = window.location.pathname.split('/')[1];
      const { data, error } = await supabase.rpc('verify_staff_access', {
        p_code: pw,
        p_role: currentRole,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        alert('Incorrect password');
        setPwErr(ERROR_TEXT);
        setPw('');
        return;
      }

      setKitchenCookie();
      window.location.href = `/${currentRole}/dashboard`;
    } catch (error) {
      console.error(error);
      setPwErr(error instanceof Error ? error.message : ERROR_TEXT);
      setPw('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen texture-bg flex items-center justify-center px-4 bg-warm-50">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass border border-warm-200 rounded-3xl p-8 w-full max-w-md shadow-warm-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-600/25 shadow-warm flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary-600 mb-2">Kitchen Access</p>
          <h1 className="font-display text-2xl font-bold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
            Kitchen Login
          </h1>
          <p className="text-xs text-gray-500 mt-2">Prathomix back-of-house control panel</p>
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
            placeholder="Enter kitchen password"
            className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {pwErr ? (
          <p className="mb-3 rounded-lg border border-primary-600/15 bg-primary-600/5 px-3 py-2 text-center text-[11px] text-stone-700">
            {pwErr}
          </p>
        ) : null}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Authenticating…
            </>
          ) : (
            'Authenticate'
          )}
        </button>

        <div className="mt-5 flex items-center justify-between text-[10px] text-gray-600">
          <span>Direct URL access only.</span>
          <Link href="/" className="hover:text-primary-600 transition-colors inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}