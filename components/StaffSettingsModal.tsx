'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Sliders,
  Bell,
  Palette,
  Lock,
  RotateCcw,
  CheckCircle2,
  Save,
  ChefHat,
  Volume2,
  Table as TableIcon,
  Smartphone,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { restartTutorial } from '@/lib/onboarding';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: 'waiter' | 'receptionist' | 'chef';
  staffName?: string;
  staffId?: string;
}

export default function StaffSettingsModal({
  isOpen,
  onClose,
  role,
  staffName = 'Staff Member',
  staffId = 'STF-01',
}: Props) {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications' | 'security' | 'tutorial'>('profile');
  const [savedToast, setSavedToast] = useState(false);

  // Profile Form States
  const [name, setName] = useState(staffName);
  const [phone, setPhone] = useState('+91 98765 43210');
  const [code, setCode] = useState(staffId);

  // Role-Specific Work Preferences
  // Waiter
  const [assignedSection, setAssignedSection] = useState('Main Fine Dining Room');
  const [assignedTables, setAssignedTables] = useState('Tables 1-5');
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(true);

  // Chef
  const [kitchenStation, setKitchenStation] = useState('Hot Line & Grill');
  const [orderSorting, setOrderSorting] = useState<'chronological' | 'priority' | 'prep-time'>('priority');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [warningThresholdMin, setWarningThresholdMin] = useState(10);

  // Receptionist
  const [defaultFloor, setDefaultFloor] = useState('Ground Dining Terrace');
  const [autoTableAssign, setAutoTableAssign] = useState(true);

  // Notifications
  const [notifyReady, setNotifyReady] = useState(true);
  const [notifyNewTicket, setNotifyNewTicket] = useState(true);
  const [notifyTableArrival, setNotifyTableArrival] = useState(true);
  const [notifyManagerMessages, setNotifyManagerMessages] = useState(true);

  // Security Form
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  if (!isOpen) return null;

  function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  }

  function handlePinChange(e: React.FormEvent) {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('PIN / Passcode must be at least 4 digits.');
      return;
    }
    setPinSuccess('Staff badge passcode updated securely.');
    setCurrentPin('');
    setNewPin('');
    setTimeout(() => setPinSuccess(''), 3500);
  }

  const roleTitle =
    role === 'waiter'
      ? 'Waiter Station Configuration'
      : role === 'chef'
        ? 'Culinary Brigade & KDS Settings'
        : 'Reception & Floor Host Settings';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-2xl bg-[#121212]/95 border border-[#C5A880]/30 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-2xl z-10 flex flex-col max-h-[92dvh]">
          
          {/* Top shimmer accent line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C5A880] to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-[#C5A880] font-bold">
                  {role.toUpperCase()} WORKSPACE
                </span>
                {savedToast && (
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    Saved!
                  </span>
                )}
              </div>
              <h2
                className="font-display text-lg sm:text-xl font-bold text-white mt-0.5"
                style={{ fontFamily: 'Cinzel, serif' }}>
                {roleTitle}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs row */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 border-b border-white/5 mb-5 text-xs font-semibold">
            {[
              { id: 'profile', label: 'Staff Profile', icon: User },
              { id: 'preferences', label: role === 'chef' ? 'KDS & Prep' : role === 'waiter' ? 'Section & Tables' : 'Floor Map', icon: Sliders },
              { id: 'notifications', label: 'Station Alerts', icon: Bell },
              { id: 'security', label: 'Badge PIN & Security', icon: Lock },
              { id: 'tutorial', label: 'Restart Tutorial', icon: RotateCcw },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-md'
                      : 'bg-[#181818] border border-white/5 text-stone-300 hover:text-white'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs sm:text-sm">
            {/* 1. Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center gap-4 pb-3 border-b border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C5A880]/20 to-[#8C7355]/30 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880] font-bold text-lg shadow-md">
                    {name ? name[0].toUpperCase() : 'S'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{name}</p>
                    <p className="text-xs text-[#C5A880] font-mono uppercase">{role} Staff Member</p>
                    <span className="text-[11px] text-stone-400">Employee ID: {code}</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Staff Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Employee ID</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Contact Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-md transition-all">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </form>
            )}

            {/* 2. Preferences Tab (Role Specific) */}
            {activeTab === 'preferences' && (
              <form onSubmit={handleSave} className="space-y-4">
                {role === 'waiter' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Assigned Section</label>
                      <select
                        value={assignedSection}
                        onChange={(e) => setAssignedSection(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none cursor-pointer [color-scheme:dark]">
                        <option value="Main Fine Dining Room">Main Fine Dining Room</option>
                        <option value="Sky Terrace Lounge">Sky Terrace Lounge</option>
                        <option value="VIP Private Dining Suites">VIP Private Dining Suites</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Assigned Table Range</label>
                      <select
                        value={assignedTables}
                        onChange={(e) => setAssignedTables(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none cursor-pointer [color-scheme:dark]">
                        <option value="Tables 1-5">Tables 1 – 5</option>
                        <option value="Tables 6-10">Tables 6 – 10</option>
                        <option value="All Dining Tables">All Tables (Lead Expediter)</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-white">Instant Kitchen Ticket Transmit</p>
                        <p className="text-[11px] text-stone-400">Skip confirmation dialog when firing tickets to the kitchen.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoConfirmOrders}
                        onChange={() => setAutoConfirmOrders(!autoConfirmOrders)}
                        className="w-4 h-4 accent-[#C5A880]"
                      />
                    </div>
                  </>
                )}

                {role === 'chef' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Kitchen Station</label>
                      <select
                        value={kitchenStation}
                        onChange={(e) => setKitchenStation(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none cursor-pointer [color-scheme:dark]">
                        <option value="Hot Line & Grill">Hot Line & Tandoor / Grill</option>
                        <option value="Garde Manger & Salads">Garde Manger & Cold Starters</option>
                        <option value="Pastry & Desserts">Pastry & Dessert Bar</option>
                        <option value="Master Executive KDS">Master Pass (All Stations)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">KDS Ticket Sorting</label>
                      <select
                        value={orderSorting}
                        onChange={(e) => setOrderSorting(e.target.value as any)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none cursor-pointer [color-scheme:dark]">
                        <option value="priority">Priority First (Rush / VIP bumped to front)</option>
                        <option value="chronological">Oldest First (First In First Out)</option>
                        <option value="prep-time">Elapsed Cook Time</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-white">Audible Ticket Chime</p>
                        <p className="text-[11px] text-stone-400">Play alert sound when new verified KOT arrives.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={() => setSoundEnabled(!soundEnabled)}
                        className="w-4 h-4 accent-[#C5A880]"
                      />
                    </div>
                  </>
                )}

                {role === 'receptionist' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs uppercase tracking-wider text-stone-300 font-semibold">Default Floor Section</label>
                      <select
                        value={defaultFloor}
                        onChange={(e) => setDefaultFloor(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl bg-[#181818] border border-white/10 text-white text-xs outline-none cursor-pointer [color-scheme:dark]">
                        <option value="Ground Dining Terrace">Ground Dining Terrace</option>
                        <option value="Skyline Mezzanine">Skyline Mezzanine</option>
                      </select>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-white">Auto-Suggest Table on Walk-in</p>
                        <p className="text-[11px] text-stone-400">Match incoming party size to optimal available table capacity.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoTableAssign}
                        onChange={() => setAutoTableAssign(!autoTableAssign)}
                        className="w-4 h-4 accent-[#C5A880]"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-md transition-all">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Work Preferences</span>
                </button>
              </form>
            )}

            {/* 3. Notifications Tab */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleSave} className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">New Order Dispatch Alerts</p>
                    <p className="text-[11px] text-stone-400">Popups and audio notifications for new floor orders.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyNewTicket}
                    onChange={() => setNotifyNewTicket(!notifyNewTicket)}
                    className="w-4 h-4 accent-[#C5A880]"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Kitchen Ready-to-Serve Notifications</p>
                    <p className="text-[11px] text-stone-400">Immediate prompt when plated dishes are ready at the pass.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyReady}
                    onChange={() => setNotifyReady(!notifyReady)}
                    className="w-4 h-4 accent-[#C5A880]"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Customer Arrival & Seating Alerts</p>
                    <p className="text-[11px] text-stone-400">Notifies assigned server when guest is seated by reception.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyTableArrival}
                    onChange={() => setNotifyTableArrival(!notifyTableArrival)}
                    className="w-4 h-4 accent-[#C5A880]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-md transition-all">
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Notification Preferences</span>
                </button>
              </form>
            )}

            {/* 4. Security & PIN */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                {pinSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{pinSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePinChange} className="p-4 rounded-xl bg-[#181818] border border-white/10 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C5A880]">Change Staff Passcode / PIN</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-stone-300 font-semibold">Current PIN</label>
                      <input
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="••••"
                        className="px-3.5 py-2 rounded-xl bg-[#141414] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-stone-300 font-semibold">New 4-Digit PIN</label>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="••••"
                        className="px-3.5 py-2 rounded-xl bg-[#141414] border border-white/10 text-white text-xs outline-none focus:border-[#C5A880]"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider transition-all">
                    Update PIN
                  </button>
                </form>

                <div className="p-3.5 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-semibold text-white">Active Station Terminal</p>
                      <p className="text-[11px] text-stone-400">Authenticated floor station session</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10">Active</span>
                </div>
              </div>
            )}

            {/* 5. Tutorial Tab */}
            {activeTab === 'tutorial' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#181818] to-[#141414] border border-[#C5A880]/30 space-y-3.5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] mx-auto shadow-md">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Cinzel, serif' }}>
                    Replay {role.toUpperCase()} Guided Tour
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 max-w-md mx-auto leading-relaxed">
                    Review step-by-step instructions covering ticket handling, kitchen workflow, table status transitions, and emergency procedures.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    restartTutorial(role, staffId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#C5A880]/20 hover:scale-[1.02] transition-all">
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart {role.toUpperCase()} Tutorial</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
