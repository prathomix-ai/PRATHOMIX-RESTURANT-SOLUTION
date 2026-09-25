'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Shield, Sparkles, UserRound, KeyRound } from 'lucide-react';

import { RESTAURANT_TABLES, supabase } from '@/lib/supabase';

const ERROR_TEXT = 'Incorrect Waiter ID or passcode.';

function setWaiterCookie() {
  document.cookie = 'prathomix_staff_role=waiter; path=/; max-age=28800; samesite=lax';
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function WaiterLogin() {
  const [waiterId, setWaiterId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document.cookie.includes('prathomix_staff_role=waiter')) {
      window.location.href = '/waiter/dashboard';
    }
  }, []);

  async function recordAttendance(staffId) {
    const today = getTodayDateValue();
    const { data, error } = await supabase
      .from(RESTAURANT_TABLES.attendance)
      .select('id')
      .eq('staff_id', staffId)
      .eq('attendance_date', today)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      const { error: insertError } = await supabase.from(RESTAURANT_TABLES.attendance).insert({
        staff_id: staffId,
        attendance_date: today,
        status: 'present',
      });

      if (insertError) {
        throw insertError;
      }
    }
  }

  async function handleLogin() {
    if (!waiterId.trim() || !passcode.trim()) {
      setError(ERROR_TEXT);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const enteredWaiterId = waiterId.trim();
      const enteredPasscode = passcode.trim();

      const { data, error } = await supabase
        .from('staff_profiles')
        .select('*')
        .eq('employee_code', enteredWaiterId)
        .eq('passcode', enteredPasscode)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        setError(ERROR_TEXT);
        setWaiterId('');
        setPasscode('');
        return;
      }

      localStorage.setItem('waiterName', data.name);
      localStorage.setItem('waiterId', data.id);
      sessionStorage.setItem('prathomix_waiter_staff_id', data.id);
      localStorage.setItem('prathomix_waiter_staff_id', data.id);
      await recordAttendance(data.id);
      setWaiterCookie();
      window.location.href = '/waiter/dashboard';
    } catch (loginError) {
      console.error('Waiter login failed:', loginError);
      setError(loginError instanceof Error ? loginError.message : ERROR_TEXT);
      setWaiterId('');
      setPasscode('');
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
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary-600 mb-2">Waiter Access</p>
          <h1 className="font-display text-2xl font-bold gradient-text" style={{ fontFamily: 'Cinzel, serif' }}>
            Waiter Login
          </h1>
          <p className="text-xs text-gray-500 mt-2">Prathomix front-of-house control panel</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Waiter ID</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={waiterId}
                onChange={(e) => {
                  setWaiterId(e.target.value);
                  setError('');
                }}
                type="text"
                placeholder="Enter your unique waiter ID"
                className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 pl-10 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-600">Passcode</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                type={showPasscode ? 'text' : 'password'}
                placeholder="Enter passcode"
                className="w-full bg-transparent border border-warm-200 focus:border-primary-600/50 rounded-xl px-4 py-3 pl-10 pr-11 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:shadow-warm"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors">
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-primary-600/15 bg-primary-600/5 px-3 py-2 text-center text-[11px] text-stone-700">
            {error}
          </p>
        ) : null}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="mt-4 w-full py-3 rounded-xl bg-primary-600/15 hover:bg-primary-600/25 border border-primary-600/30 text-primary-600 font-semibold text-sm transition-all duration-200 hover:shadow-warm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Authenticating…
            </>
          ) : (
            'Authenticate'
          )}
        </button>

        <p className="mt-5 text-center text-[10px] text-gray-600">
          Your first successful login records attendance for today.
        </p>
      </motion.div>
    </div>
  );
}
