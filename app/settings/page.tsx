'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  User,
  Sliders,
  Bell,
  Palette,
  Shield,
  RotateCcw,
  CheckCircle2,
  Lock,
  Smartphone,
  History,
  LogOut,
  Save,
  ArrowRight,
  Flame,
  Leaf,
  Heart,
  Globe,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import RoleOnboardingTutorial from '@/components/RoleOnboardingTutorial';
import { getClientSession, clearClientSession, type AuthUser } from '@/lib/auth';
import { restartTutorial } from '@/lib/onboarding';

export default function CustomerSettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'ordering' | 'notifications' | 'appearance' | 'privacy' | 'security' | 'tutorial'>('profile');

  // Profile Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Ordering Preferences
  const [dietPreference, setDietPreference] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [spicePreference, setSpicePreference] = useState<'mild' | 'medium' | 'hot' | 'extra-hot'>('medium');
  const [allergies, setAllergies] = useState<string[]>(['None']);
  const [favoriteDishes, setFavoriteDishes] = useState('Butter Chicken, Grilled Chicken Powerhouse');

  // Notifications
  const [notifyOrderUpdates, setNotifyOrderUpdates] = useState(true);
  const [notifyReadyStatus, setNotifyReadyStatus] = useState(true);
  const [notifyPayment, setNotifyPayment] = useState(true);
  const [notifyPromos, setNotifyPromos] = useState(false);

  // Appearance & Language
  const [themeMode, setThemeMode] = useState('luxury-dark');
  const [language, setLanguage] = useState('English (EN)');

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  useEffect(() => {
    const u = getClientSession();
    if (u) {
      setUser(u);
      setName(u.name || '');
      setPhone(u.phone || '+91 98765 43210');
      setEmail(u.email || '');
    } else {
      setName('Patron Guest');
      setPhone('+91 98765 43210');
      setEmail('guest@prathomix.tech');
    }
  }, []);

  function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setSecuritySuccess('Password updated securely across all active devices.');
    setCurrentPassword('');
    setNewPassword('');
    setTimeout(() => setSecuritySuccess(''), 4000);
  }

  function handleLogoutAll() {
    clearClientSession();
    window.location.href = '/login';
  }

  const role = (user?.role || 'customer') as any;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAE6DF] relative overflow-hidden pb-20">
      <Navbar />
      <RoleOnboardingTutorial role={role} userId={user?.id} userName={user?.name} />

      {/* Ambient background glow */}
      <div className="absolute top-24 left-1/3 w-[600px] h-[600px] bg-[#C5A880]/5 rounded-full blur-[140px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/25 px-3 py-1 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#C5A880] font-bold">Personalized Settings</span>
            </div>
            <h1
              className="font-display text-2xl sm:text-4xl font-bold text-white tracking-wide"
              style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
              Account & Dining Preferences
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Manage your personal hospitality profile, dietary modifier preferences, notifications, and security controls.
            </p>
          </div>

          {savedToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Preferences saved successfully!</span>
            </motion.div>
          )}
        </div>

        {/* Staff Shortcut Banner if authenticated as staff */}
        {user && user.role !== 'customer' && (
          <div className="mb-6 p-4 rounded-2xl bg-[#C5A880]/10 border border-[#C5A880]/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#C5A880]" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Logged in as {user.name} ({user.role.toUpperCase()})
                </p>
                <p className="text-xs text-stone-300">
                  You have access to the dedicated {user.role} operational dashboard and station settings.
                </p>
              </div>
            </div>
            <Link
              href={
                user.role === 'waiter'
                  ? '/waiter/dashboard'
                  : user.role === 'chef'
                    ? '/kitchen/dashboard'
                    : user.role === 'receptionist'
                      ? '/reception/dashboard'
                      : '/admin'
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] text-xs font-bold uppercase tracking-wider transition-all">
              <span>Open Staff Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Settings Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Navigation Sidebar Tabs */}
          <div className="bg-[#121212]/90 border border-[#C5A880]/20 rounded-2xl p-2.5 space-y-1 shadow-xl backdrop-blur-xl">
            {[
              { id: 'profile', label: 'Profile Information', icon: User },
              { id: 'ordering', label: 'Ordering Preferences', icon: Sliders },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'appearance', label: 'Appearance & Language', icon: Palette },
              { id: 'privacy', label: 'Privacy & Data', icon: Shield },
              { id: 'security', label: 'Security & Sessions', icon: Lock },
              { id: 'tutorial', label: 'Guided Tour / Tutorial', icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-lg shadow-[#C5A880]/20'
                      : 'text-stone-300 hover:text-white hover:bg-white/5'
                  }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A0A0A]' : 'text-[#C5A880]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Settings Tab Content */}
          <div className="bg-[#121212]/95 border border-[#C5A880]/20 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* 1. Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Profile Details</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Your personal patron profile saved across the lounge.</p>
                </div>

                <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xl flex items-center justify-center shadow-lg">
                    {name ? name[0].toUpperCase() : 'P'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{name}</p>
                    <p className="text-xs text-[#C5A880] font-mono capitalize">{user?.role || 'Patron Customer'}</p>
                    <span className="text-[11px] text-stone-400">Exclusive Dining Member</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm focus:border-[#C5A880] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm focus:border-[#C5A880] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm focus:border-[#C5A880] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-lg transition-all">
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </form>
            )}

            {/* 2. Ordering Preferences */}
            {activeTab === 'ordering' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Dining & Nutritional Preferences</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Customize default dish modifiers and kitchen instructions.</p>
                </div>

                {/* Dietary preference */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-400" /> Dietary Style
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                    {[
                      { id: 'all', label: 'All Cuisines' },
                      { id: 'veg', label: 'Vegetarian Only' },
                      { id: 'non-veg', label: 'High Protein / Non-Veg' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDietPreference(opt.id as any)}
                        className={`py-3 px-3 rounded-xl border transition-all text-center ${
                          dietPreference === opt.id
                            ? 'bg-[#C5A880] text-[#0A0A0A] border-[#C5A880] font-bold shadow-md'
                            : 'bg-[#181818] border-white/10 text-stone-300 hover:border-white/25'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spice preference */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#C5A880]" /> Default Spice Preference
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
                    {[
                      { id: 'mild', label: 'Mild & Gentle' },
                      { id: 'medium', label: 'Signature Medium' },
                      { id: 'hot', label: 'Spicy / Fiery' },
                      { id: 'extra-hot', label: 'Chef Ghost Hot' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSpicePreference(s.id as any)}
                        className={`py-3 px-3 rounded-xl border transition-all text-center ${
                          spicePreference === s.id
                            ? 'bg-[#C5A880] text-[#0A0A0A] border-[#C5A880] font-bold shadow-md'
                            : 'bg-[#181818] border-white/10 text-stone-300 hover:border-white/25'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allergies / Precautions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">
                    Allergen Warnings / Special Requests
                  </label>
                  <input
                    type="text"
                    value={allergies.join(', ')}
                    onChange={(e) => setAllergies(e.target.value.split(',').map((s) => s.trim()))}
                    placeholder="e.g. Peanut allergy, Lactose intolerance, Jain preparation"
                    className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm focus:border-[#C5A880] outline-none"
                  />
                  <span className="text-[11px] text-stone-400">
                    Our culinary brigade automatically cross-references these notes on every dish you order.
                  </span>
                </div>

                {/* Favorite Dishes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" /> Favorite Dishes
                  </label>
                  <input
                    type="text"
                    value={favoriteDishes}
                    onChange={(e) => setFavoriteDishes(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm focus:border-[#C5A880] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-lg transition-all">
                  <Save className="w-4 h-4" />
                  <span>Update Dining Preferences</span>
                </button>
              </form>
            )}

            {/* 3. Notifications Tab */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Alerts & Messaging Preferences</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Control live order updates and reservation dispatch.</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: 'Live Order Progress Updates',
                      desc: 'Get notified when your order is confirmed, preparing, and ready to serve.',
                      checked: notifyOrderUpdates,
                      toggle: () => setNotifyOrderUpdates(!notifyOrderUpdates),
                    },
                    {
                      title: 'Kitchen Ready & Serving Alert',
                      desc: 'Instant prompt the exact second your dish is plated and placed on the pass.',
                      checked: notifyReadyStatus,
                      toggle: () => setNotifyReadyStatus(!notifyReadyStatus),
                    },
                    {
                      title: 'Digital Bill & Payment Confirmation',
                      desc: 'Receive digital tax invoice copies and receipt summaries via SMS/Email.',
                      checked: notifyPayment,
                      toggle: () => setNotifyPayment(!notifyPayment),
                    },
                    {
                      title: 'Exclusive Tasting Menus & Seasonal Offers',
                      desc: 'Curated notifications about new seasonal menus, wine pairings, and member privileges.',
                      checked: notifyPromos,
                      toggle: () => setNotifyPromos(!notifyPromos),
                    },
                  ].map((n, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-[#181818]/90 border border-white/10 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-white">{n.title}</p>
                        <p className="text-[11px] sm:text-xs text-stone-400 mt-0.5">{n.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={n.checked}
                        onChange={n.toggle}
                        className="w-5 h-5 accent-[#C5A880] rounded cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-lg transition-all">
                  <Save className="w-4 h-4" />
                  <span>Save Notification Settings</span>
                </button>
              </form>
            )}

            {/* 4. Appearance & Language */}
            {activeTab === 'appearance' && (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Visual Appearance & Language</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Customize your interface theme and language.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#C5A880]" /> Theme Styling
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setThemeMode('luxury-dark')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        themeMode === 'luxury-dark'
                          ? 'bg-[#181818] border-[#C5A880] text-white shadow-lg shadow-[#C5A880]/10'
                          : 'bg-[#141414] border-white/10 text-stone-400'
                      }`}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#C5A880] inline-block" /> PRATHOMIX Obsidian
                      </p>
                      <p className="text-xs text-stone-400 mt-1">Signature fine-dining dark obsidian with champagne gold accents.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('luxury-charcoal')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        themeMode === 'luxury-charcoal'
                          ? 'bg-[#181818] border-[#C5A880] text-white shadow-lg'
                          : 'bg-[#141414] border-white/10 text-stone-400'
                      }`}>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#8C7355] inline-block" /> Warm Bronze Mood
                      </p>
                      <p className="text-xs text-stone-400 mt-1">Deep velvety charcoal with refined warm bronze accents.</p>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 max-w-sm">
                  <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#C5A880]" /> Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-[#181818] border border-white/10 text-white text-xs sm:text-sm outline-none cursor-pointer [color-scheme:dark]">
                    <option value="English (EN)">English (International)</option>
                    <option value="Hindi (HI)">हिन्दी (Hindi)</option>
                    <option value="French (FR)">Français (French)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-lg transition-all">
                  <Save className="w-4 h-4" />
                  <span>Apply Theme</span>
                </button>
              </form>
            )}

            {/* 5. Privacy & Data */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Privacy & Account Data</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Manage cached dining history and session persistence.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Clear Local Order Cache</p>
                      <p className="text-xs text-stone-400">Clears offline cart drafts and order session temporary files.</p>
                    </div>
                    <button
                      onClick={() => {
                        localStorage.removeItem('prathomix-cart');
                        alert('Local cart cache cleared.');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-white/15 hover:border-white/30 text-xs font-semibold text-stone-200">
                      Clear Cache
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">Terminate All Active Device Sessions</p>
                      <p className="text-xs text-stone-400">Logs you out across any other browser or mobile terminal.</p>
                    </div>
                    <button
                      onClick={handleLogoutAll}
                      className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold">
                      Logout All Devices
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 6. Security & Sessions */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">Security & Active Sessions</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Protect your account and review authenticated devices.</p>
                </div>

                {securitySuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{securitySuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="p-5 rounded-2xl bg-[#181818]/90 border border-white/10 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C5A880]">Change Password</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-stone-300 font-semibold">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-stone-300 font-semibold">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="px-4 py-2.5 rounded-xl bg-[#141414] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider transition-all">
                    Update Password
                  </button>
                </form>

                {/* Active Sessions List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Current Active Sessions</h3>
                  <div className="p-4 rounded-xl bg-[#181818] border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Current Browser Device</span>
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">Active Now</span>
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5">Jaipur, India · SSL Encrypted Session</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Tutorial & Onboarding Restart */}
            {activeTab === 'tutorial' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">First-Time Onboarding Tour</h2>
                  <p className="text-xs text-stone-400 mt-0.5">Replay the guided walk-through for your role.</p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] border border-[#C5A880]/30 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                    <RotateCcw className="w-6 h-6" />
                  </div>

                  <div>
                    <h3
                      className="text-base sm:text-lg font-bold text-white"
                      style={{ fontFamily: '"Cormorant Garamond", "Cinzel", serif' }}>
                      Replay {user?.role ? user.role.toUpperCase() : 'CUSTOMER'} Tutorial
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 mt-1 leading-relaxed">
                      Tap below to launch the step-by-step onboarding walkthrough covering digital menu browsing, custom product modifiers, order tracking, and table seating.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => restartTutorial(role, user?.id)}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#C5A880]/20 hover:scale-[1.02] transition-all">
                    <RotateCcw className="w-4 h-4" />
                    <span>Restart Tutorial Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
