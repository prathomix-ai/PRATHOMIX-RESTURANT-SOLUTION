'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, BarChart2, PlusCircle, Loader2, RefreshCw,
  TrendingUp, Users, ShoppingBag, Zap, LogOut, Eye, EyeOff, Database,
} from 'lucide-react';
import Image from 'next/image';

// NOTE: In production, use a server-side session, not a client env var for auth.
const ADMIN_PASSWORD = 'prathomix2024';

type Tab = 'analytics' | 'inventory';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pw,     setPw]     = useState('');
  const [show,   setShow]   = useState(false);
  const [pwErr,  setPwErr]  = useState('');
  const [tab,    setTab]    = useState<Tab>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [dishes,    setDishes]    = useState<any[]>([]);
  const [aLoading,  setALoading]  = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', price: '',
    calories: '', protein: '', image_url: '', category: 'Main',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  function handleLogin() {
    if (pw === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      setPwErr('Incorrect password. Access denied.');
      setPw('');
    }
  }

  const loadData = useCallback(async () => {
    setALoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch('/api/dishes').then((r) => r.json()),
        fetch('/api/admin/analytics').then((r) => r.json()),
      ]);
      setDishes(dRes);
      setAnalytics(aRes);
    } catch (e) {
      console.error('Admin data load error:', e);
    } finally {
      setALoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  async function addDish() {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      await fetch('/api/dishes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price:    parseFloat(form.price)    || 0,
          calories: parseInt(form.calories)   || 0,
          protein:  parseFloat(form.protein)  || 0,
        }),
      });
      setSaved(true);
      setForm({ name:'', description:'', price:'', calories:'', protein:'', image_url:'', category:'Main' });
      setTimeout(() => setSaved(false), 2500);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  /* ── Login Screen ─────────────────────────────────── */
  if (!authenticated) return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass neon-border rounded-2xl p-8 w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 shadow-neon-sm
                          flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
          <h1
            className="font-display text-2xl font-bold gradient-text"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Admin Access
          </h1>
          <p className="text-xs text-slate-500 mt-1">Prathomix Restaurant Control Panel</p>
        </div>

        <div className="relative mb-4">
          <input
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwErr(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            type={show ? 'text' : 'password'}
            placeholder="Enter admin password"
            className="w-full bg-transparent border border-slate-700 focus:border-cyan-500/50
                       rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500
                       outline-none transition-all focus:shadow-neon-sm" />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {pwErr && <p className="text-red-400 text-xs text-center mb-3">{pwErr}</p>}

        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30
                     text-cyan-400 font-semibold text-sm transition-all duration-200 hover:shadow-neon-sm">
          Authenticate
        </button>

        <p className="text-[10px] text-slate-700 text-center mt-5">
          This page is not linked from anywhere. Direct URL access only.
        </p>
      </motion.div>
    </div>
  );

  /* ── Dashboard ────────────────────────────────────── */
  return (
    <div className="min-h-screen grid-bg">
      {/* Admin Navbar */}
      <div className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span
              className="font-display text-sm font-bold gradient-text"
              style={{ fontFamily: 'Cinzel, serif' }}>
              Prathomix Admin
            </span>
            <span className="text-[10px] text-slate-600 border border-slate-800 rounded px-1.5 py-0.5 ml-1">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="text-slate-500 hover:text-cyan-400 transition-colors"
              title="Refresh data">
              <RefreshCw className={`w-4 h-4 ${aLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => setAuthenticated(false)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8">
          {(['analytics', 'inventory'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                           ${tab === t
                             ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-400 shadow-neon-sm'
                             : 'glass border border-slate-700 text-slate-300 hover:border-cyan-500/25'}`}>
              {t === 'analytics' ? <><BarChart2 className="w-4 h-4" /> AI Analytics</> : <><Database className="w-4 h-4" /> Inventory</>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Analytics Tab ─────────────────────────── */}
          {tab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: ShoppingBag, label: 'Menu Items',    value: dishes.length,                                  sub: 'total dishes'        },
                  { icon: Users,       label: 'Bookings',      value: analytics?.stats?.bookings ?? 0,                sub: 'total reservations'  },
                  { icon: TrendingUp,  label: 'Orders',        value: analytics?.stats?.orders   ?? 0,                sub: 'orders placed'       },
                  { icon: Zap,         label: 'Avg Protein',   value: analytics?.stats?.avgProtein
                                                                        ? `${Number(analytics.stats.avgProtein).toFixed(1)}g`
                                                                        : '—',                                         sub: 'per dish'            },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="glass border border-slate-800 hover:border-slate-700 rounded-2xl p-5
                               transition-all duration-200">
                    <s.icon className="w-5 h-5 text-cyan-400 mb-3 opacity-70" />
                    <p className="text-2xl font-bold text-white">
                      {aLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-600" /> : s.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* AI Insights */}
              <div className="glass neon-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-cyan-400" />
                    <h2
                      className="font-display text-lg font-semibold gradient-text"
                      style={{ fontFamily: 'Cinzel, serif' }}>
                      AI Business Insights
                    </h2>
                  </div>
                  <span className="text-[10px] text-slate-600 border border-slate-800 rounded px-2 py-0.5">
                    Gemini → Groq
                  </span>
                </div>

                {aLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                    Generating AI insights from your data…
                  </div>
                ) : analytics?.insights ? (
                  <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {analytics.insights}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    No AI insights yet. Make sure your Gemini or Groq API key is set in{' '}
                    <code className="text-cyan-500/70">.env.local</code>, then add some bookings and orders.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Inventory Tab ──────────────────────────── */}
          {tab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}>
              <div className="grid lg:grid-cols-2 gap-8">

                {/* Add Dish Form */}
                <div className="glass neon-border rounded-2xl p-6">
                  <h2
                    className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2"
                    style={{ fontFamily: 'Cinzel, serif' }}>
                    <PlusCircle className="w-5 h-5 text-cyan-400" />
                    Add New Dish
                  </h2>

                  <div className="flex flex-col gap-3.5">
                    {[
                      { k: 'name',        label: 'Dish Name *',    placeholder: 'e.g. Grilled Salmon', type: 'text'   },
                      { k: 'description', label: 'Description',    placeholder: 'Brief description…',  type: 'text'   },
                      { k: 'price',       label: 'Price (₹) *',    placeholder: '349',                  type: 'number' },
                      { k: 'calories',    label: 'Calories',        placeholder: '420',                  type: 'number' },
                      { k: 'protein',     label: 'Protein (g)',     placeholder: '38.5',                 type: 'number' },
                      { k: 'image_url',   label: 'Image URL',       placeholder: 'https://…',            type: 'url'    },
                    ].map((f) => (
                      <div key={f.k}>
                        <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
                        <input
                          value={(form as any)[f.k]}
                          type={f.type}
                          placeholder={f.placeholder}
                          onChange={(e) => setForm((prev) => ({ ...prev, [f.k]: e.target.value }))}
                          className="w-full bg-transparent border border-slate-700 focus:border-cyan-500/50
                                     rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500
                                     outline-none transition-all focus:shadow-neon-sm" />
                      </div>
                    ))}

                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-dark-800 border border-slate-700 focus:border-cyan-500/50
                                   rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-all">
                        {['Main', 'High Protein', 'Low Cal', 'Vegetarian', 'Dessert', 'Drinks'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={addDish}
                      disabled={saving || !form.name.trim() || !form.price}
                      className="py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30
                                 text-cyan-400 font-semibold text-sm transition-all duration-200
                                 hover:shadow-neon-sm disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2">
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : saved ? (
                        '✅ Dish Added!'
                      ) : (
                        <><PlusCircle className="w-4 h-4" /> Add to Menu</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Dish List */}
                <div>
                  <h2
                    className="font-display text-lg font-semibold gradient-text mb-5 flex items-center gap-2"
                    style={{ fontFamily: 'Cinzel, serif' }}>
                    <ShoppingBag className="w-5 h-5 text-cyan-400" />
                    Current Menu ({dishes.length})
                  </h2>

                  <div className="flex flex-col gap-3 max-h-[620px] overflow-y-auto pr-1">
                    {aLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 glass rounded-xl animate-pulse border border-slate-800" />
                      ))
                    ) : dishes.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-8">
                        No dishes yet. Add your first one!
                      </p>
                    ) : (
                      dishes.map((d: any) => (
                        <div
                          key={d.id}
                          className="glass border border-slate-800 rounded-xl p-3 flex gap-3 items-center
                                     hover:border-slate-700 transition-all duration-200">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={d.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}
                              alt={d.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{d.name}</p>
                            <p className="text-xs text-slate-500">
                              ₹{d.price} · {d.calories} cal · {d.protein}g protein
                            </p>
                          </div>
                          <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/15 text-cyan-400
                                           px-2 py-0.5 rounded-full flex-shrink-0">
                            {d.category}
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
    </div>
  );
}
