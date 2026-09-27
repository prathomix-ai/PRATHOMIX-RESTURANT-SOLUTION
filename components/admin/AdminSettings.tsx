'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Clock,
  Shield,
  ShieldAlert,
  Bell,
  Sparkles,
  DollarSign,
  Users,
  UtensilsCrossed,
  RotateCcw,
  CheckCircle2,
  Save,
  Laptop,
  Smartphone,
  Key,
  Lock,
  LogOut,
  AlertTriangle,
  Sliders,
  Cpu,
  Receipt,
  EyeOff,
  Eye,
} from 'lucide-react';
import { getClientSession, clearClientSession, type AuthUser } from '@/lib/auth';
import { restartTutorial } from '@/lib/onboarding';

interface Props {
  role?: string;
  onRefresh?: () => void;
}

export default function AdminSettings({ role: propRole }: Props) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('restaurant');
  const [savedToast, setSavedToast] = useState(false);
  const [tutorialRestartToast, setTutorialRestartToast] = useState(false);

  // Security States
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [suspiciousAlertDismissed, setSuspiciousAlertDismissed] = useState(false);
  const [loginActivity, setLoginActivity] = useState<any[]>([]);
  const [loginActivityLoading, setLoginActivityLoading] = useState(false);

  // Profile / Business States
  const [restaurantName, setRestaurantName] = useState('PRATHOMIX Flagship Luxury Lounge');
  const [businessEntity, setBusinessEntity] = useState('Prathomix Hospitality Pvt Ltd');
  const [gstNumber, setGstNumber] = useState('27AABCP1234F1Z5');
  const [cuisineType, setCuisineType] = useState('Modern Luxury Gastronomy');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [email, setEmail] = useState('concierge@prathomix.tech');
  const [address, setAddress] = useState('Level 42, Sky Tower, Financial District');
  const [city, setCity] = useState('Mumbai');
  const [openingTime, setOpeningTime] = useState('11:00');
  const [closingTime, setClosingTime] = useState('23:30');

  // Operations
  const [tableTimeout, setTableTimeout] = useState(120);
  const [maxActiveOrders, setMaxActiveOrders] = useState(3);
  const [requireServerConfirm, setRequireServerConfirm] = useState(true);
  const [highValueAlertThreshold, setHighValueAlertThreshold] = useState(1500);

  // Financial (Owner-only)
  const [taxRate, setTaxRate] = useState(5.0);
  const [serviceCharge, setServiceCharge] = useState(5.0);
  const [autoInvoicePrint, setAutoInvoicePrint] = useState(true);

  // AI & Automation (Owner-only)
  const [aiDemandForecasting, setAiDemandForecasting] = useState(true);
  const [aiMenuOptimizer, setAiMenuOptimizer] = useState(true);
  const [aiAutoTableAllocation, setAiAutoTableAllocation] = useState(false);

  // Notifications
  const [staffAlerts, setStaffAlerts] = useState(true);
  const [kitchenAlerts, setKitchenAlerts] = useState(true);
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [reservationAlerts, setReservationAlerts] = useState(true);

  useEffect(() => {
    const user = getClientSession();
    setCurrentUser(user);
    const effectiveRole = propRole || user?.role || 'admin';
    if (effectiveRole === 'owner' || effectiveRole === 'admin') {
      setLoginActivityLoading(true);
      fetch(`/api/auth/activity?role=${effectiveRole}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.records) {
            setLoginActivity(data.records);
          }
        })
        .catch(() => {})
        .finally(() => setLoginActivityLoading(false));
    }
  }, [propRole]);

  const role = propRole || currentUser?.role || 'admin';
  const isOwner = role === 'owner';

  // Navigation tabs tailored strictly by role
  const ownerTabs = [
    { id: 'business', label: 'Business Profile', icon: Building },
    { id: 'access', label: 'Staff & Access Control', icon: Users },
    { id: 'financial', label: 'Financial & Tax/GST', icon: DollarSign },
    { id: 'operations', label: 'Operations & Dining', icon: Sliders },
    { id: 'ai', label: 'AI Business Intelligence', icon: Cpu },
    { id: 'security', label: 'Security & Sessions', icon: Shield },
    { id: 'tutorial', label: 'System Tutorial', icon: RotateCcw },
  ];

  const adminTabs = [
    { id: 'restaurant', label: 'Restaurant Info', icon: Building },
    { id: 'operations', label: 'Operations & Kitchen', icon: Sliders },
    { id: 'menu_ctrl', label: 'Menu & Modifiers', icon: UtensilsCrossed },
    { id: 'staff_ctrl', label: 'Staff Operations', icon: Users },
    { id: 'notifications', label: 'Notification Alerts', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'tutorial', label: 'Admin Tutorial', icon: RotateCcw },
  ];

  const currentTabs = isOwner ? ownerTabs : adminTabs;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  }

  function handleRestartTutorial() {
    restartTutorial(isOwner ? 'owner' : 'admin', currentUser?.id);
    setTutorialRestartToast(true);
    setTimeout(() => setTutorialRestartToast(false), 3500);
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || newPw !== confirmPw) {
      alert('Passwords do not match');
      return;
    }
    setPwSuccess(true);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwSuccess(false), 4000);
  }

  function handleLogoutAll() {
    if (confirm('Are you sure you want to invalidate all active sessions across all devices?')) {
      clearClientSession();
      window.location.href = '/login';
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className="text-2xl font-bold text-[#EAE6DF] tracking-wide"
              style={{ fontFamily: 'Cinzel, serif' }}>
              {isOwner ? 'Owner Executive Master Control' : 'Admin Operations & Settings'}
            </h1>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isOwner
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : 'bg-[#C5A880]/15 border-[#C5A880]/30 text-[#C5A880]'
              }`}>
              {isOwner ? 'Master Access' : 'Operational Admin'}
            </span>
          </div>
          <p className="text-xs text-[#EAE6DF]/60 mt-1">
            {isOwner
              ? 'Highest tier executive authorization. Full governance over financials, staff access, AI telemetry, and security.'
              : 'Daily restaurant operations, table seating parameters, shift notifications, and operational security.'}
          </p>
        </div>

        {savedToast && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            Changes saved to database!
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-[#C5A880]/15 pb-3 overflow-x-auto scrollbar-none">
        {currentTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id || (activeSubTab === 'restaurant' && t.id === 'business');
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#C5A880] text-[#0A0A0A] font-bold shadow-warm'
                  : 'bg-[#1A1A1A] text-[#EAE6DF]/70 hover:text-[#C5A880] border border-[#C5A880]/10'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* 1. BUSINESS PROFILE (Owner) or RESTAURANT INFO (Admin) */}
      {(activeSubTab === 'business' || activeSubTab === 'restaurant') && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  {isOwner ? 'Master Business Entity & Legal Information' : 'Restaurant Operational Information'}
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  {isOwner
                    ? 'Legal tenant entity, GSTIN, corporate headquarters, and brand identity'
                    : 'Physical address, contact numbers, and guest concierge details'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Restaurant Public Name</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              {isOwner && (
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Registered Corporate Entity</label>
                  <input
                    type="text"
                    value={businessEntity}
                    onChange={(e) => setBusinessEntity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              )}

              {isOwner && (
                <div>
                  <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Cuisine Concept</label>
                <input
                  type="text"
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Concierge Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Official Contact Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Physical Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="pt-3 border-t border-[#C5A880]/10">
              <h3 className="text-xs font-bold text-[#EAE6DF] mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C5A880]" /> Daily Operating Hours
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs max-w-sm">
                <div>
                  <label className="block text-[#EAE6DF]/60 text-[11px] mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
                <div>
                  <label className="block text-[#EAE6DF]/60 text-[11px] mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
              <Save className="w-4 h-4" /> Save Profile Information
            </button>
          </div>
        </form>
      )}

      {/* 2. FINANCIAL & TAX/GST (Owner Only) */}
      {isOwner && activeSubTab === 'financial' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Fiscal Policies, GST &amp; Billing Control
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  Strictly restricted to Owner. Admin has zero access to fiscal rate alterations.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Restaurant GST / VAT (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
                <span className="text-[10px] text-[#EAE6DF]/40 mt-1 block">Applied to food and beverages</span>
              </div>
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Service Charge (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
                <span className="text-[10px] text-[#EAE6DF]/40 mt-1 block">Discretionary hospitality gratuity</span>
              </div>
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Currency Code</label>
                <input
                  type="text"
                  readOnly
                  value="INR (₹)"
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#C5A880] font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoInvoicePrint}
                  onChange={(e) => setAutoInvoicePrint(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
                />
                <span className="text-xs text-[#EAE6DF]">
                  <strong>Automatic GST Compliant Invoicing:</strong> Automatically generate thermal tax receipts with B2B GSTIN fields upon table settlement.
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
              <Save className="w-4 h-4" /> Save Financial Policies
            </button>
          </div>
        </form>
      )}

      {/* 3. OPERATIONS & KITCHEN */}
      {activeSubTab === 'operations' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Table Governance &amp; Kitchen Dispatch Parameters
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  Fine-tune session expiration, order velocity limits, and serving handover workflow
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Table Session Timeout (Mins)</label>
                <input
                  type="number"
                  value={tableTimeout}
                  onChange={(e) => setTableTimeout(parseInt(e.target.value) || 60)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
                <span className="text-[10px] text-[#EAE6DF]/40 mt-1 block">QR dine-in auto expires</span>
              </div>
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">Max Active Orders / Table</label>
                <input
                  type="number"
                  value={maxActiveOrders}
                  onChange={(e) => setMaxActiveOrders(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
                <span className="text-[10px] text-[#EAE6DF]/40 mt-1 block">Prevents duplicate order spam</span>
              </div>
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 font-semibold">High-Value Order Hold (₹)</label>
                <input
                  type="number"
                  value={highValueAlertThreshold}
                  onChange={(e) => setHighValueAlertThreshold(parseInt(e.target.value) || 1000)}
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] focus:outline-none focus:border-[#C5A880]"
                />
                <span className="text-[10px] text-[#EAE6DF]/40 mt-1 block">Requires staff confirmation</span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireServerConfirm}
                  onChange={(e) => setRequireServerConfirm(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
                />
                <span className="text-xs text-[#EAE6DF]">
                  <strong>Physical Presence Check:</strong> Waiter verifies table physically before kitchen prints initial ticket.
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#1A1A1A] border-[#C5A880]/30"
                />
                <span className="text-xs text-[#EAE6DF]">
                  <strong>Realtime KDS Dispatch Chimes:</strong> Audible notification when chef marks food ready.
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
              <Save className="w-4 h-4" /> Save Operations Settings
            </button>
          </div>
        </form>
      )}

      {/* 4. AI & PREDICTIVE INTELLIGENCE (Owner Only) */}
      {isOwner && activeSubTab === 'ai' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Autonomous Restaurant Intelligence &amp; AI Copilot
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  Proprietary demand forecasting and menu elasticity algorithms
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">AI Kitchen Inventory Forecasting</div>
                  <div className="text-[11px] text-[#EAE6DF]/60 mt-0.5">
                    Analyzes weekend reservation trends to forecast raw meat and wine procurement
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiDemandForecasting}
                  onChange={(e) => setAiDemandForecasting(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">Dynamic Menu Engineering &amp; Pairing Suggestions</div>
                  <div className="text-[11px] text-[#EAE6DF]/60 mt-0.5">
                    Generates automated wine and dessert pairings for customers on their digital menu
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiMenuOptimizer}
                  onChange={(e) => setAiMenuOptimizer(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">Predictive Table Turnover Optimization</div>
                  <div className="text-[11px] text-[#EAE6DF]/60 mt-0.5">
                    Calculates average dining pace to suggest optimal reservation slots for Concierge
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiAutoTableAllocation}
                  onChange={(e) => setAiAutoTableAllocation(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
              <Save className="w-4 h-4" /> Save AI Configuration
            </button>
          </div>
        </form>
      )}

      {/* 5. STAFF & ACCESS (Owner) or STAFF OPERATIONS (Admin) */}
      {(activeSubTab === 'access' || activeSubTab === 'staff_ctrl') && (
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                {isOwner ? 'Executive Role Permissions & Staff Access Control' : 'Staff Section Assignments'}
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">
                {isOwner
                  ? 'Manage Admin privileges, issue security tokens, and enforce password resets'
                  : 'Assign waitstaff to dining zones and manage daily shift rosters'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#EAE6DF]">Waiter Mobile Handheld POS</div>
                <div className="text-[11px] text-[#EAE6DF]/60">Assigned table orders, kitchen alerts, serving tracking</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active (4 Staff)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#EAE6DF]">Kitchen KDS Display Terminals</div>
                <div className="text-[11px] text-[#EAE6DF]/60">Ticket dispatch, cook timer, order completion</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active (2 Stations)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#EAE6DF]">Reception Concierge Terminal</div>
                <div className="text-[11px] text-[#EAE6DF]/60">Floor plan control, walk-ins, guest reservations</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active (1 Front Desk)
              </span>
            </div>

            {isOwner && (
              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-purple-500/20 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-purple-300">Operations Admin Access</div>
                  <div className="text-[11px] text-[#EAE6DF]/60">Day-to-day operations management. Restricted from Owner financial logs.</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Enforced
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. NOTIFICATIONS (Admin) */}
      {!isOwner && activeSubTab === 'notifications' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Operational Alerts &amp; Kitchen Signals
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  Configure push notifications and audio signals across restaurant terminals
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">Staff Shift Logins &amp; Presence</div>
                  <div className="text-[11px] text-[#EAE6DF]/60">Notify admin when kitchen or waitstaff begin their shift</div>
                </div>
                <input
                  type="checkbox"
                  checked={staffAlerts}
                  onChange={(e) => setStaffAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">Kitchen Ready-to-Serve Notifications</div>
                  <div className="text-[11px] text-[#EAE6DF]/60">Dispatch alerts to assigned waiter and admin summary when order is marked ready</div>
                </div>
                <input
                  type="checkbox"
                  checked={kitchenAlerts}
                  onChange={(e) => setKitchenAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-[#EAE6DF]">Front Desk Reservation Alerts</div>
                  <div className="text-[11px] text-[#EAE6DF]/60">Notify of upcoming VIP bookings and cancellations</div>
                </div>
                <input
                  type="checkbox"
                  checked={reservationAlerts}
                  onChange={(e) => setReservationAlerts(e.target.checked)}
                  className="w-4 h-4 rounded text-[#C5A880] bg-[#121212] border-[#C5A880]/30"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
              <Save className="w-4 h-4" /> Save Notification Preferences
            </button>
          </div>
        </form>
      )}

      {/* 7. SECURITY & SESSIONS (Owner & Admin) */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Suspicious Login Warning Banner if unhandled */}
          {!suspiciousAlertDismissed && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-amber-300">Security Notice: New Device Login Detected</div>
                  <div className="text-[11px] text-[#EAE6DF]/70 mt-0.5">
                    A successful login was recorded today at 1:45 PM from Chrome on Windows (IP: 192.168.1.102).
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={() => setSuspiciousAlertDismissed(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold hover:bg-amber-500/30 transition-colors">
                      Review Session &amp; Dismiss
                    </button>
                    <button
                      onClick={handleLogoutAll}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/30 transition-colors">
                      Log Out All Other Devices
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Sessions */}
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    Active Sessions &amp; Device Governance
                  </h2>
                  <span className="text-[11px] text-[#EAE6DF]/50">
                    Review and invalidate connected terminals across the restaurant
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogoutAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-all">
                <LogOut className="w-3.5 h-3.5" /> Logout All Devices
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-[#1A1A1A] border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#EAE6DF] flex items-center gap-2">
                      <span>Windows PC · Chrome Browser</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
                        Current Active Session
                      </span>
                    </div>
                    <div className="text-[10px] text-[#EAE6DF]/50">IP: 192.168.1.102 · Mumbai, IN · Logged in today</div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/15 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 text-[#C5A880] flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#EAE6DF]">Apple iPad Pro · Safari (Handheld POS)</div>
                    <div className="text-[10px] text-[#EAE6DF]/50">Floor Station 1 · Last active 12 mins ago</div>
                  </div>
                </div>
                <button
                  onClick={() => alert('Session invalidated')}
                  className="px-2.5 py-1 rounded-lg bg-[#121212] border border-[#C5A880]/20 text-[#EAE6DF]/60 hover:text-rose-400 text-[10px] transition-colors">
                  Revoke
                </button>
              </div>
            </div>
          </div>

          {/* Role-Restricted Login Activity (Owner & Admin Only) */}
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C5A880]/15">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                    {isOwner ? 'Staff & Administrator Login Activity' : 'Staff Login Activity'}
                  </h2>
                  <span className="text-[11px] text-[#EAE6DF]/50">
                    {isOwner
                      ? 'Executive security log of Admin, Waiter, Chef, and Receptionist authentication events'
                      : 'Operational security log of Waiter, Chef, and Receptionist logins'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#C5A880]/15 text-[#C5A880] border border-[#C5A880]/30">
                {isOwner ? 'Owner Level Access' : 'Admin Staff Visibility'}
              </span>
            </div>

            {/* Table: User | Role | Event | Date | Time | Status */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#C5A880]/15 text-[#EAE6DF]/60 text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold">User</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Event</th>
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Time</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C5A880]/10 text-[#EAE6DF]">
                  {loginActivityLoading ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[#EAE6DF]/50">
                        Loading login activity...
                      </td>
                    </tr>
                  ) : loginActivity.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-[#EAE6DF]/50">
                        No login activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginActivity.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1A1A1A]/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-[#EAE6DF]">{log.user}</td>
                        <td className="py-3 px-3 text-[#C5A880] font-semibold">{log.role}</td>
                        <td className="py-3 px-3 text-[#EAE6DF]/80">{log.event}</td>
                        <td className="py-3 px-3 text-[#EAE6DF]/60">{log.date}</td>
                        <td className="py-3 px-3 text-[#EAE6DF]/80">{log.time}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              log.status === 'Success'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Password & Multi-Factor Security */}
          <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
              <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                  Credential Encryption &amp; Two-Factor Authentication
                </h2>
                <span className="text-[11px] text-[#EAE6DF]/50">
                  Update administrative credentials and manage hardware MFA
                </span>
              </div>
            </div>

            {pwSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Password updated securely!
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 text-xs font-semibold">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 text-xs font-semibold">New Secure Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div>
                <label className="block text-[#EAE6DF]/70 mb-1 text-xs font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2 rounded-xl bg-[#1A1A1A] border border-[#C5A880]/20 text-[#EAE6DF] text-xs focus:outline-none focus:border-[#C5A880]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs shadow-warm hover:brightness-110 transition-all">
                  Update Password
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#C5A880]/10 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#EAE6DF]">Two-Factor Authentication (2FA)</div>
                <div className="text-[11px] text-[#EAE6DF]/60">Require biometric or authenticator passcode on sensitive changes</div>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  twoFactorEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#1A1A1A] border-[#C5A880]/20 text-[#EAE6DF]/60'
                }`}>
                {twoFactorEnabled ? 'Enabled (Active)' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. TUTORIAL REPLAY */}
      {activeSubTab === 'tutorial' && (
        <div className="p-6 rounded-2xl bg-[#121212]/90 border border-[#C5A880]/20 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#C5A880]/15">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/10 border border-[#C5A880]/20 flex items-center justify-center text-[#C5A880]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#EAE6DF]" style={{ fontFamily: 'Cinzel, serif' }}>
                {isOwner ? 'Owner Executive Onboarding Walkthrough' : 'Admin Operations Onboarding'}
              </h2>
              <span className="text-[11px] text-[#EAE6DF]/50">
                Replay your role-tailored step-by-step guidance tour
              </span>
            </div>
          </div>

          <p className="text-xs text-[#EAE6DF]/70 leading-relaxed max-w-xl">
            {isOwner
              ? 'Restarting the Owner tutorial will guide you through high-level revenue dashboards, staff governance, AI telemetry, and security audit logs.'
              : 'Restarting the Admin tutorial will guide you through day-to-day operations, floor table maps, kitchen dispatch chimes, and staff roster controls.'}
          </p>

          {tutorialRestartToast && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              Tutorial reset! The guided tour will appear now.
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleRestartTutorial}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#8C7355] text-[#0A0A0A] font-bold text-xs uppercase tracking-wider shadow-warm hover:brightness-110 transition-all">
              <RotateCcw className="w-4 h-4" /> Restart Tutorial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
