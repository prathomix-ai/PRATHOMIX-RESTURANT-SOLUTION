'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

import { supabase } from '@/lib/supabase';

const ERROR_TEXT = 'Incorrect password. Access denied.';

export default function ReceptionLoginPage() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [pwErr, setPwErr] = useState('');
  const [loading, setLoading] = useState(false);

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

      document.cookie = `prathomix_staff_role=${encodeURIComponent(currentRole)}; path=/; max-age=28800; samesite=lax`;
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
        className="glass border border-warm-200 rounded-2xl p-8 w-full max-w-sm shadow-warm-lg">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/10 border border-primary-600/25 shadow-warm
                          flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <h1
            className="font-display text-2xl font-bold gradient-text"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Reception Access
          </h1>
          <p className="text-xs text-gray-500 mt-1">Prathomix Front Desk Control Panel</p>
        </div>

        <div className="relative mb-4">
          <input
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwErr(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            type={show ? 'text' : 'password'}
            placeholder="Enter reception password"
            className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50
                       rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 placeholder-gray-500
                       outline-none transition-all focus:shadow-warm" />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {pwErr && (
          <p className="mb-3 rounded-lg border border-primary-600/15 bg-primary-600/5 px-3 py-2 text-center text-[11px] text-stone-700">
            {pwErr}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30
                     text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating…</> : 'Authenticate'}
        </button>

        <p className="text-[10px] text-gray-600 text-center mt-5">
          This page is not linked from anywhere. Direct URL access only.
        </p>
      </motion.div>
    </div>
  );
}